import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { getCurrentUserPermissions, getFirstViewablePath } from "@/data/permissions";
import { ActionLauncher } from "./action-launcher";

// Always fetch fresh data on navigation
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  const user = await getUser();

  if (!user?.email) {
    redirect("/login");
  }

  const permData = await getCurrentUserPermissions();
  const perms = permData?.permissions.dashboard;
  if (!perms?.can_view) redirect(permData ? getFirstViewablePath(permData.permissions, permData.role) : "/login");

  return (
    <main className="flex-1 overflow-auto px-6 py-12 bg-[#f6f6fb]">
      <div className="space-y-6">
        {/* Banner renders immediately */}
        <Banner
          backgroundImage="/banners/dashboard-bg.png"
          title="Welcome Back!"
          description="Track your progress and manage your activities"
          mascotImage="/banners/mascot.png"
        />

        {/* Action launcher: featured + other permitted actions */}
        <ActionLauncher
          permissions={permData?.permissions ?? null}
          userRole={permData?.role ?? null}
        />
      </div>
    </main>
  );
}
