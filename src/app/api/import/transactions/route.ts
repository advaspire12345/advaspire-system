import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/db";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

interface TransactionRow {
  sender_id: string;
  sender_type: string;
  receiver_id: string;
  receiver_type: string;
  amount: string;
  type: string;
  date?: string;
  description?: string;
}

async function resolveParticipant(
  identifier: string,
  participantType: string
): Promise<string> {
  // Use ilike() / lowercased compare so identifiers match case-insensitively
  // — migration data often has inconsistent casing (e.g. "Adv24001",
  // "AAA@Example.com").
  const id = identifier.trim();
  if (participantType === "student") {
    const { data: student } = await supabaseAdmin
      .from("students")
      .select("id")
      .ilike("student_id", id)
      .maybeSingle();

    if (!student) {
      throw new Error(`Student not found: ${identifier}`);
    }
    return student.id;
  } else if (participantType === "user") {
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id")
      .ilike("email", id)
      .maybeSingle();

    if (!user) {
      throw new Error(`User not found: ${identifier}`);
    }
    return user.id;
  } else {
    throw new Error(`Invalid participant type: ${participantType}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rows, password } = (await request.json()) as {
      rows: Record<string, string>[];
      password?: string;
    };

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "No rows provided" },
        { status: 400 }
      );
    }

    // Password re-authentication. Transactions move adcoin between accounts
    // — sensitive enough to require the uploader to confirm their identity
    // before the rows are committed. We verify via a throwaway client so the
    // existing session isn't disturbed.
    if (!password) {
      return NextResponse.json(
        { error: "Password required to approve transaction import" },
        { status: 401 }
      );
    }
    const verifyClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { error: signInError } = await verifyClient.auth.signInWithPassword({
      email: user.email,
      password,
    });
    if (signInError) {
      return NextResponse.json(
        { error: "Invalid password — transactions not approved" },
        { status: 401 }
      );
    }

    let success = 0;
    let failed = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Running balance cache per sender. Hits the DB once per unique sender,
    // then decrements in-memory as rows process. Ensures a 1000-balance
    // sender can only fund 1000 worth of outgoing transactions across the
    // CSV — the third 500-transfer in a row 500/500/500 gets blocked.
    const senderBalances = new Map<string, number>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as unknown as TransactionRow;
      const rowIndex = i + 1;

      // Skip template example rows
      const senderUpper = (row.sender_id ?? "").trim().toUpperCase();
      const receiverUpper = (row.receiver_id ?? "").trim().toUpperCase();
      if (senderUpper.startsWith("EXAMPLE") || receiverUpper.startsWith("EXAMPLE")) {
        skipped++;
        continue;
      }

      try {
        // Validate required fields
        if (
          !row.sender_id ||
          !row.sender_type ||
          !row.receiver_id ||
          !row.receiver_type ||
          !row.amount ||
          !row.type
        ) {
          throw new Error(
            "Missing required fields: sender_id, sender_type, receiver_id, receiver_type, amount, type"
          );
        }

        // Validate sender_type and receiver_type
        const senderType = row.sender_type.toLowerCase();
        const receiverType = row.receiver_type.toLowerCase();

        if (senderType !== "student" && senderType !== "user") {
          throw new Error(`Invalid sender_type: ${row.sender_type} (expected student or user)`);
        }
        if (receiverType !== "student" && receiverType !== "user") {
          throw new Error(`Invalid receiver_type: ${row.receiver_type} (expected student or user)`);
        }

        // Validate type
        const validTypes = ["earned", "spent", "transfer", "adjusted"];
        const txType = row.type.toLowerCase();
        if (!validTypes.includes(txType)) {
          throw new Error(`Invalid type: ${row.type} (expected earned/spent/transfer/adjusted)`);
        }

        // Validate amount
        const amount = parseFloat(row.amount);
        if (isNaN(amount) || amount <= 0) {
          throw new Error(`Invalid amount: ${row.amount}`);
        }

        // Resolve sender and receiver UUIDs
        const senderUuid = await resolveParticipant(row.sender_id, senderType);
        const receiverUuid = await resolveParticipant(row.receiver_id, receiverType);

        // Balance check — sender must have enough adcoin BEFORE we commit
        // the row. For types that move adcoin OUT of the sender (transfer,
        // spent), require balance >= amount. Track a running balance per
        // sender across rows so successive transfers from the same sender
        // are also bounded.
        const senderKey = `${senderType}:${senderUuid}`;
        let currentBalance: number;
        const cached = senderBalances.get(senderKey);
        if (cached === undefined) {
          const { data: senderRow } = await supabaseAdmin
            .from(senderType === "student" ? "students" : "users")
            .select("adcoin_balance")
            .eq("id", senderUuid)
            .single();
          currentBalance = (senderRow?.adcoin_balance as number | null) ?? 0;
          senderBalances.set(senderKey, currentBalance);
        } else {
          currentBalance = cached;
        }
        const debits = txType === "transfer" || txType === "spent";
        if (debits && currentBalance < amount) {
          throw new Error(
            `Insufficient adcoin to transfer — sender ${row.sender_id} has ${currentBalance} but row needs ${amount}`,
          );
        }

        // Parse optional date column. Stored as `created_at` (the table's
        // only timestamp). Blank or invalid date falls back to now().
        let createdAtIso: string | null = null;
        if (row.date?.trim()) {
          const d = new Date(row.date.trim());
          if (isNaN(d.getTime())) {
            throw new Error(`Invalid date: ${row.date}`);
          }
          createdAtIso = d.toISOString();
        }

        // Insert transaction — record the importing user in verified_by so
        // there's an audit trail of who approved the migration.
        const insertPayload: Record<string, unknown> = {
          sender_id: senderUuid,
          receiver_id: receiverUuid,
          amount,
          type: txType,
          description: row.description || null,
          verified_by: user.id,
        };
        if (createdAtIso) insertPayload.created_at = createdAtIso;
        const { error: insertError } = await supabaseAdmin
          .from("adcoin_transactions")
          .insert(insertPayload);

        if (insertError) {
          throw new Error(`Insert failed: ${insertError.message}`);
        }

        // Deduct from sender balance (only when the type debits the sender)
        // and update our in-memory running tally so the next row for the
        // same sender sees the new balance.
        if (debits) {
          const newBalance = currentBalance - amount;
          senderBalances.set(senderKey, newBalance);
          await supabaseAdmin
            .from(senderType === "student" ? "students" : "users")
            .update({ adcoin_balance: newBalance })
            .eq("id", senderUuid);
        }

        // Add to receiver balance
        if (receiverType === "student") {
          const { data: receiver } = await supabaseAdmin
            .from("students")
            .select("adcoin_balance")
            .eq("id", receiverUuid)
            .single();

          await supabaseAdmin
            .from("students")
            .update({ adcoin_balance: (receiver?.adcoin_balance ?? 0) + amount })
            .eq("id", receiverUuid);
        } else {
          const { data: receiver } = await supabaseAdmin
            .from("users")
            .select("adcoin_balance")
            .eq("id", receiverUuid)
            .single();

          await supabaseAdmin
            .from("users")
            .update({ adcoin_balance: (receiver?.adcoin_balance ?? 0) + amount })
            .eq("id", receiverUuid);
        }

        success++;
      } catch (err) {
        failed++;
        errors.push(`Row ${rowIndex}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    revalidatePath("/transactions");
    revalidatePath("/leaderboard");

    return NextResponse.json({ success, failed, skipped, errors });
  } catch (error) {
    console.error("Error importing transactions:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
