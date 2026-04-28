import { supabaseAdmin } from "@/db";
import type { User, UserRole, UserInsert, UserUpdate } from "@/db/schema";

const SUPERADMIN_EMAILS = ["admin@advaspire.com", "advaspire@gmail.com"];

// ============================================
// READ OPERATIONS
// ============================================

export async function getUserById(userId: string): Promise<User | null> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', userId)
    .is('deleted_at', null)
    .single();

  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }

  return data;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('email', email)
    .is('deleted_at', null)
    .single();

  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }

  return data;
}

/**
 * Get user by Supabase Auth ID (preferred method)
 */
export async function getUserByAuthId(authId: string): Promise<User | null> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('auth_id', authId)
    .is('deleted_at', null)
    .single();

  if (error) {
    console.error('Error fetching user by auth_id:', error);
    return null;
  }

  return data;
}

export async function getUsersByBranchId(branchId: string): Promise<User[]> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('branch_id', branchId)
    .is('deleted_at', null)
    .order('name');

  if (error) {
    console.error('Error fetching users by branch:', error);
    return [];
  }

  return data ?? [];
}

export async function getUsersByRole(role: UserRole): Promise<User[]> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('role', role)
    .is('deleted_at', null)
    .order('name');

  if (error) {
    console.error('Error fetching users by role:', error);
    return [];
  }

  return data ?? [];
}

export async function getAllUsers(): Promise<User[]> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all users:', error);
    return [];
  }

  return data ?? [];
}

// ============================================
// ROLE CHECKS
// ============================================

export function isSuperAdmin(email: string): boolean {
  return SUPERADMIN_EMAILS.includes(email);
}

export function isSuperAdminRole(role: UserRole): boolean {
  return role === 'super_admin';
}

export function isAdminRole(role: UserRole): boolean {
  return role === 'super_admin' || role === 'group_admin';
}

/** @deprecated Use isCompanyAdminRole instead */
export function isBranchAdminRole(role: UserRole): boolean {
  return isCompanyAdminRole(role);
}

export function isCompanyAdminRole(role: UserRole): boolean {
  return role === 'super_admin' || role === 'group_admin' || role === 'company_admin';
}

export function isAssistantAdminRole(role: UserRole): boolean {
  return role === 'super_admin' || role === 'group_admin' || role === 'company_admin' || role === 'assistant_admin';
}

export function isInstructorRole(role: UserRole): boolean {
  return role === 'super_admin' || role === 'group_admin' || role === 'company_admin' || role === 'assistant_admin' || role === 'instructor';
}

export function canManageBranch(role: UserRole): boolean {
  return role === 'super_admin' || role === 'group_admin';
}

export function canManageUsers(role: UserRole): boolean {
  return role === 'super_admin' || role === 'group_admin' || role === 'company_admin';
}

export function canManageStudents(role: UserRole): boolean {
  return role === 'super_admin' || role === 'group_admin' || role === 'company_admin' || role === 'assistant_admin' || role === 'instructor';
}

export function canMarkAttendance(role: UserRole): boolean {
  return role === 'super_admin' || role === 'group_admin' || role === 'company_admin' || role === 'assistant_admin' || role === 'instructor';
}

export function canManageAdcoins(role: UserRole): boolean {
  return role === 'super_admin' || role === 'group_admin' || role === 'company_admin' || role === 'assistant_admin' || role === 'instructor';
}

// ============================================
// BRANCH ACCESS
// ============================================

export async function getUserBranchId(userId: string): Promise<string | null> {
  const user = await getUserById(userId);

  if (!user) {
    return null;
  }

  if (isSuperAdmin(user.email) || isSuperAdminRole(user.role)) {
    return null; // Super admin has access to all branches
  }

  return user.branch_id ?? null;
}

export async function getUserBranchIdByEmail(email: string): Promise<string | null> {
  const user = await getUserByEmail(email);

  if (!user) {
    return null;
  }

  if (isSuperAdmin(email) || isSuperAdminRole(user.role)) {
    return null; // Super admin has access to all branches
  }

  return user.branch_id ?? null;
}

/**
 * Get all branch IDs a user has access to.
 * Returns null for super_admin (sees everything).
 * Returns array of branch IDs for admin (from admin_branches table),
 * or single-element array for branch_admin/instructor.
 */
