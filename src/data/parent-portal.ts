import { supabaseAdmin } from "@/db";
import { getParentByAuthId, getParentChildren } from "@/data/parents";
import type {
  Parent,
  Student,
  Attendance,
  AttendanceStatus,
  Payment,
  PaymentStatus,
} from "@/db/schema";

// ============================================
// TYPES
// ============================================

export interface ParentChildData {
  id: string;
  name: string;
  photo: string | null;
  level: number;
  courseName: string | null;
  courseId: string | null;
  sessionsRemaining: number;
  sessionsAttended: number;
  totalSessions: number;
  expiresAt: string | null;
  dayOfWeek: string | null;
  startTime: string | null;
  endTime: string | null;
  parsedDays: string[];
  enrollmentId: string | null;
  enrollmentStatus: string | null;
  attendedThisWeek: boolean;
}

export interface ParentPortalData {
  parent: Parent;
  children: ParentChildData[];
  totalSessionsRemaining: number;
  totalSessionsAttended: number;
  hasNegativeSessions: boolean;
  negativeChildren: { name: string; sessionsRemaining: number }[];
  nextClass: {
    courseName: string;
    dayOfWeek: string;
    startTime: string;
    childName: string;
    date: string;
  } | null;
}

export interface ParentAttendanceRecord {
  id: string;
  date: string;
  status: AttendanceStatus;
  childName: string;
  courseName: string;
  lesson: string | null;
  mission: string | null;
  adcoin: number;
  projectPhotos: string[] | null;
}

export interface UpcomingClass {
  date: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string | null;
  courseName: string;
  childName: string;
}

export interface ParentPaymentRecord {
  id: string;
  date: string;
  courseName: string | null;
  amount: number;
  status: PaymentStatus;
  childName: string;
}

// ============================================
// MAIN DATA FETCH
// ============================================

