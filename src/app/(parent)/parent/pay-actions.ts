"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/db";
import { getUser } from "@/lib/supabase/server";
import { createBill } from "@/lib/billplz";

// ----- Helpers -----------------------------------------------------------------

async function getCallingParentId(): Promise<string | null> {
  const authUser = await getUser();
  if (!authUser?.id) return null;
  const { data } = await supabaseAdmin
    .from("parents")
    .select("id")
    .eq("auth_id", authUser.id)
    .is("deleted_at", null)
    .maybeSingle();
  return data?.id ?? null;
}

/** Verify the calling parent is linked to the student on this payment. */
async function ensurePaymentBelongsToCallingParent(
  paymentId: string,
): Promise<
  | { ok: true; payment: { id: string; student_id: string; amount: number; status: string; billplz_url: string | null; billplz_bill_id: string | null }; parentId: string }
  | { ok: false; error: string }
> {
  const parentId = await getCallingParentId();
  if (!parentId) return { ok: false, error: "Not authenticated" };

  const { data: payment } = await supabaseAdmin
    .from("payments")
    .select("id, student_id, amount, status, billplz_url, billplz_bill_id")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment) return { ok: false, error: "Payment not found" };

  const { data: link } = await supabaseAdmin
    .from("parent_students")
    .select("parent_id")
    .eq("parent_id", parentId)
    .eq("student_id", payment.student_id)
    .maybeSingle();
  if (!link) return { ok: false, error: "Forbidden" };

  return { ok: true, payment, parentId };
}

function siteUrl(): string {
  // Prefer NEXT_PUBLIC_SITE_URL if explicitly set, otherwise derive from the
  // incoming request host (works in dev + prod).
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  return ""; // resolved per-call below
}

async function resolveOrigin(): Promise<string> {
  const explicit = siteUrl();
  if (explicit) return explicit;
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

// ----- Online payment (Billplz) -----------------------------------------------

export interface CheckoutResult {
  success: boolean;
  url?: string;
  error?: string;
}

export async function createBillplzCheckoutAction(
  paymentId: string,
): Promise<CheckoutResult> {
  try {
    const auth = await ensurePaymentBelongsToCallingParent(paymentId);
    if (!auth.ok) return { success: false, error: auth.error };

    if (auth.payment.status === "paid") {
      return { success: false, error: "This payment is already paid." };
    }

    // If a bill already exists and is still usable, reuse it.
    if (auth.payment.billplz_url && auth.payment.billplz_bill_id) {
      return { success: true, url: auth.payment.billplz_url };
    }

    // Pull parent name + email + child name for the bill description.
    const { data: parent } = await supabaseAdmin
      .from("parents")
      .select("name, email, phone")
      .eq("id", auth.parentId)
      .single();
    const { data: student } = await supabaseAdmin
      .from("students")
      .select("name")
      .eq("id", auth.payment.student_id)
      .single();

    if (!parent?.email) {
      return { success: false, error: "Parent email is missing — please update your profile first." };
    }

    const origin = await resolveOrigin();
    const bill = await createBill({
      name: parent.name,
      email: parent.email,
      mobile: parent.phone ?? undefined,
      amountCents: Math.round(Number(auth.payment.amount) * 100),
      description: `Course payment for ${student?.name ?? "student"}`,
      callbackUrl: `${origin}/api/billplz/webhook`,
      redirectUrl: `${origin}/api/billplz/redirect`,
      reference1: paymentId,
    });

    await supabaseAdmin
      .from("payments")
      .update({ billplz_bill_id: bill.id, billplz_url: bill.url })
      .eq("id", paymentId);

    return { success: true, url: bill.url };
  } catch (error) {
    console.error("createBillplzCheckoutAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to start payment",
    };
  }
}

// ----- Offline slip upload -----------------------------------------------------

export interface OfflineSlipResult {
  success: boolean;
  error?: string;
}

export async function submitOfflineSlipAction(
  paymentId: string,
  fileUrl: string,
  note?: string,
): Promise<OfflineSlipResult> {
  try {
    const auth = await ensurePaymentBelongsToCallingParent(paymentId);
    if (!auth.ok) return { success: false, error: auth.error };

    if (auth.payment.status === "paid") {
      return { success: false, error: "This payment is already paid." };
    }

    if (!fileUrl) {
      return { success: false, error: "Please attach a payment slip image." };
    }

    const update: Record<string, unknown> = {
      receipt_photo: fileUrl,
      parent_marked_paid_at: new Date().toISOString(),
    };
    if (note?.trim()) update.notes = note.trim();

    const { error } = await supabaseAdmin
      .from("payments")
      .update(update)
      .eq("id", paymentId);
    if (error) return { success: false, error: error.message };

    // Notify staff so they can review + approve.
    try {
      const { notifyStaff, resolveBranchCompanyId } = await import("@/data/notifications");
      const { data: studentRow } = await supabaseAdmin
        .from("students")
        .select("name, branch_id")
        .eq("id", auth.payment.student_id)
        .single();
      if (studentRow?.branch_id) {
        const companyId = await resolveBranchCompanyId(studentRow.branch_id);
        await notifyStaff(
          { roles: ["super_admin", "group_admin", "company_admin", "assistant_admin"], companyId },
          {
            type: "parent_uploaded_slip",
            title: "Parent uploaded payment slip",
            body: `${studentRow.name}: parent claims paid offline. Please review.`,
            link: `/pending-payments?highlight=${paymentId}`,
            data: { paymentId, studentId: auth.payment.student_id },
          },
        );
      }
    } catch (notifyErr) {
      console.warn("[parent slip upload] notify staff failed:", notifyErr);
    }

    revalidatePath("/parent");
    return { success: true };
  } catch (error) {
    console.error("submitOfflineSlipAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload slip",
    };
  }
}