export async function getUserBranchIds(email: string): Promise<string[] | null> {
  const user = await getUserByEmail(email);

  if (!user) {
    return [];
  }

  // Super admin sees everything
  if (isSuperAdmin(email) || isSuperAdminRole(user.role)) {
    return null;
  }

  // Group admin: check admin_branches table
  const normalizedRole = (user.role as string) === "admin" ? "group_admin" : (user.role as string) === "branch_admin" ? "company_admin" : user.role;
  if (normalizedRole === 'group_admin') {
    const { getAdminBranchIds } = await import("./permissions");
    const branchIds = await getAdminBranchIds(user.id);
    // If admin has branches assigned, return them
    if (branchIds.length > 0) return branchIds;
    // Fall back to own branch_id
    if (user.branch_id) return [user.branch_id];
    // No branches at all — treat like super_admin (see everything)
    return null;
  }

  // Branch admin / instructor: their own branch
  if (user.branch_id) return [user.branch_id];
  return [];
}

export async function getUserBranchIdByAuthId(authId: string): Promise<string | null> {
  const user = await getUserByAuthId(authId);

  if (!user) {
    return null;
  }

  if (isSuperAdminRole(user.role)) {
    return null; // Super admin has access to all branches
  }

  return user.branch_id ?? null;
}

export async function canUserAccessBranch(userId: string, branchId: string): Promise<boolean> {
  const user = await getUserById(userId);

  if (!user) {
    return false;
  }

  // Super admins can access all branches
  if (isSuperAdmin(user.email) || isSuperAdminRole(user.role)) {
    return true;
  }

  // Other users can only access their assigned branch
  return user.branch_id === branchId;
}

// ============================================
// WRITE OPERATIONS
// ============================================

export async function createUser(userData: UserInsert): Promise<User | null> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .insert(userData)
    .select()
    .single();

  if (error) {
    console.error('Error creating user:', error);
    return null;
  }

  return data;
}

export async function updateUser(userId: string, userData: UserUpdate): Promise<User | null> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .update(userData)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating user:', error);
    return null;
  }

  return data;
}

export async function linkUserToAuth(userId: string, authId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('users')
    .update({ auth_id: authId })
    .eq('id', userId);

  if (error) {
    console.error('Error linking user to auth:', error);
    return false;
  }

  return true;
}

export async function softDeleteUser(userId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('users')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.error('Error soft deleting user:', error);
    return false;
  }

  return true;
}

export async function restoreUser(userId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('users')
    .update({ deleted_at: null })
    .eq('id', userId);

  if (error) {
    console.error('Error restoring user:', error);
    return false;
  }

  return true;
}

/**
 * Update a user's adcoin balance
 */
export async function updateUserAdcoinBalance(
  userId: string,
  newBalance: number
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('users')
    .update({ adcoin_balance: newBalance })
    .eq('id', userId);

  if (error) {
    console.error('Error updating user adcoin balance:', error);
    return false;
  }

  return true;
}

// ============================================
// INSTRUCTOR QUERIES
// ============================================

export interface InstructorOption {
  id: string;
  name: string;
}

export async function getInstructorsByBranch(branchId: string | null): Promise<InstructorOption[]> {
  let query = supabaseAdmin
    .from('users')
    .select('id, name')
    .eq('role', 'instructor')
    .is('deleted_at', null)
    .order('name');

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching instructors:', error);
    return [];
  }

  return data ?? [];
}

export async function getAllInstructors(): Promise<InstructorOption[]> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, name')
    .in('role', ['instructor', 'assistant_admin', 'company_admin', 'group_admin', 'super_admin'])
    .is('deleted_at', null)
    .order('name');

  if (error) {
    console.error('Error fetching all instructors:', error);
    return [];
  }

  return data ?? [];
}

/**
 * Get instructors and branch admins filtered by branch.
 * Used when branch_admin logs in — only show staff from same branch.
 */
export async function getInstructorsByBranchForAttendance(branchId: string): Promise<InstructorOption[]> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, name')
    .in('role', ['instructor', 'assistant_admin', 'company_admin'])
    .eq('branch_id', branchId)
    .is('deleted_at', null)
    .order('name');

  if (error) {
    console.error('Error fetching branch instructors:', error);
    return [];
  }

  return data ?? [];
}

/**
 * Get all instructors and branch admins (for admin role).
 */
