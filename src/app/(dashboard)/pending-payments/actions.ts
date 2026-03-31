"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { updatePayment, deletePayment, approvePayment, createPayment } from "@/data/payments";
import { authorizeAction } from "@/data/permissions";
import type { PaymentMethod, Payment } from "@/db/schema";

export interface UpdatePaymentData {
  courseId: string | null;
  packageId: string | null;
  price: number;
  paymentMethod: PaymentMethod | null;
  paidAt: string | null;
  receiptPhoto: string | null;
}

export interface AddPaymentData {
  studentId: string;
  courseId: string;
  packageId: string;
  price: number;
  paymentMethod: PaymentMethod | null;
  paidAt: string | null;
  receiptPhoto: string | null;
  poolId?: string;
  poolStudentIds?: string[];
}

export async function updatePendingPaymentAction(
  paymentId: string,
  data: UpdatePaymentData
): Promise<{ success: boolean; error?: string }> {
  try {
    await authorizeAction('pending_payments', 'can_edit');

    // Note: We don't set package_id because payments.package_id references
    // the legacy 'packages' table, not 'course_pricing'.
    // The package is looked up by course_id + amount in getPendingPaymentsForTable.
    const result = await updatePayment(paymentId, {
      course_id: data.courseId,
      amount: data.price,
      payment_method: data.paymentMethod,
      paid_at: data.paidAt || null,
      receipt_photo: data.receiptPhoto || null,
    });

    if (!result) {
      return { success: false, error: "Failed to update payment" };
    }

    revalidatePath("/pending-payments");
    revalidateTag("dashboard", "max");
    return { success: true };
  } catch (error) {
    console.error("Error updating payment:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export async function approvePaymentAction(
  paymentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await authorizeAction('pending_payments', 'can_edit');

    console.log('[approvePaymentAction] Starting approval for payment:', paymentId);

    const result = await approvePayment(paymentId);

    if (!result) {
      console.error('[approvePaymentAction] approvePayment returned null');
      return { success: false, error: "Failed to approve payment" };
    }

    console.log('[approvePaymentAction] Payment approved successfully, revalidating paths...');

    // Revalidate ALL affected pages to ensure UI updates
    revalidatePath("/pending-payments");
    revalidatePath("/student");
    revalidatePath("/attendance");
    revalidatePath("/payment-record");
    revalidateTag("dashboard", "max");

    console.log('[approvePaymentAction] All paths revalidated');
    return { success: true };
  } catch (error) {
    console.error("[approvePaymentAction] Error approving payment:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export async function deletePendingPaymentAction(
  paymentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await authorizeAction('pending_payments', 'can_delete');

    const result = await deletePayment(paymentId);

    if (!result) {
      return { success: false, error: "Failed to delete payment" };
    }

    revalidatePath("/pending-payments");
    revalidateTag("dashboard", "max");
    return { success: true };
  } catch (error) {
    console.error("Error deleting payment:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export async function addPendingPaymentAction(
  data: AddPaymentData
): Promise<{ success: boolean; error?: string; payment?: Payment }> {
  try {
    await authorizeAction('pending_payments', 'can_create');

    // Note: We don't set package_id because payments.package_id references
    // the legacy 'packages' table, not 'course_pricing'.
    // The package is looked up by course_id + amount in getPendingPaymentsForTable.
    const paymentInsert: Record<string, unknown> = {
      student_id: data.studentId,
      course_id: data.courseId || null,
      amount: data.price,
      payment_type: "package",
      status: "pending",
      payment_method: data.paymentMethod,
      paid_at: data.paidAt || null,
      receipt_photo: data.receiptPhoto || null,
    };
    // Link payment to shared pool if applicable
    if (data.poolId) {
      paymentInsert.pool_id = data.poolId;
      paymentInsert.is_shared_package = true;
      if (data.poolStudentIds) {
        paymentInsert.shared_with = data.poolStudentIds;
      }
    }
    const result = await createPayment(paymentInsert as any);

    if (!result) {
      return { success: false, error: "Failed to create payment - check server logs" };
    }

    revalidatePath("/pending-payments");
    revalidateTag("dashboard", "max");
    return { success: true, payment: result };
  } catch (error) {
    console.error("Error creating payment:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
