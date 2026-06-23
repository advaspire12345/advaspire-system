import { cache } from "react";
import { supabaseAdmin } from "@/db";
import { getUser } from "@/lib/supabase/server";
import type {
  PermissionResource,
  ResourcePermission,
  PermissionsMap,
  UserRole,
  CustomRole,
} from "@/db/schema";

// ============================================
// CONSTANTS
// ============================================

const FULL_ACCESS: ResourcePermission = {
  can_view: true,
  can_create: true,
  can_edit: true,
  can_delete: true,
};

const NO_ACCESS: ResourcePermission = {
  can_view: false,
  can_create: false,
  can_edit: false,
  can_delete: false,
};

const VIEW_ONLY: ResourcePermission = {
  can_view: true,
  can_create: false,
  can_edit: false,
  can_delete: false,
};

const VIEW_CREATE: ResourcePermission = {
  can_view: true,
  can_create: true,
  can_edit: false,
  can_delete: false,
};

const VIEW_CREATE_EDIT: ResourcePermission = {
  can_view: true,
  can_create: true,
  can_edit: true,
  can_delete: false,
};

const VIEW_EDIT: ResourcePermission = {
  can_view: true,
  can_create: false,
  can_edit: true,
  can_delete: false,
};

const ALL_RESOURCE_KEYS: PermissionResource[] = [
  "dashboard", "companies", "branches", "trials", "students",
  "programs", "slots", "vouchers", "team", "attendance", "attendance_log",
  "payment_record", "pending_payments", "leaderboard", "transactions",
  "marketplace", "import", "events", "student_progress",
];

// ============================================
// HARDCODED FALLBACKS (used when DB has no rows)
// ============================================

// COMPANIES_NO_DELETE: VCED = 1110 — used by group_admin (cannot delete company rows but can manage them)
const COMPANIES_NO_DELETE: ResourcePermission = {
  can_view: true,
  can_create: true,
  can_edit: true,
  can_delete: false,
};

const GROUP_ADMIN_DEFAULTS: PermissionsMap = {
  dashboard: VIEW_ONLY,
  companies: COMPANIES_NO_DELETE,
  branches: FULL_ACCESS,
  trials: FULL_ACCESS,
  students: FULL_ACCESS,
  programs: FULL_ACCESS,
  slots: VIEW_ONLY,
  vouchers: FULL_ACCESS,
  team: FULL_ACCESS,
  attendance: NO_ACCESS,
  attendance_log: FULL_ACCESS,
  payment_record: VIEW_ONLY,
  pending_payments: FULL_ACCESS, // approve button gated separately by role
  leaderboard: VIEW_CREATE, // can_create gates Transfer Adcoin button
  transactions: NO_ACCESS,
  marketplace: VIEW_ONLY, // sees the topup-request table; no actions (super_admin only approves)
  import: VIEW_CREATE, // view = download templates, create = upload CSV
  events: FULL_ACCESS,
  student_progress: VIEW_CREATE_EDIT, // staff tick lesson/mission progress for the group's students
};

const COMPANY_ADMIN_DEFAULTS: PermissionsMap = {
  dashboard: VIEW_ONLY,
  companies: VIEW_ONLY,
  branches: VIEW_ONLY,
  trials: FULL_ACCESS,
  students: FULL_ACCESS,
  programs: VIEW_ONLY,
  slots: FULL_ACCESS,
  vouchers: FULL_ACCESS,
  team: FULL_ACCESS,
  attendance: FULL_ACCESS,
  attendance_log: FULL_ACCESS,
  payment_record: FULL_ACCESS,
  pending_payments: FULL_ACCESS, // approve button gated separately by role
  leaderboard: VIEW_CREATE,
  transactions: VIEW_CREATE,
  marketplace: VIEW_CREATE, // can browse + create top-up requests
  import: VIEW_CREATE, // view = download templates, create = upload CSV
  events: FULL_ACCESS,
  student_progress: VIEW_CREATE_EDIT, // staff tick lesson/mission progress for the company's students
};

const ASSISTANT_ADMIN_DEFAULTS: PermissionsMap = {
  dashboard: NO_ACCESS,
  companies: NO_ACCESS,
  branches: NO_ACCESS,
  trials: VIEW_CREATE_EDIT,
  students: VIEW_CREATE_EDIT,
  programs: VIEW_ONLY,
  slots: VIEW_CREATE_EDIT,
  vouchers: NO_ACCESS,
  team: NO_ACCESS,
  attendance: VIEW_CREATE_EDIT,
  attendance_log: VIEW_EDIT,
  payment_record: NO_ACCESS,
  pending_payments: VIEW_CREATE_EDIT, // no approve button per spec
  leaderboard: VIEW_CREATE,
  transactions: VIEW_CREATE,
  marketplace: NO_ACCESS,
  import: NO_ACCESS,
  events: { can_view: true, can_create: true, can_edit: true, can_delete: true },
  student_progress: VIEW_CREATE_EDIT, // staff tick lesson/mission progress for their branch
};

