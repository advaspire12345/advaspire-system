import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/db";
import { Banner } from "@/components/ui/banner";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { updateProfileAction } from "@/app/(dashboard)/profile-actions";
import type { ProfileData } from "@/components/dashboard/profile-modal";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getUser();

  if (!user?.id) {
    redirect("/login");
  }

  // Fetch profile directly (not via server action) for reliable SSR
  const { data: dbUser, error } = await supabaseAdmin
    .from("users")
    .select("id, name, email, phone, address, city, photo, cv_url")
    .eq("auth_id", user.id)
    .is("deleted_at", null)
    .single();

  if (error || !dbUser) {
    redirect("/dashboard");
  }

  const profile: ProfileData = {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    phone: dbUser.phone,
    address: dbUser.address,
    city: dbUser.city,
    photo: dbUser.photo,
    coverPhoto: null,
    cvUrl: dbUser.cv_url,
  };

  return (
    <main className="flex-1 overflow-auto px-6 py-12 bg-[#f6f6fb]">
      <div className="space-y-2">
        <Banner
          backgroundImage="/banners/dashboard-bg.png"
          title="Profile"
          description="Manage your personal information and password"
          mascotImage="/banners/mascot.png"
        />

        <ProfileForm
          profile={profile}
          onSave={updateProfileAction}
        />
      </div>
    </main>
  );
}
