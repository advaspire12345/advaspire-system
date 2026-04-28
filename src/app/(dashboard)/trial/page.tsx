import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { TrialTable } from "@/components/trial/trial-table";
import { getTrialsForTable } from "@/data/trial";
import { getAllBranches } from "@/data/branches";
import { getAllCourses } from "@/data/courses";
import { getCurrentUserPermissions, getFirstViewablePath } from "@/data/permissions";
import { getUserBranchIds } from "@/data/users";

export default async function TrialPage() {
  const user = await getUser();

  if (!user?.email) {
    redirect("/login");
  }

  const permData = await getCurrentUserPermissions();
  const perms = permData?.permissions.trials;
  if (!perms?.can_view) redirect(permData ? getFirstViewablePath(permData.permissions) : "/login");

  const [trials, branchesData, coursesData] = await Promise.all([
    getTrialsForTable(user.email),
    getAllBranches(),
    getAllCourses(),
  ]);

  // Filter branches based on role
  const useCityName = permData!.role !== "super_admin";
  let filteredBranches = branchesData;
  if (useCityName) {
    const branchIds = await getUserBranchIds(user.email);
    if (branchIds && branchIds.length > 0) {
      if (permData!.role === "group_admin") {
        const companyIds = new Set<string>();
        for (const b of branchesData) {
          if (branchIds.includes(b.id)) {
            if (b.type === "company") companyIds.add(b.id);
            else if (b.parent_id) companyIds.add(b.parent_id);
          }
        }
        filteredBranches = branchesData.filter(
          (b) => b.type !== "company" && b.parent_id && companyIds.has(b.parent_id)
        );
      } else {
        filteredBranches = branchesData.filter((b) => branchIds.includes(b.id));
      }
    }
  }

  const branches = filteredBranches.map((b) => ({
    id: b.id,
    name: useCityName ? (b.city || b.name) : b.name,
  }));

  const courses = coursesData.map((c) => ({
    id: c.id,
    name: c.name,
  }));

  return (
    <main className="flex-1 overflow-auto px-6 py-12 bg-[#f6f6fb]">
      <div className="space-y-2">
        <Banner
          backgroundImage="/banners/dashboard-bg.png"
          title="Trials"
          description="Manage trial class bookings for prospective students"
          mascotImage="/banners/mascot.png"
        />

        <TrialTable
          initialData={trials}
          branches={branches}
          hideBranch={permData!.role === "company_admin" || permData!.role === "instructor"}
          courses={courses}
          canCreate={perms?.can_create}
          canEdit={perms?.can_edit}
          canDelete={perms?.can_delete}
        />
      </div>
    </main>
  );
}
