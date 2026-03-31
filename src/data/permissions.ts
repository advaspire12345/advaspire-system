import { cache } from "react";
import { supabaseAdmin } from "@/db";
import { getUser } from "@/lib/supabase/server";
import type {
  PermissionResource,
  ResourcePermission,
  PermissionsMap,
  UserRole,
  ALL_RESOURCES,
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

// ============================================
// ROLE-BASED DEFAULTS
// ============================================

const BRANCH_ADMIN_DEFAULTS: PermissionsMap = {
  dashboard: VIEW_ONLY,
  companies: VIEW_ONLY,
  branches: VIEW_ONLY,
  trials: FULL_ACCESS,
  students: FULL_ACCESS,
  examinations: FULL_ACCESS,
  programs: VIEW_ONLY,
  team: VIEW_CREATE_EDIT,
  attendance: VIEW_CREATE_EDIT,
  attendance_log: VIEW_EDIT,
  payment_record: VIEW_EDIT,
  pending_payments: VIEW_CREATE_EDIT,
  leaderboard: VIEW_ONLY,
  transactions: VIEW_CREATE,
};

const INSTRUCTOR_DEFAULTS: PermissionsMap = {
  dashboard: VIEW_ONLY,
  companies: NO_ACCESS,
  branches: NO_ACCESS,
  trials: VIEW_CREATE_EDIT,
  students: VIEW_ONLY,
  examinations: VIEW_CREATE_EDIT,
  programs: VIEW_ONLY,
  team: NO_ACCESS,
  attendance: VIEW_CREATE_EDIT,
  attendance_log: VIEW_ONLY,
  payment_record: NO_ACCESS,
  pending_payments: NO_ACCESS,
  leaderboard: VIEW_ONLY,
  transactions: VIEW_CREATE,
};

function getDefaultPermissions(role: UserRole): PermissionsMap {
  if (role === "super_admin" || role === "admin") {
    const full: Partial<PermissionsMap> = {};
    const resources: PermissionResource[] = [
      "dashboard", "companies", "branches", "trials", "students", "examinations",
      "programs", "team", "attendance", "attendance_log", "payment_record",
      "pending_payments", "leaderboard", "transactions",
    ];
    for (const r of resources) {
      full[r] = { ...FULL_ACCESS };
    }
    // Admin can view companies but not manage them (only super_admin)
    if (role === "admin") {
      full.companies = { ...VIEW_ONLY };
    }
    return full as PermissionsMap;
  }
  if (role === "branch_admin") return { ...BRANCH_ADMIN_DEFAULTS };
  if (role === "instructor") return { ...INSTRUCTOR_DEFAULTS };
  // Default: no access for unknown roles
  const none: Partial<PermissionsMap> = {};
  const resources: PermissionResource[] = [
    "dashboard", "companies", "branches", "trials", "students", "examinations",
    "programs", "team", "attendance", "attendance_log", "payment_record",
    "pending_payments", "leaderboard", "transactions",
  ];
  for (const r of resources) {
    none[r] = { ...NO_ACCESS };
  }
  return none as PermissionsMap;
}

// ============================================
// PERMISSION QUERIES
// ============================================

/**
 * Get permissions for a specific user by merging DB overrides onto role defaults.
 * Admin/super_admin always get full access (no DB lookup needed).
 */
export async function getPermissionsForUser(
  userId: string,
  role: UserRole
): Promise<PermissionsMap> {
  const defaults = getDefaultPermissions(role);

  // Admin/super_admin always have full access — no overrides possible
  if (role === "super_admin" || role === "admin") {
    return defaults;
  }

  // Query DB for overrides
  const { data: rows, error } = await supabaseAdmin
    .from("user_permissions")
    .select("resource, can_view, can_create, can_edit, can_delete")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching user permissions:", error);
    return defaults;
  }

  // Overlay DB rows onto defaults
  if (rows) {
    for (const row of rows) {
      const resource = row.resource as PermissionResource;
      if (defaults[resource]) {
        defaults[resource] = {
          can_view: row.can_view,
          can_create: row.can_create,
          can_edit: row.can_edit,
          can_delete: row.can_delete,
        };
      }
    }
  }

  return defaults;
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
    console.error("Error fetching user for permissions:", error);
    return null;
  }

  const permissions = await getPermissionsForUser(dbUser.id, dbUser.role as UserRole);

  return {
    permissions,
    role: dbUser.role as UserRole,
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
// PERMISSION CRUD (for admin managing user permissions)
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
 * Replaces all permission rows for the given user.
 */
export async function bulkUpsertUserPermissions(
  userId: string,
  permissions: { resource: PermissionResource; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }[]
): Promise<boolean> {
  // Delete existing permissions for this user
  const { error: deleteError } = await supabaseAdmin
    .from("user_permissions")
    .delete()
    .eq("user_id", userId);

  if (deleteError) {
    console.error("Error deleting old permissions:", deleteError);
    return false;
  }

  // Insert new permission rows (only non-default ones to keep table clean)
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
 * Replaces all existing assignments.
 */
export async function setAdminBranches(
  userId: string,
  branchIds: string[]
): Promise<boolean> {
  // Delete existing
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
  { resource: "examinations", href: "/examination" },
  { resource: "programs", href: "/program" },
  { resource: "team", href: "/team" },
  { resource: "attendance", href: "/attendance" },
  { resource: "attendance_log", href: "/attendance-log" },
  { resource: "payment_record", href: "/payment-record" },
  { resource: "pending_payments", href: "/pending-payments" },
  { resource: "leaderboard", href: "/leaderboard" },
  { resource: "transactions", href: "/transactions" },
];

/**
 * Returns the first page the user has can_view permission for,
 * following sidebar nav order. Falls back to /login if none.
 */
export function getFirstViewablePath(permissions: PermissionsMap): string {
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
  examinations: "Examination",
  programs: "Program",
  team: "Team",
  attendance: "Mark Attendance",
  attendance_log: "Attendance History",
  payment_record: "Payment Record",
  pending_payments: "Pending Payments",
  leaderboard: "Leaderboard",
  transactions: "Transactions",
};
