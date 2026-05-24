// Billplz webhook receiver.
//
// Billplz POSTs here on every bill state change. We:
//   1. Parse the form-encoded body
//   2. Verify the HMAC-SHA256 signature with our X-Signature key
//   3. Idempotency-skip if the payment is already paid
//   4. Sanity-check the amount
//   5. Call markBillplzPaid() which runs the full approval side-effects
//
// We always return 200 unless authentication fails — Billplz retries on non-200
// responses, and we don't want loops on logical errors (amount mismatch, missing
// payment row, etc.). Logical errors are surfaced via staff notifications.

import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/billplz";
import { markBillplzPaid } from "@/data/payments";
import { supabaseAdmin } from "@/db";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Billplz sends application/x-www-form-urlencoded
  const params = new URLSearchParams(rawBody);
  const payload: Record<string, string> = {};
  for (const [k, v] of params.entries()) payload[k] = v;

  const signature = payload["x_signature"] ?? "";
  if (!verifyWebhookSignature(payload, signature)) {
    console.warn("[Billplz webhook] signature mismatch", { id: payload.id });
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  // Only act on paid bills. Other states (`due`) we acknowledge and ignore.
  if (payload.state !== "paid" || payload.paid !== "true") {
    return NextResponse.json({ ok: true, ignored: true, state: payload.state });
  }

  const paymentId = payload.reference_1 ?? null;
  const billId = payload.id ?? null;
  if (!paymentId || !billId) {
    console.error("[Billplz webhook] missing reference_1 or id", payload);
    return NextResponse.json({ ok: true, error: "missing_refs" });
  }

  // Look up the payment row to sanity-check amount before mutating.
  const { data: payment } = await supabaseAdmin
    .from("payments")
    .select("id, amount, status")
    .eq("id", paymentId)
    .maybeSingle();

  if (!payment) {
    console.error("[Billplz webhook] payment not found for id", paymentId);
    return NextResponse.json({ ok: true, error: "payment_not_found" });
  }

  const expectedCents = Math.round(Number(payment.amount) * 100);
  const paidCents = Number(payload.paid_amount);
  if (Number.isFinite(paidCents) && paidCents !== expectedCents) {
    console.error("[Billplz webhook] amount mismatch", {
      paymentId,
      expectedCents,
      paidCents,
    });
    // Notify staff but still return 200 so Billplz stops retrying.
    try {
      const { notifyStaff, resolveBranchCompanyId } = await import("@/data/notifications");
      const { data: studentRow } = await supabaseAdmin
        .from("payments")
        .select("student:students(id, name, branch_id)")
        .eq("id", paymentId)
        .single();
      const student = (studentRow?.student as unknown as { id: string; name: string; branch_id: string } | null) ?? null;
      if (student) {
        const companyId = await resolveBranchCompanyId(student.branch_id);
        await notifyStaff(
          { roles: ["super_admin", "group_admin", "company_admin"], companyId },
          {
            type: "payment_amount_mismatch",
            title: "Billplz amount mismatch",
            body: `Expected RM${(expectedCents / 100).toFixed(2)}, got RM${(paidCents / 100).toFixed(2)} for ${student.name}. Manual review needed.`,
            link: `/payment-record?highlight=${paymentId}`,
            data: { paymentId, billId, expectedCents, paidCents },
          },
        );
      }
    } catch (notifyErr) {
      console.warn("[Billplz webhook] notify staff failed:", notifyErr);
    }
    return NextResponse.json({ ok: true, error: "amount_mismatch" });
  }

  const result = await markBillplzPaid(paymentId, {
    billplzBillId: billId,
    billplzTransactionId: payload.transaction_id ?? null,
    paidAt: payload.paid_at ?? new Date().toISOString(),
  });

  if (!result.ok) {
    console.error("[Billplz webhook] markBillplzPaid failed", {
      paymentId,
      reason: result.reason,
    });
    // Still 200 — retrying won't help on logical errors.
    return NextResponse.json({ ok: true, error: result.reason });
  }

  return NextResponse.json({
    ok: true,
    paymentId,
    alreadyPaid: result.alreadyPaid,
  });
}
