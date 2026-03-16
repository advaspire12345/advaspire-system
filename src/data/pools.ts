import { supabaseAdmin } from "@/db";
import type {
  SharedSessionPool,
  SharedSessionPoolInsert,
  SharedSessionPoolUpdate,
  PoolStudent,
  PoolStudentInsert,
  SharedSessionPoolWithStudents,
  Student,
  Course,
  Parent,
} from "@/db/schema";

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Get a shared session pool by ID
 */
export async function getPoolById(poolId: string): Promise<SharedSessionPool | null> {
  const { data, error } = await supabaseAdmin
    .from('shared_session_pools')
    .select('*')
    .eq('id', poolId)
    .is('deleted_at', null)
    .single();

  if (error) {
    console.error('Error fetching pool:', error);
    return null;
  }

  return data;
}

/**
 * Get pool with all related students
 */
export async function getPoolWithStudents(poolId: string): Promise<SharedSessionPoolWithStudents | null> {
  const { data, error } = await supabaseAdmin
    .from('shared_session_pools')
    .select(`
      *,
      course:courses(*),
      parent:parents(*)
    `)
    .eq('id', poolId)
    .is('deleted_at', null)
    .single();

  if (error) {
    console.error('Error fetching pool with details:', error);
    return null;
  }

  // Get students in this pool
  const { data: poolStudents } = await supabaseAdmin
    .from('pool_students')
    .select(`
      student:students(*)
    `)
    .eq('pool_id', poolId);

  const students = (poolStudents ?? []).map(ps => (ps.student as unknown) as Student);

  return {
    ...data,
    course: data.course as Course,
    parent: data.parent as Parent | null,
    students,
  } as SharedSessionPoolWithStudents;
}

/**
 * Find existing sibling pool for a parent + course combination
 * This is the key function for detecting if we should offer sharing
 */
export async function findSiblingPool(
  parentId: string,
  courseId: string
): Promise<SharedSessionPool | null> {
  const { data, error } = await supabaseAdmin
    .from('shared_session_pools')
    .select('*')
    .eq('parent_id', parentId)
    .eq('course_id', courseId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    console.error('Error finding sibling pool:', error);
    return null;
  }

  return data;
}

/**
 * Get all siblings (students) in a pool
 */
export async function getPoolSiblings(poolId: string): Promise<Student[]> {
  const { data, error } = await supabaseAdmin
    .from('pool_students')
    .select(`
      student:students(*)
    `)
    .eq('pool_id', poolId);

  if (error) {
    console.error('Error fetching pool siblings:', error);
    return [];
  }

  return (data ?? []).map(ps => (ps.student as unknown) as Student);
}

/**
 * Get all pools for a parent
 */
export async function getPoolsByParentId(parentId: string): Promise<SharedSessionPoolWithStudents[]> {
  const { data, error } = await supabaseAdmin
    .from('shared_session_pools')
    .select(`
      *,
      course:courses(*),
      parent:parents(*)
    `)
    .eq('parent_id', parentId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pools by parent:', error);
    return [];
  }

  // Get students for each pool
  const poolsWithStudents: SharedSessionPoolWithStudents[] = [];

  for (const pool of data ?? []) {
    const { data: poolStudents } = await supabaseAdmin
      .from('pool_students')
      .select(`student:students(*)`)
      .eq('pool_id', pool.id);

    const students = (poolStudents ?? []).map(ps => (ps.student as unknown) as Student);

    poolsWithStudents.push({
      ...pool,
      course: pool.course as Course,
      parent: pool.parent as Parent | null,
      students,
    } as SharedSessionPoolWithStudents);
  }

  return poolsWithStudents;
}

/**
 * Check if an enrollment is part of a pool
 */
export async function getPoolByEnrollmentId(enrollmentId: string): Promise<SharedSessionPool | null> {
  const { data, error } = await supabaseAdmin
    .from('pool_students')
    .select(`
      pool:shared_session_pools(*)
    `)
    .eq('enrollment_id', enrollmentId)
    .maybeSingle();

  if (error) {
    console.error('Error finding pool by enrollment:', error);
    return null;
  }

  if (!data?.pool) return null;

  // Handle the nested relation type
  const poolData = data.pool as unknown as SharedSessionPool;
  return poolData;
}

// ============================================
// WRITE OPERATIONS
// ============================================

/**
 * Create a new shared session pool
 */
