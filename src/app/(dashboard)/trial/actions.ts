"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import {
  createTrial,
  updateTrial,
  updateTrialStatus,
  softDeleteTrial,
  getTrialByPhone,
} from "@/data/trial";
import type { TrialRow } from "@/data/trial";
import type { TrialSource, TrialStatus, Trial } from "@/db/schema";
import { authorizeAction } from "@/data/permissions";

export interface AddTrialData {
  parentName: string;
  parentPhone: string;
  parentEmail: string | null;
  childName: string;
  childAge: number;
  branchId: string;
  courseId: string | null;
  source: TrialSource;
  scheduledDate: string;
  scheduledTime: string;
  message: string | null;
}

export interface UpdateTrialData {
  parentName: string;
  parentPhone: string;
  parentEmail: string | null;
  childName: string;
  childAge: number;
  branchId: string;
  courseId: string | null;
  source: TrialSource;
  scheduledDate: string;
  scheduledTime: string;
  message: string | null;
  status: TrialStatus;
}

export async function addTrialAction(
  data: AddTrialData
): Promise<{ success: boolean; error?: string; trial?: Trial }> {
  try {
    await authorizeAction('trials', 'can_create');

    const result = await createTrial({
      parent_name: data.parentName,
      parent_phone: data.parentPhone,
      parent_email: data.parentEmail,
      child_name: data.childName,
      child_age: data.childAge,
      branch_id: data.branchId,
      course_id: data.courseId,
      source: data.source,
      scheduled_date: data.scheduledDate,
      scheduled_time: data.scheduledTime,
      message: data.message,
      status: "pending",
    });

    if (!result) {
      return { success: false, error: "Failed to create trial" };
    }

    revalidatePath("/trial");
    revalidateTag("dashboard", "max");
    return { success: true, trial: result };
  } catch (error) {
    console.error("Error creating trial:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export async function updateTrialAction(
  trialId: string,
  data: UpdateTrialData
): Promise<{ success: boolean; error?: string }> {
  try {
    await authorizeAction('trials', 'can_edit');

    const result = await updateTrial(trialId, {
      parent_name: data.parentName,
      parent_phone: data.parentPhone,
      parent_email: data.parentEmail,
      child_name: data.childName,
      child_age: data.childAge,
      branch_id: data.branchId,
      course_id: data.courseId,
      source: data.source,
      scheduled_date: data.scheduledDate,
      scheduled_time: data.scheduledTime,
      message: data.message,
      status: data.status,
    });

    if (!result) {
      return { success: false, error: "Failed to update trial" };
    }

    revalidatePath("/trial");
    revalidateTag("dashboard", "max");
    return { success: true };
  } catch (error) {
    console.error("Error updating trial:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export async function updateTrialStatusAction(
  trialId: string,
  status: TrialStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    await authorizeAction('trials', 'can_edit');

    const result = await updateTrialStatus(trialId, status);

    if (!result) {
      return { success: false, error: "Failed to update trial status" };
    }

    revalidatePath("/trial");
    revalidateTag("dashboard", "max");
    return { success: true };
  } catch (error) {
    console.error("Error updating trial status:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export async function checkPhoneAction(
  phone: string
): Promise<{ exists: boolean; trial?: TrialRow }> {
  try {
    await authorizeAction('trials', 'can_view');

    const trial = await getTrialByPhone(phone);
    if (trial) {
      return { exists: true, trial };
    }
    return { exists: false };
  } catch (error) {
    console.error("Error checking phone:", error);
    return { exists: false };
  }
}

export async function deleteTrialAction(
  trialId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await authorizeAction('trials', 'can_delete');

    const result = await softDeleteTrial(trialId);

    if (!result) {
      return { success: false, error: "Failed to delete trial" };
    }

    revalidatePath("/trial");
    revalidateTag("dashboard", "max");
    return { success: true };
  } catch (error) {
    console.error("Error deleting trial:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
