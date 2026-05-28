import { supabaseAdmin } from "@/db";
import type {
  Examination,
  ExaminationInsert,
  ExaminationUpdate,
  ExaminationTableRow,
  EligibleStudent,
  StudentExamOption,
} from "@/db/schema";
import { parseISO, differenceInYears } from "date-fns";

/**
 * Resolve branch IDs for admin users: company IDs → child HQ/branch IDs
 */
async function resolveExamBranchIds(userEmail: string): Promise<{
  branchIds: string[] | null;
  useCityName: boolean;
}> {
  const { getUserBranchIds, getUserByEmail, isSuperAdmin } = await import("./users");
  let branchIds = await getUserBranchIds(userEmail);
  const user = await getUserByEmail(userEmail);
  const useCityName = !(isSuperAdmin(userEmail) || user?.role === "super_admin");

  // Only expand company IDs for admin role, NOT branch_admin/instructor
  if (branchIds && branchIds.length > 0 && user?.role === "group_admin") {
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

  return { branchIds, useCityName };
}

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Get all examinations for the table view with student, course, and examiner details
 */
export async function getExaminationsForTable(
  userEmail: string
): Promise<ExaminationTableRow[]> {
  const { branchIds, useCityName } = await resolveExamBranchIds(userEmail);

  let query = supabaseAdmin
    .from("examinations")
    .select(`
      id,
      student_id,
      enrollment_id,
      exam_name,
      exam_level,
      reattempt_count,
      mark,
      notes,
      examiner_id,
      exam_date,
      certificate_url,
      certificate_number,
      status,
      student:students!inner(
        id,
        name,
        photo,
        date_of_birth,
        branch_id,
        branch:branches!students_branch_id_branches_id_fk(id, name, city)
      ),
      enrollment:enrollments(
        id,
        level,
        course:courses(id, name)
      ),
      examiner:users(
        id,
        name,
        photo
      )
    `)
    .is("deleted_at", null)
    .order("exam_date", { ascending: false });

  // Apply branch filter if user is not super admin
  if (branchIds) {
    query = query.in("student.branch_id", branchIds);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching examinations:", error);
    return [];
  }

  // Also fetch attendance counts for each enrollment
  const enrollmentIds = (data ?? [])
    .map((e: any) => e.enrollment_id)
    .filter(Boolean);

  const attendanceCounts: Record<string, number> = {};
  if (enrollmentIds.length > 0) {
    const { data: attendanceData } = await supabaseAdmin
      .from("attendance")
      .select("enrollment_id, status")
      .in("enrollment_id", enrollmentIds)
      .in("status", ["present", "late"]);

    for (const a of attendanceData ?? []) {
      if (a.enrollment_id) {
        attendanceCounts[a.enrollment_id] =
          (attendanceCounts[a.enrollment_id] || 0) + 1;
      }
    }
  }

  return (data ?? []).map((exam: any) => {
    const student = exam.student;
    const branch = student?.branch;
    const enrollment = exam.enrollment;
    const course = enrollment?.course;
    const examiner = exam.examiner;

    // Calculate age
    let studentAge: number | null = null;
    if (student?.date_of_birth) {
      try {
        const birthDate = parseISO(student.date_of_birth);
        studentAge = differenceInYears(new Date(), birthDate);
      } catch {
        // Ignore parse errors
      }
    }

    return {
      id: exam.id,
      studentId: exam.student_id,
      studentName: student?.name || "Unknown",
      studentPhoto: student?.photo || null,
      studentAge,
      branchId: student?.branch_id || "",
      branchName: useCityName ? (branch?.city || branch?.name || "N/A") : (branch?.name || "N/A"),
      courseId: course?.id || "",
      courseName: course?.name || "N/A",
      sessionAttend: attendanceCounts[exam.enrollment_id] || 0,
      currentLevel: enrollment?.level || 1,
      examName: exam.exam_name,
      examLevel: exam.exam_level,
      reattemptCount: exam.reattempt_count,
      mark: exam.mark,
      notes: exam.notes,
      examinerId: exam.examiner_id,
      examinerName: examiner?.name || null,
      examinerPhoto: examiner?.photo || null,
      examDate: exam.exam_date,
      certificateUrl: exam.certificate_url,
      certificateNumber: exam.certificate_number,
      status: exam.status,
    };
  });
}

/**
 * Paginated version of getExaminationsForTable.
 * Returns rows for a slice of examinations + total count, for progressive loading.
 */
export async function getExaminationsForTablePaginated(
  userEmail: string,
  options: { offset: number; limit: number }
): Promise<{ rows: ExaminationTableRow[]; totalCount: number }> {
  const { branchIds, useCityName } = await resolveExamBranchIds(userEmail);

  // Count query
  let countQuery = supabaseAdmin
    .from("examinations")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null);

  if (branchIds) {
    // To filter by branch we need to join through students
    // @ts-expect-error -- Supabase type conflict when reassigning with different select shape
    countQuery = supabaseAdmin
      .from("examinations")
      .select("id, student:students!inner(branch_id)", { count: "exact", head: true })
      .is("deleted_at", null)
      .in("student.branch_id" as any, branchIds);
  }

  const { count: totalCount } = await countQuery;

  // Main paginated query
  let query = supabaseAdmin
    .from("examinations")
    .select(`
      id,
      student_id,
      enrollment_id,
      exam_name,
      exam_level,
      reattempt_count,
      mark,
      notes,
      examiner_id,
      exam_date,
      certificate_url,
      certificate_number,
      status,
      student:students!inner(
        id,
        name,
        photo,
        date_of_birth,
        branch_id,
        branch:branches!students_branch_id_branches_id_fk(id, name, city)
      ),
      enrollment:enrollments(
        id,
        level,
        course:courses(id, name)
      ),
      examiner:users(
        id,
        name,
        photo
      )
    `)
    .is("deleted_at", null)
    .order("exam_date", { ascending: false });

  // Apply branch filter if user is not super admin
  if (branchIds) {
    query = query.in("student.branch_id", branchIds);
  }

  // Apply pagination
  query = query.range(options.offset, options.offset + options.limit - 1);

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching paginated examinations:", error);
    return { rows: [], totalCount: 0 };
  }

  // Also fetch attendance counts for each enrollment
  const enrollmentIds = (data ?? [])
    .map((e: any) => e.enrollment_id)
    .filter(Boolean);

  const attendanceCounts: Record<string, number> = {};
  if (enrollmentIds.length > 0) {
    const { data: attendanceData } = await supabaseAdmin
      .from("attendance")
      .select("enrollment_id, status")
      .in("enrollment_id", enrollmentIds)
      .in("status", ["present", "late"]);

    for (const a of attendanceData ?? []) {
      if (a.enrollment_id) {
        attendanceCounts[a.enrollment_id] =
          (attendanceCounts[a.enrollment_id] || 0) + 1;
      }
    }
  }

  const rows: ExaminationTableRow[] = (data ?? []).map((exam: any) => {
    const student = exam.student;
    const branch = student?.branch;
    const enrollment = exam.enrollment;
    const course = enrollment?.course;
    const examiner = exam.examiner;

    // Calculate age
    let studentAge: number | null = null;
    if (student?.date_of_birth) {
      try {
        const birthDate = parseISO(student.date_of_birth);
        studentAge = differenceInYears(new Date(), birthDate);
      } catch {
        // Ignore parse errors
      }
    }

    return {
      id: exam.id,
      studentId: exam.student_id,
      studentName: student?.name || "Unknown",
      studentPhoto: student?.photo || null,
      studentAge,
      branchId: student?.branch_id || "",
      branchName: useCityName ? (branch?.city || branch?.name || "N/A") : (branch?.name || "N/A"),
      courseId: course?.id || "",
      courseName: course?.name || "N/A",
      sessionAttend: attendanceCounts[exam.enrollment_id] || 0,
      currentLevel: enrollment?.level || 1,
      examName: exam.exam_name,
      examLevel: exam.exam_level,
      reattemptCount: exam.reattempt_count,
      mark: exam.mark,
      notes: exam.notes,
      examinerId: exam.examiner_id,
      examinerName: examiner?.name || null,
      examinerPhoto: examiner?.photo || null,
      examDate: exam.exam_date,
      certificateUrl: exam.certificate_url,
      certificateNumber: exam.certificate_number,
      status: exam.status,
    };
  });

  return { rows, totalCount: totalCount ?? 0 };
}

