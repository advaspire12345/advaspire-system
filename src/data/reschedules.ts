import { supabaseAdmin } from "@/db";
import type {
  SessionReschedule,
  SessionRescheduleInsert,
} from "@/db/schema";
import {
  createReschedulePairEvents,
  updateReschedulePairTarget,
} from "@/data/events";

// ============================================
// Constants
// ============================================

const ADVANCE_MS = 24 * 60 * 60 * 1000;
const PROJECTION_WEEKS = 8; // how far ahead to project upcoming sessions

const DAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

// ============================================
// Date helpers
// ============================================

function dayNameToIndex(name: string | null): number | null {
  if (!name) return null;
  const idx = DAY_INDEX[name.toLowerCase().trim()];
  return idx === undefined ? null : idx;
}

function ymd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function combineDateAndTime(dateStr: string, timeStr: string | null): Date {
  const t = (timeStr ?? "00:00:00").slice(0, 8);
  return new Date(`${dateStr}T${t}`);
}

function nextOccurrenceOfDay(fromDate: Date, dayIdx: number, inclusive = true): Date {
  const result = new Date(fromDate);
  result.setHours(0, 0, 0, 0);
  const diff = (dayIdx - result.getDay() + 7) % 7;
  if (diff === 0 && !inclusive) {
    result.setDate(result.getDate() + 7);
  } else if (diff > 0) {
    result.setDate(result.getDate() + diff);
  }
  return result;
}

// ============================================
// Types
// ============================================

export interface UpcomingSession {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  courseId: string;
  courseName: string;
  /** Date the session is currently scheduled to occur on (after any reschedule). */
  currentDate: string;
  currentSlotDay: string;
  currentSlotTime: string;
  currentEndTime: string | null;
  /** Anchor date used to identify the session in DB (always the original recurring date). */
  originalDate: string;
  originalSlotDay: string;
  originalSlotTime: string;
  /** Whether this session has already been rescheduled at least once. */
  rescheduled: boolean;
  /** True iff the current scheduled date/time is >=24h away. */
  canReschedule: boolean;
}

export interface AvailableSlot {
  slotId: string;
  courseId: string;
  day: string;
  time: string;
  endTime: string | null;
  duration: number | null;
  nextDate: string;
  seatsRemaining: number;
  limit: number;
}

// ============================================
// Upcoming sessions (per student)
// ============================================

export async function getUpcomingSessionsForParent(
  parentId: string,
): Promise<UpcomingSession[]> {
  const { data: links } = await supabaseAdmin
    .from("parent_students")
    .select("student_id")
    .eq("parent_id", parentId);
  const studentIds = (links ?? [])
    .map((l) => l.student_id as string)
    .filter(Boolean);
  if (studentIds.length === 0) return [];

  return getUpcomingSessions(studentIds);
}

type EnrollmentRow = {
  id: string;
  student_id: string;
  course_id: string;
  day_of_week: string | null;
  start_time: string | null;
  end_time: string | null;
  status: string;
  sessions_remaining: number | null;
};

