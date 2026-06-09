import { supabaseAdmin } from "@/db";
import { notifyStaff } from "./notifications";
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
        branch:branches!students_branch_id_branches_id_fk(*)
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
        branch:branches!students_branch_id_branches_id_fk(*)
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
        branch:branches!students_branch_id_branches_id_fk(*)
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
        branch:branches!students_branch_id_branches_id_fk(*)
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
  // Snapshot the pool_id BEFORE soft-deleting so we can check whether this
  // cancellation collapses a pool back to a single member (Sc 6a/6b).
  const { data: prior } = await supabaseAdmin
    .from('enrollments')
    .select('pool_id')
    .eq('id', enrollmentId)
    .maybeSingle();

  const { error } = await supabaseAdmin
    .from('enrollments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', enrollmentId);

  if (error) {
    console.error('Error soft deleting enrollment:', error);
    return false;
  }

  if (prior?.pool_id) {
    const { dissolvePoolIfOneMember } = await import('./pools');
    await dissolvePoolIfOneMember(prior.pool_id);
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

// ============================================
// ON-DEMAND EXPIRY CHECK
// ============================================

/**
 * Check and expire enrollments where expires_at has passed.
 * Called on-demand from page loads (student, attendance, dashboard).
 */
export async function checkAndExpireEnrollments(): Promise<number> {
  const now = new Date().toISOString();

  // Find active enrollments that have expired
  const { data: expired, error } = await supabaseAdmin
    .from('enrollments')
    .select('id, student_id, pool_id, sessions_remaining')
    .eq('status', 'active')
    .is('deleted_at', null)
    .not('expires_at', 'is', null)
    .lt('expires_at', now);

  if (error) {
    console.error('[Expiry Check] Error finding expired enrollments:', error);
    return 0;
  }

  if (!expired || expired.length === 0) {
    return 0;
  }

  console.log(`[Expiry Check] Found ${expired.length} expired enrollment(s)`);

  let expiredCount = 0;

  for (const enrollment of expired) {
    // Set enrollment to expired and forfeit remaining sessions
    const { error: updateError } = await supabaseAdmin
      .from('enrollments')
      .update({
        status: 'expired',
        sessions_remaining: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', enrollment.id);

    if (updateError) {
      console.error(`[Expiry Check] Error expiring enrollment ${enrollment.id}:`, updateError);
      continue;
    }

    expiredCount++;
    console.log(`[Expiry Check] Expired enrollment ${enrollment.id} for student ${enrollment.student_id}`);

    // If pooled, redistribute pool sessions and keep enrollment.pool_id as
    // a breadcrumb so the student can be restored later (Scenario 7).
    if (enrollment.pool_id) {
      try {
        const { redistributePoolOnInactive } = await import("./pools");
        await redistributePoolOnInactive(enrollment.id, enrollment.student_id);
        console.log(`[Expiry Check] Redistributed pool ${enrollment.pool_id} for student ${enrollment.student_id}`);
      } catch (poolError) {
        console.error(`[Expiry Check] Error redistributing pool:`, poolError);
      }
    }
  }

  return expiredCount;
}

// ============================================
// INACTIVITY REMINDER (Phase A1)
// ============================================

/**
 * Find every active enrollment that hasn't recorded a present/late
 * attendance recently and queue a non-destructive reminder to the
 * branch's assistant_admin + company_admin. NEVER mutates the
 * enrollment — the admin decides whether to cancel.
 *
 * Returns the number of notification rows inserted across all
 * recipients (one row per recipient per matching enrollment, modulo
 * the dedupe window).
 */
export async function checkInactivityAndNotify(): Promise<number> {
  const todayIso = new Date().toISOString().slice(0, 10);

  // 1. Active enrollments with sessions left AND a package row (we need
  //    pricing config to know the warning window). Pull enough columns
  //    to compute everything in one pass without N+1.
  const { data: rows } = await supabaseAdmin
    .from("enrollments")
    .select(`
      id, student_id, package_id, sessions_remaining, expires_at, enrolled_at,
      student:students(id, name, branch_id, branch:branches!students_branch_id_branches_id_fk(parent_id, type)),
      pricing:course_pricing!enrollments_package_id_course_pricing_fk(
        id, expiry_weeks, inactivity_warning_weeks, reminder_interval_days
      )
    `)
    .eq("status", "active")
    .gt("sessions_remaining", 0)
    .is("deleted_at", null);

  if (!rows || rows.length === 0) return 0;

  // 2. For each enrollment, find the most recent present/late attendance.
  //    attendance is keyed by enrollment_id, so group-by-enrollment.
  //    Page through to avoid PostgREST's 1000-row default cap — with
  //    thousands of attendance rows across many fixtures, a single
  //    .in() call would otherwise miss the recent rows for some
  //    enrollments because we order date-desc and stop at row 1000.
  const enrollmentIds = rows.map((r) => r.id);
  const lastByEnrollment = new Map<string, string>();
  if (enrollmentIds.length > 0) {
    const pageSize = 1000;
    let from = 0;
    for (;;) {
      const { data: attRows } = await supabaseAdmin
        .from("attendance")
        .select("enrollment_id, date")
        .in("enrollment_id", enrollmentIds)
        .in("status", ["present", "late"])
        .order("date", { ascending: false })
        .range(from, from + pageSize - 1);
      const page = (attRows ?? []) as Array<{ enrollment_id: string; date: string }>;
      for (const a of page) {
        const prev = lastByEnrollment.get(a.enrollment_id);
        if (!prev || a.date > prev) lastByEnrollment.set(a.enrollment_id, a.date);
      }
      if (page.length < pageSize) break;
      from += pageSize;
    }
  }

  // 3. Walk each enrollment, decide if it's overdue, dedupe against
  //    recent notifications, and fire if needed.
  let inserted = 0;

  for (const r of rows as any[]) {
    const student = r.student;
    const pricing = r.pricing;
    if (!student || !student.branch_id) continue;

    const branchId: string = student.branch_id;
    const branch = student.branch ?? null;
    const companyId: string | null =
      branch?.type === "company" ? branchId : branch?.parent_id ?? null;
    if (!companyId) continue;

    // Resolve the warning window. Explicit per-pricing wins; otherwise
    // half the expiry window in weeks (min 2); otherwise a flat 4 weeks.
    const explicitWeeks: number | null = pricing?.inactivity_warning_weeks ?? null;
    const expiryWeeks: number | null = pricing?.expiry_weeks ?? null;
    const warnWeeks =
      explicitWeeks ??
      (expiryWeeks != null ? Math.max(2, Math.floor(expiryWeeks / 2)) : 4);
    const reminderIntervalDays: number = pricing?.reminder_interval_days ?? 7;

    // Anchor for inactivity: last attendance if present, else enrolled_at.
    const lastDate = lastByEnrollment.get(r.id) ?? r.enrolled_at?.slice(0, 10) ?? todayIso;
    const lastTs = new Date(lastDate + "T00:00:00").getTime();
    const ageDays = Math.floor((Date.now() - lastTs) / (1000 * 60 * 60 * 24));
    if (ageDays < warnWeeks * 7) continue;

    // Dedupe: skip if a reminder for this enrollment was inserted within
    // the last reminder_interval_days.
    const sinceIso = new Date(Date.now() - reminderIntervalDays * 24 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabaseAdmin
      .from("notifications")
      .select("id")
      .eq("type", "inactivity_reminder")
      .gte("created_at", sinceIso)
      .contains("data", { enrollmentId: r.id })
      .limit(1);
    if ((recent ?? []).length > 0) continue;

    const sessionsLeft = r.sessions_remaining ?? 0;
    const expiryNote = r.expires_at
      ? ` Package expires ${String(r.expires_at).slice(0, 10)}.`
      : "";
    const ageWeeks = Math.floor(ageDays / 7);

    const sent = await notifyStaff(
      { roles: ["assistant_admin", "company_admin"], branchId, companyId },
      {
        type: "inactivity_reminder",
        title: "Student hasn't attended recently",
        body: `${student.name} has been inactive for ${ageWeeks} week${ageWeeks === 1 ? "" : "s"}. ${sessionsLeft} session${sessionsLeft === 1 ? "" : "s"} remaining.${expiryNote}`,
        link: `/student`,
        data: {
          enrollmentId: r.id,
          studentId: r.student_id,
          weeksInactive: ageWeeks,
          sessionsRemaining: sessionsLeft,
        },
      },
    );
    inserted += sent;
  }

  return inserted;
}

// ============================================
// COURSE-SWITCH (Phase A2)
// ============================================

export interface SwitchCourseResult {
  fromEnrollmentId: string;
  toEnrollmentId: string;
  sessionsMoved: number;
}

/**
 * Move a student from one course to another while carrying their
 * remaining sessions over 1:1. The source enrollment is marked
 * `status='course_switched'` (NOT soft-deleted) so it stays in audit
 * history; a brand-new active enrollment is created on the target
 * course with the carry-over balance and the same package binding.
 *
 * If the source enrollment is pooled, the student is detached from
 * the pool first; that may dissolve the pool back to an individual
 * for the surviving sibling (existing `dissolvePoolIfOneMember`
 * handles that).
 */
export async function switchEnrollmentCourse(
  enrollmentId: string,
  newCourseId: string,
  actorUserId: string | null,
  notes?: string | null,
): Promise<SwitchCourseResult | null> {
  const source = await getEnrollmentById(enrollmentId);
  if (!source) return null;
  if (source.status !== "active") {
    throw new Error(`Cannot switch course on enrollment in status ${source.status}.`);
  }
  if (source.course_id === newCourseId) {
    throw new Error("Target course is the same as the current course.");
  }

  // For pooled sources: detach the student from the pool. The remaining
  // members keep their per-student counts; the pool dissolves to an
  // individual enrollment for the survivor if only one sibling is left.
  let carryOver = source.sessions_remaining ?? 0;
  if (source.pool_id) {
    const { removeStudentFromPool, dissolvePoolIfOneMember } = await import("./pools");
    // The student's pool-side balance is the source of truth when pooled.
    const { data: poolStudent } = await supabaseAdmin
      .from("pool_students")
      .select("sessions_remaining")
      .eq("pool_id", source.pool_id)
      .eq("student_id", source.student_id)
      .maybeSingle();
    carryOver = poolStudent?.sessions_remaining ?? 0;
    await removeStudentFromPool(source.pool_id, source.student_id);
    await dissolvePoolIfOneMember(source.pool_id);
  }

  // Create the destination enrollment in the new course. Keep the same
  // schedule fields, instructor, and package so the admin doesn't have
  // to refill them — they can edit afterward if the new course has a
  // different cadence.
  const inserted = await createEnrollment({
    student_id: source.student_id,
    course_id: newCourseId,
    package_id: source.package_id,
    instructor_id: source.instructor_id,
    day_of_week: source.day_of_week,
    start_time: source.start_time,
    end_time: source.end_time,
    schedule: source.schedule,
    status: "active",
    sessions_remaining: carryOver,
    period_start: null,
    pool_id: null,
    expires_at: source.expires_at,
    level: 1,
    adcoin_balance: 0,
  } as EnrollmentInsert);

  if (!inserted) {
    throw new Error("Failed to create destination enrollment.");
  }

  // Mark source as switched. We don't soft-delete so audit + history
  // queries still see the row.
  await supabaseAdmin
    .from("enrollments")
    .update({
      status: "course_switched" as EnrollmentStatus,
      sessions_remaining: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", source.id);

  // Insert the audit row.
  await supabaseAdmin.from("enrollment_course_switches").insert({
    from_enrollment_id: source.id,
    to_enrollment_id: inserted.id,
    sessions_moved: carryOver,
    actor_user_id: actorUserId,
    notes: notes ?? null,
  });

  // Best-effort parent notification — fire-and-forget any errors.
  try {
    const { data: psRows } = await supabaseAdmin
      .from("parent_students")
      .select("parent_id")
      .eq("student_id", source.student_id);
    const { data: courseRows } = await supabaseAdmin
      .from("courses")
      .select("id, name")
      .in("id", [source.course_id, newCourseId]);
    const courseNames = new Map((courseRows ?? []).map((c) => [c.id, c.name]));
    const fromName = courseNames.get(source.course_id) ?? "previous course";
    const toName = courseNames.get(newCourseId) ?? "new course";
    const { notifyParent } = await import("./notifications");
    for (const ps of psRows ?? []) {
      await notifyParent(ps.parent_id, {
        type: "course_switched",
        title: "Course updated",
        body: `Your child has been moved from ${fromName} to ${toName}. ${carryOver} session${carryOver === 1 ? "" : "s"} carried over.`,
        link: `/parent`,
        data: { fromCourseId: source.course_id, toCourseId: newCourseId, sessionsMoved: carryOver },
      });
    }
  } catch (err) {
    console.warn("[switchEnrollmentCourse] parent notify failed:", err);
  }

  return {
    fromEnrollmentId: source.id,
    toEnrollmentId: inserted.id,
    sessionsMoved: carryOver,
  };
}
