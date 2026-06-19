import { supabaseAdmin } from "@/db";

export interface AttendanceSlotOption {
  /** match key: `${courseName}|${day-lowercase}|${HH:MM-start}` */
  value: string;
  /** display label, e.g. "EV3 · Saturday 9:00 AM - 10:30 AM" */
  label: string;
  course: string;
  /** lowercase day, e.g. "saturday" */
  day: string;
  /** slot window start "HH:MM" */
  startTime: string;
  /** slot window end "HH:MM" */
  endTime: string;
}

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function to12h(hm: string): string {
  const [h, m] = hm.split(":").map(Number);
  if (Number.isNaN(h)) return hm;
  const ap = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m ?? 0).padStart(2, "0")} ${ap}`;
}

/** Add `min` minutes to an "HH:MM" string, returning "HH:MM" (clamped to 24h). */
function addMinutes(hm: string, min: number): string {
  const [h, m] = hm.split(":").map(Number);
  const total = (h * 60 + m + min) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export interface CourseSlotWindow {
  startTime: string; // "09:00"
  endTime: string;   // "10:30"
  label: string;     // "9:00 AM - 10:30 AM"
}

/**
 * Distinct scheduled time-windows for a course (deduped across days), built from
 * `course_slots.time` + `duration`. The attendance slot picker shows these; the
 * day comes from the chosen attendance date, not the slot row.
 */
export async function getSlotWindowsForCourse(
  courseId: string,
  day?: string,
  branchId?: string,
): Promise<CourseSlotWindow[]> {
  let query = supabaseAdmin
    .from("course_slots")
    .select("time, duration")
    .eq("course_id", courseId)
    .eq("kind", "schedule")
    .is("deleted_at", null)
    .not("time", "is", null);
  if (day) query = query.eq("day", day.toLowerCase());
  if (branchId) query = query.eq("branch_id", branchId);
  const { data, error } = await query;
  if (error) {
    console.error("Error fetching slot windows for course:", error);
    return [];
  }
  const seen = new Map<string, CourseSlotWindow>();
  for (const row of data ?? []) {
    const start = String(row.time ?? "").slice(0, 5); // "09:00:00" -> "09:00"
    if (!start) continue;
    const dur = Number(row.duration) || 90;
    const end = addMinutes(start, dur);
    if (!seen.has(start)) {
      seen.set(start, { startTime: start, endTime: end, label: `${to12h(start)} - ${to12h(end)}` });
    }
  }
  return [...seen.values()].sort((a, b) => a.startTime.localeCompare(b.startTime));
}

/**
 * Slot options for the attendance page filter, built from the LMS scheduled
 * slots (`course_slots`, kind='schedule'), branch-scoped to the caller. Each
 * option's `value` is a normalized key so the table can match attendance rows
 * (whose slotDay is capitalised and slotTime is HH:MM:SS).
 */
export async function getScheduleSlotsForFilter(
  userEmail: string
): Promise<AttendanceSlotOption[]> {
  const { getUserBranchIds } = await import("./users");
  const branchIds = await getUserBranchIds(userEmail);
  if (branchIds !== null && branchIds.length === 0) return [];

  let query = supabaseAdmin
    .from("course_slots")
    .select("day, time, duration, course:courses!inner(name)")
    .eq("kind", "schedule")
    .is("deleted_at", null)
    .not("day", "is", null)
    .not("time", "is", null);

  if (branchIds !== null) query = query.in("branch_id", branchIds);

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching slots for attendance filter:", error);
    return [];
  }

  const seen = new Map<string, AttendanceSlotOption>();
  for (const row of data ?? []) {
    const course =
      (Array.isArray(row.course) ? row.course[0]?.name : (row.course as { name?: string } | null)?.name) ?? "";
    const day = (row.day as string) ?? "";
    const start = String(row.time ?? "").slice(0, 5); // "15:00:00" -> "15:00"
    if (!course || !day || !start) continue;
    const end = addMinutes(start, Number(row.duration) || 90);
    const value = `${course}|${day.toLowerCase()}|${start}`;
    if (!seen.has(value)) {
      seen.set(value, {
        value,
        label: `${course} · ${cap(day)} ${to12h(start)} - ${to12h(end)}`,
        course,
        day: day.toLowerCase(),
        startTime: start,
        endTime: end,
      });
    }
  }
  return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label));
}
