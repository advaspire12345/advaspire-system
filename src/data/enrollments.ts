import { supabaseAdmin } from "@/db";
import type {
  Enrollment,
  EnrollmentInsert,
  EnrollmentUpdate,
  EnrollmentStatus,
  EnrollmentWithStudent,
  EnrollmentWithCourse,
  EnrollmentFull,
} from "@/db/schema";

// ============================================
// READ OPERATIONS
// ============================================

export async function getEnrollmentById(enrollmentId: string): Promise<Enrollment | null> {
  const { data, error } = await supabaseAdmin
    .from('enrollments')
    .select('*')
    .eq('id', enrollmentId)
    .is('deleted_at', null)
    .single();

  if (error) {
    console.error('Error fetching enrollment:', error);
    return null;
  }

  return data;
}

export async function getEnrollmentWithStudent(enrollmentId: string): Promise<EnrollmentWithStudent | null> {
  const { data, error } = await supabaseAdmin
    .from('enrollments')
    .select(`
      *,
      student:students(*)
    `)
    .eq('id', enrollmentId)
    .is('deleted_at', null)
    .single();

  if (error) {
    console.error('Error fetching enrollment with student:', error);
    return null;
  }

  return data as EnrollmentWithStudent;
}

export async function getEnrollmentWithCourse(enrollmentId: string): Promise<EnrollmentWithCourse | null> {
  const { data, error } = await supabaseAdmin
    .from('enrollments')
    .select(`
      *,
      course:courses(*)
    `)
    .eq('id', enrollmentId)
    .is('deleted_at', null)
    .single();

  if (error) {
    console.error('Error fetching enrollment with course:', error);
    return null;
  }

  return data as EnrollmentWithCourse;
}

export async function getEnrollmentFull(enrollmentId: string): Promise<EnrollmentFull | null> {
  const { data, error } = await supabaseAdmin
    .from('enrollments')
    .select(`
      *,
      student:students(
        *,
        branch:branches(*)
      ),
      course:courses(*),
      package:packages(*)
    `)
    .eq('id', enrollmentId)
    .is('deleted_at', null)
    .single();

  if (error) {
    console.error('Error fetching full enrollment:', error);
    return null;
  }

  return data as EnrollmentFull;
}

export async function getEnrollmentsByStudentId(studentId: string): Promise<Enrollment[]> {
  const { data, error } = await supabaseAdmin
    .from('enrollments')
    .select('*')
    .eq('student_id', studentId)
    .is('deleted_at', null)
    .order('start_date', { ascending: false });

  if (error) {
    console.error('Error fetching enrollments by student:', error);
    return [];
  }

  return data ?? [];
}

export async function getEnrollmentsByCourseId(courseId: string): Promise<EnrollmentWithStudent[]> {
  const { data, error } = await supabaseAdmin
    .from('enrollments')
    .select(`
      *,
      student:students(*)
    `)
    .eq('course_id', courseId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching enrollments by course:', error);
    return [];
  }

  return data as EnrollmentWithStudent[];
}

export async function getEnrollmentsByBranchId(branchId: string): Promise<EnrollmentFull[]> {
  const { data, error } = await supabaseAdmin
    .from('enrollments')
    .select(`
      *,
      student:students!inner(
        *,
        branch:branches(*)
      ),
      course:courses(*),
      package:packages(*)
    `)
    .eq('students.branch_id', branchId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching enrollments by branch:', error);
    return [];
  }

  return data as EnrollmentFull[];
}

export async function getActiveEnrollments(branchId?: string): Promise<EnrollmentFull[]> {
  let query = supabaseAdmin
    .from('enrollments')
    .select(`
      *,
      student:students!inner(
        *,
        branch:branches(*)
      ),
      course:courses(*),
      package:packages(*)
    `)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('start_date', { ascending: false });

  if (branchId) {
    query = query.eq('students.branch_id', branchId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching active enrollments:', error);
    return [];
  }

  return data as EnrollmentFull[];
}

export async function getEnrollmentsByStatus(
  status: EnrollmentStatus,
  branchId?: string
): Promise<EnrollmentFull[]> {
  let query = supabaseAdmin
    .from('enrollments')
    .select(`
      *,
      student:students!inner(
        *,
        branch:branches(*)
      ),
      course:courses(*),
      package:packages(*)
    `)
    .eq('status', status)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (branchId) {
    query = query.eq('students.branch_id', branchId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching enrollments by status:', error);
    return [];
  }

  return data as EnrollmentFull[];
}

// ============================================
// STATISTICS
// ============================================

export async function getEnrollmentCount(branchId?: string, status?: EnrollmentStatus): Promise<number> {
  let query = supabaseAdmin
    .from('enrollments')
    .select('id, students!inner(branch_id)', { count: 'exact', head: true })
    .is('deleted_at', null);

  if (branchId) {
    query = query.eq('students.branch_id', branchId);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { count, error } = await query;

  if (error) {
    console.error('Error counting enrollments:', error);
    return 0;
  }

  return count ?? 0;
}

// ============================================
// WRITE OPERATIONS
// ============================================

export async function createEnrollment(enrollmentData: EnrollmentInsert): Promise<Enrollment | null> {
  const { data, error } = await supabaseAdmin
    .from('enrollments')
    .insert(enrollmentData)
    .select()
    .single();

  if (error) {
    console.error('Error creating enrollment:', error);
    return null;
  }

  return data;
}

export async function updateEnrollment(enrollmentId: string, enrollmentData: EnrollmentUpdate): Promise<Enrollment | null> {
  const { data, error } = await supabaseAdmin
    .from('enrollments')
    .update(enrollmentData)
    .eq('id', enrollmentId)
    .select()
    .single();

  if (error) {
    console.error('Error updating enrollment:', error);
    return null;
  }

  return data;
}

export async function updateEnrollmentStatus(enrollmentId: string, status: EnrollmentStatus): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('enrollments')
    .update({ status })
    .eq('id', enrollmentId);

  if (error) {
    console.error('Error updating enrollment status:', error);
    return false;
  }

  return true;
}

export async function decrementSessionsRemaining(enrollmentId: string): Promise<boolean> {
  const enrollment = await getEnrollmentById(enrollmentId);
  if (!enrollment || enrollment.sessions_remaining === null) {
    return false;
  }

  if (enrollment.sessions_remaining <= 0) {
    console.error('No sessions remaining');
    return false;
  }

  const { error } = await supabaseAdmin
    .from('enrollments')
    .update({ sessions_remaining: enrollment.sessions_remaining - 1 })
    .eq('id', enrollmentId);

  if (error) {
    console.error('Error decrementing sessions remaining:', error);
    return false;
  }

  return true;
}

export async function softDeleteEnrollment(enrollmentId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('enrollments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', enrollmentId);

  if (error) {
    console.error('Error soft deleting enrollment:', error);
    return false;
  }

  return true;
}

export async function restoreEnrollment(enrollmentId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('enrollments')
    .update({ deleted_at: null })
    .eq('id', enrollmentId);

  if (error) {
    console.error('Error restoring enrollment:', error);
    return false;
  }

  return true;
}