export async function getParentPortalData(
  authId: string
): Promise<ParentPortalData | null> {
  const parent = await getParentByAuthId(authId);
  if (!parent) return null;

  const students = await getParentChildren(parent.id);
  if (!students.length) {
    return {
      parent,
      children: [],
      totalSessionsRemaining: 0,
      totalSessionsAttended: 0,
      hasNegativeSessions: false,
      negativeChildren: [],
      nextClass: null,
    };
  }

  const studentIds = students.map((s) => s.id);

  // Fetch enrollments with pool info + attendance (same as student table)
  const { data: enrollments } = await supabaseAdmin
    .from("enrollments")
    .select(
      `
      *,
      course:courses(id, name),
      package:course_pricing(id, package_type, duration),
      pool:shared_session_pools(id, sessions_remaining, total_sessions, name),
      attendance(date, status)
    `
    )
    .in("student_id", studentIds)
    .eq("status", "active")
    .is("deleted_at", null);

  // Pre-fetch all course_pricing for payment session lookups
  const { data: allPricing } = await supabaseAdmin
    .from("course_pricing")
    .select("id, duration, package_type");
  const pricingMap = new Map<string, { duration: number; package_type: string }>();
  for (const p of allPricing ?? []) {
    pricingMap.set(p.id, { duration: p.duration, package_type: p.package_type });
  }

  const getSessionsForPayment = (packageId: string | null): number => {
    if (!packageId) return 0;
    const pkg = pricingMap.get(packageId);
    if (!pkg) return 0;
    return pkg.package_type === "monthly" ? pkg.duration * 4 : pkg.duration;
  };

  // Gather all pool IDs for pool-aware logic
  const allPoolIds = new Set<string>();
  for (const e of enrollments ?? []) {
    if ((e as any).pool_id) allPoolIds.add((e as any).pool_id);
  }

  // Pool caches (same approach as student table)
  const poolSiblingCountCache = new Map<string, number>();
  const poolJoinDateCache = new Map<string, Map<string, string>>();
  const poolStudentNamesCache = new Map<string, Map<string, string>>();
  const poolPaymentCache = new Map<string, { totalPaid: number; totalSessions: number }>();

  if (allPoolIds.size > 0) {
    for (const poolId of allPoolIds) {
      const { data: poolStudentLinks } = await supabaseAdmin
        .from("pool_students")
        .select("student_id, joined_at, student:students(name)")
        .eq("pool_id", poolId);

      const joinDates = new Map<string, string>();
      const studentNames = new Map<string, string>();
      for (const ps of poolStudentLinks ?? []) {
        if (ps.joined_at) joinDates.set(ps.student_id, ps.joined_at);
        const sd = ps.student as unknown as { name: string } | null;
        if (sd?.name) studentNames.set(ps.student_id, sd.name);
      }
      poolJoinDateCache.set(poolId, joinDates);
      poolSiblingCountCache.set(poolId, (poolStudentLinks ?? []).length);
      poolStudentNamesCache.set(poolId, studentNames);

      // Get pool payments
      const { data: poolData } = await supabaseAdmin
        .from("shared_session_pools")
        .select("course_id")
        .eq("id", poolId)
        .single();
      if (!poolStudentLinks?.length || !poolData) continue;
      const poolStudentIds = poolStudentLinks.map((ps) => ps.student_id);
      const { data: poolPayments } = await supabaseAdmin
        .from("payments")
        .select("amount, package_id")
        .in("student_id", poolStudentIds)
        .eq("course_id", poolData.course_id)
        .eq("pool_id", poolId)
        .eq("status", "paid");

      const totalPaid = (poolPayments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
      const totalSessions = (poolPayments ?? []).reduce(
        (sum, p) => sum + getSessionsForPayment((p as any).package_id),
        0
      );
      poolPaymentCache.set(poolId, { totalPaid, totalSessions });
    }
  }

  // This week attendance check
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(now.getDate() + mondayOffset);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  // Build children data using the SAME logic as student table
  const childrenData: ParentChildData[] = students.map((student) => {
    const enrollment = (enrollments ?? []).find(
      (e: any) => e.student_id === student.id
    ) as any;

    // Count attendance (same as student table sessionCount)
    const attendanceRecords = enrollment?.attendance ?? [];
    const sessionsAttended = attendanceRecords.filter(
      (a: any) => a.status === "present" || a.status === "late"
    ).length;

    // Check if attended this week
    const attendedThisWeek = attendanceRecords.some((a: any) => {
      if (a.status !== "present" && a.status !== "late") return false;
      const d = new Date(a.date);
      return d >= weekStart && d <= weekEnd;
    });

    // Pool-aware session remaining (exact same formula as student table)
    let sessionsRemaining = 0;
    let totalSessionsBought = 0;

    if (enrollment) {
      const isPooled =
        enrollment.pool_id &&
        enrollment.pool &&
        (poolSiblingCountCache.get(enrollment.pool_id) ?? 0) > 0 &&
        poolStudentNamesCache.get(enrollment.pool_id)?.has(student.id);

      if (isPooled) {
        const poolInfo = enrollment.pool as {
          id: string;
          sessions_remaining: number;
          total_sessions: number;
        };
        const siblingCount = poolSiblingCountCache.get(enrollment.pool_id) || 2;
        const poolRemaining = poolInfo.sessions_remaining;

        // Position for remainder bonus
        const joinDates = poolJoinDateCache.get(enrollment.pool_id);
        const sortedStudentIds = joinDates
          ? [...joinDates.entries()]
              .sort((a, b) => new Date(a[1]).getTime() - new Date(b[1]).getTime())
              .map(([id]) => id)
          : [];
        const position = sortedStudentIds.indexOf(student.id);

        // Unified equal split formula (same as student table)
        const perStudent = Math.floor(poolRemaining / siblingCount);
        const remainder = poolRemaining - perStudent * siblingCount;
        let positionBonus: number;
        if (poolRemaining >= 0) {
          positionBonus = position >= 0 && position < remainder ? 1 : 0;
        } else {
          positionBonus =
            position >= 0 && position >= siblingCount - remainder ? 1 : 0;
        }
        sessionsRemaining = perStudent + positionBonus;

        // Total sessions bought from pool payments (split per sibling)
        const poolPayment = poolPaymentCache.get(enrollment.pool_id);
        totalSessionsBought = Math.floor(
          (poolPayment?.totalSessions ?? 0) / siblingCount
        );
      } else {
        // Individual: use enrollment.sessions_remaining directly
        sessionsRemaining = enrollment.sessions_remaining ?? 0;

        // Individual: totalSessionsBought computed in follow-up loop below (can't await inside map)
        totalSessionsBought = 0;
      }
    }

    const parsedDays = parseDayOfWeek(enrollment?.day_of_week);

    return {
      id: student.id,
      name: student.name,
      photo: student.photo,
      level: student.level,
      courseName: enrollment?.course?.name ?? null,
      courseId: enrollment?.course_id ?? null,
      sessionsRemaining,
      sessionsAttended,
      totalSessions: totalSessionsBought,
      expiresAt: enrollment?.expires_at ?? null,
      dayOfWeek: parsedDays.length > 0 ? parsedDays[0] : null,
      parsedDays,
      startTime: enrollment?.start_time ?? null,
      endTime: enrollment?.end_time ?? null,
      enrollmentId: enrollment?.id ?? null,
      enrollmentStatus: enrollment?.status ?? null,
      attendedThisWeek,
      _isPooled: !!(
        enrollment?.pool_id &&
        enrollment?.pool &&
        poolStudentNamesCache.get(enrollment?.pool_id)?.has(student.id)
      ),
      _poolId: enrollment?.pool_id ?? null,
    };
  });

  // Fix individual students' totalSessionsBought (can't await inside map)
  for (const child of childrenData) {
    if (!(child as any)._isPooled && child.enrollmentId) {
      const enrollment = (enrollments ?? []).find(
        (e: any) => e.id === child.enrollmentId
      ) as any;
      const courseId = enrollment?.course?.id;
      if (courseId) {
        const { data: ownPayments } = await supabaseAdmin
          .from("payments")
          .select("package_id")
          .eq("student_id", child.id)
          .eq("course_id", courseId)
          .eq("status", "paid");
        child.totalSessions = (ownPayments ?? []).reduce(
          (sum, p: any) => sum + getSessionsForPayment(p.package_id),
          0
        );
      }
    }
    // Clean up internal fields
    delete (child as any)._isPooled;
    delete (child as any)._poolId;
  }

  const totalSessionsRemaining = childrenData.reduce(
    (sum, c) => sum + c.sessionsRemaining,
    0
  );

  const totalSessionsAttended = childrenData.reduce(
    (sum, c) => sum + c.sessionsAttended,
    0
  );

  const nextClass = getNextClassFromChildren(childrenData);

  const negativeChildren = childrenData
    .filter((c) => c.sessionsRemaining < 0)
    .map((c) => ({ name: c.name, sessionsRemaining: c.sessionsRemaining }));

  return {
    parent,
    children: childrenData,
    totalSessionsRemaining,
    totalSessionsAttended,
    hasNegativeSessions: negativeChildren.length > 0,
    negativeChildren,
    nextClass,
  };
}

// ============================================
// ATTENDANCE HISTORY
// ============================================

export async function getParentAttendanceHistory(
  studentIds: string[]
): Promise<ParentAttendanceRecord[]> {
  if (!studentIds.length) return [];

  const { data, error } = await supabaseAdmin
    .from("attendance")
    .select(
      `
      id,
      date,
      status,
      lesson,
      mission,
      adcoin,
      project_photos,
      enrollment:enrollments!inner(
        student_id,
        student:students!inner(name),
        course:courses(name)
      )
    `
    )
    .in("enrollments.student_id", studentIds)
    .order("date", { ascending: false })
    .limit(30);

  if (error) {
    console.error("Error fetching parent attendance:", error);
    return [];
  }

  return (
    data?.map((a: any) => ({
      id: a.id,
      date: a.date,
      status: a.status as AttendanceStatus,
      childName: a.enrollment?.student?.name ?? "Unknown",
      courseName: a.enrollment?.course?.name ?? "Unknown",
      lesson: a.lesson,
      mission: a.mission,
      adcoin: a.adcoin ?? 0,
      projectPhotos: a.project_photos,
    })) ?? []
  );
}

// ============================================
// UPCOMING CLASSES
// ============================================

export function getParentUpcomingClasses(
  children: ParentChildData[]
): UpcomingClass[] {
  const dayMap: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  const today = new Date();
  const classes: UpcomingClass[] = [];

  for (const child of children) {
    if (!child.startTime || !child.courseName) continue;
    if (!child.parsedDays.length) continue;

    // How many classes to show per child:
    // Positive sessions → show that many upcoming classes
    // Zero or negative → show only the next 1 class
    const classLimit = child.sessionsRemaining > 0 ? child.sessionsRemaining : 1;

    // If already attended this week, start from next Monday (not flat +7)
    const todayDow = today.getDay(); // 0=Sun
    const daysUntilNextMonday = todayDow === 0 ? 1 : 8 - todayDow;
    const startOffset = child.attendedThisWeek ? daysUntilNextMonday : 0;

    // Generate all possible dates for this child, then take up to classLimit
    const childClasses: UpcomingClass[] = [];

    // Search far enough ahead to fill classLimit (up to 90 days)
    for (let i = startOffset; i < startOffset + 90 && childClasses.length < classLimit; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      for (const day of child.parsedDays) {
        const targetDay = dayMap[day.toLowerCase()];
        if (targetDay === undefined) continue;

        if (date.getDay() === targetDay) {
          childClasses.push({
            date: date.toISOString().split("T")[0],
            dayOfWeek: day,
            startTime: child.startTime,
            endTime: child.endTime,
            courseName: child.courseName,
            childName: child.name,
          });
        }
      }

      if (childClasses.length >= classLimit) break;
    }

    classes.push(...childClasses);
  }

  classes.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  return classes;
}

// ============================================
// PAYMENT HISTORY
// ============================================

export async function getParentPaymentHistory(
  studentIds: string[]
): Promise<ParentPaymentRecord[]> {
  if (!studentIds.length) return [];

  const { data, error } = await supabaseAdmin
    .from("payments")
    .select(
      `
      id,
      amount,
      status,
      paid_at,
      created_at,
      student:students!inner(name),
      course:courses(name)
    `
    )
    .in("student_id", studentIds)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Error fetching parent payments:", error);
    return [];
  }

  return (
    data?.map((p: any) => ({
      id: p.id,
      date: p.paid_at ?? p.created_at,
      courseName: p.course?.name ?? null,
      amount: p.amount,
      status: p.status as PaymentStatus,
      childName: p.student?.name ?? "Unknown",
    })) ?? []
  );
}

