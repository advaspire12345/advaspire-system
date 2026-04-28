import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/db";

interface TransactionRow {
  sender_id: string;
  sender_type: string;
  receiver_id: string;
  receiver_type: string;
  amount: string;
  type: string;
  description?: string;
}

async function resolveParticipant(
  identifier: string,
  participantType: string
): Promise<string> {
  if (participantType === "student") {
    const { data: student, error } = await supabaseAdmin
      .from("students")
      .select("id")
      .eq("student_id", identifier)
      .single();

    if (error || !student) {
      throw new Error(`Student not found: ${identifier}`);
    }
    return student.id;
  } else if (participantType === "user") {
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", identifier)
      .single();

    if (error || !user) {
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

    const { rows } = (await request.json()) as { rows: Record<string, string>[] };

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "No rows provided" },
        { status: 400 }
      );
    }

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as unknown as TransactionRow;
      const rowIndex = i + 1;

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

        // Insert transaction
        const { error: insertError } = await supabaseAdmin
          .from("adcoin_transactions")
          .insert({
            sender_id: senderUuid,
            receiver_id: receiverUuid,
            amount,
            type: txType,
            description: row.description || null,
          });

        if (insertError) {
          throw new Error(`Insert failed: ${insertError.message}`);
        }

        // Deduct from sender balance
        if (senderType === "student") {
          const { data: sender } = await supabaseAdmin
            .from("students")
            .select("adcoin_balance")
            .eq("id", senderUuid)
            .single();

          await supabaseAdmin
            .from("students")
            .update({ adcoin_balance: (sender?.adcoin_balance ?? 0) - amount })
            .eq("id", senderUuid);
        } else {
          const { data: sender } = await supabaseAdmin
            .from("users")
            .select("adcoin_balance")
            .eq("id", senderUuid)
            .single();

          await supabaseAdmin
            .from("users")
            .update({ adcoin_balance: (sender?.adcoin_balance ?? 0) - amount })
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

    return NextResponse.json({ success, failed, errors });
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
