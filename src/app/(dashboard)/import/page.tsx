import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { ImportPage } from "@/components/import/import-page";
import { getCurrentUserPermissions, getFirstViewablePath } from "@/data/permissions";

export const dynamic = "force-dynamic";

export default async function ImportPageRoute() {
  const user = await getUser();
  if (!user?.email) redirect("/login");

  const permData = await getCurrentUserPermissions();
  const perms = permData?.permissions.import;
  if (!perms?.can_view) redirect(permData ? getFirstViewablePath(permData.permissions) : "/login");

  return (
    <main className="flex-1 overflow-auto px-6 py-12 bg-[#f6f6fb]">
      <div className="space-y-2">
        <Banner
          backgroundImage="/banners/dashboard-bg.png"
          title="Import"
          description="Bulk import students, attendance, payments and transactions via CSV"
          mascotImage="/banners/mascot.png"
        />

        <ImportPage canImport={perms?.can_create} />
      </div>
    </main>
  );
}
