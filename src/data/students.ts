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
  /** If this entry represents a shared pool, the pool ID */
  poolId?: string;
  /** All student IDs in the shared pool (for creating payments) */
  poolStudentIds?: string[];
}

export async function getStudentsForPayment(userEmail: string): Promise<StudentForPayment[]> {
  // Import user helpers dynamically to avoid circular imports
  const { getUserBranchIds, getUserByEmail, isSuperAdmin } = await import("./users");
  const branchIds = await getUserBranchIds(userEmail);
  const user = await getUserByEmail(userEmail);
  const useCityName = !(isSuperAdmin(userEmail) || user?.role === "super_admin");

  let query = supabaseAdmin
    .from('students')
    .select(`
      id,
      name,
      branch:branches!inner(name, city),
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

  if (branchIds) {
    query = query.in('branch_id', branchIds);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching students for payment:', error);
    return [];
  }

  const result: StudentForPayment[] = (data ?? []).map((student) => {
    const branch = student.branch as unknown as { name: string; city: string | null };
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
      branchName: useCityName ? (branch.city || branch.name) : branch.name,
      parentName,
      parentPhone,
      enrollments,
    };
  });

  // Also fetch shared pools and create combined entries (exclude monthly packages)
  const { data: pools } = await supabaseAdmin
    .from('shared_session_pools')
    .select(`
      id,
      course_id,
      package_id,
      course:courses(id, name)
    `)
    .is('deleted_at', null);

  for (const pool of pools ?? []) {
    // Skip pools with monthly packages — monthly subscriptions are per-student
    if (pool.package_id) {
      const { data: poolPkg } = await supabaseAdmin
        .from('course_pricing')
        .select('package_type')
        .eq('id', pool.package_id)
        .single();
      if (poolPkg?.package_type === 'monthly') continue;
    }
    // Get students in this pool
    const { data: poolStudents } = await supabaseAdmin
      .from('pool_students')
      .select('student_id')
      .eq('pool_id', pool.id);
    if (!poolStudents || poolStudents.length < 2) continue;

    const poolStudentIds = poolStudents.map((ps: { student_id: string }) => ps.student_id);
    // Find matching individual student entries we already built
    const matchedStudents = result.filter((s: StudentForPayment) => poolStudentIds.includes(s.id));
    if (matchedStudents.length < 2) continue;

    const course = pool.course as unknown as { id: string; name: string } | null;
    const combinedName = matchedStudents.map((s: StudentForPayment) => s.name).join(' & ');
    // Use first student's info for parent/branch
    const first = matchedStudents[0];

    result.push({
      id: `pool:${pool.id}:${first.id}`,
      name: combinedName,
      branchName: first.branchName,
      parentName: first.parentName,
      parentPhone: first.parentPhone,
      enrollments: course ? [{ courseId: course.id, courseName: course.name }] : [],
      poolId: pool.id,
      poolStudentIds: matchedStudents.map((s: StudentForPayment) => s.id),
    });
  }

  return result;
}

export async function searchStudents(query: string, branchId?: string): Promise<Student[]> {
  let dbQuery = supabaseAdmin
    .from('students')
    .select('*')
    .is('deleted_at', null)
    .or(`name.ilike.%${query}%,student_id.ilike.%${query}%`)
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
  displayId: string | null;
  coins: number;
  photo: string | null;
}

export async function getAdcoinRanking(
  branchId?: string,
  limit = 20,
  offset = 0
): Promise<{ entries: AdcoinRankingEntry[]; hasMore: boolean }> {
  let query = supabaseAdmin
    .from('students')
    .select('id, name, student_id, adcoin_balance, photo')
    .is('deleted_at', null)
    .order('adcoin_balance', { ascending: false })
    .range(offset, offset + limit - 1);

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching adcoin ranking:', error);
    return { entries: [], hasMore: false };
  }

  const entries = (data ?? []).map((s, index) => ({
    rank: offset + index + 1,
    studentId: s.id,
    studentName: s.name,
    displayId: s.student_id,
    coins: s.adcoin_balance ?? 0,
    photo: s.photo,
  }));

  return { entries, hasMore: (data ?? []).length > limit };
}

export async function getStudentRank(
  studentId: string,
  branchId?: string
): Promise<number> {
  // Get the student's balance
  const { data: student } = await supabaseAdmin
    .from('students')
    .select('adcoin_balance')
    .eq('id', studentId)
    .is('deleted_at', null)
    .single();

  if (!student) return 1;

  // Count students with higher balance
  let query = supabaseAdmin
    .from('students')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)
    .gt('adcoin_balance', student.adcoin_balance ?? 0);

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { count } = await query;
  return (count ?? 0) + 1;
}

// ============================================
// AUTH OPERATIONS
// ============================================

export async function getStudentByUsername(username: string): Promise<Student | null> {
  const { data, error } = await supabaseAdmin
    .from('students')
    .select('*')
    .eq('username', username)
    .is('deleted_at', null)
    .single();

  if (error) {
    console.error('Error fetching student by username:', error);
    return null;
  }

  return data;
}

export async function updateStudentCredentials(
  id: string,
  username: string,
  passwordHash: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('students')
    .update({ username, password_hash: passwordHash })
    .eq('id', id);

  if (error) {
    console.error('Error updating student credentials:', error);
    throw new Error('Failed to update student credentials');
  }
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
  enrollmentId: string | null;
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
  // Get user's branch access — resolve company IDs to all child HQ/branch IDs
  const { getUserBranchIds, getUserByEmail, isSuperAdmin } = await import("./users");
  let branchIds = await getUserBranchIds(userEmail);
  const user = await getUserByEmail(userEmail);
  const useCityName = !(isSuperAdmin(userEmail) || user?.role === "super_admin");

  // Only expand company IDs for admin role, NOT branch_admin/instructor
  if (branchIds && branchIds.length > 0 && user?.role === "admin") {
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
      branch:branches(name, city),
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
        level,
        adcoin_balance,
        expires_at,
        course:courses(id, name),
        package:course_pricing(id, package_type, duration),
        pool:shared_session_pools(id, sessions_remaining, total_sessions, name),
        attendance(date, status, created_at)
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
      payments(amount, status, course_id, package_id, pool_id, paid_at)
    `)
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
    console.error('Error fetching students for table:', error);
    return [];
  }

  // Pre-fetch all course pricing so we can look up duration per payment's package_id
  const { data: allPricing } = await supabaseAdmin
    .from('course_pricing')
    .select('id, duration, package_type');
  const pricingMap = new Map<string, { duration: number; package_type: string }>();
  for (const p of allPricing ?? []) {
    pricingMap.set(p.id, { duration: p.duration, package_type: p.package_type });
  }

  // Helper to compute sessions from a payment's own package
  const getSessionsForPayment = (packageId: string | null): number => {
    if (!packageId) return 0;
    const pkg = pricingMap.get(packageId);
    if (!pkg) return 0;
    return pkg.package_type === 'monthly' ? pkg.duration * 4 : pkg.duration;
  };

  // Pre-fetch pool payment data and join dates so ALL siblings in a pool share the total
  const poolPaymentCache = new Map<string, { totalPaid: number; totalSessions: number }>();
  // Raw pool payments for latest package lookup (includes package_id and paid_at)
  const poolPaymentCacheRaw = new Map<string, Array<{ amount: number; status: string; course_id: string | null; package_id: string | null; pool_id: string | null; paid_at: string | null }>>();
  // Map: poolId -> studentId -> joined_at date string
  const poolJoinDateCache = new Map<string, Map<string, string>>();
  // Map: poolId -> actual number of students in the pool
  const poolSiblingCountCache = new Map<string, number>();
  // Map: poolId -> studentId -> student name (for pool siblings display)
  const poolStudentNamesCache = new Map<string, Map<string, string>>();
  const allPoolIds = new Set<string>();
  for (const student of data ?? []) {
    for (const enrollment of (student as any).enrollments || []) {
      if (enrollment.pool_id) allPoolIds.add(enrollment.pool_id);
    }
  }
  if (allPoolIds.size > 0) {
    for (const poolId of allPoolIds) {
      // Get all students in this pool with join dates and names
      const { data: poolStudentLinks } = await supabaseAdmin
        .from('pool_students')
        .select('student_id, joined_at, student:students(name)')
        .eq('pool_id', poolId);

      // Cache join dates per student, sibling count, and student names
      const joinDates = new Map<string, string>();
      const studentNames = new Map<string, string>();
      for (const ps of poolStudentLinks ?? []) {
        if (ps.joined_at) joinDates.set(ps.student_id, ps.joined_at);
        const studentData = ps.student as unknown as { name: string } | null;
        if (studentData?.name) studentNames.set(ps.student_id, studentData.name);
      }
      poolJoinDateCache.set(poolId, joinDates);
      poolSiblingCountCache.set(poolId, (poolStudentLinks ?? []).length);
      poolStudentNamesCache.set(poolId, studentNames);
      // Get the pool's course_id
      const { data: poolData } = await supabaseAdmin
        .from('shared_session_pools')
        .select('course_id')
        .eq('id', poolId)
        .single();
      if (!poolStudentLinks?.length || !poolData) continue;
      const studentIds = poolStudentLinks.map(ps => ps.student_id);
      // Sum only shared pool payments (with pool_id set) from ALL siblings
      const { data: poolPayments } = await supabaseAdmin
        .from('payments')
        .select('amount, package_id, paid_at, course_id')
        .in('student_id', studentIds)
        .eq('course_id', poolData.course_id)
        .eq('pool_id', poolId)
        .eq('status', 'paid');
      const totalPaid = (poolPayments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
      const totalSessions = (poolPayments ?? []).reduce((sum, p) => {
        return sum + getSessionsForPayment(p.package_id);
      }, 0);
      poolPaymentCache.set(poolId, { totalPaid, totalSessions });
      // Store raw payment data for latest package lookup
      poolPaymentCacheRaw.set(poolId, (poolPayments ?? []).map(p => ({
        amount: Number(p.amount),
        status: 'paid',
        course_id: p.course_id,
        package_id: p.package_id,
        pool_id: poolId,
        paid_at: p.paid_at,
      })));
    }
  }

  // Helper to build a row from a student + single enrollment
  const buildRow = (student: any, enrollment: any | null): StudentTableRow => {
    // Parse schedule from enrollment - prefer new schedule field
    let scheduleDays: string[] = [];
    let scheduleTime: string | null = null;

    if (enrollment?.schedule) {
      try {
        const scheduleEntries = JSON.parse(enrollment.schedule);
        if (Array.isArray(scheduleEntries)) {
          scheduleDays = scheduleEntries.map((e: { day: string }) => e.day).filter(Boolean);
          const times = scheduleEntries
            .map((e: { day: string; time: string }) => e.time)
            .filter(Boolean);
          scheduleTime = times.length > 0 ? times.join(', ') : null;
        }
      } catch {
        // Fall back to legacy parsing
      }
    }

    if (scheduleDays.length === 0 && enrollment?.day_of_week) {
      try {
        const parsed = JSON.parse(enrollment.day_of_week);
        scheduleDays = Array.isArray(parsed) ? parsed : [enrollment.day_of_week];
      } catch {
        scheduleDays = enrollment.day_of_week.split(',').map((d: string) => d.trim());
      }
    }

    if (!scheduleTime && enrollment?.start_time) {
      scheduleTime = enrollment.start_time;
    }

    // Get first parent (if any)
    const firstParentLink = student.parent_students?.[0];
    const parent = firstParentLink?.parent || null;

    // Calculate period active info
    let sessionsRemaining: number | null = null;
    let periodStart: string | null = null;
    let periodEnd: string | null = null;

    // Determine package from latest paid payment (not enrollment's original package)
    let packageDuration: number | null = enrollment?.package?.duration || null;
    let packageType = enrollment?.package?.package_type || null;
    let latestPackageId: string | null = enrollment?.package_id || null;

    if (enrollment?.course?.id) {
      // Check this student's own payments first
      const coursePayments = ((student.payments || []) as Array<{
        amount: number; status: string; course_id: string | null;
        package_id: string | null; pool_id: string | null; paid_at: string | null;
      }>).filter(
        (p) => p.status === 'paid' && p.course_id === enrollment.course.id && p.package_id
      );

      // For pooled students, also check pool payment cache (payment may belong to a sibling)
      if (enrollment.pool_id && poolPaymentCacheRaw.has(enrollment.pool_id)) {
        const poolPmts = poolPaymentCacheRaw.get(enrollment.pool_id) ?? [];
        for (const pp of poolPmts) {
          // Avoid duplicates (if this student's own payment is also a pool payment)
          if (!coursePayments.some(cp => cp.amount === pp.amount && cp.paid_at === pp.paid_at && cp.package_id === pp.package_id)) {
            coursePayments.push(pp);
          }
        }
      }

      // Sort by paid_at descending to get the latest
      coursePayments.sort((a, b) => {
        if (!a.paid_at) return 1;
        if (!b.paid_at) return -1;
        return new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime();
      });
      const latestPayment = coursePayments[0];
      if (latestPayment?.package_id) {
        const latestPkg = pricingMap.get(latestPayment.package_id);
        if (latestPkg) {
          packageDuration = latestPkg.duration;
          packageType = latestPkg.package_type;
          latestPackageId = latestPayment.package_id;
        }
      }
    }

    // Check if enrollment is part of an ACTIVE shared sibling pool
    // Must have pool_id AND be actively in pool_students (count > 0)
    // AND this student must actually be in pool_students (not just have pool_id breadcrumb)
    // A student can have pool_id as a breadcrumb for restoration but not be actively pooled
    const isPooled = enrollment?.pool_id && enrollment?.pool
      && (poolSiblingCountCache.get(enrollment.pool_id) ?? 0) > 0
      && poolStudentNamesCache.get(enrollment.pool_id)?.has(student.id);
    const poolInfo = isPooled ? enrollment.pool as unknown as {
      id: string;
      sessions_remaining: number;
      total_sessions: number;
      name: string | null;
    } : null;

    // Calculate session count for THIS enrollment only
    let sessionCount = 0;
    const attendanceRecords = enrollment
      ? (enrollment.attendance || []) as Array<{ date: string; status: string; created_at: string }>
      : [];
    sessionCount = attendanceRecords.filter(
      (a) => a.status === 'present' || a.status === 'late'
    ).length;

    if (enrollment) {
      // Cancelled/completed/expired pooled students show 0 — their sessions were redistributed to siblings
      // Individual students keep their sessions so they can rejoin later
      const inactiveStatus = ['cancelled', 'expired', 'completed'].includes(enrollment.status);
      if (inactiveStatus && enrollment.pool_id) {
        sessionsRemaining = 0;
      } else if (isPooled && poolInfo) {
        const siblingCount = poolSiblingCountCache.get(enrollment.pool_id) || 2;
        const poolRemaining = poolInfo.sessions_remaining;

        // Determine this student's position (earliest joined = 0) for odd remainder
        const joinDates = poolJoinDateCache.get(enrollment.pool_id);
        const sortedStudentIds = joinDates
          ? [...joinDates.entries()]
              .sort((a, b) => new Date(a[1]).getTime() - new Date(b[1]).getTime())
              .map(([id]) => id)
          : [];
        const position = sortedStudentIds.indexOf(student.id);

        // Unified equal split formula for both positive and negative pool values.
        // All sessions (including debt) are absorbed into pool, so enrollment is 0.
        // First-joined sibling gets "more" — more sessions (positive) or more debt (negative).
        const perStudent = Math.floor(poolRemaining / siblingCount);
        // Use proper remainder (not JS %) to handle negatives correctly
        const remainder = poolRemaining - perStudent * siblingCount;
        let positionBonus: number;
        if (poolRemaining >= 0) {
          // Positive: first-joined gets the extra session
          positionBonus = position >= 0 && position < remainder ? 1 : 0;
        } else {
          // Negative: last-joined gets the +1 adjustment (less debt), first keeps more debt
          positionBonus = position >= 0 && position >= (siblingCount - remainder) ? 1 : 0;
        }
        sessionsRemaining = perStudent + positionBonus;
      } else {
        const enrollmentSessions = enrollment.sessions_remaining ?? 0;

        if (packageType === 'session') {
          sessionsRemaining = enrollmentSessions;
        } else if (packageType === 'monthly') {
          const dbPeriodStart = enrollment.period_start;
          sessionsRemaining = enrollmentSessions;
          if (dbPeriodStart) {
            periodStart = dbPeriodStart;
            const endDate = new Date(dbPeriodStart);
            endDate.setMonth(endDate.getMonth() + 1);
            periodEnd = endDate.toISOString().split('T')[0];
          }
        } else {
          sessionsRemaining = enrollmentSessions;
        }
      }
    }

    // Calculate payment count - for this enrollment's course
    let totalPaid: number;
    let totalSessionsBought: number;

    if (isPooled && poolInfo && enrollment?.pool_id) {
      // Shared package: split pool payments evenly, then add this student's individual payments
      const poolPayments = poolPaymentCache.get(enrollment.pool_id);
      const siblingCount = poolSiblingCountCache.get(enrollment.pool_id) || 2;
      const poolSharePaid = (poolPayments?.totalPaid ?? 0) / siblingCount;
      const poolShareSessions = Math.floor((poolPayments?.totalSessions ?? 0) / siblingCount);

      // Also get this student's individual (non-pool) payments for the same course
      const individualPayments = (student.payments || []) as Array<{
        amount: number;
        status: string;
        course_id: string | null;
        package_id: string | null;
        pool_id: string | null;
      }>;
      const individualPaid = individualPayments.filter(
        (p) => p.status === 'paid' && p.course_id === enrollment.course?.id && !p.pool_id
      );
      const individualTotalPaid = individualPaid.reduce((sum, p) => sum + Number(p.amount), 0);
      const individualSessions = individualPaid.reduce((sum, p) => sum + getSessionsForPayment(p.package_id), 0);

      totalPaid = poolSharePaid + individualTotalPaid;
      totalSessionsBought = poolShareSessions + individualSessions;
    } else {
      // Normal (non-shared): use this student's own payments
      const payments = (student.payments || []) as Array<{
        amount: number;
        status: string;
        course_id: string | null;
        package_id: string | null;
      }>;
      const coursePayments = enrollment?.course?.id
        ? payments.filter((p) => p.course_id === enrollment.course.id)
        : payments;
      const paidPayments = coursePayments.filter((p) => p.status === 'paid');
      totalPaid = paidPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      // Sum sessions from each payment's own package duration
      totalSessionsBought = paidPayments.reduce((sum, p) => {
        return sum + getSessionsForPayment(p.package_id);
      }, 0);
    }

    return {
      id: student.id,
      enrollmentId: enrollment?.id || null,
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
      branchName: useCityName ? (student.branch?.city || student.branch?.name || 'N/A') : (student.branch?.name || 'N/A'),
      programName: enrollment?.course?.name || null,
      courseId: enrollment?.course?.id || null,
      instructorId: enrollment?.instructor_id || null,
      packageId: latestPackageId,
      packageType: packageType || null,
      scheduleDays,
      scheduleTime,
      enrollDate: student.created_at,
      expiredDate: enrollment?.expires_at || null,
      enrollmentStatus: enrollment?.status || null,
      level: enrollment?.level ?? student.level ?? 1,
      adcoinBalance: enrollment?.adcoin_balance ?? student.adcoin_balance ?? 0,
      sessionsRemaining,
      periodStart,
      periodEnd,
      packageDuration,
      isPooled: !!isPooled,
      poolId: enrollment?.pool_id || null,
      poolName: poolInfo?.name || null,
      poolSiblings: isPooled && enrollment?.pool_id
        ? Array.from(poolStudentNamesCache.get(enrollment.pool_id)?.entries() ?? [])
            .filter(([id]) => id !== student.id)
            .map(([, name]) => name)
        : null,
      sessionCount,
      paymentCount: {
        totalPaid,
        totalSessionsBought,
      },
      parentId: parent?.id || null,
      parentName: parent?.name || null,
      parentPhone: parent?.phone || null,
      parentEmail: parent?.email || null,
      parentAddress: parent?.address || null,
      parentPostcode: parent?.postcode || null,
      parentCity: parent?.city || null,
      parentRelationship: firstParentLink?.relationship || null,
    };
  };

  // Process results - one row per enrollment (or one row for students with no enrollments)
  const rows: StudentTableRow[] = [];
  for (const student of data ?? []) {
    const enrollments = student.enrollments || [];
    if (enrollments.length === 0) {
      // Student with no enrollments - still show one row
      rows.push(buildRow(student, null));
    } else {
      // One row per enrollment
      for (const enrollment of enrollments) {
        rows.push(buildRow(student, enrollment));
      }
    }
  }

  return rows;
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
    status?: EnrollmentStatus;
    level?: number;
    adcoin_balance?: number;
  }
): Promise<boolean> {
  // Build day_of_week and start_time from schedule for backwards compatibility
  const days = enrollmentData.schedule.map(s => s.day).filter(Boolean);
  const firstEntry = enrollmentData.schedule[0];

  // First, check if student has any enrollment for this course (any status)
  const { data: existingEnrollments, error: fetchError } = await supabaseAdmin
    .from('enrollments')
    .select('id, course_id, sessions_remaining, status, pool_id')
    .eq('student_id', studentId)
    .is('deleted_at', null)
    .order('enrolled_at', { ascending: false });

  if (fetchError) {
    console.error('Error fetching existing enrollments:', fetchError);
    return false;
  }

  // Find if there's an enrollment for the same course (any status)
  const sameCourseEnrollment = existingEnrollments?.find(
    (e) => e.course_id === enrollmentData.course_id
  );

  if (sameCourseEnrollment) {
    // Update existing enrollment for the same course
    // Sessions are preserved for individual students even when cancelled/completed (so they can rejoin)
    // But pooled students get sessions zeroed because their share is redistributed to siblings
    const isGoingInactive = enrollmentData.status && ['cancelled', 'expired', 'completed'].includes(enrollmentData.status);
    const zeroSessions = isGoingInactive && !!sameCourseEnrollment.pool_id;
    console.log('[updateOrCreateEnrollment] Updating enrollment:', {
      enrollmentId: sameCourseEnrollment.id,
      existingSessions: sameCourseEnrollment.sessions_remaining,
      isGoingInactive,
      isPooled: !!sameCourseEnrollment.pool_id,
      zeroSessions,
    });
    const { error: updateError } = await supabaseAdmin
      .from('enrollments')
      .update({
        package_id: enrollmentData.package_id,
        instructor_id: enrollmentData.instructor_id,
        day_of_week: days.length > 0 ? JSON.stringify(days) : null,
        start_time: firstEntry?.time || null,
        schedule: JSON.stringify(enrollmentData.schedule),
        ...(zeroSessions ? { sessions_remaining: 0 } : {}),
        ...(enrollmentData.status ? { status: enrollmentData.status } : {}),
        ...(enrollmentData.level !== undefined ? { level: enrollmentData.level } : {}),
        ...(enrollmentData.adcoin_balance !== undefined ? { adcoin_balance: enrollmentData.adcoin_balance } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sameCourseEnrollment.id);

    if (updateError) {
      console.error('Error updating enrollment:', updateError);
      return false;
    }
  } else {
    // No existing enrollment for this course - create a new one
    // Do NOT deactivate other enrollments; students can have multiple active enrollments in different courses
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
        level: enrollmentData.level || 1,
        adcoin_balance: enrollmentData.adcoin_balance || 0,
      });

    if (insertError) {
      console.error('Error creating enrollment:', insertError);
      return false;
    }
  }

  return true;
}