export async function getUpcomingSessions(
  studentIds: string[],
): Promise<UpcomingSession[]> {
  if (studentIds.length === 0) return [];

  const { data: rawEnrollments } = await supabaseAdmin
    .from("enrollments")
    .select(
      "id, student_id, course_id, day_of_week, start_time, end_time, status, sessions_remaining",
    )
    .in("student_id", studentIds)
    .eq("status", "active")
    .is("deleted_at", null);

  const enrollments = (rawEnrollments ?? []) as unknown as EnrollmentRow[];
  if (enrollments.length === 0) return [];

  const enrollmentIds = enrollments.map((e) => e.id);
  const courseIds = Array.from(new Set(enrollments.map((e) => e.course_id)));
  const enrolledStudentIds = Array.from(new Set(enrollments.map((e) => e.student_id)));

  const [{ data: rawStudents }, { data: rawCourses }] = await Promise.all([
    supabaseAdmin.from("students").select("id, name").in("id", enrolledStudentIds),
    supabaseAdmin.from("courses").select("id, name").in("id", courseIds),
  ]);
  const studentName = new Map<string, string>();
  for (const s of (rawStudents ?? []) as { id: string; name: string }[]) {
    studentName.set(s.id, s.name);
  }
  const courseName = new Map<string, string>();
  for (const c of (rawCourses ?? []) as { id: string; name: string }[]) {
    courseName.set(c.id, c.name);
  }

  const { data: reschedules } = await supabaseAdmin
    .from("session_reschedules")
    .select("*")
    .in("enrollment_id", enrollmentIds);
  const reschedulesByKey = new Map<string, SessionReschedule>();
  for (const r of (reschedules ?? []) as SessionReschedule[]) {
    reschedulesByKey.set(`${r.enrollment_id}|${r.original_date}`, r);
  }

  const { data: marked } = await supabaseAdmin
    .from("attendance")
    .select("enrollment_id, date")
    .in("enrollment_id", enrollmentIds);
  const markedByEnrollment = new Map<string, Set<string>>();
  for (const m of (marked ?? []) as { enrollment_id: string; date: string }[]) {
    if (!markedByEnrollment.has(m.enrollment_id)) markedByEnrollment.set(m.enrollment_id, new Set());
    markedByEnrollment.get(m.enrollment_id)!.add(m.date);
  }

  const now = new Date();
  const todayMidnight = new Date(now);
  todayMidnight.setHours(0, 0, 0, 0);

  const out: UpcomingSession[] = [];

  for (const en of enrollments) {
    const dayIdx = dayNameToIndex(en.day_of_week);
    if (dayIdx === null || !en.start_time) continue;

    const startTime = en.start_time;
    const endTime = en.end_time;
    const slotDay = en.day_of_week!.toLowerCase();
    const sName = studentName.get(en.student_id) ?? "Student";
    const cName = courseName.get(en.course_id) ?? "Course";

    const enrollmentMarked = markedByEnrollment.get(en.id) ?? new Set<string>();
    const remaining = Math.max(0, Number(en.sessions_remaining ?? 0));
    const projectionLimit = Math.max(remaining, 1) + PROJECTION_WEEKS;

    const cursor = nextOccurrenceOfDay(todayMidnight, dayIdx, true);
    let emitted = 0;

    for (let i = 0; i < projectionLimit && emitted < PROJECTION_WEEKS; i++) {
      const originalDate = ymd(cursor);
      cursor.setDate(cursor.getDate() + 7);

      if (enrollmentMarked.has(originalDate)) continue;

      const r = reschedulesByKey.get(`${en.id}|${originalDate}`);
      const currentDate = r ? r.new_date : originalDate;
      const currentSlotDay = r ? r.new_slot_day : slotDay;
      const currentSlotTime = r ? r.new_slot_time : startTime;
      const currentDateTime = combineDateAndTime(currentDate, currentSlotTime);
      const canReschedule = currentDateTime.getTime() - now.getTime() >= ADVANCE_MS;

      // Don't show sessions whose current time has already passed.
      if (currentDateTime.getTime() < now.getTime()) continue;

      out.push({
        enrollmentId: en.id,
        studentId: en.student_id,
        studentName: sName,
        courseId: en.course_id,
        courseName: cName,
        currentDate,
        currentSlotDay,
        currentSlotTime,
        currentEndTime: r ? null : endTime,
        originalDate,
        originalSlotDay: slotDay,
        originalSlotTime: startTime,
        rescheduled: !!r,
        canReschedule,
      });
      emitted++;
    }
  }

  // Sort by current date then by student name for stable UI ordering.
  out.sort(
    (a, b) =>
      a.currentDate.localeCompare(b.currentDate) ||
      a.studentName.localeCompare(b.studentName),
  );
  return out;
}

// ============================================
// Available slots (capacity + 24h filtered)
// ============================================

type SlotRow = {
  id: string;
  course_id: string;
  day: string;
  time: string;
  duration: number | null;
  limit_student: number | null;
};

