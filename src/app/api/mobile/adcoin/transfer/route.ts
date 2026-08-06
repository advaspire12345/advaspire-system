import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { authenticateMobile } from "@/lib/mobile-auth";
import { supabaseAdmin } from "@/db";
import { unifiedTransfer } from "@/data/adcoins";

// Mobile teacher: give adcoin to a student from the teacher's own balance.
// Token-authed; mirrors the web /api/adcoin/transfer (password-confirmed transfer,
// deducts sender, credits receiver) via the shared `unifiedTransfer`.
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateMobile(request);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (!auth.user || !auth.email) return NextResponse.json({ error: "Not a staff account." }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const { receiverId, amount, message, password } = body ?? {};
    if (!receiverId || !amount || !password) {
      return NextResponse.json({ error: "Missing student, amount or password." }, { status: 400 });
    }
    const amt = Math.floor(Number(amount));
    if (!Number.isFinite(amt) || amt <= 0) {
      return NextResponse.json({ error: "Amount must be a whole number greater than 0." }, { status: 400 });
    }

    // Confirm the teacher's password with a throwaway client (don't disturb sessions).
    const verifyClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { error: signInError } = await verifyClient.auth.signInWithPassword({ email: auth.email, password });
    if (signInError) return NextResponse.json({ error: "Incorrect password." }, { status: 401 });

    const description = typeof message === "string" && message.trim() ? message.trim() : `Reward from ${auth.user.name}`;
    const transaction = await unifiedTransfer(auth.user.id, "user", receiverId, "student", amt, description, auth.user.id);
    if (!transaction) {
      return NextResponse.json({ error: "Transfer failed — you may not have enough adcoin." }, { status: 400 });
    }
    // Mark the student's side as 'earned' (a reward), matching the web semantics.
    await supabaseAdmin.from("adcoin_transactions").update({ type: "earned" }).eq("id", transaction.id);

    const { data: me } = await supabaseAdmin.from("users").select("adcoin_balance").eq("id", auth.user.id).single();
    const { data: stu } = await supabaseAdmin.from("students").select("adcoin_balance").eq("id", receiverId).single();
    return NextResponse.json({ success: true, senderBalance: me?.adcoin_balance ?? null, receiverBalance: stu?.adcoin_balance ?? null });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}