const INSTRUCTOR_DEFAULTS: PermissionsMap = {
  dashboard: NO_ACCESS,
  companies: NO_ACCESS,
  branches: NO_ACCESS,
  trials: VIEW_EDIT,
  students: VIEW_ONLY,
  programs: VIEW_ONLY,
  slots: VIEW_ONLY,
  vouchers: NO_ACCESS,
  team: NO_ACCESS,
  attendance: VIEW_CREATE_EDIT,
  attendance_log: VIEW_ONLY,
  payment_record: NO_ACCESS,
  pending_payments: NO_ACCESS,
  leaderboard: VIEW_CREATE,
  transactions: VIEW_CREATE,
  marketplace: NO_ACCESS,
  import: NO_ACCESS,
  events: { can_view: true, can_create: true, can_edit: true, can_delete: false },
  student_progress: VIEW_CREATE_EDIT, // the teacher ticks their branch's learning progress
};

/** Hardcoded fallback when DB has no role_permissions rows */
function getHardcodedDefaults(role: string): PermissionsMap {
  // Support both old and new role names for backward compatibility
  if (role === "group_admin" || role === "admin") return { ...GROUP_ADMIN_DEFAULTS };
  if (role === "company_admin" || role === "branch_admin") return { ...COMPANY_ADMIN_DEFAULTS };
  if (role === "assistant_admin") return { ...ASSISTANT_ADMIN_DEFAULTS };
  if (role === "instructor") return { ...INSTRUCTOR_DEFAULTS };
  // No access for unknown roles
  const none: Partial<PermissionsMap> = {};
  for (const r of ALL_RESOURCE_KEYS) none[r] = { ...NO_ACCESS };
  return none as PermissionsMap;
}

// ============================================
// DB-DRIVEN ROLE PERMISSION RESOLUTION
// ============================================

function buildPermissionsMapFromRows(
  rows: { resource: string; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }[]
): PermissionsMap | null {
  if (!rows || rows.length === 0) return null;
  const map: Partial<PermissionsMap> = {};
  for (const r of ALL_RESOURCE_KEYS) map[r] = { ...NO_ACCESS };
  for (const row of rows) {
    const resource = row.resource as PermissionResource;
    if (map[resource] !== undefined) {
      map[resource] = {
        can_view: row.can_view,
        can_create: row.can_create,
        can_edit: row.can_edit,
        can_delete: row.can_delete,
      };
    }
  }
  return map as PermissionsMap;
}

/**
 * Resolve the company ID for a user based on their branch assignment.
 * Walks up to find the parent company branch.
 */
async function resolveCompanyId(branchId: string | null): Promise<string | null> {
  if (!branchId) return null;
  const { data: branch } = await supabaseAdmin
    .from("branches")
    .select("id, type, parent_id")
    .eq("id", branchId)
    .single();
  if (!branch) return null;
  if (branch.type === "company") return branch.id;
  return branch.parent_id || null;
}

/**
 * Get permissions for a role, scoped to a company and optionally a branch.
 * Resolution order:
 *   1. (role, company_id, branch_id) — per-branch override
 *   2. (role, company_id, branch_id IS NULL) — company-wide
 *   3. (role, company_id IS NULL, branch_id IS NULL) — global default
 *   4. Hardcoded fallback
 */
async function getRolePermissionsFromDB(
  role: string,
  companyId: string | null,
  branchId: string | null = null,
): Promise<PermissionsMap> {
  // 1. Branch-specific override (only meaningful when both company and branch
  // are known — a per-branch row makes no sense without a company).
  if (companyId && branchId) {
    const { data: branchRows } = await supabaseAdmin
      .from("role_permissions")
      .select("resource, can_view, can_create, can_edit, can_delete")
      .eq("role", role)
      .eq("company_id", companyId)
      .eq("branch_id", branchId);
    const branchMap = buildPermissionsMapFromRows(branchRows ?? []);
    if (branchMap) return branchMap;
  }

  // 2. Company-wide (branch_id IS NULL)
  if (companyId) {
    const { data: companyRows } = await supabaseAdmin
      .from("role_permissions")
      .select("resource, can_view, can_create, can_edit, can_delete")
      .eq("role", role)
      .eq("company_id", companyId)
      .is("branch_id", null);
    const companyMap = buildPermissionsMapFromRows(companyRows ?? []);
    if (companyMap) return companyMap;
  }

  // 3. Global default (both NULL)
  const { data: globalRows } = await supabaseAdmin
    .from("role_permissions")
    .select("resource, can_view, can_create, can_edit, can_delete")
    .eq("role", role)
    .is("company_id", null)
    .is("branch_id", null);
  const globalMap = buildPermissionsMapFromRows(globalRows ?? []);
  if (globalMap) return globalMap;

  // 4. Hardcoded
  return getHardcodedDefaults(role);
}

