import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { BranchTable } from "@/components/branches/branch-table";
import { getBranchData, getCompanyOptions } from "@/data/branches";
import { getCurrentUserPermissions, getFirstViewablePath } from "@/data/permissions";
import { getUserBranchIds, getUserByEmail } from "@/data/users";
import { supabaseAdmin } from "@/db";

export default async function BranchPage() {
  const user = await getUser();

  if (!user?.email) {
    redirect("/login");
  }

  const permData = await getCurrentUserPermissions();
  const perms = permData?.permissions.branches;
  if (!perms?.can_view) redirect(permData ? getFirstViewablePath(permData.permissions, permData.role) : "/login");

  // Admin users only see their assigned branches + parent companies
  const branchIds = await getUserBranchIds(user.email);

  const [branchData, allCompanyOptions, currentUser] = await Promise.all([
    getBranchData(branchIds ?? undefined),
    getCompanyOptions(),
    getUserByEmail(user.email),
  ]);

  // Resolve the current user's OWN company id — needed for group_admin so the
  // Add modal can auto-set parent + auto-generate code even when their company
  // has zero child branches yet (in that case `branchData` won't include the
  // company row).
  let currentUserCompanyId: string | null = null;
  if (currentUser?.branch_id) {
    const { data: row } = await supabaseAdmin
      .from("branches")
      .select("id, type, parent_id")
      .eq("id", currentUser.branch_id)
      .maybeSingle();
    if (row) {
      currentUserCompanyId = row.type === "company" ? row.id : row.parent_id;
    }
  }

  // If admin, filter company options to only their own company.  Make sure
  // the user's company is in the list even if their branchData filter missed
  // it (group_admin with no child branches yet).
  let companyOptions = allCompanyOptions;
  if (branchIds) {
    const adminCompanyIds = new Set(
      branchData
        .filter((b) => b.type === "company")
        .map((b) => b.id)
    );
    if (currentUserCompanyId) adminCompanyIds.add(currentUserCompanyId);
    companyOptions = allCompanyOptions.filter((c) => adminCompanyIds.has(c.id));
  }

  const companyPerms = permData?.permissions.companies;

  return (
    <main className="flex-1 overflow-auto px-6 py-12 bg-[#f6f6fb]">
      <div className="space-y-2">
        <Banner
          backgroundImage="/banners/dashboard-bg.png"
          title="Branches"
          description="View all companies and branches"
          mascotImage="/banners/mascot.png"
        />

        <BranchTable
          initialData={branchData}
          companyOptions={companyOptions}
          userRole={permData?.role ?? "instructor"}
          currentUserCompanyId={currentUserCompanyId}
          canCreateCompany={companyPerms?.can_create ?? false}
          canEditCompany={companyPerms?.can_edit ?? false}
          canDeleteCompany={companyPerms?.can_delete ?? false}
          canCreateBranch={perms?.can_create ?? false}
          canEditBranch={perms?.can_edit ?? false}
          canDeleteBranch={perms?.can_delete ?? false}
        />
      </div>
    </main>
  );
}