// ============================================
// PROJECT PHOTOS
// ============================================

export async function getParentProjectPhotos(
  studentIds: string[]
): Promise<{ url: string; date: string; childName: string }[]> {
  if (!studentIds.length) return [];

  const { data, error } = await supabaseAdmin
    .from("attendance")
    .select(
      `
      date,
      project_photos,
      enrollment:enrollments!inner(
        student_id,
        student:students!inner(name)
      )
    `
    )
    .in("enrollments.student_id", studentIds)
    .not("project_photos", "is", null)
    .order("date", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Error fetching project photos:", error);
    return [];
  }

  const photos: { url: string; date: string; childName: string }[] = [];

  data?.forEach((a: any) => {
    if (a.project_photos && Array.isArray(a.project_photos)) {
      a.project_photos.forEach((url: string) => {
        photos.push({
          url,
          date: a.date,
          childName: a.enrollment?.student?.name ?? "Unknown",
        });
      });
    }
  });

  return photos;
}

// ============================================
// PARENT EVENTS (Calendar)
// ============================================

export interface ParentEvent {
  id: string;
  parentId: string;
  title: string;
  date: string;
  endDate: string | null;
  startTime: string;
  endTime: string | null;
  color: string;
}

export async function getParentEvents(
  parentId: string
): Promise<ParentEvent[]> {
  const { data, error } = await supabaseAdmin
    .from("parent_events")
    .select("*")
    .eq("parent_id", parentId)
    .order("date", { ascending: true });

  if (error) {
    console.error("Error fetching parent events:", error);
    return [];
  }

  return (
    data?.map((e: any) => ({
      id: e.id,
      parentId: e.parent_id,
      title: e.title,
      date: e.date,
      endDate: e.end_date ?? null,
      startTime: e.start_time,
      endTime: e.end_time,
      color: e.color ?? "#615DFA",
    })) ?? []
  );
}

