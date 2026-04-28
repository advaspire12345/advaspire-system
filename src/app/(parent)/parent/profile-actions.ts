"use server";

import { supabaseAdmin } from "@/db";
import { getUser } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";

export interface ParentProfileData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  postcode: string | null;
  city: string | null;
  photo: string | null;
  coverPhoto: string | null;
}

export interface ParentProfilePayload {
  phone: string | null;
  address: string | null;
  postcode: string | null;
  city: string | null;
  photo: string | null;
  coverPhoto: string | null;
  currentPassword: string;
  newPassword: string;
}

export async function updateParentProfileAction(
  payload: ParentProfilePayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const authUser = await getUser();
    if (!authUser?.id) return { success: false, error: "Not authenticated" };

    // Get parent record
    const { data: parent } = await supabaseAdmin
      .from("parents")
      .select("id, email")
      .eq("auth_id", authUser.id)
      .is("deleted_at", null)
      .single();

    if (!parent) return { success: false, error: "Parent not found" };

    // If changing password, verify current password first
    if (payload.newPassword) {
      if (!payload.currentPassword) {
        return { success: false, error: "Current password is required" };
      }

      const supabase = await createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: parent.email,
        password: payload.currentPassword,
      });

      if (signInError) {
        return { success: false, error: "Current password is incorrect" };
      }

      const { error: pwError } = await supabaseAdmin.auth.admin.updateUserById(
        authUser.id,
        { password: payload.newPassword }
      );

      if (pwError) {
        return { success: false, error: `Failed to update password: ${pwError.message}` };
      }
    }

    // Update parent record
    const { error: updateError } = await supabaseAdmin
      .from("parents")
      .update({
        phone: payload.phone,
        address: payload.address,
        postcode: payload.postcode,
        city: payload.city,
        photo: payload.photo,
        cover_photo: payload.coverPhoto,
      })
      .eq("id", parent.id);

    if (updateError) {
      return { success: false, error: "Failed to update profile" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating parent profile:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
