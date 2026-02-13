import { supabaseAdmin } from "@/db";
import type { User, UserRole, UserInsert, UserUpdate } from "@/db/schema";

const SUPERADMIN_EMAIL = "admin@advaspire.com";

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

/**
 * Get user by Clerk ID (legacy - will be deprecated)
 * @deprecated Use getUserByAuthId instead
 */
export async function getUserByClerkId(clerkId: string): Promise<User | null> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('clerk_id', clerkId)
    .is('deleted_at', null)
    .single();

  if (error) {
    console.error('Error fetching user by clerk_id:', error);
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
  return email === SUPERADMIN_EMAIL;
}

export function isSuperAdminRole(role: UserRole): boolean {
  return role === 'super_admin';
}

export function isAdminRole(role: UserRole): boolean {
  return role === 'super_admin' || role === 'admin';
}

export function isBranchAdminRole(role: UserRole): boolean {
  return role === 'super_admin' || role === 'admin' || role === 'branch_admin';
}

export function isInstructorRole(role: UserRole): boolean {
  return role === 'super_admin' || role === 'admin' || role === 'branch_admin' || role === 'instructor';
}

export function canManageBranch(role: UserRole): boolean {
  return role === 'super_admin' || role === 'admin';
}

export function canManageUsers(role: UserRole): boolean {
  return role === 'super_admin' || role === 'admin' || role === 'branch_admin';
}

export function canManageStudents(role: UserRole): boolean {
  return role === 'super_admin' || role === 'admin' || role === 'branch_admin' || role === 'instructor';
}

export function canMarkAttendance(role: UserRole): boolean {
  return role === 'super_admin' || role === 'admin' || role === 'branch_admin' || role === 'instructor';
}

export function canManageAdcoins(role: UserRole): boolean {
  return role === 'super_admin' || role === 'admin' || role === 'branch_admin' || role === 'instructor';
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
    .in('role', ['instructor', 'branch_admin', 'admin', 'super_admin'])
    .is('deleted_at', null)
    .order('name');

  if (error) {
    console.error('Error fetching all instructors:', error);
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

export async function getTransferParticipants(): Promise<TransferParticipant[]> {
  const participants: TransferParticipant[] = [];

  // Fetch students with branch info
  const { data: students, error: studentsError } = await supabaseAdmin
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
  const { data: users, error: usersError } = await supabaseAdmin
    .from('users')
    .select(`
      id,
      name,
      photo,
      role,
      branch_id,
      branch:branches(id, name)
    `)
    .not('role', 'in', '("parent","student")')
    .is('deleted_at', null)
    .order('name');

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
        adcoinBalance: 0, // Users don't have adcoin balance
      });
    }
  }

  return participants;
}

function formatRole(role: string): string {
  const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    branch_admin: 'Branch Admin',
    instructor: 'Instructor',
  };
  return roleLabels[role] ?? role;
}