/**
 * Get students eligible for examination
 * Eligibility: accumulated attendance >= sessions_to_level_up for their current level
 */
export async function getEligibleStudentsForExam(
  userEmail: string
): Promise<EligibleStudent[]> {
  const { branchIds, useCityName } = await resolveExamBranchIds(userEmail);

  // First fetch enrollments with their course settings
  let query = supabaseAdmin
    .from("enrollments")
    .select(`
      id,
      student_id,
      course_id,
      level,
      student:students!inner(
        id,
        name,
        photo,
        date_of_birth,
        branch_id,
        branch:branches!students_branch_id_branches_id_fk(id, name, city)
      ),
      course:courses!inner(
        id,
        name,
        sessions_to_level_up,
        number_of_levels
      )
    `)
    .eq("status", "active")
    .is("deleted_at", null)
    .gt("course.number_of_levels", 0);

  if (branchIds) {
    query = query.in("student.branch_id", branchIds);
  }

  const { data: enrollments, error } = await query;

  if (error) {
    console.error("Error fetching enrollments for eligibility:", error);
    return [];
  }

  if (!enrollments || enrollments.length === 0) {
    return [];
  }

  // Get attendance counts for these enrollments
  const enrollmentIds = enrollments.map((e) => e.id);
  const { data: attendanceData } = await supabaseAdmin
    .from("attendance")
    .select("enrollment_id, status")
    .in("enrollment_id", enrollmentIds)
    .in("status", ["present", "late"]);

  const attendanceCounts: Record<string, number> = {};
  for (const a of attendanceData ?? []) {
    if (a.enrollment_id) {
      attendanceCounts[a.enrollment_id] =
        (attendanceCounts[a.enrollment_id] || 0) + 1;
    }
  }

  // Get existing examinations to exclude students already being examined at current level+program
  const enrollmentIds2 = enrollments.map((e) => e.id);
  const { data: existingExams } = await supabaseAdmin
    .from("examinations")
    .select("enrollment_id, exam_level, status")
    .in("enrollment_id", enrollmentIds2)
    .is("deleted_at", null)
    .not("status", "in", "(fail,absent)");

  // Create a set of "enrollmentId-level" combinations that already have active exams
  const existingExamSet = new Set(
    (existingExams ?? []).map((e) => `${e.enrollment_id}-${e.exam_level}`)
  );

  const eligibleStudents: EligibleStudent[] = [];

  for (const enrollment of enrollments) {
    const student = enrollment.student as any;
    const course = enrollment.course as any;
    const branch = student?.branch;

    const maxLevels = course?.number_of_levels || 0;
    const sessionsRequired = course?.sessions_to_level_up || 0;
    const sessionsAttended = attendanceCounts[enrollment.id] || 0;
    const currentLevel = (enrollment as any).level || 1;

    // Skip programs with 0 levels (no examination)
    if (maxLevels <= 0) continue;

    // Check if student has attended enough sessions
    if (sessionsAttended >= sessionsRequired) {
      // Check if student has completed all levels
      if (currentLevel > maxLevels) {
        continue;
      }

      // Check if there's already an active exam for this program + level
      const examKey = `${enrollment.id}-${currentLevel}`;
      if (existingExamSet.has(examKey)) {
        continue;
      }

      eligibleStudents.push({
        studentId: enrollment.student_id,
        studentName: student?.name || "Unknown",
        studentPhoto: student?.photo || null,
        dateOfBirth: student?.date_of_birth || null,
        branchId: student?.branch_id || "",
        branchName: useCityName ? (branch?.city || branch?.name || "N/A") : (branch?.name || "N/A"),
        enrollmentId: enrollment.id,
        courseId: enrollment.course_id,
        courseName: course?.name || "N/A",
        currentLevel,
        sessionsAttended,
        sessionsRequired,
      });
    }
  }

  return eligibleStudents;
}

