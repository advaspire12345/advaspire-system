import { supabaseAdmin } from "@/db";
import type {
  Student,
  StudentInsert,
  StudentUpdate,
  StudentWithBranch,
  StudentWithEnrollments,
  StudentFull,
} from "@/db/schema";

// ============================================
// READ OPERATIONS
// ============================================

export async function getStudentById(studentId: string): Promise<Student | null> {
  const { data, error } = await supabaseAdmin
    .from('students')
    .select('*')
    .eq('id', studentId)
    .is('deleted_at', null)
    .single();

  if (error) {
    console.error('Error fetching student:', error);
    return null;
  }

  return data;
}

export async function getStudentWithBranch(studentId: string): Promise<StudentWithBranch | null> {
  const { data, error } = await supabaseAdmin
    .from('students')
    .select(`
      *,
      branch:branches(*)
    `)
    .eq('id', studentId)
    .is('deleted_at', null)
    .single();

  if (error) {
    console.error('Error fetching student with branch:', error);
    return null;
  }

  return data as StudentWithBranch;
}

export async function getStudentWithEnrollments(studentId: string): Promise<StudentWithEnrollments | null> {
  const { data, error } = await supabaseAdmin
    .from('students')
    .select(`
      *,
      enrollments(*)
    `)
    .eq('id', studentId)
    .is('deleted_at', null)
    .single();

  if (error) {
    console.error('Error fetching student with enrollments:', error);
    return null;
  }

  return data as StudentWithEnrollments;
}

export async function getStudentFull(studentId: string): Promise<StudentFull | null> {
  const { data, error } = await supabaseAdmin
    .from('students')
    .select(`
      *,
      branch:branches(*),
      enrollments(
        *,
        course:courses(*)
      ),
      parents:parent_students(
        parent:parents(*)
      )
    `)
    .eq('id', studentId)
    .is('deleted_at', null)
    .single();

  if (error) {
    console.error('Error fetching full student:', error);
    return null;
  }

  // Flatten parents array
  const flatData = {
    ...data,
    parents: data.parents?.map((ps: { parent: unknown }) => ps.parent) ?? [],
  };

  return flatData as StudentFull;
}

export async function getStudentByEmail(email: string): Promise<Student | null> {
  const { data, error } = await supabaseAdmin
    .from('students')
    .select('*')
    .eq('email', email)
    .is('deleted_at', null)
    .single();

  if (error) {
    console.error('Error fetching student by email:', error);
    return null;
  }

  return data;
}

export async function getStudentsByBranchId(branchId: string): Promise<Student[]> {
  const { data, error } = await supabaseAdmin
    .from('students')
    .select('*')
    .eq('branch_id', branchId)
    .is('deleted_at', null)
    .order('name');

  if (error) {
    console.error('Error fetching students by branch:', error);
    return [];
  }

  return data ?? [];
}

export async function getAllStudents(): Promise<Student[]> {
  const { data, error } = await supabaseAdmin
    .from('students')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all students:', error);
    return [];
  }

  return data ?? [];
}

export interface StudentForPayment {
  id: string;
  name: string;
  branchName: string;
  parentName: string | null;
}

export async function getStudentsForPayment(userEmail: string): Promise<StudentForPayment[]> {
  // Import user helpers dynamically to avoid circular imports
  const { getUserBranchIdByEmail } = await import("./users");
  const userBranchId = await getUserBranchIdByEmail(userEmail);

  let query = supabaseAdmin
    .from('students')
    .select(`
      id,
      name,
      branch:branches!inner(name),
      parent_students(
        parent:parents(name)
      )
    `)
    .is('deleted_at', null)
    .order('name');

  if (userBranchId) {
    query = query.eq('branch_id', userBranchId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching students for payment:', error);
    return [];
  }

  return (data ?? []).map((student) => {
    const branch = student.branch as unknown as { name: string };
    const parentStudents = student.parent_students as unknown as Array<{
      parent: { name: string } | null;
    }>;
    const parentName = parentStudents?.[0]?.parent?.name ?? null;

    return {
      id: student.id,
      name: student.name,
      branchName: branch.name,
      parentName,
    };
  });
}

export async function searchStudents(query: string, branchId?: string): Promise<Student[]> {
  let dbQuery = supabaseAdmin
    .from('students')
    .select('*')
    .is('deleted_at', null)
    .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
    .order('name')
    .limit(50);

  if (branchId) {
    dbQuery = dbQuery.eq('branch_id', branchId);
  }

  const { data, error } = await dbQuery;

  if (error) {
    console.error('Error searching students:', error);
    return [];
  }

  return data ?? [];
}

// ============================================
// ADCOIN RANKING
// ============================================

export interface AdcoinRankingEntry {
  rank: number;
  studentId: string;
  studentName: string;
  coins: number;
  photo: string | null;
}

export async function getAdcoinRanking(
  branchId?: string,
  limit = 10
): Promise<AdcoinRankingEntry[]> {
  let query = supabaseAdmin
    .from('students')
    .select('id, name, adcoin_balance, photo')
    .is('deleted_at', null)
    .order('adcoin_balance', { ascending: false })
    .limit(limit);

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching adcoin ranking:', error);
    return [];
  }

  return (data ?? []).map((s, index) => ({
    rank: index + 1,
    studentId: s.id,
    studentName: s.name,
    coins: s.adcoin_balance ?? 0,
    photo: s.photo,
  }));
}

// ============================================
// WRITE OPERATIONS
// ============================================

export async function createStudent(studentData: StudentInsert): Promise<Student | null> {
  const { data, error } = await supabaseAdmin
    .from('students')
    .insert(studentData)
    .select()
    .single();

  if (error) {
    console.error('Error creating student:', error);
    return null;
  }

  return data;
}

export async function updateStudent(studentId: string, studentData: StudentUpdate): Promise<Student | null> {
  const { data, error } = await supabaseAdmin
    .from('students')
    .update(studentData)
    .eq('id', studentId)
    .select()
    .single();

  if (error) {
    console.error('Error updating student:', error);
    return null;
  }

  return data;
}

export async function updateAdcoinBalance(studentId: string, newBalance: number): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('students')
    .update({ adcoin_balance: newBalance })
    .eq('id', studentId);

  if (error) {
    console.error('Error updating adcoin balance:', error);
    return false;
  }

  return true;
}

export async function softDeleteStudent(studentId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('students')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', studentId);

  if (error) {
    console.error('Error soft deleting student:', error);
    return false;
  }

  return true;
}

export async function restoreStudent(studentId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('students')
    .update({ deleted_at: null })
    .eq('id', studentId);

  if (error) {
    console.error('Error restoring student:', error);
    return false;
  }

  return true;
}

// ============================================
// PARENT RELATIONSHIPS
// ============================================

export async function linkParentToStudent(parentId: string, studentId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('parent_students')
    .insert({ parent_id: parentId, student_id: studentId });

  if (error) {
    console.error('Error linking parent to student:', error);
    return false;
  }

  return true;
}

export async function unlinkParentFromStudent(parentId: string, studentId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('parent_students')
    .delete()
    .eq('parent_id', parentId)
    .eq('student_id', studentId);

  if (error) {
    console.error('Error unlinking parent from student:', error);
    return false;
  }

  return true;
}
