import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { TeamTable } from "@/components/team/team-table";
import { getTeamMembersForTable } from "@/data/team";
import { getAllBranches } from "@/data/branches";
import { getUserByAuthId, getUserBranchIds } from "@/data/users";
import {
  createTeamMemberAction,
  updateTeamMemberAction,
  deleteTeamMemberAction,
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
  if (!perms?.can_view) redirect(permData ? getFirstViewablePath(permData.permissions) : "/login");

  const [teamMembers, branchesData, dbUser, customRoles] = await Promise.all([
    getTeamMembersForTable(user.email),
    getAllBranches(),
    getUserByAuthId(user.id),
    getCustomRolesAction(),
  ]);

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
  }));

  // Show Edit Permissions button for group_admin and company_admin only
  const canEditRolePermissions =
    permData!.role === "group_admin" || permData!.role === "company_admin";

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
          hideBranch={permData!.role === "company_admin" || permData!.role === "instructor"}
          currentUserRole={permData?.role ?? null}
          currentUserBranchId={dbUser?.branch_id ?? null}
          onAdd={perms?.can_create ? createTeamMemberAction : undefined}
          onEdit={perms?.can_edit ? updateTeamMemberAction : undefined}
          onDelete={perms?.can_delete ? deleteTeamMemberAction : undefined}
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
