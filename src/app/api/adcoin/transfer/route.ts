import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/db";
import { getUserByAuthId } from "@/data/users";
import { unifiedTransfer, unifiedAward, unifiedAdjust, type ParticipantType } from "@/data/adcoins";

interface TransferAdcoinRequest {
  senderId: string;
  receiverId: string;
  senderType?: "student" | "user";
  receiverType?: "student" | "user";
  transactionType: "transfer" | "earned" | "adjusted";
  amount: number;
  message?: string;
  password: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser || !authUser.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user record from our users table using auth_id
    const user = await getUserByAuthId(authUser.id);
    if (!user) {
      return NextResponse.json(
        { error: "User not found in system" },
        { status: 401 }
      );
    }

    const body: TransferAdcoinRequest = await request.json();

    // Validate required fields
    if (!body.senderId || !body.receiverId || !body.amount || !body.password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (body.senderId === body.receiverId) {
      return NextResponse.json(
        { error: "Sender and receiver cannot be the same person" },
        { status: 400 }
      );
    }

    if (body.amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 }
      );
    }

    // Default to student type if not specified (for backwards compatibility)
    const senderType: ParticipantType = body.senderType ?? 'student';
    const receiverType: ParticipantType = body.receiverType ?? 'student';

    // Verify sender's password
    let verifyEmail: string;

    if (senderType === "user") {
      // For user-type senders, verify the sender's own password
      const { data: senderUser } = await supabaseAdmin
        .from("users")
        .select("email")
        .eq("id", body.senderId)
        .single();

      if (!senderUser?.email) {
        return NextResponse.json(
          { error: "Sender not found" },
          { status: 400 }
        );
      }
      verifyEmail = senderUser.email;
    } else {
      // Student senders don't have auth accounts, verify logged-in user's password
      verifyEmail = authUser.email;
    }

    // Create a throwaway client for password verification to avoid corrupting any session state
    const verifyClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { error: signInError } = await verifyClient.auth.signInWithPassword({
      email: verifyEmail,
      password: body.password,
    });

    if (signInError) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    let transaction;
    const description = body.message || `${body.transactionType} by ${user.name}`;

    // Handle different transaction types
    switch (body.transactionType) {
      case "transfer":
        transaction = await unifiedTransfer(
          body.senderId,
          senderType,
          body.receiverId,
          receiverType,
          body.amount,
          description,
          user.id
        );
        break;

      case "earned":
        // For "earned", we award coins to the receiver
        transaction = await unifiedAward(
          body.receiverId,
          receiverType,
          body.amount,
          description,
          user.id
        );
        break;

      case "adjusted":
        // For "adjusted", we adjust the receiver's balance
        transaction = await unifiedAdjust(
          body.receiverId,
          receiverType,
          body.amount,
          description,
          user.id
        );
        break;

      default:
        return NextResponse.json(
          { error: "Invalid transaction type" },
          { status: 400 }
        );
    }

    if (!transaction) {
      return NextResponse.json(
        { error: "Failed to process transaction. Check if sender has sufficient balance." },
        { status: 500 }
      );
    }

    // Invalidate dashboard cache so adcoin stats/leaderboard show updated data
    revalidateTag("dashboard", "max");

    return NextResponse.json({ success: true, transaction });
  } catch (error) {
    console.error("Error processing adcoin transaction:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
