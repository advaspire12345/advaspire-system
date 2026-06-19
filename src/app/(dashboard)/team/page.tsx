import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { TeamTable } from "@/components/team/team-table";
import { getTeamMembersForTable } from "@/data/team";
import { getAllBranches } from "@/data/branches";
import { getUserByAuthId, getUserBranchIds } from "@/data/users";
import { getCoursesForUser } from "@/data/courses";
import { supabaseAdmin } from "@/db";
import {
  createTeamMemberAction,
  updateTeamMemberAction,
  deleteTeamMemberAction,
  resetTeamMemberPasswordAction,
  saveUserPermissionsAction,
  loadUserPermissionsAction,
  loadRolePermissionsAction,
  saveRolePermissionsAction,
  getCustomRolesAction,
  createCustomRoleAction,
  updateCustomRoleNameAction,
  deleteCustomRoleAction,
} from "./actions";
import { getCurrentUserPermissions, getFirstViewablePath } from "@/data/permissions";

export default async function TeamPage() {
  const user = await getUser();

  if (!user?.email) {
    redirect("/login");
  }

  const permData = await getCurrentUserPermissions();
  const perms = permData?.permissions.team;
  if (!perms?.can_view) redirect(permData ? getFirstViewablePath(permData.permissions, permData.role) : "/login");

  const [teamMembersAll, branchesData, dbUser, customRoles, coursesData] = await Promise.all([
    getTeamMembersForTable(user.email),
    getAllBranches(),
    getUserByAuthId(user.id),
    getCustomRolesAction(),
    getCoursesForUser(user.email),
  ]);

  // Never let any user see their own row in /team — own info lives in
  // /profile. This also blocks accidental self-demote or self-delete, which
  // would otherwise wipe their public.users row and cause the dashboard ↔
  // /login redirect loop (auth session still valid, no public row to match).
  const teamMembers = dbUser?.id
    ? teamMembersAll.filter((m) => m.id !== dbUser.id)
    : teamMembersAll;

  // Companies the current user can assign a group_admin to. Super admin sees all
  // companies, group_admin only their own (rare — typically you don't assign
  // another group admin from a group admin context, but the field is here for
  // super admin's flow).
  const allCompaniesData = await supabaseAdmin
    .from("branches")
    .select("id, name, city")
    .eq("type", "company")
    .is("deleted_at", null)
    .order("name");
  let companies = (allCompaniesData.data ?? []).map((c) => ({ id: c.id, name: c.name }));
  if (permData!.role === "group_admin" && dbUser?.branch_id) {
    // Restrict to the group admin's own company
    const ownCompanyId = await supabaseAdmin
      .from("branches")
      .select("id, type, parent_id")
      .eq("id", dbUser.branch_id)
      .single();
    const cid = ownCompanyId.data?.type === "company" ? ownCompanyId.data.id : ownCompanyId.data?.parent_id;
    if (cid) companies = companies.filter((c) => c.id === cid);
  }

  const programs = coursesData.map((c) => ({ id: c.id, name: c.name }));

  // Filter branches for admin: only show own company's HQ and branches
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
    type: b.type,
  }));

  // Edit Permissions button visible to:
  //   - super_admin (manages Group Admin globally)
  //   - group_admin (manages Company Admin / Assistant / Instructor company-wide)
  //   - company_admin (manages Assistant / Instructor at their own branch)
  const canEditRolePermissions =
    permData!.role === "super_admin" ||
    permData!.role === "group_admin" ||
    permData!.role === "company_admin";

  return (
    <main className="flex-1 overflow-auto px-6 py-12 bg-[#f6f6fb]">
      <div className="space-y-2">
        <Banner
          backgroundImage="/banners/dashboard-bg.png"
          title="Team"
          description="Manage team members, roles, and employment information"
          mascotImage="/banners/mascot.png"
        />

        <TeamTable
          initialData={teamMembers}
          branches={branches}
          companies={companies}
          programs={programs}
          hideBranch={permData!.role === "company_admin" || permData!.role === "instructor"}
          currentUserRole={permData?.role ?? null}
          currentUserBranchId={dbUser?.branch_id ?? null}
          onAdd={perms?.can_create ? createTeamMemberAction : undefined}
          onEdit={perms?.can_edit ? updateTeamMemberAction : undefined}
          onDelete={perms?.can_delete ? deleteTeamMemberAction : undefined}
          onResetPassword={perms?.can_edit ? resetTeamMemberPasswordAction : undefined}
          onSavePermissions={perms?.can_edit ? saveUserPermissionsAction : undefined}
          onLoadPermissions={perms?.can_edit ? loadUserPermissionsAction : undefined}
          canEditRolePermissions={canEditRolePermissions}
          customRoles={customRoles}
          onLoadRolePermissions={canEditRolePermissions ? loadRolePermissionsAction : undefined}
          onSaveRolePermissions={canEditRolePermissions ? saveRolePermissionsAction : undefined}
          onCreateCustomRole={canEditRolePermissions ? createCustomRoleAction : undefined}
          onUpdateCustomRoleName={canEditRolePermissions ? updateCustomRoleNameAction : undefined}
          onDeleteCustomRole={canEditRolePermissions ? deleteCustomRoleAction : undefined}
        />
      </div>
    </main>
  );
}