// ============================================
// PERMISSION QUERIES
// ============================================

/**
 * Get permissions for a specific user.
 * super_admin always gets full access (god-tier).
 * Others resolve from role_permissions table → hardcoded defaults.
 */
export async function getPermissionsForUser(
  userId: string,
  role: UserRole | string
): Promise<PermissionsMap> {
  // Super admin always has full access — immutable
  if (role === "super_admin") {
    const full: Partial<PermissionsMap> = {};
    for (const r of ALL_RESOURCE_KEYS) full[r] = { ...FULL_ACCESS };
    return full as PermissionsMap;
  }

  // Normalize old role names to new ones (backward compat if migration not yet applied)
  const normalizedRole = role === "admin" ? "group_admin" : role === "branch_admin" ? "company_admin" : role;

  // Get user's branch to resolve company
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("branch_id, custom_role_id")
    .eq("id", userId)
    .single();

  const companyId = await resolveCompanyId(user?.branch_id ?? null);
  // Per-branch overrides are only used for assistant_admin/instructor — those
  // are the only roles a company_admin can manage. For everyone else (incl.
  // company_admin and group_admin) we look up at the company tier.
  const branchScope =
    (normalizedRole === "assistant_admin" || normalizedRole === "instructor")
      ? (user?.branch_id ?? null)
      : null;

  // If user has a custom role assigned, use that for permission lookup
  if (user?.custom_role_id) {
    return getRolePermissionsFromDB(`custom:${user.custom_role_id}`, companyId, branchScope);
  }

  return getRolePermissionsFromDB(normalizedRole, companyId, branchScope);
}

/**
 * Get the current authenticated user's permissions.
 * Cached per-request via React.cache().
 */
export const getCurrentUserPermissions = cache(async (): Promise<{
  permissions: PermissionsMap;
  role: UserRole;
  userId: string;
} | null> => {
  const authUser = await getUser();
  if (!authUser?.email) return null;

  // Look up the user record to get role
  const { data: dbUser, error } = await supabaseAdmin
    .from("users")
    .select("id, role")
    .eq("auth_id", authUser.id)
    .is("deleted_at", null)
    .single();

  if (error || !dbUser) {
    // Auth session is still valid but the matching public.users row is gone
    // (deleted or soft-deleted). Without this revocation the page redirects
    // to /login, middleware sees the still-valid auth cookie and bounces back
    // to /dashboard → ERR_TOO_MANY_REDIRECTS. Revoking the session globally
    // means the next request's `getUser()` will return null and /login will
    // render normally.
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const sb = await createClient();
      await sb.auth.signOut({ scope: "global" });
    } catch (e) {
      console.error("Failed to revoke stale auth session:", e);
    }
    return null;
  }

  // Normalize old role names for backward compatibility
  const rawRole = dbUser.role as string;
  const normalizedRole: UserRole = rawRole === "admin" ? "group_admin"
    : rawRole === "branch_admin" ? "company_admin"
    : rawRole as UserRole;

  const permissions = await getPermissionsForUser(dbUser.id, normalizedRole);

  return {
    permissions,
    role: normalizedRole,
    userId: dbUser.id,
  };
});

// ============================================
// SERVER ACTION GUARD
// ============================================

type PermissionAction = "can_view" | "can_create" | "can_edit" | "can_delete";

/**
 * Guard for server actions. Throws "Forbidden" if the current user
 * does not have the required permission on the given resource.
 */
export async function authorizeAction(
  resource: PermissionResource,
  action: PermissionAction
): Promise<void> {
  const permData = await getCurrentUserPermissions();

  if (!permData) {
    throw new Error("Unauthorized");
  }

  const perm = permData.permissions[resource];
  if (!perm || !perm[action]) {
    throw new Error("Forbidden");
  }
}

// ============================================
// ROLE PERMISSION CRUD (for permission modal)
// ============================================