export async function getAllInstructorsForAttendance(): Promise<InstructorOption[]> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, name')
    .in('role', ['instructor', 'assistant_admin', 'company_admin'])
    .is('deleted_at', null)
    .order('name');

  if (error) {
    console.error('Error fetching instructors for attendance:', error);
    return [];
  }

  return data ?? [];
}

// ============================================
// TRANSFER PARTICIPANTS (for AdCoin transfers)
// ============================================

export interface TransferParticipant {
  id: string;
  name: string;
  photo: string | null;
  type: 'student' | 'user';
  role: UserRole | 'student';
  branchId: string | null;
  branchName: string | null;
  adcoinBalance: number;
}

export async function getTransferParticipants(userEmail?: string): Promise<TransferParticipant[]> {
  const participants: TransferParticipant[] = [];

  // Get branch IDs for filtering (null = super_admin, sees all)
  let branchIds: string[] | null = null;
  if (userEmail) {
    branchIds = await getUserBranchIds(userEmail);
    const currentUser = await getUserByEmail(userEmail);

    // Normalize old role names
    const role = (currentUser?.role as string) === "admin" ? "group_admin" : (currentUser?.role as string) === "branch_admin" ? "company_admin" : currentUser?.role;

    // Expand company branches for group_admin, company_admin, assistant_admin
    if (branchIds && branchIds.length > 0 && currentUser && (role === "group_admin" || role === "company_admin" || role === "assistant_admin")) {
      const { data: assigned } = await supabaseAdmin
        .from("branches")
        .select("id, type, parent_id")
        .in("id", branchIds)
        .is("deleted_at", null);

      const companyIds = new Set<string>();
      for (const b of assigned ?? []) {
        if (b.type === "company") companyIds.add(b.id);
        else if (b.parent_id) companyIds.add(b.parent_id);
      }

      if (companyIds.size > 0) {
        const { data: children } = await supabaseAdmin
          .from("branches")
          .select("id")
          .in("parent_id", [...companyIds])
          .in("type", ["hq", "branch"])
          .is("deleted_at", null);
        branchIds = (children ?? []).map((b) => b.id);
      }
    }
  }

  // Fetch students with branch info
  let studentQuery = supabaseAdmin
    .from('students')
    .select(`
      id,
      name,
      photo,
      branch_id,
      adcoin_balance,
      branch:branches(id, name)
    `)
    .is('deleted_at', null)
    .order('name');

  if (branchIds && branchIds.length > 0) {
    studentQuery = studentQuery.in('branch_id', branchIds);
  }

  const { data: students, error: studentsError } = await studentQuery;

  if (studentsError) {
    console.error('Error fetching students for transfer:', studentsError);
  } else {
    for (const student of students ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const branchData = student.branch as any;
      const branchName = branchData?.name ?? null;
      participants.push({
        id: student.id,
        name: student.name,
        photo: student.photo,
        type: 'student',
        role: 'student',
        branchId: student.branch_id,
        branchName,
        adcoinBalance: student.adcoin_balance ?? 0,
      });
    }
  }

  // Fetch users with roles (excluding parent and student roles)
  let userQuery = supabaseAdmin
    .from('users')
    .select(`
      id,
      name,
      photo,
      role,
      branch_id,
      adcoin_balance,
      branch:branches!users_branch_id_branches_id_fk(id, name)
    `)
    .not('role', 'in', '("parent","student")')
    .is('deleted_at', null)
    .order('name');

  if (branchIds && branchIds.length > 0) {
    userQuery = userQuery.in('branch_id', branchIds);
  }

  const { data: users, error: usersError } = await userQuery;

  if (usersError) {
    console.error('Error fetching users for transfer:', usersError);
  } else {
    for (const user of users ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const branchData = user.branch as any;
      const branchName = branchData?.name ?? null;
      participants.push({
        id: user.id,
        name: `${user.name} (${formatRole(user.role)})`,
        photo: user.photo,
        type: 'user',
        role: user.role as UserRole,
        branchId: user.branch_id,
        branchName,
        adcoinBalance: user.adcoin_balance ?? 0,
      });
    }
  }

  return participants;
}

function formatRole(role: string): string {
  const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin',
    group_admin: 'Group Admin',
    company_admin: 'Company Admin',
    assistant_admin: 'Assistant Admin',
    instructor: 'Instructor',
  };
  return roleLabels[role] ?? role;
}