/**
 * Get examination by ID
 */
export async function getExaminationById(
  examId: string
): Promise<Examination | null> {
  const { data, error } = await supabaseAdmin
    .from("examinations")
    .select("*")
    .eq("id", examId)
    .is("deleted_at", null)
    .single();

  if (error) {
    console.error("Error fetching examination:", error);
    return null;
  }

  return data;
}

/**
 * Get examinations by student ID
 */
export async function getExaminationsByStudentId(
  studentId: string
): Promise<Examination[]> {
  const { data, error } = await supabaseAdmin
    .from("examinations")
    .select("*")
    .eq("student_id", studentId)
    .is("deleted_at", null)
    .order("exam_date", { ascending: false });

  if (error) {
    console.error("Error fetching student examinations:", error);
    return [];
  }

  return data ?? [];
}

// ============================================
// WRITE OPERATIONS
// ============================================

/**
 * Create a new examination record
 */
export async function createExamination(
  examData: ExaminationInsert
): Promise<Examination | null> {
  const { data, error } = await supabaseAdmin
    .from("examinations")
    .insert(examData)
    .select()
    .single();

  if (error) {
    console.error("Error creating examination:", error);
    return null;
  }

  return data;
}

/**
 * Update an existing examination
 */
export async function updateExamination(
  examId: string,
  examData: ExaminationUpdate
): Promise<Examination | null> {
  const { data, error } = await supabaseAdmin
    .from("examinations")
    .update(examData)
    .eq("id", examId)
    .select()
    .single();

  if (error) {
    console.error("Error updating examination:", error);
    return null;
  }

  return data;
}