/**
 * Get permissions for a role within a company scope, optionally scoped to a
 * specific branch (used when company_admin manages per-branch overrides for
 * assistant_admin / instructor).
 */
export async function getRolePermissions(
  role: string,
  companyId: string | null,
  branchId: string | null = null,
): Promise<PermissionsMap> {
  return getRolePermissionsFromDB(role, companyId, branchId);
}

/**
 * Save permissions for a role.
 *
 * - `companyId=null, branchId=null` → global default (super_admin editing
 *   group_admin permissions).
 * - `companyId=<id>, branchId=null` → company-wide (group_admin editing
 *   company_admin / assistant_admin / instructor). Branch-level overrides
 *   under this company for the same role are wiped so everyone re-converges
 *   on the new company-wide setting.
 * - `companyId=<id>, branchId=<id>` → per-branch (company_admin editing
 *   assistant_admin / instructor at their own branch).
 */
export async function saveRolePermissions(
  role: string,
  companyId: string | null,
  branchId: string | null,
  permissions: { resource: PermissionResource; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }[]
): Promise<boolean> {
  // Delete existing rows that exactly match this (role, company, branch) scope.
  let deleteQ = supabaseAdmin.from("role_permissions").delete().eq("role", role);
  deleteQ = companyId ? deleteQ.eq("company_id", companyId) : deleteQ.is("company_id", null);
  deleteQ = branchId ? deleteQ.eq("branch_id", branchId) : deleteQ.is("branch_id", null);
  const { error: deleteError } = await deleteQ;
  if (deleteError) {
    console.error("Error deleting role permissions:", deleteError);
    return false;
  }

  // Company-wide save also wipes any branch-level overrides under this company
  // for the same role, so the new setting really applies to everyone.
  if (companyId && !branchId) {
    const { error: branchWipeError } = await supabaseAdmin
      .from("role_permissions")
      .delete()
      .eq("role", role)
      .eq("company_id", companyId)
      .not("branch_id", "is", null);
    if (branchWipeError) {
      console.error("Error wiping branch overrides:", branchWipeError);
      return false;
    }
  }

  if (permissions.length === 0) return true;

  const rows = permissions.map((p) => ({
    role,
    company_id: companyId,
    branch_id: branchId,
    resource: p.resource,
    can_view: p.can_view,
    can_create: p.can_create,
    can_edit: p.can_edit,
    can_delete: p.can_delete,
  }));

  const { error: insertError } = await supabaseAdmin
    .from("role_permissions")
    .insert(rows);

  if (insertError) {
    console.error("Error inserting role permissions:", insertError);
    return false;
  }

  return true;
}

// ============================================
// CUSTOM ROLE CRUD
// ============================================

/**
 * Get custom roles for a company.
 */
export async function getCustomRoles(companyId: string): Promise<CustomRole[]> {
  const { data, error } = await supabaseAdmin
    .from("custom_roles")
    .select("*")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("sort_order");

  if (error) {
    console.error("Error fetching custom roles:", error);
    return [];
  }

  return (data ?? []) as CustomRole[];
}

/**
 * Create a custom role for a company (max 2 per company).
 */
