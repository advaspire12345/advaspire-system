import { supabaseAdmin } from "@/db";
import { getUserBranchIds } from "./users";

/**
 * Part E (Phase 1) — read-only learning-progress summary for the staff cockpit.
 *
 * Reads the Hub-migrated tables (`lesson_progress`, `assessment_attempts`,
 * `certificates`) for the students in the caller's branch(es). The actual
 * marking / certificate issuance still happens in the Learning Hub (deep-linked
 * from the table); this view is read-only.
 */
export interface StudentProgressRow {
  studentId: string;          // students.id — used for the Hub deep-link
  studentCode: string | null; // students.student_id
  name: string;
  branchName: string | null;
  lessonsTracked: number;     // lesson_progress rows started
  lessonsApproved: number;    // rows with learnt+challenge+homework all approved
  assessmentsMarked: number;  // assessment_attempts with status='marked'
  certificates: number;
}

const APPROVED = "approved";

export async function getStudentsProgressInBranch(
  email: string,
  options: { offset: number; limit: number }
): Promise<{ rows: StudentProgressRow[]; totalCount: number }> {
  // null = super admin (all branches); [] = no access
  const branchIds = await getUserBranchIds(email);
  if (branchIds !== null && branchIds.length === 0) {
    return { rows: [], totalCount: 0 };
  }

  let query = supabaseAdmin
    .from("students")
    .select("id, name, student_id, branch_id", { count: "exact" })
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (branchIds !== null) {
    query = query.in("branch_id", branchIds);
  }

  const { data: students, count, error } = await query.range(
    options.offset,
    options.offset + options.limit - 1
  );
  if (error) {
    console.error("Error fetching students for progress:", error);
    return { rows: [], totalCount: 0 };
  }

  const ids = (students ?? []).map((s) => s.id);
  if (ids.length === 0) return { rows: [], totalCount: count ?? 0 };

  const branchIdList = [
    ...new Set((students ?? []).map((s) => s.branch_id).filter(Boolean)),
  ] as string[];

  // Batch the reads over the page's student ids (no N+1). Branch names fetched
  // separately because students has multiple FKs to branches (embed is ambiguous).
  const [lp, aa, certs, branchRows] = await Promise.all([
    supabaseAdmin
      .from("lesson_progress")
      .select("student_id, learnt_status, challenge_status, homework_status")
      .in("student_id", ids),
    supabaseAdmin
      .from("assessment_attempts")
      .select("student_id, status")
      .in("student_id", ids),
    supabaseAdmin.from("certificates").select("student_id").in("student_id", ids),
    branchIdList.length
      ? supabaseAdmin.from("branches").select("id, name").in("id", branchIdList)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);
  const branchNameById = new Map(
    ((branchRows.data ?? []) as { id: string; name: string }[]).map((b) => [b.id, b.name])
  );

  const tracked = new Map<string, number>();
  const approved = new Map<string, number>();
  for (const r of lp.data ?? []) {
    tracked.set(r.student_id, (tracked.get(r.student_id) ?? 0) + 1);
    if (
      r.learnt_status === APPROVED &&
      r.challenge_status === APPROVED &&
      r.homework_status === APPROVED
    ) {
      approved.set(r.student_id, (approved.get(r.student_id) ?? 0) + 1);
    }
  }
  const marked = new Map<string, number>();
  for (const r of aa.data ?? []) {
    if (r.status === "marked") marked.set(r.student_id, (marked.get(r.student_id) ?? 0) + 1);
  }
  const certCount = new Map<string, number>();
  for (const r of certs.data ?? []) {
    certCount.set(r.student_id, (certCount.get(r.student_id) ?? 0) + 1);
  }

  const rows: StudentProgressRow[] = (students ?? []).map((s) => {
    return {
      studentId: s.id,
      studentCode: s.student_id ?? null,
      name: s.name,
      branchName: branchNameById.get(s.branch_id) ?? null,
      lessonsTracked: tracked.get(s.id) ?? 0,
      lessonsApproved: approved.get(s.id) ?? 0,
      assessmentsMarked: marked.get(s.id) ?? 0,
      certificates: certCount.get(s.id) ?? 0,
    };
  });

  return { rows, totalCount: count ?? 0 };
}

// ── Attendance-driven lesson progress (date + slot) ───────────────────────────

const ROBOTICS_CATALOGS = new Set(["ev3", "microbit", "advasbot"]);

/** A checkbox is "checked" when its status is set to anything other than not_done. */
function checked(status: string | null | undefined): boolean {
  return !!status && status !== "not_done";
}

export interface ProgressLessonRow {
  attendanceId: string;
  studentId: string;
  studentName: string;
  studentCode: string | null;
  courseName: string;
  lessonCatalog: string | null;
  isRobotics: boolean;
  lessonCoordinate: string;
  lessonTitle: string; // full stored lesson, e.g. "EV3-L1-03 EV3 Robot drop tower"
  level: number | null; // lesson level (for the All-Progresses level tabs)
  slotKey: string; // `${course}|${day}|${HH:MM}` — matches the slot filter option value
  learnt: boolean;
  mission1: boolean;
  mission2: boolean;
  mission3: boolean;
  challenge: boolean;
  homework: boolean;
  remark: string | null;
  upload: { imagePath: string | null; videoUrl: string | null; projectUrl: string | null } | null;
}

/**
 * Attendance-driven progress: for a given date (and optional slot), one row per
 * student-lesson recorded in attendance that day, with the per-lesson checkbox
 * states from lesson_progress (+ remark / upload). Branch-scoped to the caller.
 */
export async function getProgressForDateSlot(
  email: string,
  opts: { date: string; slot?: string },
): Promise<ProgressLessonRow[]> {
  const branchIds = await getUserBranchIds(email);
  if (branchIds !== null && branchIds.length === 0) return [];

  const { lessonCoordinateFromActivity } = await import("./attendance");

  const { data, error } = await supabaseAdmin
    .from("attendance")
    .select(
      `id, activities, slot_day, slot_time,
       enrollment:enrollments!inner(
         student:students!inner(id, name, student_id, branch_id),
         course:courses!inner(name, lesson_catalog)
       )`,
    )
    .eq("date", opts.date)
    .in("status", ["present", "late"]);
  if (error) {
    console.error("Error fetching attendance for progress:", error);
    return [];
  }

  type Embedded = {
    id: string;
    activities: { lesson: string; mission: string }[] | null;
    slot_day: string | null;
    slot_time: string | null;
    enrollment: {
      student: { id: string; name: string; student_id: string | null; branch_id: string | null };
      course: { name: string; lesson_catalog: string | null };
    };
  };

  const rows: ProgressLessonRow[] = [];
  for (const rec of (data ?? []) as unknown as Embedded[]) {
    const student = rec.enrollment?.student;
    const course = rec.enrollment?.course;
    if (!student || !course) continue;
    if (branchIds !== null && !branchIds.includes(student.branch_id ?? "")) continue;

    const catalog = (course.lesson_catalog ?? "").toLowerCase();
    const day = (rec.slot_day ?? "").toLowerCase();
    const start = (rec.slot_time ?? "").slice(0, 5);
    const slotKey = `${course.name}|${day}|${start}`;
    if (opts.slot && slotKey !== opts.slot) continue;

    for (const act of rec.activities ?? []) {
      const coord = lessonCoordinateFromActivity(act.lesson);
      if (!coord) continue;
      rows.push({
        attendanceId: rec.id,
        studentId: student.id,
        studentName: student.name,
        studentCode: student.student_id ?? null,
        courseName: course.name,
        lessonCatalog: course.lesson_catalog,
        isRobotics: ROBOTICS_CATALOGS.has(catalog),
        lessonCoordinate: coord,
        lessonTitle: act.lesson,
        level: null,
        slotKey,
        learnt: false,
        mission1: false,
        mission2: false,
        mission3: false,
        challenge: false,
        homework: false,
        remark: null,
        upload: null,
      });
    }
  }
  if (rows.length === 0) return [];

  const studentIds = [...new Set(rows.map((r) => r.studentId))];
  const coords = [...new Set(rows.map((r) => r.lessonCoordinate))];

  const [lp, uploads, remarks] = await Promise.all([
    supabaseAdmin
      .from("lesson_progress")
      .select(
        "student_id, lesson_coordinate, learnt_status, mission1_status, mission2_status, mission3_status, challenge_status, homework_status",
      )
      .in("student_id", studentIds)
      .in("lesson_coordinate", coords),
    supabaseAdmin
      .from("lesson_uploads")
      .select("student_id, lesson_coordinate, project_url, video_url, image_path")
      .in("student_id", studentIds)
      .in("lesson_coordinate", coords),
    supabaseAdmin
      .from("lesson_remarks")
      .select("student_id, lesson_coordinate, note")
      .in("student_id", studentIds)
      .in("lesson_coordinate", coords),
  ]);

  const key = (s: string, c: string) => `${s}|${c}`;
  const lpMap = new Map((lp.data ?? []).map((r) => [key(r.student_id, r.lesson_coordinate), r]));
  const upMap = new Map(
    (uploads.data ?? []).map((r) => [
      key(r.student_id, r.lesson_coordinate),
      { imagePath: r.image_path ?? null, videoUrl: r.video_url ?? null, projectUrl: r.project_url ?? null },
    ]),
  );
  const rmMap = new Map(
    (remarks.data ?? []).map((r) => [key(r.student_id, r.lesson_coordinate), r.note ?? null]),
  );

  for (const row of rows) {
    const k = key(row.studentId, row.lessonCoordinate);
    const p = lpMap.get(k);
    if (p) {
      row.learnt = checked(p.learnt_status);
      row.mission1 = checked(p.mission1_status);
      row.mission2 = checked(p.mission2_status);
      row.mission3 = checked(p.mission3_status);
      row.challenge = checked(p.challenge_status);
      row.homework = checked(p.homework_status);
    }
    row.upload = upMap.get(k) ?? null;
    row.remark = rmMap.get(k) ?? null;
  }

  rows.sort((a, b) => a.studentName.localeCompare(b.studentName) || a.lessonCoordinate.localeCompare(b.lessonCoordinate));
  return rows;
}

// ── All progress for one student (search view) ────────────────────────────────

export interface ProgressStudentHit {
  id: string;
  name: string;
  studentCode: string | null;
}

/** Branch-scoped student search for the "All Progresses" view. */
export async function searchStudentsForProgress(
  email: string,
  q: string,
): Promise<ProgressStudentHit[]> {
  const branchIds = await getUserBranchIds(email);
  if (branchIds !== null && branchIds.length === 0) return [];
  let query = supabaseAdmin
    .from("students")
    .select("id, name, student_id, branch_id")
    .is("deleted_at", null)
    .order("name", { ascending: true })
    .limit(25);
  const term = q.trim();
  if (term) query = query.or(`name.ilike.%${term}%,student_id.ilike.%${term}%`);
  if (branchIds !== null) query = query.in("branch_id", branchIds);
  const { data, error } = await query;
  if (error) {
    console.error("searchStudentsForProgress error:", error);
    return [];
  }
  return (data ?? []).map((s) => ({ id: s.id, name: s.name, studentCode: s.student_id ?? null }));
}

/**
 * All lessons across a student's enrolled courses, with their per-lesson progress
 * states — the full "All Progresses" view for one student. Branch-scoped.
 */
export async function getAllProgressForStudent(
  email: string,
  studentId: string,
): Promise<{ student: ProgressStudentHit; rows: ProgressLessonRow[] } | null> {
  const branchIds = await getUserBranchIds(email);
  if (branchIds !== null && branchIds.length === 0) return null;

  const { data: student } = await supabaseAdmin
    .from("students")
    .select("id, name, student_id, branch_id")
    .eq("id", studentId)
    .maybeSingle();
  if (!student) return null;
  if (branchIds !== null && !branchIds.includes(student.branch_id ?? "")) return null;

  const studentHit: ProgressStudentHit = {
    id: student.id,
    name: student.name,
    studentCode: student.student_id ?? null,
  };

  const { data: enrollments } = await supabaseAdmin
    .from("enrollments")
    .select("course:courses!inner(name, lesson_catalog)")
    .eq("student_id", studentId)
    .is("deleted_at", null);

  // Map of lesson_catalog -> course name (deduped).
  const courseByCatalog = new Map<string, string>();
  for (const e of (enrollments ?? []) as unknown as { course: { name: string; lesson_catalog: string | null } }[]) {
    const cat = e.course?.lesson_catalog;
    if (cat && !courseByCatalog.has(cat)) courseByCatalog.set(cat, e.course.name);
  }
  if (courseByCatalog.size === 0) return { student: studentHit, rows: [] };

  const catalogs = [...courseByCatalog.keys()];
  const [lessonsRes, lpRes, upRes, rmRes] = await Promise.all([
    supabaseAdmin
      .from("lessons")
      .select("course_code, coordinate, title, level, position")
      .in("course_code", catalogs)
      .order("level", { ascending: true, nullsFirst: false })
      .order("position", { ascending: true, nullsFirst: false }),
    supabaseAdmin
      .from("lesson_progress")
      .select(
        "lesson_coordinate, learnt_status, mission1_status, mission2_status, mission3_status, challenge_status, homework_status",
      )
      .eq("student_id", studentId),
    supabaseAdmin
      .from("lesson_uploads")
      .select("lesson_coordinate, project_url, video_url, image_path")
      .eq("student_id", studentId),
    supabaseAdmin.from("lesson_remarks").select("lesson_coordinate, note").eq("student_id", studentId),
  ]);

  const lpMap = new Map((lpRes.data ?? []).map((r) => [r.lesson_coordinate, r]));
  const upMap = new Map(
    (upRes.data ?? []).map((r) => [
      r.lesson_coordinate,
      { imagePath: r.image_path ?? null, videoUrl: r.video_url ?? null, projectUrl: r.project_url ?? null },
    ]),
  );
  const rmMap = new Map((rmRes.data ?? []).map((r) => [r.lesson_coordinate, r.note ?? null]));

  const rows: ProgressLessonRow[] = (lessonsRes.data ?? []).map((l) => {
    const p = lpMap.get(l.coordinate);
    const catalog = (l.course_code ?? "").toLowerCase();
    return {
      attendanceId: "",
      studentId: student.id,
      studentName: student.name,
      studentCode: student.student_id ?? null,
      courseName: courseByCatalog.get(l.course_code) ?? l.course_code,
      lessonCatalog: l.course_code,
      isRobotics: ROBOTICS_CATALOGS.has(catalog),
      lessonCoordinate: l.coordinate,
      lessonTitle: l.coordinate ? `${l.coordinate} ${l.title}` : l.title,
      level: l.level ?? null,
      slotKey: "",
      learnt: checked(p?.learnt_status),
      mission1: checked(p?.mission1_status),
      mission2: checked(p?.mission2_status),
      mission3: checked(p?.mission3_status),
      challenge: checked(p?.challenge_status),
      homework: checked(p?.homework_status),
      remark: rmMap.get(l.coordinate) ?? null,
      upload: upMap.get(l.coordinate) ?? null,
    };
  });

  return { student: studentHit, rows };
}