// ============================================
// HELPERS
// ============================================

function getNextClassFromChildren(children: ParentChildData[]) {
  const dayMap: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  const today = new Date();
  const todayDay = today.getDay();
  let nearest: {
    courseName: string;
    dayOfWeek: string;
    startTime: string;
    childName: string;
    daysUntil: number;
    date: string;
  } | null = null;

  for (const child of children) {
    if (!child.startTime || !child.courseName) continue;
    if (!child.parsedDays.length) continue;

    for (const day of child.parsedDays) {
      const targetDay = dayMap[day.toLowerCase()];
      if (targetDay === undefined) continue;

      let daysUntil = targetDay - todayDay;
      if (daysUntil < 0) daysUntil += 7;

      // If already attended this week, skip to next week only if target is still in current week
      if (child.attendedThisWeek) {
        const daysToNextMon = todayDay === 0 ? 1 : 8 - todayDay;
        if (daysUntil < daysToNextMon) {
          daysUntil += 7;
        }
      }

      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + daysUntil);
      const dateStr = nextDate.toISOString().split("T")[0];

      if (!nearest || daysUntil < nearest.daysUntil) {
        nearest = {
          courseName: child.courseName,
          dayOfWeek: day,
          startTime: child.startTime,
          childName: child.name,
          daysUntil,
          date: dateStr,
        };
      }
    }
  }

  if (!nearest) return null;

  return {
    courseName: nearest.courseName,
    dayOfWeek: nearest.dayOfWeek,
    startTime: nearest.startTime,
    childName: nearest.childName,
    date: nearest.date,
  };
}

/**
 * Parses the day_of_week field which can be:
 * - JSON string array: '["monday","wednesday"]'
 * - Plain string: 'monday'
 * - null/undefined
 */
function parseDayOfWeek(dayOfWeek: string | null | undefined): string[] {
  if (!dayOfWeek) return [];

  try {
    const parsed = JSON.parse(dayOfWeek);
    if (Array.isArray(parsed)) {
      return parsed.filter((d: any) => typeof d === "string" && d.trim() !== "");
    }
  } catch {
    // Not JSON — treat as plain string
  }

  // Plain string like "monday"
  const trimmed = dayOfWeek.trim();
  return trimmed ? [trimmed] : [];
}
