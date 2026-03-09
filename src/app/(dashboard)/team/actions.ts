"use server";

import { revalidatePath } from "next/cache";
import {
  createTeamMember,
  updateTeamMember,
  softDeleteTeamMember,
} from "@/data/team";
import { supabaseAdmin } from "@/db";
import type { UserInsert, UserUpdate, UserRole, TeamMemberStatus } from "@/db/schema";

export interface TeamMemberFormPayload {
  name: string;
  email: string;
  password?: string;
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
    // Validate password is provided for new team members
    if (!payload.password || payload.password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters" };
    }

    // Create Supabase Auth user with email and password
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true, // Auto-confirm email so they can login immediately
      user_metadata: {
        full_name: payload.name,
        role: payload.role,
      },
    });

    if (authError) {
      console.error("Error creating auth user:", authError);
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: "Failed to create authentication account" };
    }

    // Create team member record with auth_id linked
    const userData: UserInsert = {
      name: payload.name,
      email: payload.email,
      auth_id: authData.user.id,
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
      // If team member creation fails, we should clean up the auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
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