/**
 * Soft delete an examination
 */
export async function softDeleteExamination(examId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("examinations")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", examId);

  if (error) {
    console.error("Error deleting examination:", error);
    return false;
  }

  return true;
}

/**
 * After a present attendance is marked, check if the student has reached the
 * level-up session count for their current level. If yes, and no exam already
 * exists for that level, insert an examination row with status='eligible' and
 * date set to the next scheduled class.
 *
 * Returns the created examination ID (or null if no exam was created).
 */
export async function maybeCreateLevelUpExam(
  enrollmentId: string
): Promise<string | null> {
  // Pull enrollment + course context
  const { data: enrollment } = await supabaseAdmin
    .from("enrollments")
    .select(`
      id,
      student_id,
      level,
      schedule,
      day_of_week,
      start_time,
      course:courses(sessions_to_level_up, number_of_levels)
    `)
    .eq("id", enrollmentId)
    .single();

  if (!enrollment) return null;
  const course = enrollment.course as unknown as {
    sessions_to_level_up: number | null;
    number_of_levels: number | null;
  } | null;
  const sessionsRequired = course?.sessions_to_level_up ?? 0;
  if (!sessionsRequired) return null;

  const currentLevel = enrollment.level ?? 1;
  const maxLevels = course?.number_of_levels ?? 0;
  // Already at top level — nothing to level up to
  if (maxLevels > 0 && currentLevel >= maxLevels) return null;

  // Trigger when sessions attended SINCE the most recent passed exam reach
  // the threshold. Example with sessions_to_level_up=48:
  //   • No prior pass: trigger at attendance #48.
  //   • Pass at session 48 → next trigger at session 96 (48 more after pass).
  //   • Fail at 48, retry at +2 months / ~session 56 → pass → next trigger at
  //     session 104 (48 more after the 56-session pass).
  const { data: lastPass } = await supabaseAdmin
    .from("examinations")
    .select("exam_date, updated_at")
    .eq("enrollment_id", enrollmentId)
    .eq("status", "pass")
    .is("deleted_at", null)
    .order("exam_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Use the pass exam_date as the cut-off; sessions on/after that day are
  // considered post-pass and count toward the next level-up.
  const sinceDate = lastPass?.exam_date ?? null;

  let attendanceQuery = supabaseAdmin
    .from("attendance")
    .select("id", { count: "exact", head: true })
    .eq("enrollment_id", enrollmentId)
    .in("status", ["present", "late"]);

  if (sinceDate) {
    attendanceQuery = attendanceQuery.gt("date", sinceDate);
  }

  const { count: attendedCount } = await attendanceQuery;

  // Trigger 2 sessions early so a student imported with 46–47 sessions (or a
  // live student about to cross 48) gets the exam created without waiting for
  // the exact threshold to be hit. The exam date placement (next class day)
  // gives the instructor a window to actually prep them.
  const EARLY_TRIGGER_BUFFER = 2;
  const triggerThreshold = Math.max(1, sessionsRequired - EARLY_TRIGGER_BUFFER);
  if ((attendedCount ?? 0) < triggerThreshold) return null;

  // Skip if an active exam for this level already exists
  const { count: existingExamCount } = await supabaseAdmin
    .from("examinations")
    .select("id", { count: "exact", head: true })
    .eq("enrollment_id", enrollmentId)
    .eq("exam_level", currentLevel)
    .in("status", ["eligible", "scheduled", "in_progress", "pass"])
    .is("deleted_at", null);

  if ((existingExamCount ?? 0) > 0) return null;

  // Compute the next scheduled class date for this enrollment.
  // Schedule shape varies — try the simple { day_of_week, start_time } columns first,
  // fall back to today + 7 days if no schedule info available.
  const examDate = computeNextScheduledDate(
    (enrollment as any).day_of_week,
    (enrollment as any).schedule,
  );

  const { data: created, error } = await supabaseAdmin
    .from("examinations")
    .insert({
      student_id: enrollment.student_id,
      enrollment_id: enrollmentId,
      exam_name: `Level ${currentLevel} → ${currentLevel + 1}`,
      exam_level: currentLevel,
      exam_date: examDate,
      status: "eligible",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[Level-up Exam] Failed to insert exam:", error);
    return null;
  }

  return created.id;
}

/**
 * Pick the next future date matching the enrollment's schedule day-of-week.
 * Falls back to today + 7 days if no schedule info available.
 */
function computeNextScheduledDate(
  dayOfWeek?: string | null,
  schedule?: unknown,
): string {
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  let targetDow: number | null = null;

  // day_of_week may be stored as a bare string ("monday") OR as a JSON array
  // ('["monday"]') depending on which import path created the enrollment.
  // Parse defensively.
  if (dayOfWeek) {
    let raw: string | null = dayOfWeek.trim();
    if (raw.startsWith("[")) {
      try {
        const parsed = JSON.parse(raw);
        raw = Array.isArray(parsed) && parsed.length > 0 ? String(parsed[0]) : null;
      } catch { /* fall through with original */ }
    }
    if (raw) {
      const idx = dayNames.indexOf(raw.toLowerCase());
      if (idx >= 0) targetDow = idx;
    }
  } else if (Array.isArray(schedule) && schedule.length > 0) {
    const first = schedule[0] as { day?: string };
    const idx = first.day ? dayNames.indexOf(first.day.toLowerCase()) : -1;
    if (idx >= 0) targetDow = idx;
  } else if (typeof schedule === "string") {
    try {
      const parsed = JSON.parse(schedule);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const first = parsed[0] as { day?: string };
        const idx = first?.day ? dayNames.indexOf(first.day.toLowerCase()) : -1;
        if (idx >= 0) targetDow = idx;
      }
    } catch { /* ignore */ }
  }

  const today = new Date();
  if (targetDow === null) {
    today.setDate(today.getDate() + 7);
    return today.toISOString().split("T")[0];
  }

  // Find the next occurrence of targetDow strictly after today
  const currentDow = today.getDay();
  let daysAhead = targetDow - currentDow;
  if (daysAhead <= 0) daysAhead += 7;
  const next = new Date(today);
  next.setDate(today.getDate() + daysAhead);
  return next.toISOString().split("T")[0];
}

/**
 * Generate a unique certificate number in the spec format:
 *   {programCode}-{levelGroup}-{sessions}P{YYMMDD}{random4}-{scoreLetter}
 * Example: EV3-BGN-24P2601110868-D
 *
 *   programCode  = courses.code
 *   levelGroup   = BGN (level 1) | INT (level 2-3) | ADV (level 4+)
 *   sessions     = courses.sessions_to_level_up (e.g. "24")
 *   YYMMDD       = today's date (completion date)
 *   random4      = unique 4-digit suffix (collision-checked against existing cert numbers)
 *   scoreLetter  = D (mark >= 80) | P (mark >= 50) | F (below 50)
 */
export async function generateCertificateNumber(examId: string): Promise<string> {
  // Pull exam + enrollment + course in one round-trip
  const { data: exam } = await supabaseAdmin
    .from("examinations")
    .select(`
      mark,
      exam_level,
      enrollment_id,
      enrollment:enrollments(
        course:courses(code, sessions_to_level_up)
      )
    `)
    .eq("id", examId)
    .single();

  const enrollmentCourse = (exam?.enrollment as any)?.course;
  const programCode = (enrollmentCourse?.code ?? "GEN").toString().toUpperCase();
  const sessions = enrollmentCourse?.sessions_to_level_up ?? 0;

  const level = exam?.exam_level ?? 1;
  const levelGroup = level <= 1 ? "BGN" : level <= 3 ? "INT" : "ADV";

  const mark = exam?.mark ?? 0;
  const scoreLetter = mark >= 80 ? "D" : mark >= 50 ? "P" : "F";

  const now = new Date();
  const yymmdd =
    now.getFullYear().toString().slice(-2) +
    (now.getMonth() + 1).toString().padStart(2, "0") +
    now.getDate().toString().padStart(2, "0");

  const middle = `${sessions}P${yymmdd}`;

  // Collision-check loop — try up to 50 random suffixes before giving up.
  for (let attempt = 0; attempt < 50; attempt++) {
    const random4 = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    const candidate = `${programCode}-${levelGroup}-${middle}${random4}-${scoreLetter}`;
    const { count } = await supabaseAdmin
      .from("examinations")
      .select("id", { count: "exact", head: true })
      .eq("certificate_number", candidate);
    if ((count ?? 0) === 0) return candidate;
  }

  // Extremely unlikely fallback — append a millisecond timestamp to guarantee uniqueness.
  const tsSuffix = Date.now().toString().slice(-4);
  return `${programCode}-${levelGroup}-${middle}${tsSuffix}-${scoreLetter}`;
}

// ============================================
// ALL STUDENTS FOR EXAM SELECTION
// ============================================

/**
 * Get all students with their enrollments for exam selection dropdown
 */
export async function getAllStudentsForExam(
  userEmail: string
): Promise<StudentExamOption[]> {
  const { branchIds, useCityName } = await resolveExamBranchIds(userEmail);

  let query = supabaseAdmin
    .from("enrollments")
    .select(`
      id,
      student_id,
      course_id,
      level,
      student:students!inner(
        id,
        name,
        photo,
        date_of_birth,
        branch_id,
        branch:branches!students_branch_id_branches_id_fk(id, name, city)
      ),
      course:courses!inner(
        id,
        name,
        sessions_to_level_up,
        number_of_levels
      )
    `)
    .eq("status", "active")
    .is("deleted_at", null)
    .gt("course.number_of_levels", 0);

  if (branchIds) {
    query = query.in("student.branch_id", branchIds);
  }

  const { data: enrollments, error } = await query;

  if (error) {
    console.error("Error fetching all students for exam:", error);
    return [];
  }

  if (!enrollments || enrollments.length === 0) return [];

  // Get attendance counts
  const enrollmentIds = enrollments.map((e) => e.id);
  const { data: attendanceData } = await supabaseAdmin
    .from("attendance")
    .select("enrollment_id, status")
    .in("enrollment_id", enrollmentIds)
    .in("status", ["present", "late"]);

  const attendanceCounts: Record<string, number> = {};
  for (const a of attendanceData ?? []) {
    if (a.enrollment_id) {
      attendanceCounts[a.enrollment_id] =
        (attendanceCounts[a.enrollment_id] || 0) + 1;
    }
  }

  // Group by student
  const studentMap = new Map<string, StudentExamOption>();

  for (const enrollment of enrollments) {
    const student = enrollment.student as any;
    const course = enrollment.course as any;
    const branch = student?.branch;

    const sessionsRequired = course?.sessions_to_level_up || 8;
    const sessionsAttended = attendanceCounts[enrollment.id] || 0;
    const currentLevel = (enrollment as any).level || 1;
    const maxLevels = course?.number_of_levels || 10;
    const isEligible =
      sessionsAttended >= sessionsRequired && currentLevel < maxLevels;

    if (!studentMap.has(enrollment.student_id)) {
      studentMap.set(enrollment.student_id, {
        studentId: enrollment.student_id,
        studentName: student?.name || "Unknown",
        studentPhoto: student?.photo || null,
        dateOfBirth: student?.date_of_birth || null,
        branchId: student?.branch_id || "",
        branchName: useCityName ? (branch?.city || branch?.name || "N/A") : (branch?.name || "N/A"),
        enrollments: [],
      });
    }

    studentMap.get(enrollment.student_id)!.enrollments.push({
      enrollmentId: enrollment.id,
      courseId: enrollment.course_id,
      courseName: course?.name || "N/A",
      currentLevel,
      sessionsAttended,
      sessionsRequired,
      isEligible,
    });
  }

  return Array.from(studentMap.values());
}

// ============================================
// EXAMINER QUERIES
// ============================================

export interface ExaminerOption {
  id: string;
  name: string;
  photo: string | null;
}

/**
 * Get all team members who can be examiners
 */
export async function getExaminers(userEmail: string): Promise<ExaminerOption[]> {
  const { branchIds } = await resolveExamBranchIds(userEmail);

  let query = supabaseAdmin
    .from("users")
    .select("id, name, photo")
    .in("role", ["super_admin", "group_admin", "company_admin", "assistant_admin", "instructor"])
    .is("deleted_at", null)
    .order("name");

  if (branchIds) {
    query = query.in("branch_id", branchIds);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching examiners:", error);
    return [];
  }

  return data ?? [];
}

/**
 * Post-import reconciliation for one enrollment. Run after exam rows are
 * imported. Brings the enrollment's `level` and any missing reattempt rows
 * into a consistent state derived from the exam history:
 *
 *   - level := max(current level, highest_passed_level + 1, capped at number_of_levels)
 *   - For each fail row at level L where no follow-up attempt (scheduled,
 *     in_progress, or pass) exists at the same level → insert a scheduled
 *     reattempt 8 weeks later on the enrollment's schedule day.
 *   - Then runs maybeCreateLevelUpExam to fire the eligible exam for the
 *     current level if the attendance threshold (sessions − 2) is crossed.
 *   - Does NOT regenerate certificate numbers — imported pass rows keep
 *     whatever cert they came in with.
 */
export async function reconcileImportedExams(enrollmentId: string): Promise<void> {
  const { data: enrollment } = await supabaseAdmin
    .from("enrollments")
    .select(`
      id,
      student_id,
      level,
      day_of_week,
      schedule,
      course:courses(number_of_levels)
    `)
    .eq("id", enrollmentId)
    .maybeSingle();
  if (!enrollment) return;
  const course = enrollment.course as unknown as { number_of_levels: number | null } | null;
  const maxLevels = course?.number_of_levels ?? 0;

  // Resolve schedule day for reattempt placement
  let scheduleDay: string | null = enrollment.day_of_week ?? null;
  if (!scheduleDay && typeof enrollment.schedule === "string") {
    try {
      const parsed = JSON.parse(enrollment.schedule);
      if (Array.isArray(parsed) && parsed.length > 0) scheduleDay = parsed[0]?.day ?? null;
    } catch { /* ignore */ }
  } else if (!scheduleDay && Array.isArray(enrollment.schedule) && enrollment.schedule.length > 0) {
    const first = enrollment.schedule[0] as { day?: string };
    scheduleDay = first?.day ?? null;
  }

  const { data: exams } = await supabaseAdmin
    .from("examinations")
    .select("id, exam_name, exam_level, exam_date, status, reattempt_count, examiner_id")
    .eq("enrollment_id", enrollmentId)
    .is("deleted_at", null)
    .order("exam_date", { ascending: true });

  const allExams = (exams ?? []) as Array<{
    id: string;
    exam_name: string;
    exam_level: number;
    exam_date: string | null;
    status: string;
    reattempt_count: number | null;
    examiner_id: string | null;
  }>;

  // 1. Level reconciliation — highest passed level + 1, capped at maxLevels.
  const passedLevels = allExams.filter((e) => e.status === "pass").map((e) => e.exam_level);
  const highestPassed = passedLevels.length > 0 ? Math.max(...passedLevels) : 0;
  let expectedLevel = highestPassed + 1;
  if (maxLevels > 0) expectedLevel = Math.min(expectedLevel, maxLevels);
  const currentLevel = enrollment.level ?? 1;
  if (expectedLevel > currentLevel) {
    await supabaseAdmin
      .from("enrollments")
      .update({ level: expectedLevel })
      .eq("id", enrollmentId);
  }

  // 2. Reattempt creation — for each fail with no follow-up at same level.
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const snapToScheduleDay = (date: Date): Date => {
    if (!scheduleDay) return date;
    const idx = dayNames.indexOf(scheduleDay.toLowerCase());
    if (idx < 0) return date;
    const d = new Date(date);
    let daysAhead = idx - d.getDay();
    if (daysAhead < 0) daysAhead += 7;
    d.setDate(d.getDate() + daysAhead);
    return d;
  };

  for (const fail of allExams.filter((e) => e.status === "fail")) {
    const hasFollowUp = allExams.some(
      (e) =>
        e.id !== fail.id &&
        e.exam_level === fail.exam_level &&
        ["scheduled", "in_progress", "pass"].includes(e.status) &&
        (e.exam_date ?? "") >= (fail.exam_date ?? ""),
    );
    if (hasFollowUp) continue;
    if (!fail.exam_date) continue;

    const base = new Date(fail.exam_date);
    base.setDate(base.getDate() + 8 * 7);
    const target = snapToScheduleDay(base);
    const rescheduleDate = target.toISOString().split("T")[0];

    const { error } = await supabaseAdmin.from("examinations").insert({
      student_id: enrollment.student_id,
      enrollment_id: enrollmentId,
      exam_name: fail.exam_name,
      exam_level: fail.exam_level,
      exam_date: rescheduleDate,
      status: "scheduled",
      reattempt_count: (fail.reattempt_count ?? 0) + 1,
      examiner_id: fail.examiner_id,
    });
    if (error) {
      console.warn(`[reconcileImportedExams] reattempt insert failed for enrollment ${enrollmentId}:`, error);
    }
  }

  // 2b. Cleanup — soft-delete stale eligible/scheduled exams at levels the
  // student has already passed. This handles the case where attendance was
  // imported BEFORE examinations: the attendance import's level-up scan
  // creates an eligible exam at Level 1, then exams import reveals Level 1
  // is already passed.
  if (highestPassed > 0) {
    await supabaseAdmin
      .from("examinations")
      .update({ deleted_at: new Date().toISOString() })
      .eq("enrollment_id", enrollmentId)
      .in("status", ["eligible", "scheduled"])
      .lte("exam_level", highestPassed)
      .is("deleted_at", null);
  }

  // 3. Bring students.level up to the max across all of this student's enrollments.
  if (expectedLevel > currentLevel && enrollment.student_id) {
    const { data: allEnr } = await supabaseAdmin
      .from("enrollments")
      .select("level")
      .eq("student_id", enrollment.student_id)
      .is("deleted_at", null);
    const maxStudentLevel = Math.max(1, ...((allEnr ?? []).map((e) => e.level ?? 1)));
    await supabaseAdmin
      .from("students")
      .update({ level: maxStudentLevel })
      .eq("id", enrollment.student_id);
  }

  // 4. Fire the eligible-exam auto-create if attendance threshold is crossed
  // for the (possibly bumped) current level.
  await maybeCreateLevelUpExam(enrollmentId);
}