export async function getAvailableSlots(
  enrollmentId: string,
  originalDate: string,
): Promise<AvailableSlot[]> {
  const { data: rawEnrollment } = await supabaseAdmin
    .from("enrollments")
    .select("id, course_id, day_of_week, start_time")
    .eq("id", enrollmentId)
    .is("deleted_at", null)
    .single();
  const enrollment = rawEnrollment as unknown as {
    id: string;
    course_id: string;
    day_of_week: string | null;
    start_time: string | null;
  } | null;
  if (!enrollment) return [];

  const courseId = enrollment.course_id;

  const { data: rawSlots } = await supabaseAdmin
    .from("course_slots")
    .select("id, course_id, day, time, duration, limit_student")
    .eq("course_id", courseId)
    .is("deleted_at", null);
  const slots = (rawSlots ?? []) as unknown as SlotRow[];
  if (slots.length === 0) return [];

  const now = new Date();
  const todayMidnight = new Date(now);
  todayMidnight.setHours(0, 0, 0, 0);

  const out: AvailableSlot[] = [];

  for (const s of slots) {
    const slotDay = s.day;
    const dayIdx = dayNameToIndex(slotDay);
    if (dayIdx === null) continue;
    const slotTime = s.time ?? "00:00";
    const duration = s.duration ?? null;
    const limit = Number(s.limit_student ?? 0);
    if (limit <= 0) continue;

    const candidate = nextOccurrenceOfDay(todayMidnight, dayIdx, true);
    for (let i = 0; i < 14; i++) {
      const dt = combineDateAndTime(ymd(candidate), slotTime);
      if (dt.getTime() - now.getTime() >= ADVANCE_MS) break;
      candidate.setDate(candidate.getDate() + 7);
    }
    const nextDate = ymd(candidate);

    if (
      slotDay.toLowerCase() === (enrollment.day_of_week ?? "").toLowerCase() &&
      slotTime === enrollment.start_time &&
      nextDate === originalDate
    ) {
      continue;
    }

    const { count: seatedCount } = await supabaseAdmin
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .eq("course_id", courseId)
      .eq("day_of_week", slotDay)
      .eq("start_time", slotTime)
      .eq("status", "active")
      .is("deleted_at", null);

    const { count: incomingCount } = await supabaseAdmin
      .from("session_reschedules")
      .select("id", { count: "exact", head: true })
      .eq("new_slot_id", s.id)
      .eq("new_date", nextDate);

    const { data: rawMatched } = await supabaseAdmin
      .from("enrollments")
      .select("id")
      .eq("course_id", courseId)
      .eq("day_of_week", slotDay)
      .eq("start_time", slotTime)
      .eq("status", "active")
      .is("deleted_at", null);
    const matchedIds = ((rawMatched ?? []) as unknown as { id: string }[]).map(
      (e) => e.id,
    );

    let outgoing = 0;
    if (matchedIds.length > 0) {
      const { count: outgoingCount } = await supabaseAdmin
        .from("session_reschedules")
        .select("id", { count: "exact", head: true })
        .in("enrollment_id", matchedIds)
        .eq("original_date", nextDate);
      outgoing = outgoingCount ?? 0;
    }

    const usage = (seatedCount ?? 0) + (incomingCount ?? 0) - outgoing;
    const seatsRemaining = limit - usage;
    if (seatsRemaining <= 0) continue;

    out.push({
      slotId: s.id,
      courseId,
      day: slotDay,
      time: slotTime,
      endTime: null,
      duration,
      nextDate,
      seatsRemaining,
      limit,
    });
  }

  out.sort((a, b) =>
    a.nextDate.localeCompare(b.nextDate) || a.time.localeCompare(b.time),
  );
  return out;
}

// ============================================
// Mutation
// ============================================

export interface RescheduleInput {
  parentId: string;
  enrollmentId: string;
  originalDate: string;
  newSlotId: string;
}

