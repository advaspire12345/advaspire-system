"use server";

import { revalidatePath } from "next/cache";
import {
  createTeamMember,
  updateTeamMember,
  softDeleteTeamMember,
} from "@/data/team";
import type { UserInsert, UserUpdate, UserRole, TeamMemberStatus } from "@/db/schema";

export interface TeamMemberFormPayload {
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  branchId: string | null;
  photoUrl: string | null;
  cvUrl: string | null;
  role: UserRole;
  employedDate: string | null;
  status: TeamMemberStatus;
}

export async function createTeamMemberAction(
  payload: TeamMemberFormPayload
): Promise<{ success: boolean; error?: string; userId?: string }> {
  try {
    const userData: UserInsert = {
      name: payload.name,
      email: payload.email,
      phone: payload.phone || null,
      address: payload.address || null,
      branch_id: payload.branchId || null,
      photo: payload.photoUrl || null,
      cv_url: payload.cvUrl || null,
      role: payload.role,
      employed_date: payload.employedDate || null,
      status: payload.status,
    };

    const user = await createTeamMember(userData);

    if (!user) {
      return { success: false, error: "Failed to create team member" };
    }

    revalidatePath("/team");
    return { success: true, userId: user.id };
  } catch (error) {
    console.error("Error in createTeamMemberAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export async function updateTeamMemberAction(
  userId: string,
  payload: TeamMemberFormPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: UserUpdate = {
      name: payload.name,
      email: payload.email,
      phone: payload.phone || null,
      address: payload.address || null,
      branch_id: payload.branchId || null,
      photo: payload.photoUrl || null,
      cv_url: payload.cvUrl || null,
      role: payload.role,
      employed_date: payload.employedDate || null,
      status: payload.status,
    };

    const result = await updateTeamMember(userId, updateData);

    if (!result) {
      return { success: false, error: "Failed to update team member" };
    }

    revalidatePath("/team");
    return { success: true };
  } catch (error) {
    console.error("Error in updateTeamMemberAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export async function deleteTeamMemberAction(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await softDeleteTeamMember(userId);

    if (!success) {
      return { success: false, error: "Failed to delete team member" };
    }

    revalidatePath("/team");
    return { success: true };
  } catch (error) {
    console.error("Error in deleteTeamMemberAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
