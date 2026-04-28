import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/db";
import { ParentNav } from "@/components/parent/parent-nav";
import { ParentProfileForm } from "@/components/parent/parent-profile-form";
import { updateParentProfileAction } from "@/app/(parent)/parent/profile-actions";
import type { ParentProfileData } from "@/app/(parent)/parent/profile-actions";

export const dynamic = "force-dynamic";

export default async function ParentProfilePage() {
  const user = await getUser();

  if (!user?.id) {
    redirect("/login");
  }

  const { data: parent, error } = await supabaseAdmin
    .from("parents")
    .select("id, name, email, phone, address, postcode, city, photo, cover_photo")
    .eq("auth_id", user.id)
    .is("deleted_at", null)
    .single();

  if (error || !parent) {
    redirect("/parent");
  }

  const profile: ParentProfileData = {
    id: parent.id,
    name: parent.name,
    email: parent.email,
    phone: parent.phone,
    address: parent.address,
    postcode: parent.postcode,
    city: parent.city,
    photo: parent.photo,
    coverPhoto: parent.cover_photo,
  };

  return (
    <>
      <ParentNav parentName={parent.name} />

      <main className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        <ParentProfileForm
          profile={profile}
          onSave={updateParentProfileAction}
        />
      </main>
    </>
  );
}
