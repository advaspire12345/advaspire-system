import { supabaseAdmin } from "@/db";

// ============================================
// TYPES
// ============================================

export interface StudentProfile {
  id: string;
  name: string;
  photo: string | null;
  level: number;
  adcoinBalance: number;
  poolName: string | null;
  programName: string | null;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  lesson: string | null;
  mission: string | null;
  adcoin: number;
  projectPhotos: string[] | null;
  courseName: string;
}

export interface AttendanceSummary {
  totalClasses: number;
  attended: number;
  absent: number;
  percentage: number;
  recentRecords: AttendanceRecord[];
}

export interface StudentEnrollment {
  id: string;
  courseName: string;
  status: string;
  sessionsRemaining: number;
  level: number;
  schedule: string | null;
}

// ============================================
// DATA QUERIES
// ============================================

export async function getStudentProfile(
  studentId: string
): Promise<StudentProfile | null> {
  const { data: student, error } = await supabaseAdmin
    .from("students")
    .select("id, name, photo, level, adcoin_balance")
    .eq("id", studentId)
    .is("deleted_at", null)
    .single();

  if (error || !student) return null;

  // Get active enrollment for program name and pool info
  const { data: enrollment } = await supabaseAdmin
    .from("enrollments")
    .select(
      `
      course:courses(name),
      pool:shared_session_pools(name)
    `
    )
    .eq("student_id", studentId)
    .eq("status", "active")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  const course = enrollment?.course as unknown as { name: string } | null;
  const pool = enrollment?.pool as unknown as { name: string | null } | null;

  return {
    id: student.id,
    name: student.name,
    photo: student.photo,
    level: student.level ?? 1,
    adcoinBalance: student.adcoin_balance ?? 0,
    poolName: pool?.name ?? null,
    programName: course?.name ?? null,
  };
}

export async function getStudentAttendanceSummary(
  studentId: string
): Promise<AttendanceSummary> {
  // Get all enrollment IDs for this student
  const { data: enrollments } = await supabaseAdmin
    .from("enrollments")
    .select("id, course:courses(name)")
    .eq("student_id", studentId)
    .is("deleted_at", null);

  if (!enrollments || enrollments.length === 0) {
    return {
      totalClasses: 0,
      attended: 0,
      absent: 0,
      percentage: 0,
      recentRecords: [],
    };
  }

  const enrollmentIds = enrollments.map((e) => e.id);
  const courseMap = new Map<string, string>();
  for (const e of enrollments) {
    const course = e.course as unknown as { name: string } | null;
    courseMap.set(e.id, course?.name ?? "Unknown");
  }

  const { data: records } = await supabaseAdmin
    .from("attendance")
    .select("id, date, status, lesson, mission, adcoin, project_photos, enrollment_id")
    .in("enrollment_id", enrollmentIds)
    .order("date", { ascending: false });

  const allRecords = records ?? [];
  const attended = allRecords.filter(
    (r) => r.status === "present" || r.status === "late"
  ).length;
  const absent = allRecords.filter((r) => r.status === "absent").length;
  const totalClasses = allRecords.length;

  return {
    totalClasses,
    attended,
    absent,
    percentage: totalClasses > 0 ? Math.round((attended / totalClasses) * 100) : 0,
    recentRecords: allRecords.slice(0, 10).map((r) => ({
      id: r.id,
      date: r.date,
      status: r.status,
      lesson: r.lesson,
      mission: r.mission,
      adcoin: r.adcoin ?? 0,
      projectPhotos: r.project_photos,
      courseName: courseMap.get(r.enrollment_id) ?? "Unknown",
    })),
  };
}

export async function getStudentEnrollments(
  studentId: string
): Promise<StudentEnrollment[]> {
  const { data, error } = await supabaseAdmin
    .from("enrollments")
    .select(
      `
      id,
      status,
      sessions_remaining,
      level,
      schedule,
      course:courses(name)
    `
    )
    .eq("student_id", studentId)
    .eq("status", "active")
    .is("deleted_at", null);

  if (error || !data) return [];

  return data.map((e) => {
    const course = e.course as unknown as { name: string } | null;
    return {
      id: e.id,
      courseName: course?.name ?? "Unknown",
      status: e.status,
      sessionsRemaining: e.sessions_remaining ?? 0,
      level: e.level ?? 1,
      schedule: e.schedule,
    };
  });
}

// ============================================
// BRANCH RANK
// ============================================

export async function getBranchRank(studentId: string): Promise<number | null> {
  // Get the student's branch and balance
  const { data: student } = await supabaseAdmin
    .from('students')
    .select('branch_id, adcoin_balance')
    .eq('id', studentId)
    .is('deleted_at', null)
    .single();

  if (!student || !student.branch_id) return null;

  // Count how many students in the same branch have higher balance
  const { count, error } = await supabaseAdmin
    .from('students')
    .select('id', { count: 'exact', head: true })
    .eq('branch_id', student.branch_id)
    .is('deleted_at', null)
    .gt('adcoin_balance', student.adcoin_balance ?? 0);

  if (error) return null;

  return (count ?? 0) + 1;
}
