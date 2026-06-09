"use server";

import { revalidatePath } from "next/cache";
import {
  createTeamMember,
  updateTeamMember,
  softDeleteTeamMember,
} from "@/data/team";
import { supabaseAdmin } from "@/db";
import type { UserInsert, UserUpdate, UserRole, TeamMemberStatus, PermissionResource, ResourcePermission } from "@/db/schema";
import {
  bulkUpsertUserPermissions,
  getPermissionsForUser,
  getUserPermissionRows,
  authorizeAction,
  getCurrentUserPermissions,
  resolveCompanyId,
  getRolePermissions,
  saveRolePermissions,
  getCustomRoles,
  createCustomRole,
  updateCustomRoleName,
  deleteCustomRole,
} from "@/data/permissions";
import type { CustomRole, PermissionsMap } from "@/db/schema";

export interface TeamMemberFormPayload {
  name: string;
  email: string;
  password?: string;
  phone: string | null;
  address: string | null;
  branchId: string | null;
  photoUrl: string | null;
  cvUrl: string | null;
  role: UserRole;
  employedDate: string | null;
  status: TeamMemberStatus;
  // Programs this user is in charge of (company/assistant/instructor only).
  // Persisted via the course_instructors junction table.
  inChargeProgramIds?: string[];
}

async function syncInChargePrograms(userId: string, programIds: string[] | undefined): Promise<void> {
  // Replace strategy: clear existing assignments, then insert the new set.
  await supabaseAdmin.from("course_instructors").delete().eq("user_id", userId);
  if (programIds && programIds.length > 0) {
    await supabaseAdmin.from("course_instructors").insert(
      programIds.map((course_id) => ({ user_id: userId, course_id }))
    );
  }
}

