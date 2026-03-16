import { supabaseAdmin } from "@/db";
import type {
  Student,
  StudentInsert,
  StudentUpdate,
  StudentWithBranch,
  StudentWithEnrollments,
  StudentFull,
  EnrollmentStatus,
  EnrollmentInsert,
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

export interface StudentEnrollmentForPayment {
  courseId: string;
  courseName: string;
}

export interface StudentForPayment {
  id: string;
  name: string;
  branchName: string;
  parentName: string | null;
  parentPhone: string | null;
  enrollments: StudentEnrollmentForPayment[];
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
        parent:parents(name, phone)
      ),
      enrollments(
        id,
        course_id,
        course:courses(id, name)
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
      parent: { name: string; phone: string | null } | null;
    }>;
    const parentName = parentStudents?.[0]?.parent?.name ?? null;
    const parentPhone = parentStudents?.[0]?.parent?.phone ?? null;

    // Extract enrollments with course info
    const enrollmentsData = student.enrollments as unknown as Array<{
      id: string;
      course_id: string;
      course: { id: string; name: string } | null;
    }>;

    const enrollments: StudentEnrollmentForPayment[] = (enrollmentsData ?? [])
      .filter((e) => e.course !== null)
      .map((e) => ({
        courseId: e.course!.id,
        courseName: e.course!.name,
      }));

    return {
      id: student.id,
      name: student.name,
      branchName: branch.name,
      parentName,
      parentPhone,
      enrollments,
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

export async function linkParentToStudent(
  parentId: string,
  studentId: string,
  relationship?: string | null
): Promise<boolean> {
  // First check if link already exists
  const { data: existing } = await supabaseAdmin
    .from('parent_students')
    .select('id')
    .eq('parent_id', parentId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (existing) {
    // Update the relationship if it exists
    const { error: updateError } = await supabaseAdmin
      .from('parent_students')
      .update({ relationship: relationship || 'parent' })
      .eq('id', existing.id);

    if (updateError) {
      console.error('Error updating parent-student relationship:', updateError);
      return false;
    }
    return true;
  }

  // Create new link
  const { error } = await supabaseAdmin
    .from('parent_students')
    .insert({
      parent_id: parentId,
      student_id: studentId,
      relationship: relationship || 'parent'
    });

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

// ============================================
// TABLE VIEW OPERATIONS
// ============================================

export interface StudentTableRow {
  id: string;
  studentId: string | null;
  photo: string | null;
  coverPhoto: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  gender: "male" | "female" | "other" | null;
  schoolName: string | null;
  branchId: string;
  branchName: string;
  programName: string | null;
  courseId: string | null;
  instructorId: string | null;
  packageId: string | null;
  packageType: "monthly" | "session" | null;
  scheduleDays: string[];
  scheduleTime: string | null;
  enrollDate: string;
  expiredDate: string | null;
  enrollmentStatus: EnrollmentStatus | null;
  level: number;
  adcoinBalance: number;
  // Period Active info
  sessionsRemaining: number | null;
  periodStart: string | null;
  periodEnd: string | null;
  packageDuration: number | null;
  // Pool info (for sibling sharing)
  isPooled: boolean;
  poolId: string | null;
  poolName: string | null;
  poolSiblings: string[] | null; // Sibling names in the pool
  // Session count - total attended sessions
  sessionCount: number;
  // Payment info - total paid and sessions bought
  paymentCount: {
    totalPaid: number;
    totalSessionsBought: number;
  };
  // Parent info
  parentId: string | null;
  parentName: string | null;
  parentPhone: string | null;
  parentEmail: string | null;
  parentAddress: string | null;
  parentPostcode: string | null;
  parentCity: string | null;
  parentRelationship: string | null;
}

/**
 * Optimized query for student table view
 * Uses valid Supabase query syntax matching actual database schema
 */
export async function getStudentsForTable(
  userEmail: string,
  branchId?: string
): Promise<StudentTableRow[]> {
  // Get user's branch access
  const { getUserBranchIdByEmail } = await import("./users");
  const userBranchId = await getUserBranchIdByEmail(userEmail);

  // Build base query with actual database columns
  let query = supabaseAdmin
    .from('students')
    .select(`
      id,
      student_id,
      photo,
      cover_photo,
      name,
      email,
      phone,
      date_of_birth,
      gender,
      school_name,
      branch_id,
      level,
      adcoin_balance,
      created_at,
      branch:branches(name),
      enrollments(
        id,
        status,
        enrolled_at,
        sessions_remaining,
        period_start,
        day_of_week,
        start_time,
        end_time,
        schedule,
        package_id,
        instructor_id,
        pool_id,
        course:courses(id, name),
        package:course_pricing(id, package_type, duration),
        pool:shared_session_pools(id, sessions_remaining, total_sessions, name),
        attendance(date, status)
      ),
      parent_students(
        relationship,
        parent:parents(
          id,
          name,
          phone,
          email,
          address,
          postcode,
          city
        )
      ),
      payments(amount, status, course_id, package_id)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  // Apply branch filter
  const effectiveBranchId = branchId || userBranchId;
  if (effectiveBranchId) {
    query = query.eq('branch_id', effectiveBranchId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching students for table:', error);
    return [];
  }

  // Process results with defensive typing
  return (data ?? []).map((student: any) => {
    // Get most relevant active enrollment
    const activeEnrollment = student.enrollments
      ?.filter((e: any) => e.status === 'active')
      .sort((a: any, b: any) =>
        new Date(b.enrolled_at || 0).getTime() - new Date(a.enrolled_at || 0).getTime()
      )[0] || null;

    // Parse schedule from enrollment - prefer new schedule field
    let scheduleDays: string[] = [];
    let scheduleTime: string | null = null;

    if (activeEnrollment?.schedule) {
      // New format: JSON array of {day, time} objects
      try {
        const scheduleEntries = JSON.parse(activeEnrollment.schedule);
        if (Array.isArray(scheduleEntries)) {
          scheduleDays = scheduleEntries.map((e: { day: string }) => e.day).filter(Boolean);
          // Build time string from all entries
          const times = scheduleEntries
            .map((e: { day: string; time: string }) => e.time)
            .filter(Boolean);
          scheduleTime = times.length > 0 ? times.join(', ') : null;
        }
      } catch {
        // Fall back to legacy parsing
      }
    }

    // Fall back to legacy day_of_week/start_time if schedule not available
    if (scheduleDays.length === 0 && activeEnrollment?.day_of_week) {
      try {
        const parsed = JSON.parse(activeEnrollment.day_of_week);
        scheduleDays = Array.isArray(parsed) ? parsed : [activeEnrollment.day_of_week];
      } catch {
        scheduleDays = activeEnrollment.day_of_week.split(',').map((d: string) => d.trim());
      }
    }

    if (!scheduleTime && activeEnrollment?.start_time) {
      scheduleTime = activeEnrollment.start_time;
    }

    // Get first parent (if any)
    const firstParentLink = student.parent_students?.[0];
    const parent = firstParentLink?.parent || null;

    // Calculate period active info
    let sessionsRemaining: number | null = null;
    let periodStart: string | null = null;
    let periodEnd: string | null = null;
    const packageDuration: number | null = activeEnrollment?.package?.duration || null;
    const packageType = activeEnrollment?.package?.package_type || null;

    // Check if enrollment is part of a shared sibling pool
    const isPooled = activeEnrollment?.pool_id && activeEnrollment?.pool;
    const poolInfo = isPooled ? activeEnrollment.pool as unknown as {
      id: string;
      sessions_remaining: number;
      total_sessions: number;
      name: string | null;
      sibling_count?: number;
    } : null;

    if (activeEnrollment) {
      // For pooled enrollments, calculate INDIVIDUAL session remaining
      // Each sibling's remaining = (pool.total_sessions / sibling_count) - their_attendance_count
      if (isPooled && poolInfo) {
        // Count this student's attendance (present/late)
        const attendanceRecords = (activeEnrollment.attendance || []) as Array<{ date: string; status: string }>;
        const thisStudentAttendance = attendanceRecords.filter(
          (a) => a.status === 'present' || a.status === 'late'
        ).length;

        // Get sibling count from pool (default to 2 if not available)
        const siblingCount = poolInfo.sibling_count || 2;

        // Calculate this student's allocation
        const thisStudentAllocation = Math.floor(poolInfo.total_sessions / siblingCount);

        // This student's remaining = allocation - their attendance
        sessionsRemaining = thisStudentAllocation - thisStudentAttendance;
      } else {
        // Non-pooled: use enrollment's sessions_remaining
        const enrollmentSessions = activeEnrollment.sessions_remaining ?? 0;

        if (packageType === 'session') {
          // For session-based: show remaining sessions directly
          sessionsRemaining = enrollmentSessions;
        } else if (packageType === 'monthly') {
          // For monthly: sessions_remaining represents months remaining
          // period_start is set when first attendance is marked
          const dbPeriodStart = activeEnrollment.period_start;

          // Always set sessions remaining
          sessionsRemaining = enrollmentSessions;

          // If period_start exists, always show the date range (even if sessions <= 0)
          if (dbPeriodStart) {
            periodStart = dbPeriodStart;
            // Calculate end date: start + 1 month (per period)
            const endDate = new Date(dbPeriodStart);
            endDate.setMonth(endDate.getMonth() + 1);
            const endDateStr = endDate.toISOString().split('T')[0];
            periodEnd = endDateStr;
          }
          // If no period_start and sessions > 0, they're waiting for first attendance
          // If no period_start and sessions <= 0, pending payment before any attendance
        } else {
          // No package type specified, use enrollment sessions
          sessionsRemaining = enrollmentSessions;
        }
      }
    }

    // Calculate session count - total attended sessions across all enrollments
    let sessionCount = 0;
    for (const enrollment of student.enrollments || []) {
      const attendanceRecords = (enrollment.attendance || []) as Array<{ date: string; status: string }>;
      // Count only present and late statuses
      sessionCount += attendanceRecords.filter(
        (a) => a.status === 'present' || a.status === 'late'
      ).length;
    }

    // Calculate payment count - total paid amount and sessions bought
    const payments = (student.payments || []) as Array<{
      amount: number;
      status: string;
      course_id: string | null;
      package_id: string | null;
    }>;
    const paidPayments = payments.filter((p) => p.status === 'paid');
    const totalPaid = paidPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    // Calculate total sessions bought from enrollment package
    // For monthly packages: 4 sessions per month
    // For session packages: use the duration directly
    const enrollmentPackageType = activeEnrollment?.package?.package_type;
    const packageDurationVal = activeEnrollment?.package?.duration ?? 0;
    const sessionsPerPayment = enrollmentPackageType === 'monthly' ? packageDurationVal * 4 : packageDurationVal;
    const totalSessionsBought = paidPayments.length * sessionsPerPayment;

    return {
      id: student.id,
      studentId: student.student_id || null,
      photo: student.photo || null,
      coverPhoto: student.cover_photo || null,
      name: student.name,
      email: student.email || null,
      phone: student.phone || null,
      dateOfBirth: student.date_of_birth || null,
      gender: student.gender || null,
      schoolName: student.school_name || null,
      branchId: student.branch_id,
      branchName: student.branch?.name || 'N/A',
      programName: activeEnrollment?.course?.name || null,
      courseId: activeEnrollment?.course?.id || null,
      instructorId: activeEnrollment?.instructor_id || null,
      packageId: activeEnrollment?.package_id || null,
      packageType: activeEnrollment?.package?.package_type || null,
      scheduleDays,
      scheduleTime,
      enrollDate: student.created_at,
      expiredDate: null, // Can be calculated from sessions_remaining if needed
      enrollmentStatus: activeEnrollment?.status || null,
      level: student.level || 1,
      adcoinBalance: student.adcoin_balance || 0,
      // Period Active info
      sessionsRemaining, // Allow negative for tracking sessions used before payment
      periodStart,
      periodEnd,
      packageDuration,
      // Pool info (for sibling sharing)
      isPooled: !!isPooled,
      poolId: activeEnrollment?.pool_id || null,
      poolName: poolInfo?.name || null,
      poolSiblings: null, // Will be populated via separate query if needed
      // Session count
      sessionCount,
      // Payment info
      paymentCount: {
        totalPaid,
        totalSessionsBought,
      },
      // Parent info
      parentId: parent?.id || null,
      parentName: parent?.name || null,
      parentPhone: parent?.phone || null,
      parentEmail: parent?.email || null,
      parentAddress: parent?.address || null,
      parentPostcode: parent?.postcode || null,
      parentCity: parent?.city || null,
      parentRelationship: firstParentLink?.relationship || null,
    };
  });
}

// ============================================
// ENROLLMENT OPERATIONS
// ============================================

export async function createEnrollment(enrollmentData: EnrollmentInsert): Promise<{ id: string } | null> {
  const { data, error } = await supabaseAdmin
    .from('enrollments')
    .insert(enrollmentData)
    .select('id')
    .single();

  if (error) {
    console.error('Error creating enrollment:', error);
    return null;
  }

  return data;
}

export async function updateOrCreateEnrollment(
  studentId: string,
  enrollmentData: {
    course_id: string;
    package_id: string | null;
    instructor_id: string | null;
    schedule: { day: string; time: string }[];
    sessions_remaining: number;
  }
): Promise<boolean> {
  // Build day_of_week and start_time from schedule for backwards compatibility
  const days = enrollmentData.schedule.map(s => s.day).filter(Boolean);
  const firstEntry = enrollmentData.schedule[0];

  // First, check if student has any active enrollment
  const { data: activeEnrollments, error: fetchError } = await supabaseAdmin
    .from('enrollments')
    .select('id, course_id, sessions_remaining')
    .eq('student_id', studentId)
    .eq('status', 'active')
    .is('deleted_at', null);

  if (fetchError) {
    console.error('Error fetching existing enrollments:', fetchError);
    return false;
  }

  // Find if there's an enrollment for the same course
  const sameCourseEnrollment = activeEnrollments?.find(
    (e) => e.course_id === enrollmentData.course_id
  );

  if (sameCourseEnrollment) {
    // Update existing enrollment for the same course
    // Keep existing sessions_remaining if it has any value (positive from payment, or negative from attendance)
    // Only reset if it's exactly 0 (brand new enrollment with no activity)
    const keepSessions = sameCourseEnrollment.sessions_remaining !== 0;
    console.log('[updateOrCreateEnrollment] Updating enrollment:', {
      enrollmentId: sameCourseEnrollment.id,
      existingSessions: sameCourseEnrollment.sessions_remaining,
      keepSessions,
      scheduleOnly: true, // This is a schedule-only update
    });
    const { error: updateError } = await supabaseAdmin
      .from('enrollments')
      .update({
        package_id: enrollmentData.package_id,
        instructor_id: enrollmentData.instructor_id,
        day_of_week: days.length > 0 ? JSON.stringify(days) : null,
        start_time: firstEntry?.time || null,
        schedule: JSON.stringify(enrollmentData.schedule),
        // Only update sessions if existing is exactly 0 (no payment or attendance yet)
        ...(keepSessions ? {} : { sessions_remaining: 0 }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sameCourseEnrollment.id);

    if (updateError) {
      console.error('Error updating enrollment:', updateError);
      return false;
    }
  } else {
    // Deactivate any other active enrollments
    if (activeEnrollments && activeEnrollments.length > 0) {
      const { error: deactivateError } = await supabaseAdmin
        .from('enrollments')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('student_id', studentId)
        .eq('status', 'active')
        .is('deleted_at', null);

      if (deactivateError) {
        console.error('Error deactivating old enrollments:', deactivateError);
      }
    }

    // Create new enrollment with sessions_remaining = 0
    // Sessions will be added when payment is approved
    const { error: insertError } = await supabaseAdmin
      .from('enrollments')
      .insert({
        student_id: studentId,
        course_id: enrollmentData.course_id,
        package_id: enrollmentData.package_id,
        instructor_id: enrollmentData.instructor_id,
        day_of_week: days.length > 0 ? JSON.stringify(days) : null,
        start_time: firstEntry?.time || null,
        schedule: JSON.stringify(enrollmentData.schedule),
        sessions_remaining: 0, // Start with 0, will be set when payment approved
        status: 'active',
      });

    if (insertError) {
      console.error('Error creating enrollment:', insertError);
      return false;
    }
  }

  return true;
}