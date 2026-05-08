"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { authorizeAction, getCurrentUserPermissions } from "@/data/permissions";
import {
  createTopupRequest,
  approveTopupRequest,
  rejectTopupRequest,
  getTopupRequestById,
  rmCostFor,
} from "@/data/marketplace";
import { supabaseAdmin } from "@/db";
import { getUser } from "@/lib/supabase/server";

export interface CreateTopupInput {
  adcoinAmount: number;
  receiptUrl: string | null;
  notes?: string | null;
}

export async function createTopupRequestAction(input: CreateTopupInput): Promise<
  { success: boolean; error?: string; requestId?: string }
> {
  try {
    await authorizeAction("marketplace", "can_create");
    const permData = await getCurrentUserPermissions();
    if (!permData) return { success: false, error: "Unauthorized" };

    if (!input.adcoinAmount || input.adcoinAmount <= 0) {
      return { success: false, error: "Adcoin amount must be greater than 0" };
    }

    // Resolve the requester's branch_id for the request row
    const { data: dbUser } = await supabaseAdmin
      .from("users")
      .select("branch_id")
      .eq("id", permData.userId)
      .single();

    const result = await createTopupRequest({
      requesterId: permData.userId,
      branchId: dbUser?.branch_id ?? null,
      adcoinAmount: input.adcoinAmount,
      rmAmount: rmCostFor(input.adcoinAmount),
      receiptUrl: input.receiptUrl,
      notes: input.notes ?? null,
    });

    if (!result) return { success: false, error: "Failed to submit request" };

    // Notify super_admin so they see a pending request
    try {
      const { notifyStaff } = await import("@/data/notifications");
      await notifyStaff(
        { roles: ["super_admin"] },
        {
          type: "marketplace_topup_request",
          title: "New marketplace top-up request",
          body: `${input.adcoinAmount} adcoins requested (RM ${rmCostFor(input.adcoinAmount).toFixed(2)})`,
          link: "/marketplace",
          data: { requestId: result.id },
        },
      );
    } catch (e) {
      console.warn("[Notify marketplace_topup_request] failed:", e);
    }

    revalidatePath("/marketplace");
    return { success: true, requestId: result.id };
  } catch (e) {
    console.error("[createTopupRequestAction] failed:", e);
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export interface ApproveTopupInput {
  requestId: string;
  /** Sender (super_admin) password — verified before transferring adcoin */
  senderPassword: string;
}

export async function approveTopupRequestAction(input: ApproveTopupInput): Promise<
  { success: boolean; error?: string }
> {
  try {
    const permData = await getCurrentUserPermissions();
    if (!permData) return { success: false, error: "Unauthorized" };
    if (permData.role !== "super_admin") {
      return { success: false, error: "Only super_admin can approve top-up requests" };
    }

    // Verify the approver's password to prevent accidental large transfers
    const authUser = await getUser();
    if (!authUser?.email) return { success: false, error: "Unauthorized" };

    const verifyClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { error: signInError } = await verifyClient.auth.signInWithPassword({
      email: authUser.email,
      password: input.senderPassword,
    });
    if (signInError) {
      return { success: false, error: "Invalid password. Approval denied." };
    }

    const request = await getTopupRequestById(input.requestId);
    if (!request) return { success: false, error: "Request not found" };
    if (request.status !== "pending") {
      return { success: false, error: `Request is already ${request.status}` };
    }

    const result = await approveTopupRequest({
      requestId: input.requestId,
      approverId: permData.userId,
      adcoinAmount: request.adcoin_amount,
      rmAmount: Number(request.rm_amount),
      receiverId: request.requester_id,
    });

    if (!result.success) return { success: false, error: result.error };

    revalidatePath("/marketplace");
    revalidatePath("/transactions");
    return { success: true };
  } catch (e) {
    console.error("[approveTopupRequestAction] failed:", e);
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function rejectTopupRequestAction(input: { requestId: string; notes?: string }): Promise<
  { success: boolean; error?: string }
> {
  try {
    const permData = await getCurrentUserPermissions();
    if (!permData) return { success: false, error: "Unauthorized" };
    if (permData.role !== "super_admin") {
      return { success: false, error: "Only super_admin can reject top-up requests" };
    }
    const ok = await rejectTopupRequest({
      requestId: input.requestId,
      reviewerId: permData.userId,
      notes: input.notes,
    });
    if (!ok) return { success: false, error: "Failed to reject request" };
    revalidatePath("/marketplace");
    return { success: true };
  } catch (e) {
    console.error("[rejectTopupRequestAction] failed:", e);
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