export async function createPool(poolData: SharedSessionPoolInsert): Promise<SharedSessionPool | null> {
  const { data, error } = await supabaseAdmin
    .from('shared_session_pools')
    .insert(poolData)
    .select()
    .single();

  if (error) {
    console.error('Error creating pool:', error);
    return null;
  }

  return data;
}

/**
 * Update a shared session pool
 */
export async function updatePool(
  poolId: string,
  poolData: SharedSessionPoolUpdate
): Promise<SharedSessionPool | null> {
  const { data, error } = await supabaseAdmin
    .from('shared_session_pools')
    .update(poolData)
    .eq('id', poolId)
    .select()
    .single();

  if (error) {
    console.error('Error updating pool:', error);
    return null;
  }

  return data;
}

/**
 * Add a student to a pool
 */
export async function addStudentToPool(
  poolId: string,
  studentId: string,
  enrollmentId: string
): Promise<PoolStudent | null> {
  // First check if already in pool
  const { data: existing } = await supabaseAdmin
    .from('pool_students')
    .select('id')
    .eq('pool_id', poolId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (existing) {
    console.log('Student already in pool');
    return existing as PoolStudent;
  }

  const insertData: PoolStudentInsert = {
    pool_id: poolId,
    student_id: studentId,
    enrollment_id: enrollmentId,
  };

  const { data, error } = await supabaseAdmin
    .from('pool_students')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error adding student to pool:', error);
    return null;
  }

  // Also update the enrollment to reference the pool
  await supabaseAdmin
    .from('enrollments')
    .update({ pool_id: poolId })
    .eq('id', enrollmentId);

  return data;
}

/**
 * Remove a student from a pool
 */
