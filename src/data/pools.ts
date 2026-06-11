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
 * Add a student to a pool.
 * If the student has leftover sessions_remaining > 0, absorb them into the pool.
 */
export async function addStudentToPool(
  poolId: string,
  studentId: string,
  enrollmentId: string
): Promise<PoolStudent | null> {
  // Read the incoming enrollment's leftover sessions — these get absorbed
  // into the pool regardless of whether this is the student's first
  // enrollment in the pool or an additional one.
  const { data: enrollment } = await supabaseAdmin
    .from('enrollments')
    .select('sessions_remaining')
    .eq('id', enrollmentId)
    .single();

  const leftover = enrollment?.sessions_remaining ?? 0;

  // Absorb ALL sessions (positive and negative) into pool for equal sharing.
  // Display formula: floor(pool.sessions_remaining / siblingCount) + positionBonus
  // Debt is shared equally among siblings (family pool model).
  if (leftover !== 0) {
    const pool = await getPoolById(poolId);
    if (pool) {
      await supabaseAdmin
        .from('shared_session_pools')
        .update({
          sessions_remaining: pool.sessions_remaining + leftover,
          updated_at: new Date().toISOString(),
        })
        .eq('id', poolId);
    }
  }

  // Link THIS enrollment to the pool (regardless of whether the student is
  // already in the pool via another enrollment). Reset its sessions to 0 —
  // all session bookkeeping happens at the pool level from now on.
  await supabaseAdmin
    .from('enrollments')
    .update({ sessions_remaining: 0, pool_id: poolId })
    .eq('id', enrollmentId);

  // pool_students has one row per (pool, student). If the student is already
  // in the pool (via a different enrollment), don't insert a duplicate; just
  // return that existing row. This supports a student with multiple weekly
  // slots in the same course pool.
  const { data: existing } = await supabaseAdmin
    .from('pool_students')
    .select('*')
    .eq('pool_id', poolId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (existing) {
    return existing as PoolStudent;
  }

  // Seed pool_students.sessions_remaining with the leftover the student brought
  // in — that's how the per-student tracking knows about absorbed sessions.
  // Without this, R1 redistribution on the next payment sees the contributing
  // member at 0 instead of their actual balance.
  const insertData: PoolStudentInsert = {
    pool_id: poolId,
    student_id: studentId,
    enrollment_id: enrollmentId,
    sessions_remaining: leftover,
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

// ============================================
// REDISTRIBUTION ON INACTIVE
// ============================================

/**
 * Redistribute pool sessions when a pooled sibling becomes inactive.
 *
 * Key design: enrollment.pool_id is KEPT so the student can be restored later.
 * Only pool_students row is removed (so siblingCount drops).
 * The display formula (pool.sessions_remaining / siblingCount) automatically
 * gives remaining siblings more sessions when siblingCount drops.
 */
export async function redistributePoolOnInactive(
  enrollmentId: string,
  studentId: string
): Promise<void> {
  // 1. Find pool membership for this enrollment
  const { data: poolStudent } = await supabaseAdmin
    .from('pool_students')
    .select('pool_id')
    .eq('enrollment_id', enrollmentId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (!poolStudent?.pool_id) return; // Not in a pool

  const poolId = poolStudent.pool_id;
  const pool = await getPoolById(poolId);
  if (!pool) return;

  // 2. Remove from pool_students only — keep enrollment.pool_id for restoration
  await supabaseAdmin
    .from('pool_students')
    .delete()
    .eq('pool_id', poolId)
    .eq('student_id', studentId);

  // 3. Check remaining members
  const { data: remainingMembers } = await supabaseAdmin
    .from('pool_students')
    .select('student_id, enrollment_id')
    .eq('pool_id', poolId);

  if ((remainingMembers ?? []).length === 0) {
    // No members left → soft delete pool
    await softDeletePool(poolId);
  } else if ((remainingMembers ?? []).length === 1) {
    // Only 1 sibling left → auto-convert to individual
    // Give ALL pool.sessions_remaining to remaining student (both positive and negative debt)
    // Debt is a family obligation — when one sibling leaves, remaining inherits the full pool state
    const lastMember = remainingMembers![0];

    // enrollment.sessions_remaining should be 0 (absorbed into pool), but include for safety
    const { data: lastEnrollData } = await supabaseAdmin
      .from('enrollments')
      .select('sessions_remaining')
      .eq('id', lastMember.enrollment_id)
      .single();
    const enrollmentOffset = lastEnrollData?.sessions_remaining ?? 0;

    await supabaseAdmin
      .from('enrollments')
      .update({
        sessions_remaining: enrollmentOffset + pool.sessions_remaining,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lastMember.enrollment_id);

    // Remove from pool_students (display logic checks pool_students membership, not pool_id)
    await supabaseAdmin
      .from('pool_students')
      .delete()
      .eq('pool_id', poolId)
      .eq('student_id', lastMember.student_id);

    // Soft delete the pool
    await softDeletePool(poolId);
  }
  // If 2+ members remain, pool continues — sessions auto-redistribute via display formula
}

/**
 * Restore a student back into their pool when their enrollment becomes active again.
 *
 * Uses enrollment.pool_id (preserved during redistribution) as the breadcrumb.
 * Re-adds to pool_students so they share sessions again.
 * The display formula automatically splits pool.sessions_remaining among all members.
 */
export async function restoreStudentToPool(
  enrollmentId: string,
  studentId: string
): Promise<void> {
  // 1. Check enrollment still has pool_id breadcrumb
  const { data: enrollment } = await supabaseAdmin
    .from('enrollments')
    .select('id, pool_id')
    .eq('id', enrollmentId)
    .single();

  if (!enrollment?.pool_id) return; // Not a pooled enrollment

  const poolId = enrollment.pool_id;

  // 2. Check if already in pool_students (no double-add)
  const { data: existing } = await supabaseAdmin
    .from('pool_students')
    .select('id')
    .eq('pool_id', poolId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (existing) return; // Already active in pool

  // 3. Get pool — might be soft-deleted if auto-converted to individual (2→1 case)
  const { data: pool } = await supabaseAdmin
    .from('shared_session_pools')
    .select('*')
    .eq('id', poolId)
    .single();

  if (!pool) return;

  // Un-delete pool if it was soft-deleted
  if (pool.deleted_at) {
    await supabaseAdmin
      .from('shared_session_pools')
      .update({ deleted_at: null, updated_at: new Date().toISOString() })
      .eq('id', poolId);
  }

  // 4. Re-add restored student to pool_students
  await supabaseAdmin
    .from('pool_students')
    .insert({
      pool_id: poolId,
      student_id: studentId,
      enrollment_id: enrollmentId,
    });

  // 5. Absorb restored student's ALL enrollment sessions into pool (positive and negative)
  const { data: enrollmentSessions } = await supabaseAdmin
    .from('enrollments')
    .select('sessions_remaining')
    .eq('id', enrollmentId)
    .single();

  const leftover = enrollmentSessions?.sessions_remaining ?? 0;

  let currentPool = await getPoolById(poolId);
  if (currentPool && leftover !== 0) {
    await supabaseAdmin
      .from('shared_session_pools')
      .update({
        sessions_remaining: currentPool.sessions_remaining + leftover,
        updated_at: new Date().toISOString(),
      })
      .eq('id', poolId);
  }
  // Reset enrollment to 0 — all sessions tracked in pool
  await supabaseAdmin
    .from('enrollments')
    .update({ sessions_remaining: 0 })
    .eq('id', enrollmentId);

  // 6. Check if there are other students with this pool_id breadcrumb who are NOT in pool_students
  //    This handles the 2→1 auto-convert case: when the cancelled sibling is restored,
  //    the other sibling (who was converted to individual) must also rejoin the pool.
  const { data: breadcrumbEnrollments } = await supabaseAdmin
    .from('enrollments')
    .select('id, student_id, sessions_remaining, status')
    .eq('pool_id', poolId)
    .neq('student_id', studentId)
    .is('deleted_at', null);

  for (const otherEnroll of breadcrumbEnrollments ?? []) {
    // Skip inactive enrollments (they were separately cancelled/expired)
    if (['cancelled', 'completed', 'expired'].includes(otherEnroll.status)) continue;

    // Check if already in pool_students
    const { data: alreadyInPool } = await supabaseAdmin
      .from('pool_students')
      .select('id')
      .eq('pool_id', poolId)
      .eq('student_id', otherEnroll.student_id)
      .maybeSingle();

    if (alreadyInPool) continue; // Already active in pool

    // Re-add this sibling to pool_students
    await supabaseAdmin
      .from('pool_students')
      .insert({
        pool_id: poolId,
        student_id: otherEnroll.student_id,
        enrollment_id: otherEnroll.id,
      });

    // Absorb ALL sessions back into pool (positive and negative)
    const siblingLeftover = otherEnroll.sessions_remaining ?? 0;
    if (siblingLeftover !== 0) {
      currentPool = await getPoolById(poolId);
      if (currentPool) {
        await supabaseAdmin
          .from('shared_session_pools')
          .update({
            sessions_remaining: currentPool.sessions_remaining + siblingLeftover,
            updated_at: new Date().toISOString(),
          })
          .eq('id', poolId);
      }
    }
    // Reset enrollment to 0 — all sessions tracked in pool
    await supabaseAdmin
      .from('enrollments')
      .update({ sessions_remaining: 0 })
      .eq('id', otherEnroll.id);
  }
}

// ============================================
// AUTO-POOL + PER-STUDENT TRACKING (migration 027 era)
// ============================================

/**
 * Find an existing live pool for this parent+course pair, or null. Used by
 * the auto-pool logic on add-student and on payment approval to route
 * sessions into the shared bucket.
 */
export async function findPoolForParentCourse(
  parentId: string,
  courseId: string,
): Promise<SharedSessionPool | null> {
  const { data } = await supabaseAdmin
    .from('shared_session_pools')
    .select('*')
    .eq('parent_id', parentId)
    .eq('course_id', courseId)
    .is('deleted_at', null)
    .maybeSingle();
  return (data as SharedSessionPool | null) ?? null;
}

/**
 * Pool's effective capacity = MAX(max_students_per_pool) across all
 * pricing rows that have ever contributed sessions to this pool. Reads from
 * the payments table joined to course_pricing.
 */
export async function getPoolEffectiveCapacity(poolId: string): Promise<number> {
  const { data: payments } = await supabaseAdmin
    .from('payments')
    .select('package_id, status')
    .eq('pool_id', poolId)
    .eq('status', 'paid');
  const pkgIds = Array.from(new Set((payments ?? []).map((p) => p.package_id).filter((x): x is string => Boolean(x))));
  if (pkgIds.length === 0) return 1;
  const { data: pricings } = await supabaseAdmin
    .from('course_pricing')
    .select('max_students_per_pool')
    .in('id', pkgIds);
  let max = 1;
  for (const p of (pricings ?? []) as { max_students_per_pool: number | null }[]) {
    if ((p.max_students_per_pool ?? 1) > max) max = p.max_students_per_pool ?? 1;
  }
  return max;
}

/**
 * Credit N sessions into a pool using R1 redistribution:
 *   total = sum(pool_students.sessions_remaining) + N
 *   each member gets floor(total / member_count)
 *   remainder one-by-one starting from payerStudentId
 *
 * Also updates `current_window_pricing_id` to the source pricing (the window
 * length goes by whatever was most recently credited) and clears
 * `window_started_at` so the next attendance will re-arm it.
 */
export async function creditSessionsToPool(
  poolId: string,
  sessionsToAdd: number,
  payerStudentId: string,
  sourcePricingId: string | null,
): Promise<void> {
  const { data: members } = await supabaseAdmin
    .from('pool_students')
    .select('id, student_id, sessions_remaining, joined_at')
    .eq('pool_id', poolId)
    .order('joined_at', { ascending: true });

  const memberRows = (members ?? []) as Array<{
    id: string;
    student_id: string;
    sessions_remaining: number;
    joined_at: string;
  }>;
  if (memberRows.length === 0) return;

  const currentTotal = memberRows.reduce((s, m) => s + (m.sessions_remaining ?? 0), 0);
  const total = currentTotal + sessionsToAdd;
  const memberCount = memberRows.length;
  const share = Math.floor(total / memberCount);
  let remainder = total - share * memberCount;

  // Order remainder distribution: payer first, then joined_at oldest → newest.
  const ordered = [...memberRows].sort((a, b) => {
    if (a.student_id === payerStudentId && b.student_id !== payerStudentId) return -1;
    if (a.student_id !== payerStudentId && b.student_id === payerStudentId) return 1;
    return a.joined_at.localeCompare(b.joined_at);
  });

  for (const m of ordered) {
    const bonus = remainder > 0 ? 1 : 0;
    if (bonus > 0) remainder -= 1;
    await supabaseAdmin
      .from('pool_students')
      .update({ sessions_remaining: share + bonus })
      .eq('id', m.id);
  }

  // Mirror the pool-wide bucket so legacy code paths still see the total.
  await supabaseAdmin
    .from('shared_session_pools')
    .update({
      sessions_remaining: total,
      total_sessions: total,
      current_window_pricing_id: sourcePricingId,
      window_started_at: null, // re-arm; first attendance starts the clock
      updated_at: new Date().toISOString(),
    })
    .eq('id', poolId);
}

/**
 * Deduct one session from a specific student's count inside the pool, and
 * arm the completion/expiry window if it isn't already (the rule: window
 * starts on the first attendance after the latest package credit).
 */
export async function deductPoolSessionForStudent(
  poolId: string,
  studentId: string,
  attendanceDate: string,
): Promise<void> {
  const { data: row } = await supabaseAdmin
    .from('pool_students')
    .select('id, sessions_remaining')
    .eq('pool_id', poolId)
    .eq('student_id', studentId)
    .maybeSingle();
  if (!row) return;

  await supabaseAdmin
    .from('pool_students')
    .update({ sessions_remaining: (row.sessions_remaining ?? 0) - 1 })
    .eq('id', row.id);

  // Mirror the pool-wide bucket — keeps reporting/legacy queries consistent.
  const pool = await getPoolById(poolId);
  if (pool) {
    await supabaseAdmin
      .from('shared_session_pools')
      .update({
        sessions_remaining: pool.sessions_remaining - 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', poolId);

    // Start the window on first attendance after credit.
    if (!pool.window_started_at) {
      await supabaseAdmin
        .from('shared_session_pools')
        .update({ window_started_at: attendanceDate })
        .eq('id', poolId);
    }
  }
}

/**
 * If the pool now has exactly 1 active member, dissolve it: copy the
 * survivor's per-student count back onto enrollment.sessions_remaining,
 * clear pool_id, and soft-delete the pool row. Used after a sibling cancel.
 *
 * Re-pooling on restoration is handled by `restoreStudentToPool`.
 */
export async function dissolvePoolIfOneMember(poolId: string): Promise<boolean> {
  const { data: members } = await supabaseAdmin
    .from('pool_students')
    .select('id, student_id, enrollment_id, sessions_remaining')
    .eq('pool_id', poolId);
  const live = (members ?? []) as Array<{
    id: string;
    student_id: string;
    enrollment_id: string;
    sessions_remaining: number;
  }>;
  if (live.length !== 1) return false;

  const sole = live[0];
  await supabaseAdmin
    .from('enrollments')
    .update({
      sessions_remaining: sole.sessions_remaining,
      pool_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sole.enrollment_id);
  await supabaseAdmin.from('pool_students').delete().eq('id', sole.id);
  await supabaseAdmin
    .from('shared_session_pools')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', poolId);
  return true;
}

/**
 * Voucher award + session expiry sweep for a pool. Called from the
 * attendance-mark route and from the daily cron.
 *
 *   - If pool sessions_remaining = 0 and within completion window → award
 *     per-member voucher (one row in `vouchers` per member, sourced from
 *     pricing.voucher_id / voucher_amount). No-op if voucher_id is null.
 *   - If past expiry window with sessions still > 0 → zero out remaining.
 *
 * Idempotent: vouchers are deduplicated by (student_id, source_pool_id, level).
 */
export async function checkPoolCompletionOrExpiry(poolId: string): Promise<void> {
  const pool = await getPoolById(poolId);
  if (!pool || !pool.window_started_at) return;
  if (!pool.current_window_pricing_id) return;

  const { data: pricing } = await supabaseAdmin
    .from('course_pricing')
    .select('expiry_weeks, completion_months, voucher_id, voucher_amount')
    .eq('id', pool.current_window_pricing_id)
    .maybeSingle();
  if (!pricing) return;

  const start = new Date(pool.window_started_at + 'T00:00:00');
  const now = new Date();

  // Completion: if pool fully consumed AND within completion_months → voucher.
  if (pool.sessions_remaining <= 0 && pricing.completion_months) {
    const deadline = new Date(start);
    deadline.setMonth(deadline.getMonth() + pricing.completion_months);
    if (now <= deadline && pricing.voucher_id) {
      const { data: members } = await supabaseAdmin
        .from('pool_students')
        .select('student_id, enrollment_id')
        .eq('pool_id', poolId);
      for (const m of (members ?? []) as { student_id: string; enrollment_id: string }[]) {
        // Dedup: one earned voucher per (student, pricing, enrollment).
        const { data: existing } = await supabaseAdmin
          .from('vouchers')
          .select('id')
          .eq('student_id', m.student_id)
          .eq('pricing_id', pool.current_window_pricing_id)
          .eq('enrollment_id', m.enrollment_id)
          .is('deleted_at', null)
          .maybeSingle();
        if (existing) continue;
        await supabaseAdmin.from('vouchers').insert({
          student_id: m.student_id,
          enrollment_id: m.enrollment_id,
          pricing_id: pool.current_window_pricing_id,
          course_id: pool.course_id,
          amount: pricing.voucher_amount ?? null,
          status: 'earned',
          earned_at: new Date().toISOString(),
        });
      }
    }
  }

  // Expiry: if past expiry_weeks and still has unused sessions → forfeit.
  if (pricing.expiry_weeks && pool.sessions_remaining > 0) {
    const expiryDeadline = new Date(start);
    expiryDeadline.setDate(expiryDeadline.getDate() + pricing.expiry_weeks * 7);
    if (now > expiryDeadline) {
      await supabaseAdmin
        .from('pool_students')
        .update({ sessions_remaining: 0 })
        .eq('pool_id', poolId);
      await supabaseAdmin
        .from('shared_session_pools')
        .update({ sessions_remaining: 0, updated_at: new Date().toISOString() })
        .eq('id', poolId);
    }
  }
}
