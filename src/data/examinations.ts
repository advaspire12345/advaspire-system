import { supabaseAdmin } from "@/db";
import type {
  Examination,
  ExaminationInsert,
  ExaminationUpdate,
  ExaminationTableRow,
  EligibleStudent,
} from "@/db/schema";
import { parseISO, differenceInYears } from "date-fns";

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Get all examinations for the table view with student, course, and examiner details
 */
export async function getExaminationsForTable(
  userEmail: string
): Promise<ExaminationTableRow[]> {
  const { getUserBranchIdByEmail } = await import("./users");
  const userBranchId = await getUserBranchIdByEmail(userEmail);

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
        level,
        branch_id,
        branch:branches!inner(id, name)
      ),
      enrollment:enrollments(
        id,
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
  if (userBranchId) {
    query = query.eq("student.branch_id", userBranchId);
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
      branchName: branch?.name || "N/A",
      courseId: course?.id || "",
      courseName: course?.name || "N/A",
      sessionAttend: attendanceCounts[exam.enrollment_id] || 0,
      currentLevel: student?.level || 1,
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
 * Get students eligible for examination
 * Eligibility: accumulated attendance >= sessions_to_level_up for their current level
 */
export async function getEligibleStudentsForExam(
  userEmail: string
): Promise<EligibleStudent[]> {
  const { getUserBranchIdByEmail } = await import("./users");
  const userBranchId = await getUserBranchIdByEmail(userEmail);

  // First fetch enrollments with their course settings
  let query = supabaseAdmin
    .from("enrollments")
    .select(`
      id,
      student_id,
      course_id,
      student:students!inner(
        id,
        name,
        photo,
        level,
        branch_id,
        branch:branches!inner(id, name)
      ),
      course:courses!inner(
        id,
        name,
        sessions_to_level_up,
        number_of_levels
      )
    `)
    .eq("status", "active")
    .is("deleted_at", null);

  if (userBranchId) {
    query = query.eq("student.branch_id", userBranchId);
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

  // Get existing examinations to exclude students already being examined at current level
  const studentIds = enrollments.map((e) => e.student_id);
  const { data: existingExams } = await supabaseAdmin
    .from("examinations")
    .select("student_id, exam_level, status")
    .in("student_id", studentIds)
    .is("deleted_at", null)
    .not("status", "in", '("fail", "absent")');

  // Create a set of "studentId-level" combinations that already have active exams
  const existingExamSet = new Set(
    (existingExams ?? []).map((e) => `${e.student_id}-${e.exam_level}`)
  );

  const eligibleStudents: EligibleStudent[] = [];

  for (const enrollment of enrollments) {
    const student = enrollment.student as any;
    const course = enrollment.course as any;
    const branch = student?.branch;

    const sessionsRequired = course?.sessions_to_level_up || 8;
    const sessionsAttended = attendanceCounts[enrollment.id] || 0;
    const currentLevel = student?.level || 1;
    const maxLevels = course?.number_of_levels || 10;

    // Check if student has attended enough sessions
    if (sessionsAttended >= sessionsRequired) {
      // Check if student is already at max level
      if (currentLevel >= maxLevels) {
        continue;
      }

      // Check if there's already an active exam for this level
      const examKey = `${enrollment.student_id}-${currentLevel + 1}`;
      if (existingExamSet.has(examKey)) {
        continue;
      }

      eligibleStudents.push({
        studentId: enrollment.student_id,
        studentName: student?.name || "Unknown",
        studentPhoto: student?.photo || null,
        branchId: student?.branch_id || "",
        branchName: branch?.name || "N/A",
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
 * Generate a unique certificate number
 */
export async function generateCertificateNumber(): Promise<string> {
  const { data, error } = await supabaseAdmin.rpc("generate_certificate_number");

  if (error) {
    console.error("Error generating certificate number:", error);
    // Fallback: generate a simple certificate number
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 99999)
      .toString()
      .padStart(5, "0");
    return `CERT-${year}-${random}`;
  }

  return data;
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
  const { getUserBranchIdByEmail } = await import("./users");
  const userBranchId = await getUserBranchIdByEmail(userEmail);

  let query = supabaseAdmin
    .from("users")
    .select("id, name, photo")
    .in("role", ["super_admin", "admin", "branch_admin", "instructor"])
    .is("deleted_at", null)
    .order("name");

  if (userBranchId) {
    query = query.eq("branch_id", userBranchId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching examiners:", error);
    return [];
  }

  return data ?? [];
}