export async function createCustomRole(
  companyId: string,
  name: string,
  createdBy: string
): Promise<CustomRole | null> {
  // Check max 2 limit
  const existing = await getCustomRoles(companyId);
  if (existing.length >= 2) {
    console.error("Max 2 custom roles per company");
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("custom_roles")
    .insert({
      name,
      company_id: companyId,
      created_by: createdBy,
      sort_order: existing.length,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating custom role:", error);
    return null;
  }

  return data as CustomRole;
}

/**
 * Update custom role name.
 */
export async function updateCustomRoleName(
  roleId: string,
  name: string
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("custom_roles")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", roleId);

  if (error) {
    console.error("Error updating custom role:", error);
    return false;
  }

  return true;
}

/**
 * Soft-delete a custom role.
 */
export async function deleteCustomRole(roleId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("custom_roles")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", roleId);

  if (error) {
    console.error("Error deleting custom role:", error);
    return false;
  }

  // Also remove custom_role_id from any users who had this role
  await supabaseAdmin
    .from("users")
    .update({ custom_role_id: null })
    .eq("custom_role_id", roleId);

  return true;
}

// ============================================
// USER PERMISSION CRUD (legacy — kept for backward compat)
// ============================================

/**
 * Get raw permission rows for a user (for pre-filling the permission modal).
 */
export async function getUserPermissionRows(
  userId: string
): Promise<{ resource: PermissionResource; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }[]> {
  const { data, error } = await supabaseAdmin
    .from("user_permissions")
    .select("resource, can_view, can_create, can_edit, can_delete")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching permission rows:", error);
    return [];
  }

  return (data ?? []) as { resource: PermissionResource; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }[];
}

/**
 * Bulk upsert permissions for a user.
 */
export async function bulkUpsertUserPermissions(
  userId: string,
  permissions: { resource: PermissionResource; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }[]
): Promise<boolean> {
  const { error: deleteError } = await supabaseAdmin
    .from("user_permissions")
    .delete()
    .eq("user_id", userId);

  if (deleteError) {
    console.error("Error deleting old permissions:", deleteError);
    return false;
  }

  if (permissions.length === 0) return true;

  const rows = permissions.map((p) => ({
    user_id: userId,
    resource: p.resource,
    can_view: p.can_view,
    can_create: p.can_create,
    can_edit: p.can_edit,
    can_delete: p.can_delete,
  }));

  const { error: insertError } = await supabaseAdmin
    .from("user_permissions")
    .insert(rows);

  if (insertError) {
    console.error("Error inserting permissions:", insertError);
    return false;
  }

  return true;
}

// ============================================
// ADMIN BRANCHES
// ============================================

/**
 * Get branch IDs assigned to an admin user.
 */
export async function getAdminBranchIds(userId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("admin_branches")
    .select("branch_id")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching admin branches:", error);
    return [];
  }

  return (data ?? []).map((row) => row.branch_id);
}

/**
 * Set branch assignments for an admin user.
 */
export async function setAdminBranches(
  userId: string,
  branchIds: string[]
): Promise<boolean> {
  const { error: deleteError } = await supabaseAdmin
    .from("admin_branches")
    .delete()
    .eq("user_id", userId);

  if (deleteError) {
    console.error("Error deleting admin branches:", deleteError);
    return false;
  }

  if (branchIds.length === 0) return true;

  const rows = branchIds.map((branchId) => ({
    user_id: userId,
    branch_id: branchId,
  }));

  const { error: insertError } = await supabaseAdmin
    .from("admin_branches")
    .insert(rows);

  if (insertError) {
    console.error("Error inserting admin branches:", insertError);
    return false;
  }

  return true;
}

// ============================================
// NAV ORDER & SMART REDIRECT
// ============================================

const NAV_ORDER: { resource: PermissionResource; href: string }[] = [
  { resource: "dashboard", href: "/dashboard" },
  { resource: "branches", href: "/branches" },
  { resource: "trials", href: "/trial" },
  { resource: "students", href: "/student" },
  { resource: "student_progress", href: "/student-progress" },
  { resource: "programs", href: "/courses" },
  { resource: "slots", href: "/slot" },
  { resource: "vouchers", href: "/voucher" },
  { resource: "team", href: "/team" },
  { resource: "attendance", href: "/attendance" },
  { resource: "attendance_log", href: "/attendance-log" },
  { resource: "payment_record", href: "/payment-record" },
  { resource: "pending_payments", href: "/pending-payments" },
  { resource: "leaderboard", href: "/leaderboard" },
  { resource: "transactions", href: "/transactions" },
  { resource: "marketplace", href: "/marketplace" },
  { resource: "import", href: "/import" },
];

/**
 * Returns the first page the user has can_view permission for.
 * Instructors are redirected to /attendance (their primary workflow).
 */
export function getFirstViewablePath(permissions: PermissionsMap, role?: string): string {
  if (role === "instructor" && permissions.attendance?.can_view) {
    return "/attendance";
  }
  for (const { resource, href } of NAV_ORDER) {
    if (permissions[resource]?.can_view) return href;
  }
  return "/login";
}

// ============================================
// RESOURCE LABELS (for UI display)
// ============================================

export const RESOURCE_LABELS: Record<PermissionResource, string> = {
  dashboard: "Dashboard",
  companies: "Companies",
  branches: "Branches",
  trials: "Trial",
  students: "Student",
  programs: "Courses",
  slots: "Slot",
  vouchers: "Voucher",
  team: "Team",
  attendance: "Mark Attendance",
  attendance_log: "Attendance History",
  payment_record: "Payment Record",
  pending_payments: "Pending Payments",
  leaderboard: "Leaderboard",
  transactions: "Transactions",
  marketplace: "Marketplace",
  import: "Import",
  events: "Events",
  student_progress: "Student Progress",
};

// ============================================
// HELPER: Resolve company ID for current user
// ============================================

export { resolveCompanyId };
