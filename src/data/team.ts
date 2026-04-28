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
  city: string | null;
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
  // Get user's branch access — resolve company IDs to child HQ/branch IDs
  const { getUserBranchIds, getUserByEmail, isSuperAdmin } = await import("./users");
  let branchIds = await getUserBranchIds(userEmail);
  const currentUser = await getUserByEmail(userEmail);
  const useCityName = !(isSuperAdmin(userEmail) || currentUser?.role === "super_admin");

  // Only expand company IDs for admin role, NOT branch_admin/instructor
  if (branchIds && branchIds.length > 0 && currentUser?.role === "group_admin") {
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

  // Staff roles to include — hide super_admin from non-super_admin users
  const staffRoles: UserRole[] = useCityName
    ? ['group_admin', 'company_admin', 'assistant_admin', 'instructor']
    : ['super_admin', 'group_admin', 'company_admin', 'assistant_admin', 'instructor'];

  let query = supabaseAdmin
    .from('users')
    .select(`
      id,
      photo,
      name,
      phone,
      address,
      city,
      branch_id,
      email,
      cv_url,
      role,
      employed_date,
      status,
      branch:branches!users_branch_id_branches_id_fk(name, city)
    `)
    .in('role', staffRoles)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  // Apply branch filter
  if (branchId) {
    query = query.eq('branch_id', branchId);
  } else if (branchIds) {
    query = query.in('branch_id', branchIds);
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
    city: user.city || null,
    branchId: user.branch_id,
    branchName: useCityName ? (user.branch?.city || user.branch?.name || 'No Branch') : (user.branch?.name || 'No Branch'),
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