export async function removeStudentFromPool(
  poolId: string,
  studentId: string
): Promise<boolean> {
  // Get the enrollment ID before removing
  const { data: poolStudent } = await supabaseAdmin
    .from('pool_students')
    .select('enrollment_id')
    .eq('pool_id', poolId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (poolStudent?.enrollment_id) {
    // Clear pool_id from enrollment
    await supabaseAdmin
      .from('enrollments')
      .update({ pool_id: null })
      .eq('id', poolStudent.enrollment_id);
  }

  const { error } = await supabaseAdmin
    .from('pool_students')
    .delete()
    .eq('pool_id', poolId)
    .eq('student_id', studentId);

  if (error) {
    console.error('Error removing student from pool:', error);
    return false;
  }

  return true;
}

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * Deduct one session from a pool
 * Returns the new remaining count (can be negative)
 */
export async function deductPoolSession(poolId: string): Promise<number | null> {
  const pool = await getPoolById(poolId);
  if (!pool) {
    console.error('Pool not found for deduction');
    return null;
  }

  const newRemaining = pool.sessions_remaining - 1;

  const { error } = await supabaseAdmin
    .from('shared_session_pools')
    .update({
      sessions_remaining: newRemaining,
      updated_at: new Date().toISOString(),
    })
    .eq('id', poolId);

  if (error) {
    console.error('Error deducting pool session:', error);
    return null;
  }

  return newRemaining;
}

/**
 * Add sessions to a pool (when payment is approved)
 */
export async function addPoolSessions(
  poolId: string,
  sessions: number
): Promise<number | null> {
  const pool = await getPoolById(poolId);
  if (!pool) {
    console.error('Pool not found for adding sessions');
    return null;
  }

  const newRemaining = pool.sessions_remaining + sessions;
  const newTotal = pool.total_sessions + sessions;

  const { error } = await supabaseAdmin
    .from('shared_session_pools')
    .update({
      sessions_remaining: newRemaining,
      total_sessions: newTotal,
      updated_at: new Date().toISOString(),
    })
    .eq('id', poolId);

  if (error) {
    console.error('Error adding pool sessions:', error);
    return null;
  }

  return newRemaining;
}

/**
 * Update pool period start (for monthly packages)
 */
export async function updatePoolPeriodStart(
  poolId: string,
  periodStart: string
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('shared_session_pools')
    .update({
      period_start: periodStart,
      updated_at: new Date().toISOString(),
    })
    .eq('id', poolId);

  if (error) {
    console.error('Error updating pool period start:', error);
    return false;
  }

  return true;
}

// ============================================
// POOL CREATION HELPERS
// ============================================

/**
 * Create a pool and add both siblings to it
 * Used when 2nd sibling chooses to share sessions with existing sibling
 */
export async function createPoolWithSiblings(
  parentId: string,
  courseId: string,
  packageId: string | null,
  parentName: string,
  courseName: string,
  firstSibling: { studentId: string; enrollmentId: string },
  secondSibling: { studentId: string; enrollmentId: string }
): Promise<SharedSessionPool | null> {
  // Create the pool
  const poolData: SharedSessionPoolInsert = {
    name: `${parentName} Family - ${courseName}`,
    course_id: courseId,
    package_id: packageId,
    total_sessions: 0,
    sessions_remaining: 0,
    parent_id: parentId,
  };

  const pool = await createPool(poolData);
  if (!pool) {
    console.error('Failed to create pool');
    return null;
  }

  // Add both siblings to the pool
  await addStudentToPool(pool.id, firstSibling.studentId, firstSibling.enrollmentId);
  await addStudentToPool(pool.id, secondSibling.studentId, secondSibling.enrollmentId);

  return pool;
}

/**
 * Soft delete a pool (mark as deleted)
 */
export async function softDeletePool(poolId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('shared_session_pools')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', poolId);

  if (error) {
    console.error('Error soft deleting pool:', error);
    return false;
  }

  return true;
}

// ============================================
// POOL INFO FOR UI
// ============================================

export interface SiblingPoolInfo {
  poolId: string;
  poolName: string | null;
  courseId: string;
  courseName: string;
  sessionsRemaining: number;
  totalSessions: number;
  packageId: string | null;
  packageType: "monthly" | "session" | null;
  packageDuration: number | null;
  siblings: {
    studentId: string;
    studentName: string;
  }[];
}

/**
 * Get pool info formatted for UI display (by parent + course)
 */
export async function getSiblingPoolInfo(
  parentId: string,
  courseId: string
): Promise<SiblingPoolInfo | null> {
  const pool = await findSiblingPool(parentId, courseId);
  if (!pool) return null;

  // Get course name
  const { data: course } = await supabaseAdmin
    .from('courses')
    .select('name')
    .eq('id', courseId)
    .single();

  // Get package info if available
  let packageType: "monthly" | "session" | null = null;
  let packageDuration: number | null = null;

  if (pool.package_id) {
    const { data: pricing } = await supabaseAdmin
      .from('course_pricing')
      .select('package_type, duration')
      .eq('id', pool.package_id)
      .single();

    if (pricing) {
      packageType = pricing.package_type as "monthly" | "session";
      packageDuration = pricing.duration;
    }
  }

  // Get siblings
  const siblings = await getPoolSiblings(pool.id);

  return {
    poolId: pool.id,
    poolName: pool.name,
    courseId: pool.course_id,
    courseName: course?.name ?? 'Unknown Course',
    sessionsRemaining: pool.sessions_remaining,
    totalSessions: pool.total_sessions,
    packageId: pool.package_id,
    packageType,
    packageDuration,
    siblings: siblings.map(s => ({
      studentId: s.id,
      studentName: s.name,
    })),
  };
}

/**
 * Get pool info formatted for UI display (by poolId)
 */
export async function getPoolInfoById(poolId: string): Promise<SiblingPoolInfo | null> {
  const pool = await getPoolById(poolId);
  if (!pool) return null;

  // Get course name
  const { data: course } = await supabaseAdmin
    .from('courses')
    .select('name')
    .eq('id', pool.course_id)
    .single();

  // Get package info if available
  let packageType: "monthly" | "session" | null = null;
  let packageDuration: number | null = null;

  if (pool.package_id) {
    const { data: pricing } = await supabaseAdmin
      .from('course_pricing')
      .select('package_type, duration')
      .eq('id', pool.package_id)
      .single();

    if (pricing) {
      packageType = pricing.package_type as "monthly" | "session";
      packageDuration = pricing.duration;
    }
  }

  // Get siblings
  const siblings = await getPoolSiblings(pool.id);

  return {
    poolId: pool.id,
    poolName: pool.name,
    courseId: pool.course_id,
    courseName: course?.name ?? 'Unknown Course',
    sessionsRemaining: pool.sessions_remaining,
    totalSessions: pool.total_sessions,
    packageId: pool.package_id,
    packageType,
    packageDuration,
    siblings: siblings.map(s => ({
      studentId: s.id,
      studentName: s.name,
    })),
  };
}
