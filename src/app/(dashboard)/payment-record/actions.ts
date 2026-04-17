"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { updatePayment, deletePayment, getPaymentById, createInvoiceSnapshot } from "@/data/payments";
import { authorizeAction } from "@/data/permissions";
import type { PaymentMethod } from "@/db/schema";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface UpdatePaymentRecordData {
  courseId: string | null;
  packageId: string | null;
  price: number;
  paymentMethod: PaymentMethod | null;
  paidAt: string | null;
  receiptPhoto: string | null;
}

export async function updatePaymentRecordAction(
  paymentId: string,
  data: UpdatePaymentRecordData
): Promise<{ success: boolean; error?: string }> {
  try {
    await authorizeAction('payment_record', 'can_edit');

    // Check 1-week edit restriction
    const existing = await getPaymentById(paymentId);
    if (existing?.paid_at) {
      const paidDate = new Date(existing.paid_at).getTime();
      const now = Date.now();
      if (now - paidDate > ONE_WEEK_MS) {
        return { success: false, error: "Cannot edit payment record after 1 week. Invoice data is frozen." };
      }
    }

    const result = await updatePayment(paymentId, {
      course_id: data.courseId,
      package_id: data.packageId,
      amount: data.price,
      payment_method: data.paymentMethod,
      paid_at: data.paidAt || null,
      receipt_photo: data.receiptPhoto || null,
    });

    if (!result) {
      return { success: false, error: "Failed to update payment record" };
    }

    // Re-create invoice snapshot since package/price may have changed (within 1-week window)
    await createInvoiceSnapshot(paymentId);

    revalidatePath("/payment-record");
    revalidateTag("dashboard", "max");
    return { success: true };
  } catch (error) {
    console.error("Error updating payment record:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export async function deletePaymentRecordAction(
  paymentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await authorizeAction('payment_record', 'can_delete');

    const result = await deletePayment(paymentId);

    if (!result) {
      return { success: false, error: "Failed to delete payment record" };
    }

    revalidatePath("/payment-record");
    revalidateTag("dashboard", "max");
    return { success: true };
  } catch (error) {
    console.error("Error deleting payment record:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