export async function createTeamMemberAction(
  payload: TeamMemberFormPayload
): Promise<{ success: boolean; error?: string; userId?: string }> {
  try {
    await authorizeAction('team', 'can_create');

    // Validate password is provided for new team members
    if (!payload.password || payload.password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters" };
    }

    // Create Supabase Auth user with email and password
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true, // Auto-confirm email so they can login immediately
      user_metadata: {
        full_name: payload.name,
        role: payload.role,
      },
    });

    if (authError) {
      console.error("Error creating auth user:", authError);
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: "Failed to create authentication account" };
    }

    // Create team member record with auth_id linked
    const userData: UserInsert = {
      name: payload.name,
      email: payload.email,
      auth_id: authData.user.id,
      phone: payload.phone || null,
      address: payload.address || null,
      branch_id: payload.branchId || null,
      photo: payload.photoUrl || null,
      cv_url: payload.cvUrl || null,
      role: payload.role,
      employed_date: payload.employedDate || null,
      status: payload.status,
    };

    const user = await createTeamMember(userData);

    if (!user) {
      // If team member creation fails, we should clean up the auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return { success: false, error: "Failed to create team member" };
    }

    // Sync in-charge programs (only relevant for company/assistant/instructor)
    if (
      payload.role === "company_admin" ||
      payload.role === "assistant_admin" ||
      payload.role === "instructor"
    ) {
      await syncInChargePrograms(user.id, payload.inChargeProgramIds);
    }

    revalidatePath("/team");
    revalidatePath("/program");
    return { success: true, userId: user.id };
  } catch (error) {
    console.error("Error in createTeamMemberAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export async function updateTeamMemberAction(
  userId: string,
  payload: TeamMemberFormPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    await authorizeAction('team', 'can_edit');

    const updateData: UserUpdate = {
      name: payload.name,
      email: payload.email,
      phone: payload.phone || null,
      address: payload.address || null,
      branch_id: payload.branchId || null,
      photo: payload.photoUrl || null,
      cv_url: payload.cvUrl || null,
      role: payload.role,
      employed_date: payload.employedDate || null,
      status: payload.status,
    };

    const result = await updateTeamMember(userId, updateData);

    if (!result) {
      return { success: false, error: "Failed to update team member" };
    }

    if (
      payload.role === "company_admin" ||
      payload.role === "assistant_admin" ||
      payload.role === "instructor"
    ) {
      await syncInChargePrograms(userId, payload.inChargeProgramIds);
    } else {
      // Group admin / super admin don't have in-charge programs; clear if any.
      await syncInChargePrograms(userId, []);
    }

    revalidatePath("/team");
    revalidatePath("/program");
    return { success: true };
  } catch (error) {
    console.error("Error in updateTeamMemberAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export async function deleteTeamMemberAction(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await authorizeAction('team', 'can_delete');

    // Refuse self-delete. Deleting your own row kills your public.users + auth
    // simultaneously and traps the next page render in a dashboard ↔ /login
    // redirect loop. Self-management goes through /profile.
    const actor = await getCurrentUserPermissions();
    if (actor?.userId === userId) {
      return { success: false, error: "You can't delete your own account from here. Use /profile to manage your account." };
    }

    const success = await softDeleteTeamMember(userId);

    if (!success) {
      return { success: false, error: "Failed to delete team member" };
    }

    revalidatePath("/team");
    return { success: true };
  } catch (error) {
    console.error("Error in deleteTeamMemberAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export async function saveUserPermissionsAction(
  userId: string,
  permissions: { resource: PermissionResource; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await authorizeAction("team", "can_edit");

    const success = await bulkUpsertUserPermissions(userId, permissions);
    if (!success) {
      return { success: false, error: "Failed to save permissions" };
    }

    revalidatePath("/team");
    return { success: true };
  } catch (error) {
    console.error("Error in saveUserPermissionsAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export async function loadUserPermissionsAction(
  userId: string
): Promise<{ permissions: Record<PermissionResource, ResourcePermission>; role: string } | null> {
  try {
    // Get the user's role
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();

    if (error || !user) return null;

    const permissions = await getPermissionsForUser(userId, user.role as UserRole);
    return { permissions, role: user.role };
  } catch (error) {
    console.error("Error loading user permissions:", error);
    return null;
  }
}

// ============================================
// ROLE PERMISSION ACTIONS
// ============================================

async function getCurrentScope(): Promise<{
  companyId: string | null;
  branchId: string | null;
  role: string;
} | null> {
  const permData = await getCurrentUserPermissions();
  if (!permData) return null;

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("branch_id")
    .eq("id", permData.userId)
    .single();

  const branchId = user?.branch_id ?? null;
  const companyId = branchId ? await resolveCompanyId(branchId) : null;
  return { companyId, branchId, role: permData.role };
}

/**
 * Resolve the (company, branch) scope to read or write a role's permissions
 * for, given who is editing and which role tab they picked.
 *
 *   super_admin   → editing group_admin: global (NULL, NULL)
 *   group_admin   → editing any role under their company: (company, NULL)
 *   company_admin → editing assistant_admin / instructor / custom: (company, own branch)
 */
function resolveSaveScope(
  actorRole: string,
  actorCompanyId: string | null,
  actorBranchId: string | null,
  targetRole: string,
): { companyId: string | null; branchId: string | null } | { error: string } {
  if (actorRole === "super_admin") {
    if (targetRole !== "group_admin") {
      return { error: "Super Admin manages Group Admin permissions only here." };
    }
    return { companyId: null, branchId: null };
  }
  if (actorRole === "group_admin") {
    if (!actorCompanyId) return { error: "No company found" };
    if (targetRole === "group_admin") {
      return { error: "Group Admin permissions are managed by Super Admin." };
    }
    return { companyId: actorCompanyId, branchId: null };
  }
  if (actorRole === "company_admin") {
    if (!actorCompanyId || !actorBranchId) return { error: "Missing branch context" };
    if (targetRole !== "assistant_admin" && targetRole !== "instructor" && !targetRole.startsWith("custom:")) {
      return { error: "You can only edit permissions for Assistant Admin and Instructor roles" };
    }
    return { companyId: actorCompanyId, branchId: actorBranchId };
  }
  return { error: "You do not have permission to edit role permissions." };
}

export async function loadRolePermissionsAction(
  role: string
): Promise<PermissionsMap | null> {
  try {
    const scope = await getCurrentScope();
    if (!scope) return null;
    const resolved = resolveSaveScope(scope.role, scope.companyId, scope.branchId, role);
    if ("error" in resolved) {
      // Fall back to whatever lookup is reasonable for read context — defaults
      // to global so the modal can still render the values.
      return getRolePermissions(role, scope.companyId, null);
    }
    return getRolePermissions(role, resolved.companyId, resolved.branchId);
  } catch (error) {
    console.error("Error loading role permissions:", error);
    return null;
  }
}

export async function saveRolePermissionsAction(
  role: string,
  permissions: { resource: PermissionResource; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await authorizeAction("team", "can_edit");

    const scope = await getCurrentScope();
    if (!scope) return { success: false, error: "Unauthorized" };

    const resolved = resolveSaveScope(scope.role, scope.companyId, scope.branchId, role);
    if ("error" in resolved) return { success: false, error: resolved.error };

    const success = await saveRolePermissions(role, resolved.companyId, resolved.branchId, permissions);
    if (!success) return { success: false, error: "Failed to save permissions" };

    revalidatePath("/team");
    return { success: true };
  } catch (error) {
    console.error("Error saving role permissions:", error);
    return { success: false, error: error instanceof Error ? error.message : "An error occurred" };
  }
}

export async function getCustomRolesAction(): Promise<CustomRole[]> {
  try {
    const scope = await getCurrentScope();
    if (!scope?.companyId) return [];
    return getCustomRoles(scope.companyId);
  } catch (error) {
    console.error("Error fetching custom roles:", error);
    return [];
  }
}

export async function createCustomRoleAction(
  name: string
): Promise<{ success: boolean; error?: string; role?: CustomRole }> {
  try {
    await authorizeAction("team", "can_edit");

    const permData = await getCurrentUserPermissions();
    if (!permData || permData.role !== "group_admin") {
      return { success: false, error: "Only Group Admin can create custom roles" };
    }

    const scope = await getCurrentScope();
    if (!scope?.companyId) return { success: false, error: "No company found" };

    const role = await createCustomRole(scope.companyId, name, permData.userId);
    if (!role) return { success: false, error: "Failed to create custom role (max 2 per company)" };

    revalidatePath("/team");
    return { success: true, role };
  } catch (error) {
    console.error("Error creating custom role:", error);
    return { success: false, error: error instanceof Error ? error.message : "An error occurred" };
  }
}

export async function updateCustomRoleNameAction(
  roleId: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await authorizeAction("team", "can_edit");

    const permData = await getCurrentUserPermissions();
    if (!permData || permData.role !== "group_admin") {
      return { success: false, error: "Only Group Admin can rename custom roles" };
    }

    const success = await updateCustomRoleName(roleId, name);
    if (!success) return { success: false, error: "Failed to rename role" };

    revalidatePath("/team");
    return { success: true };
  } catch (error) {
    console.error("Error renaming custom role:", error);
    return { success: false, error: error instanceof Error ? error.message : "An error occurred" };
  }
}

export async function deleteCustomRoleAction(
  roleId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await authorizeAction("team", "can_edit");

    const permData = await getCurrentUserPermissions();
    if (!permData || permData.role !== "group_admin") {
      return { success: false, error: "Only Group Admin can delete custom roles" };
    }

    const success = await deleteCustomRole(roleId);
    if (!success) return { success: false, error: "Failed to delete role" };

    revalidatePath("/team");
    return { success: true };
  } catch (error) {
    console.error("Error deleting custom role:", error);
    return { success: false, error: error instanceof Error ? error.message : "An error occurred" };
  }
}
