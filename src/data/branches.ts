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
  type: 'company' | 'hq' | 'branch';
  code: string | null;
  parentId: string | null;
  parentName: string | null;
  branchAddress: string;
  city: string;
  branchEmail: string;
  branchPhone: string;
  bankName: string;
  bankAccount: string;
  adminId: string | null;
  adminName: string | null;
  website: string;
  logoUrl: string;
  registrationNumber: string;
}

export async function getBranchData(branchIds?: string[]): Promise<BranchEntry[]> {
  // Fetch branches with all new fields
  let query = supabaseAdmin
    .from("branches")
    .select(
      `
      id,
      name,
      type,
      parent_id,
      address,
      city,
      email,
      phone,
      bank_name,
      bank_account,
      admin_id,
      website,
      logo_url,
      registration_number
    `
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  // If branchIds provided, find admin's company and show full company hierarchy
  if (branchIds) {
    // Fetch the admin's assigned branches to find types and parent IDs
    const { data: adminBranches } = await supabaseAdmin
      .from("branches")
      .select("id, type, parent_id")
      .in("id", branchIds)
      .is("deleted_at", null);

    // Collect company IDs: either directly assigned companies, or parent companies of assigned branches/HQs
    const companyIds = new Set<string>();
    for (const b of adminBranches ?? []) {
      if (b.type === "company") {
        companyIds.add(b.id);
      } else if (b.parent_id) {
        companyIds.add(b.parent_id);
      }
    }

    const companyIdArr = [...companyIds];

    // Show: the company rows + all children (HQ/branches) under those companies
    if (companyIdArr.length > 0) {
      query = query.or(
        `id.in.(${companyIdArr.join(",")}),parent_id.in.(${companyIdArr.join(",")})`
      );
    } else {
      // Fallback: just show the admin's own branches
      query = query.in("id", branchIds);
    }
  }

  const { data: branches, error: branchError } = await query;

  if (branchError) {
    console.error("Error fetching branches data:", branchError);
    return [];
  }

  // Fetch codes separately (column may not exist if migration not applied)
  const codeMap = new Map<string, string>();
  const branchIdList = (branches ?? []).map((b: any) => b.id);
  if (branchIdList.length > 0) {
    const { data: codeData } = await supabaseAdmin
      .from("branches")
      .select("id, code")
      .in("id", branchIdList);
    for (const c of codeData ?? []) {
      if (c.code) codeMap.set(c.id, c.code);
    }
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

  // Build parent name map (for branch rows that have a parent_id)
  const parentIds = (branches ?? [])
    .map((b) => b.parent_id)
    .filter((id): id is string => id !== null);

  let parentMap: Record<string, string> = {};
  if (parentIds.length > 0) {
    const { data: parents } = await supabaseAdmin
      .from("branches")
      .select("id, name")
      .in("id", parentIds);

    parentMap = (parents ?? []).reduce(
      (acc, p) => {
        acc[p.id] = p.name;
        return acc;
      },
      {} as Record<string, string>
    );
  }

  // Sort: Company first, then HQ, then branches
  const typeOrder = { company: 0, hq: 1, branch: 2 };
  const sorted = [...(branches ?? [])].sort((a, b) => {
    const aOrder = typeOrder[a.type as keyof typeof typeOrder] ?? 3;
    const bOrder = typeOrder[b.type as keyof typeof typeOrder] ?? 3;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.name.localeCompare(b.name);
  });

  return sorted.map((branch) => {
    return {
      id: branch.id,
      branchName: branch.name,
      type: branch.type as 'company' | 'hq' | 'branch',
      code: codeMap.get(branch.id) ?? null,
      parentId: branch.parent_id,
      parentName: branch.parent_id ? parentMap[branch.parent_id] ?? null : null,
      branchAddress: branch.address ?? "",
      city: branch.city ?? "",
      branchEmail: branch.email ?? "",
      branchPhone: branch.phone ?? "",
      bankName: branch.bank_name ?? "",
      bankAccount: branch.bank_account ?? "",
      adminId: branch.admin_id,
      adminName: branch.admin_id ? adminMap[branch.admin_id] ?? null : null,
      website: branch.website ?? "",
      logoUrl: branch.logo_url ?? "",
      registrationNumber: branch.registration_number ?? "",
    };
  });
}

export interface CompanyOption {
  id: string;
  name: string;
}

export async function getCompanyOptions(): Promise<CompanyOption[]> {
  const { data, error } = await supabaseAdmin
    .from("branches")
    .select("id, name")
    .eq("type", "company")
    .is("deleted_at", null)
    .order("name");

  if (error) {
    console.error("Error fetching company options:", error);
    return [];
  }

  return data ?? [];
}

export interface AdminOption {
  id: string;
  name: string;
}

export async function getAdminOptions(): Promise<AdminOption[]> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, name")
    .in("role", ["super_admin", "group_admin", "company_admin", "assistant_admin"])
    .is("deleted_at", null)
    .order("name");

  if (error) {
    console.error("Error fetching admin options:", error);
    return [];
  }

  return data ?? [];
}


export interface InstructorOption {
  id: string;
  name: string;
  branchId: string | null;
}

export async function getInstructorOptions(): Promise<InstructorOption[]> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, name, branch_id")
    .in("role", ["company_admin", "assistant_admin", "instructor"])
    .is("deleted_at", null)
    .order("name");

  if (error) {
    console.error("Error fetching instructor options:", error);
    return [];
  }

  return (data ?? []).map((user) => ({
    id: user.id,
    name: user.name,
    branchId: user.branch_id,
  }));
}

