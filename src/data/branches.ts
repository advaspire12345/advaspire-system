import { supabaseAdmin } from "@/db";
import type { Branch, BranchInsert, BranchUpdate } from "@/db/schema";

// ============================================
// READ OPERATIONS
// ============================================

export async function getBranchById(branchId: string): Promise<Branch | null> {
  const { data, error } = await supabaseAdmin
    .from('branches')
    .select('*')
    .eq('id', branchId)
    .is('deleted_at', null)
    .single();

  if (error) {
    console.error('Error fetching branch:', error);
    return null;
  }

  return data;
}

export async function getBranchByName(name: string): Promise<Branch | null> {
  const { data, error } = await supabaseAdmin
    .from('branches')
    .select('*')
    .eq('name', name)
    .is('deleted_at', null)
    .single();

  if (error) {
    console.error('Error fetching branch by name:', error);
    return null;
  }

  return data;
}

export async function getAllBranches(): Promise<Branch[]> {
  const { data, error } = await supabaseAdmin
    .from('branches')
    .select('*')
    .is('deleted_at', null)
    .order('name');

  if (error) {
    console.error('Error fetching all branches:', error);
    return [];
  }

  return data ?? [];
}

export async function getBranchCount(): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('branches')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null);

  if (error) {
    console.error('Error counting branches:', error);
    return 0;
  }

  return count ?? 0;
}

// ============================================
// BRANCH STATISTICS
// ============================================

export interface BranchStats {
  totalStudents: number;
  totalEnrollments: number;
  activeEnrollments: number;
  totalRevenue: number;
}

export async function getBranchStats(branchId: string): Promise<BranchStats> {
  // Count students in branch
  const { count: studentCount } = await supabaseAdmin
    .from('students')
    .select('id', { count: 'exact', head: true })
    .eq('branch_id', branchId)
    .is('deleted_at', null);

  // Count total enrollments
  const { count: enrollmentCount } = await supabaseAdmin
    .from('enrollments')
    .select('id, students!inner(branch_id)', { count: 'exact', head: true })
    .eq('students.branch_id', branchId)
    .is('deleted_at', null);

  // Count active enrollments
  const { count: activeCount } = await supabaseAdmin
    .from('enrollments')
    .select('id, students!inner(branch_id)', { count: 'exact', head: true })
    .eq('students.branch_id', branchId)
    .eq('status', 'active')
    .is('deleted_at', null);

  // Sum payments
  const { data: payments } = await supabaseAdmin
    .from('payments')
    .select('amount, students!inner(branch_id)')
    .eq('students.branch_id', branchId)
    .eq('status', 'paid');

  const totalRevenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;

  return {
    totalStudents: studentCount ?? 0,
    totalEnrollments: enrollmentCount ?? 0,
    activeEnrollments: activeCount ?? 0,
    totalRevenue,
  };
}

// ============================================
// WRITE OPERATIONS
// ============================================

export async function createBranch(branchData: BranchInsert): Promise<Branch | null> {
  const { data, error } = await supabaseAdmin
    .from('branches')
    .insert(branchData)
    .select()
    .single();

  if (error) {
    console.error('Error creating branch:', error);
    return null;
  }

  return data;
}

export async function updateBranch(branchId: string, branchData: BranchUpdate): Promise<Branch | null> {
  const { data, error } = await supabaseAdmin
    .from('branches')
    .update(branchData)
    .eq('id', branchId)
    .select()
    .single();

  if (error) {
    console.error('Error updating branch:', error);
    return null;
  }

  return data;
}

export async function softDeleteBranch(branchId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('branches')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', branchId);

  if (error) {
    console.error('Error soft deleting branch:', error);
    return false;
  }

  return true;
}

export async function restoreBranch(branchId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('branches')
    .update({ deleted_at: null })
    .eq('id', branchId);

  if (error) {
    console.error('Error restoring branch:', error);
    return false;
  }

  return true;
}

export interface BranchEntry {
  id: string;
  branchName: string;
  branchCompany: string;
  branchAddress: string;
  branchEmail: string;
  branchPhone: string;
  bankName: string;
  bankAccount: string;
  adminId: string | null;
  adminName: string | null;
}

export async function getBranchData(): Promise<BranchEntry[]> {
  // Fetch branches
  const { data: branches, error: branchError } = await supabaseAdmin
    .from("branches")
    .select(
      `
      id,
      name,
      company_name,
      address,
      email,
      phone,
      bank_name,
      bank_account,
      admin_id
    `
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (branchError) {
    console.error("Error fetching branches data:", branchError);
    return [];
  }

  // Get unique admin IDs
  const adminIds = (branches ?? [])
    .map((b) => b.admin_id)
    .filter((id): id is string => id !== null);

  // Fetch admin names if there are any admin IDs
  let adminMap: Record<string, string> = {};
  if (adminIds.length > 0) {
    const { data: admins } = await supabaseAdmin
      .from("users")
      .select("id, name")
      .in("id", adminIds);

    adminMap = (admins ?? []).reduce(
      (acc, admin) => {
        acc[admin.id] = admin.name;
        return acc;
      },
      {} as Record<string, string>
    );
  }

  return (branches ?? []).map((branch) => {
    return {
      id: branch.id,
      branchName: branch.name,
      branchCompany: branch.company_name ?? "",
      branchAddress: branch.address ?? "",
      branchEmail: branch.email ?? "",
      branchPhone: branch.phone ?? "",
      bankName: branch.bank_name ?? "",
      bankAccount: branch.bank_account ?? "",
      adminId: branch.admin_id,
      adminName: branch.admin_id ? adminMap[branch.admin_id] ?? null : null,
    };
  });
}

export interface AdminOption {
  id: string;
  name: string;
}

export async function getAdminOptions(): Promise<AdminOption[]> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, name")
    .in("role", ["super_admin", "admin", "branch_admin"])
    .is("deleted_at", null)
    .order("name");

  if (error) {
    console.error("Error fetching admin options:", error);
    return [];
  }

  return data ?? [];
}

