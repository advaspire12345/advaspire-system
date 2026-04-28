"use server";

import { supabaseAdmin } from "@/db";
import { getUser } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import type { ProfileData, ProfileFormPayload } from "@/components/dashboard/profile-modal";

export async function getProfileAction(): Promise<ProfileData | null> {
  const authUser = await getUser();
  if (!authUser?.email) return null;

  const { data: dbUser, error } = await supabaseAdmin
    .from("users")
    .select("id, name, email, phone, address, city, photo, cover_photo, cv_url")
    .eq("auth_id", authUser.id)
    .is("deleted_at", null)
    .single();

  if (error || !dbUser) return null;

  return {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    phone: dbUser.phone,
    address: dbUser.address,
    city: dbUser.city,
    photo: dbUser.photo,
    coverPhoto: dbUser.cover_photo,
    cvUrl: dbUser.cv_url,
  };
}

export async function updateProfileAction(
  payload: ProfileFormPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const authUser = await getUser();
    if (!authUser?.id) return { success: false, error: "Not authenticated" };

    // If changing password, verify current password first
    if (payload.newPassword) {
      if (!payload.currentPassword) {
        return { success: false, error: "Current password is required" };
      }

      // Verify current password by attempting sign-in
      const supabase = await createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: payload.email,
        password: payload.currentPassword,
      });

      if (signInError) {
        return { success: false, error: "Current password is incorrect" };
      }

      // Update password via admin API
      const { error: pwError } = await supabaseAdmin.auth.admin.updateUserById(
        authUser.id,
        { password: payload.newPassword }
      );

      if (pwError) {
        return { success: false, error: `Failed to update password: ${pwError.message}` };
      }
    }

    // Update user record in users table
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        name: payload.name,
        phone: payload.phone,
        address: payload.address,
        city: payload.city,
        photo: payload.photoUrl,
        cv_url: payload.cvUrl,
      })
      .eq("auth_id", authUser.id);

    if (updateError) {
      return { success: false, error: "Failed to update profile" };
    }

    // Update auth user metadata
    await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
      user_metadata: { full_name: payload.name },
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating profile:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
