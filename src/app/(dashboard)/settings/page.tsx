import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { SettingsForm } from "@/components/settings/settings-form";
import { getSettings } from "@/data/settings";
import { updateSettingsAction } from "./actions";
import { getCurrentUserPermissions, getFirstViewablePath } from "@/data/permissions";

export default async function SettingsPage() {
  const user = await getUser();

  if (!user?.email) {
    redirect("/login");
  }

  const permData = await getCurrentUserPermissions();
  if (permData?.role !== 'super_admin' && permData?.role !== 'admin') redirect(permData ? getFirstViewablePath(permData.permissions) : "/login");

  const settings = await getSettings();

  return (
    <main className="flex-1 overflow-auto px-6 py-12 bg-[#f6f6fb]">
      <div className="space-y-6">
        <Banner
          backgroundImage="/banners/dashboard-bg.png"
          title="Settings"
          description="Configure application settings and AdCoin pool parameters"
          mascotImage="/banners/mascot.png"
        />

        <SettingsForm initialSettings={settings} onSave={updateSettingsAction} />
      </div>
    </main>
  );
}
