import { supabaseAdmin } from "@/db";
import type {
  User,
  UserInsert,
  UserUpdate,
  UserRole,
  TeamMemberStatus,
} from "@/db/schema";

// ============================================
// TEAM TABLE ROW TYPE
// ============================================

export interface TeamTableRow {
  id: string;
  photo: string | null;
  name: string;
  phone: string | null;
  address: string | null;
  branchId: string | null;
  branchName: string;
  email: string;
  cvUrl: string | null;
  role: UserRole;
  employedDate: string | null;
  status: TeamMemberStatus;
}

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Get team members for table view
 * Filters to only show staff roles (not students or parents)
 */
export async function getTeamMembersForTable(
  userEmail: string,
  branchId?: string
): Promise<TeamTableRow[]> {
  // Get user's branch access
  const { getUserBranchIdByEmail } = await import("./users");
  const userBranchId = await getUserBranchIdByEmail(userEmail);

  // Staff roles to include
  const staffRoles: UserRole[] = ['super_admin', 'admin', 'branch_admin', 'instructor'];

  let query = supabaseAdmin
    .from('users')
    .select(`
      id,
      photo,
      name,
      phone,
      address,
      branch_id,
      email,
      cv_url,
      role,
      employed_date,
      status,
      branch:branches(name)
    `)
    .in('role', staffRoles)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  // Apply branch filter
  const effectiveBranchId = branchId || userBranchId;
  if (effectiveBranchId) {
    query = query.eq('branch_id', effectiveBranchId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching team members for table:', error);
    return [];
  }

  return (data ?? []).map((user: any) => ({
    id: user.id,
    photo: user.photo || null,
    name: user.name,
    phone: user.phone || null,
    address: user.address || null,
    branchId: user.branch_id,
    branchName: user.branch?.name || 'No Branch',
    email: user.email,
    cvUrl: user.cv_url || null,
    role: user.role as UserRole,
    employedDate: user.employed_date || null,
    status: (user.status as TeamMemberStatus) || 'active',
  }));
}

/**
 * Get a single team member by ID
 */
export async function getTeamMemberById(userId: string): Promise<User | null> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', userId)
    .is('deleted_at', null)
    .single();

  if (error) {
    console.error('Error fetching team member:', error);
    return null;
  }

  return data;
}

// ============================================
// WRITE OPERATIONS
// ============================================

/**
 * Create a new team member
 */
export async function createTeamMember(userData: UserInsert): Promise<User | null> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .insert({
      ...userData,
      status: userData.status || 'active',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating team member:', error);
    return null;
  }

  return data;
}

/**
 * Update a team member
 */
export async function updateTeamMember(
  userId: string,
  userData: UserUpdate
): Promise<User | null> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .update(userData)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating team member:', error);
    return null;
  }

  return data;
}

/**
 * Soft delete a team member
 */
export async function softDeleteTeamMember(userId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('users')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.error('Error soft deleting team member:', error);
    return false;
  }

  return true;
}