export async function rescheduleSession(
  input: RescheduleInput,
): Promise<{ ok: true; reschedule: SessionReschedule } | { ok: false; error: string }> {
  // 1) Load enrollment + ensure parent owns the student.
  const { data: rawEnrollment } = await supabaseAdmin
    .from("enrollments")
    .select("id, student_id, course_id, day_of_week, start_time, end_time, status")
    .eq("id", input.enrollmentId)
    .is("deleted_at", null)
    .single();
  const enrollment = rawEnrollment as unknown as {
    id: string;
    student_id: string;
    course_id: string;
    day_of_week: string | null;
    start_time: string | null;
    end_time: string | null;
    status: string;
  } | null;
  if (!enrollment) return { ok: false, error: "Enrollment not found." };
  if (enrollment.status !== "active") return { ok: false, error: "Enrollment is not active." };
  if (!enrollment.day_of_week || !enrollment.start_time) {
    return { ok: false, error: "Enrollment has no scheduled slot." };
  }

  const { data: link } = await supabaseAdmin
    .from("parent_students")
    .select("parent_id")
    .eq("parent_id", input.parentId)
    .eq("student_id", enrollment.student_id)
    .maybeSingle();
  if (!link) return { ok: false, error: "Parent is not linked to this student." };

  const { data: rawCourse } = await supabaseAdmin
    .from("courses")
    .select("id, name")
    .eq("id", enrollment.course_id)
    .single();
  const course = rawCourse as unknown as { id: string; name: string } | null;
  if (!course) return { ok: false, error: "Course not found." };

  // 2) Load the new slot.
  const { data: rawSlot } = await supabaseAdmin
    .from("course_slots")
    .select("id, course_id, day, time, limit_student, duration")
    .eq("id", input.newSlotId)
    .is("deleted_at", null)
    .single();
  const slot = rawSlot as unknown as SlotRow | null;
  if (!slot) return { ok: false, error: "New slot not found." };
  if (slot.course_id !== enrollment.course_id) {
    return { ok: false, error: "New slot must belong to the same course." };
  }

  const newSlotDay = String(slot.day);
  const newSlotTime = String(slot.time);
  const limit = Number(slot.limit_student ?? 0);
  if (limit <= 0) return { ok: false, error: "Target slot has no capacity." };

  // 3) Compute the next occurrence of the new slot's day.
  const dayIdx = dayNameToIndex(newSlotDay);
  if (dayIdx === null) return { ok: false, error: "Invalid slot day-of-week." };
  const now = new Date();
  const todayMidnight = new Date(now);
  todayMidnight.setHours(0, 0, 0, 0);
  const candidate = nextOccurrenceOfDay(todayMidnight, dayIdx, true);
  let newDate = ymd(candidate);
  for (let i = 0; i < 14; i++) {
    const dt = combineDateAndTime(newDate, newSlotTime);
    if (dt.getTime() - now.getTime() >= ADVANCE_MS) break;
    candidate.setDate(candidate.getDate() + 7);
    newDate = ymd(candidate);
  }

  // 4) 24h check on the *currently scheduled* date (the one the user is missing).
  //    Use existing reschedule if there is one — else the original recurring date.
  const { data: rawExisting } = await supabaseAdmin
    .from("session_reschedules")
    .select("*")
    .eq("enrollment_id", input.enrollmentId)
    .eq("original_date", input.originalDate)
    .maybeSingle();
  const existing = rawExisting as unknown as SessionReschedule | null;
  const currentScheduledDate = existing ? existing.new_date : input.originalDate;
  const currentScheduledTime = existing ? existing.new_slot_time : enrollment.start_time;
  const currentScheduledAt = combineDateAndTime(currentScheduledDate, currentScheduledTime);
  if (currentScheduledAt.getTime() - now.getTime() < ADVANCE_MS) {
    return { ok: false, error: "Reschedule must be at least 24 hours in advance." };
  }
  const newScheduledAt = combineDateAndTime(newDate, newSlotTime);
  if (newScheduledAt.getTime() - now.getTime() < ADVANCE_MS) {
    return { ok: false, error: "Target session must be at least 24 hours from now." };
  }

  // 5) Capacity check on the target slot for newDate.
  const { count: seatedCount } = await supabaseAdmin
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .eq("course_id", enrollment.course_id)
    .eq("day_of_week", newSlotDay)
    .eq("start_time", newSlotTime)
    .eq("status", "active")
    .is("deleted_at", null);

  const { count: incomingCount } = await supabaseAdmin
    .from("session_reschedules")
    .select("id", { count: "exact", head: true })
    .eq("new_slot_id", input.newSlotId)
    .eq("new_date", newDate);

  const { data: rawMatchedEnr } = await supabaseAdmin
    .from("enrollments")
    .select("id")
    .eq("course_id", enrollment.course_id)
    .eq("day_of_week", newSlotDay)
    .eq("start_time", newSlotTime)
    .eq("status", "active")
    .is("deleted_at", null);
  const matchedIds = ((rawMatchedEnr ?? []) as unknown as { id: string }[]).map(
    (e) => e.id,
  );

  let outgoing = 0;
  if (matchedIds.length > 0) {
    const { count: outgoingCount } = await supabaseAdmin
      .from("session_reschedules")
      .select("id", { count: "exact", head: true })
      .in("enrollment_id", matchedIds)
      .eq("original_date", newDate);
    outgoing = outgoingCount ?? 0;
  }
  // If the current student is one of the "incoming" already for this slot/date, don't double-count.
  let selfIncoming = 0;
  if (existing && existing.new_slot_id === input.newSlotId && existing.new_date === newDate) {
    selfIncoming = 1;
  }
  const usage = (seatedCount ?? 0) + (incomingCount ?? 0) - outgoing - selfIncoming;
  if (usage >= limit) return { ok: false, error: "Target slot is full on that date." };

  const cName = course.name;

  // 6) Insert-or-update path.
  if (existing) {
    if (!existing.target_event_id) {
      return { ok: false, error: "Existing reschedule has no target event reference." };
    }
    await updateReschedulePairTarget(existing.target_event_id as string, {
      courseName: cName,
      newDate,
      newStartTime: `${newSlotTime}`,
      newEndTime: null,
    });
    const { data: updated, error } = await supabaseAdmin
      .from("session_reschedules")
      .update({
        new_slot_id: input.newSlotId,
        new_date: newDate,
        new_slot_day: newSlotDay,
        new_slot_time: newSlotTime,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();
    if (error || !updated) return { ok: false, error: error?.message ?? "Update failed" };
    return { ok: true, reschedule: updated as SessionReschedule };
  }

  // 7) Fresh insert — create both events first, then the row.
  const pair = await createReschedulePairEvents({
    studentId: enrollment.student_id,
    courseName: cName,
    originalDate: input.originalDate,
    originalStartTime: enrollment.start_time,
    originalEndTime: enrollment.end_time,
    newDate,
    newStartTime: newSlotTime,
    newEndTime: null,
  });

  const insertRow: SessionRescheduleInsert = {
    enrollment_id: input.enrollmentId,
    student_id: enrollment.student_id,
    course_id: enrollment.course_id,
    original_date: input.originalDate,
    original_slot_day: enrollment.day_of_week.toLowerCase(),
    original_slot_time: enrollment.start_time,
    new_slot_id: input.newSlotId,
    new_date: newDate,
    new_slot_day: newSlotDay,
    new_slot_time: newSlotTime,
    origin_event_id: pair.originEventId,
    target_event_id: pair.targetEventId,
    initiated_by_parent_id: input.parentId,
  };
  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from("session_reschedules")
    .insert(insertRow)
    .select()
    .single();
  if (insertErr || !inserted) {
    // Roll back the events we just created.
    await supabaseAdmin
      .from("events")
      .delete()
      .in("id", [pair.originEventId, pair.targetEventId]);
    return { ok: false, error: insertErr?.message ?? "Insert failed" };
  }

  return { ok: true, reschedule: inserted as SessionReschedule };
}

// ============================================
// Read helpers
// ============================================

export async function getSessionReschedulesForStudent(
  studentId: string,
  fromDate?: string,
): Promise<SessionReschedule[]> {
  let query = supabaseAdmin
    .from("session_reschedules")
    .select("*")
    .eq("student_id", studentId);
  if (fromDate) query = query.gte("new_date", fromDate);
  const { data } = await query;
  return (data ?? []) as SessionReschedule[];
}
