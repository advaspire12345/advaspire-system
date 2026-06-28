import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { TopBar } from "@/components/TopBar";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useAuth } from "@/contexts/auth";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { listLocalEvents, localEventOccursOn, type LocalEvent } from "@/lib/localEvents";
import { supabase } from "@/lib/supabase";

const WEEKDAYS_FULL = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type EnrollmentSchedule = {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  courseName: string | null;
  scheduleDays: string[]; // lowercased weekday names
  startTime: string | null;
};

type AttendanceMarker = {
  date: string; // yyyy-mm-dd
  studentId: string;
  studentName: string;
  status: "present" | "absent" | "late" | "excused";
  courseName: string | null;
};

type EventEntry = {
  id: string;
  title: string;
  eventType: "activity" | "competition" | "own_schedule" | "holiday";
  date: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  color: string;
  isRecurring: boolean;
  isBounded: boolean;
  recurringDays: string[];
  recurringStartDate: string | null;
  recurringEndDate: string | null;
  recurringStartTime: string | null;
  recurringEndTime: string | null;
  occurrences: string[];
  createdByParent: boolean;
};

type CalendarData = {
  parentId: string | null;
  enrollments: EnrollmentSchedule[];
  attendance: AttendanceMarker[];
  events: EventEntry[];
};

type DayKey = string; // yyyy-mm-dd

function ymd(d: Date): DayKey {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function buildMonthGrid(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const firstWeekday = first.getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const grid: (Date | null)[][] = [];
  let cursor = 1 - firstWeekday; // start of first row (may be in prev month)
  for (let row = 0; row < 6; row++) {
    const rowCells: (Date | null)[] = [];
    for (let col = 0; col < 7; col++) {
      if (cursor >= 1 && cursor <= daysInMonth) {
        rowCells.push(new Date(year, month, cursor));
      } else {
        rowCells.push(null);
      }
      cursor++;
    }
    grid.push(rowCells);
  }
  return grid;
}

const STATUS_COLORS: Record<AttendanceMarker["status"], string> = {
  present: "#22C55E",
  late: "#F59E0B",
  absent: "#EF4444",
  excused: "#6366F1",
};

const EVENT_TYPE_META: Record<EventEntry["eventType"], { label: string; color: string }> = {
  holiday: { label: "Holiday", color: "#EF4444" },
  activity: { label: "Activity", color: "#10B981" },
  competition: { label: "Competition", color: "#F59E0B" },
  own_schedule: { label: "My event", color: "#615DFA" },
};

function eventOccursOn(e: EventEntry, dateKey: string): boolean {
  if (e.occurrences.includes(dateKey)) return true;
  if (e.isRecurring) {
    const d = new Date(dateKey + "T00:00:00");
    const wd = WEEKDAYS_FULL[d.getDay()];
    if (!e.recurringDays.includes(wd)) return false;
    if (e.isBounded) {
      const start = e.recurringStartDate;
      const end = e.recurringEndDate;
      if (start && dateKey < start) return false;
      if (end && dateKey > end) return false;
    }
    return true;
  }
  // Single or multi-day non-recurring
  if (e.endDate) {
    return dateKey >= e.date && dateKey <= e.endDate;
  }
  return dateKey === e.date;
}

export default function CalendarScreen() {
  const { user } = useAuth();
  const userId = user?.id;
  const router = useRouter();
  const [month, setMonth] = useState<Date>(startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());

  // Personal on-device events. Reload whenever the tab refocuses (e.g. after
  // creating one) so new events appear immediately.
  const [localEvents, setLocalEvents] = useState<LocalEvent[]>([]);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (userId) listLocalEvents(userId).then((evs) => { if (active) setLocalEvents(evs); });
      return () => { active = false; };
    }, [userId]),
  );

  const fetchCalendar = async (): Promise<CalendarData> => {
    const empty: CalendarData = { parentId: null, enrollments: [], attendance: [], events: [] };

    const { data: parentRow } = await supabase
      .from("parents")
      .select("id, branch_id, company_id")
      .eq("auth_id", userId!)
      .is("deleted_at", null)
      .maybeSingle();
    if (!parentRow) return empty;
    const parentId = parentRow.id as string;

    const { data: links } = await supabase
      .from("parent_students")
      .select("student_id, student:students!inner(id, name, deleted_at)")
      .eq("parent_id", parentRow.id);
    const studentRows = (links ?? [])
      .map((l) => l.student as unknown as { id: string; name: string; deleted_at: string | null })
      .filter((s) => s && !s.deleted_at);
    const studentIds = studentRows.map((s) => s.id);
    if (studentIds.length === 0) return { ...empty, parentId };

    // Recurring schedule per active enrollment
    const { data: enrs, error: enrErr } = await supabase
      .from("enrollments")
      .select("id, student_id, day_of_week, start_time, schedule, course:courses(name)")
      .in("student_id", studentIds)
      .eq("status", "active")
      .is("deleted_at", null);
    if (enrErr) throw enrErr;

    const enrollments: EnrollmentSchedule[] = (enrs ?? []).map((e) => {
      let days: string[] = [];
      let startTime: string | null = (e.start_time as string | null) ?? null;
      // schedule is a JSON array string [{day, time}, ...]; fall back to day_of_week.
      const scheduleRaw = e.schedule as string | null;
      if (scheduleRaw) {
        try {
          const parsed = JSON.parse(scheduleRaw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            days = parsed.map((p: { day: string }) => String(p.day || "").toLowerCase()).filter(Boolean);
            if (!startTime && parsed[0].time) startTime = parsed[0].time;
          }
        } catch {
          /* ignore */
        }
      }
      if (days.length === 0 && e.day_of_week) {
        try {
          const parsed = JSON.parse(e.day_of_week as string);
          if (Array.isArray(parsed)) {
            days = parsed.map((d: string) => String(d).toLowerCase());
          }
        } catch {
          /* ignore */
        }
      }
      const studentName = studentRows.find((s) => s.id === (e.student_id as string))?.name ?? "Unknown";
      const c = e.course as unknown as { name: string } | null;
      return {
        enrollmentId: e.id as string,
        studentId: e.student_id as string,
        studentName,
        courseName: c?.name ?? null,
        scheduleDays: days,
        startTime,
      };
    });

    // Attendance for this month + a buffer
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 2, 0); // end of next month
    const { data: att, error: attErr } = await supabase
      .from("attendance")
      .select(`
        date,
        status,
        enrollment:enrollments!inner(student_id, course:courses(name))
      `)
      .gte("date", ymd(monthStart))
      .lte("date", ymd(monthEnd))
      .in("enrollment.student_id", studentIds);
    if (attErr) throw attErr;

    const attendance: AttendanceMarker[] = (att ?? []).map((a) => {
      const enr = a.enrollment as unknown as { student_id: string; course: { name: string } | null } | null;
      const studentName = studentRows.find((s) => s.id === enr?.student_id)?.name ?? "Unknown";
      return {
        date: a.date as string,
        studentId: (enr?.student_id as string) ?? "",
        studentName,
        status: (a.status as AttendanceMarker["status"]) ?? "absent",
        courseName: enr?.course?.name ?? null,
      };
    });

    // Events: holidays / activities / competitions visible to this parent,
    // plus parent-created own_schedule events. We rely on RLS to scope.
    const { data: evs, error: evErr } = await supabase
      .from("events")
      .select(`
        id, title, event_type, date, end_date, start_time, end_time, color,
        is_recurring, is_bounded, recurring_days, recurring_start_date, recurring_end_date,
        recurring_start_time, recurring_end_time, created_by_parent_id, status, deleted_at,
        occurrences:event_occurrences(date)
      `)
      .is("deleted_at", null)
      .neq("status", "rejected");
    if (evErr) {
      // Don't block the calendar if events table isn't readable by this role
      console.warn("events load failed", evErr.message);
    }
    const events: EventEntry[] = (evs ?? []).map((e) => ({
      id: e.id as string,
      title: (e.title as string) ?? "",
      eventType: e.event_type as EventEntry["eventType"],
      date: e.date as string,
      endDate: (e.end_date as string | null) ?? null,
      startTime: (e.start_time as string | null) ?? null,
      endTime: (e.end_time as string | null) ?? null,
      color: (e.color as string) ?? "#615DFA",
      isRecurring: !!e.is_recurring,
      isBounded: !!e.is_bounded,
      recurringDays: ((e.recurring_days as string[] | null) ?? []).map((d) => String(d).toLowerCase()),
      recurringStartDate: (e.recurring_start_date as string | null) ?? null,
      recurringEndDate: (e.recurring_end_date as string | null) ?? null,
      recurringStartTime: (e.recurring_start_time as string | null) ?? null,
      recurringEndTime: (e.recurring_end_time as string | null) ?? null,
      occurrences: (((e.occurrences as unknown as Array<{ date: string }> | null) ?? []).map((o) => o.date)),
      createdByParent: (e.created_by_parent_id as string | null) === parentId,
    }));

    return { parentId, enrollments, attendance, events };
  };

  const { data, loading, error, isStale, updatedAt } = useCachedQuery<CalendarData>(
    `schedule:${userId ?? "anon"}:${month.getFullYear()}-${month.getMonth()}`,
    fetchCalendar,
    { enabled: !!userId },
  );

  const enrollments = useMemo(() => data?.enrollments ?? [], [data]);
  const attendance = useMemo(() => data?.attendance ?? [], [data]);
  const events = useMemo(() => data?.events ?? [], [data]);
  const parentId = data?.parentId ?? null;
  const errorMessage = error && !data ? "Couldn't load your calendar. Check your connection." : null;

  const grid = useMemo(() => buildMonthGrid(month.getFullYear(), month.getMonth()), [month]);

  const monthLabel = useMemo(() => {
    return month.toLocaleDateString("en-MY", { month: "long", year: "numeric" });
  }, [month]);

  const goPrevMonth = () => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  const goNextMonth = () => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));
  const goToday = () => {
    const today = new Date();
    setMonth(startOfMonth(today));
    setSelectedDay(today);
  };

  // Attendance + class + event indicators per day key
  const dayMarkers = useMemo(() => {
    const map = new Map<DayKey, { hasAttendance: boolean; hasClass: boolean; hasEvent: boolean }>();
    for (const a of attendance) {
      const existing = map.get(a.date) ?? { hasAttendance: false, hasClass: false, hasEvent: false };
      existing.hasAttendance = true;
      map.set(a.date, existing);
    }
    const winStart = new Date(month.getFullYear(), month.getMonth() - 1, 1);
    const winEnd = new Date(month.getFullYear(), month.getMonth() + 2, 0);
    for (let d = new Date(winStart); d <= winEnd; d.setDate(d.getDate() + 1)) {
      const k = ymd(d);
      const wd = WEEKDAYS_FULL[d.getDay()];
      const existing = map.get(k) ?? { hasAttendance: false, hasClass: false, hasEvent: false };
      if (enrollments.some((e) => e.scheduleDays.includes(wd))) {
        existing.hasClass = true;
      }
      if (events.some((e) => eventOccursOn(e, k)) || localEvents.some((e) => localEventOccursOn(e, k))) {
        existing.hasEvent = true;
      }
      if (existing.hasAttendance || existing.hasClass || existing.hasEvent) {
        map.set(k, existing);
      }
    }
    return map;
  }, [attendance, enrollments, events, localEvents, month]);

  const todayKey = ymd(new Date());

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <ActivityIndicator color="#615DFA" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <TopBar title="Schedule" />
      <View style={styles.header}>
        <Pressable onPress={goPrevMonth} style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}>
          <Ionicons name="chevron-back" size={18} color="#615DFA" />
        </Pressable>
        <Pressable onPress={goToday} style={styles.monthLabelButton}>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <Text style={styles.todayHint}>Tap for today</Text>
        </Pressable>
        <Pressable onPress={goNextMonth} style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}>
          <Ionicons name="chevron-forward" size={18} color="#615DFA" />
        </Pressable>
      </View>

      {errorMessage ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {isStale ? (
        <View style={styles.bannerWrap}>
          <OfflineBanner updatedAt={updatedAt} />
        </View>
      ) : null}

      <View style={styles.weekdays}>
        {WEEKDAY_LABELS.map((w) => (
          <Text key={w} style={styles.weekdayLabel}>
            {w}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {grid.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.gridRow}>
            {row.map((d, colIdx) => {
              if (!d) return <View key={colIdx} style={styles.cellEmpty} />;
              const key = ymd(d);
              const marker = dayMarkers.get(key);
              const isToday = key === todayKey;
              const isSelected = selectedDay && ymd(selectedDay) === key;
              return (
                <Pressable
                  key={colIdx}
                  style={[
                    styles.cell,
                    isSelected && styles.cellSelected,
                    isToday && !isSelected && styles.cellToday,
                  ]}
                  onPress={() => setSelectedDay(d)}
                >
                  <Text style={[styles.cellDate, isSelected && styles.cellDateSelected, isToday && !isSelected && styles.cellDateToday]}>
                    {d.getDate()}
                  </Text>
                  <View style={styles.cellDots}>
                    {marker?.hasClass ? <View style={[styles.dot, { backgroundColor: "#23D2E2" }]} /> : null}
                    {marker?.hasAttendance ? <View style={[styles.dot, { backgroundColor: "#615DFA" }]} /> : null}
                    {marker?.hasEvent ? <View style={[styles.dot, { backgroundColor: "#F59E0B" }]} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: "#23D2E2" }]} />
          <Text style={styles.legendText}>Class scheduled</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: "#615DFA" }]} />
          <Text style={styles.legendText}>Attended</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: "#F59E0B" }]} />
          <Text style={styles.legendText}>Event</Text>
        </View>
      </View>

      <DayAgenda
        day={selectedDay ?? new Date()}
        enrollments={enrollments}
        attendance={attendance}
        events={events}
        localEvents={localEvents}
        onReschedule={(enrollmentId, originalDate, studentId, courseName) =>
          router.push({
            pathname: "/reschedule",
            params: { enrollmentId, originalDate, studentId, courseName: courseName ?? "" },
          })
        }
      />

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() =>
          router.push({
            pathname: "/event/new",
            params: parentId ? { parentId } : {},
          })
        }
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>
    </SafeAreaView>
  );
}

function toMinutes(t: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.split(":").map((n) => parseInt(n, 10));
  return h * 60 + m;
}
function fmt12(t: string | null): string | null {
  if (!t) return null;
  const [h, m] = t.split(":").map((n) => parseInt(n, 10));
  const period = h < 12 ? "AM" : "PM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${period}`;
}
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type AgendaItem = {
  id: string;
  time: number | null;
  timeLabel: string | null;
  title: string;
  subtitle: string;
  color: string;
  reschedule?: { enrollmentId: string; studentId: string; courseName: string | null; date: string };
};

function DayAgenda({
  day,
  enrollments,
  attendance,
  events,
  localEvents,
  onReschedule,
}: {
  day: Date;
  enrollments: EnrollmentSchedule[];
  attendance: AttendanceMarker[];
  events: EventEntry[];
  localEvents: LocalEvent[];
  onReschedule: (enrollmentId: string, originalDate: string, studentId: string, courseName: string | null) => void;
}) {
  const key = ymd(day);
  const dayWeekday = WEEKDAYS_FULL[day.getDay()];
  const attendanceThisDay = attendance.filter((a) => a.date === key);
  const isFuture = day.getTime() > new Date().setHours(23, 59, 59, 999) - 86_400_000;

  const items: AgendaItem[] = [];

  for (const e of localEvents.filter((ev) => localEventOccursOn(ev, key))) {
    const typeName = e.type === "birthday" ? "Birthday" : e.type === "holiday" ? "Holiday" : "Event";
    items.push({
      id: `le-${e.id}`,
      time: toMinutes(e.startTime),
      timeLabel: fmt12(e.startTime) ?? "All day",
      title: e.title,
      subtitle: typeName,
      color: e.color,
    });
  }

  for (const e of events.filter((ev) => eventOccursOn(ev, key))) {
    const meta = EVENT_TYPE_META[e.eventType];
    const t = e.isRecurring ? e.recurringStartTime : e.startTime;
    items.push({
      id: `se-${e.id}`,
      time: toMinutes(t),
      timeLabel: fmt12(t) ?? "All day",
      title: e.title,
      subtitle: meta.label,
      color: e.color || meta.color,
    });
  }

  for (const c of enrollments.filter((en) => en.scheduleDays.includes(dayWeekday))) {
    const att = attendanceThisDay.find((a) => a.studentId === c.studentId && a.courseName === c.courseName);
    items.push({
      id: `cl-${c.enrollmentId}`,
      time: toMinutes(c.startTime),
      timeLabel: fmt12(c.startTime) ?? "Class",
      title: c.studentName,
      subtitle: `${c.courseName ?? "Class"}${att ? ` · ${cap(att.status)}` : ""}`,
      color: att ? STATUS_COLORS[att.status] : "#23D2E2",
      reschedule: isFuture && !att ? { enrollmentId: c.enrollmentId, studentId: c.studentId, courseName: c.courseName, date: key } : undefined,
    });
  }

  items.sort((a, b) => (a.time ?? -1) - (b.time ?? -1));

  return (
    <View style={styles.agenda}>
      <Text style={styles.agendaDate}>
        {day.toLocaleDateString("en-MY", { weekday: "long", day: "numeric", month: "long" })}
      </Text>
      <ScrollView style={styles.flex} contentContainerStyle={styles.agendaList} showsVerticalScrollIndicator={false}>
        {items.length === 0 ? (
          <Text style={styles.agendaEmpty}>Nothing scheduled on this day.</Text>
        ) : (
          items.map((it) => (
            <View key={it.id} style={styles.agendaItem}>
              <Text style={styles.agendaTime}>{it.timeLabel}</Text>
              <View style={[styles.agendaBar, { backgroundColor: it.color }]} />
              <View style={styles.flex}>
                <Text style={styles.agendaTitle} numberOfLines={1}>{it.title}</Text>
                <Text style={styles.agendaSub} numberOfLines={1}>{it.subtitle}</Text>
              </View>
              {it.reschedule ? (
                <Pressable
                  style={({ pressed }) => [styles.rescheduleButton, pressed && styles.pressed]}
                  onPress={() => onReschedule(it.reschedule!.enrollmentId, it.reschedule!.date, it.reschedule!.studentId, it.reschedule!.courseName)}
                >
                  <Ionicons name="swap-horizontal" size={16} color="#615DFA" />
                  <Text style={styles.rescheduleText}>Move</Text>
                </Pressable>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F6FB" },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F6F6FB" },
  agenda: { flex: 1, marginTop: 4 },
  agendaDate: { fontSize: 14, fontWeight: "800", color: "#0F172A", paddingHorizontal: 16, marginBottom: 8 },
  agendaList: { paddingHorizontal: 16, paddingBottom: 100, gap: 10 },
  agendaEmpty: { fontSize: 13, color: "#9CA3AF", textAlign: "center", paddingVertical: 24 },
  agendaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  agendaTime: { width: 64, fontSize: 11, fontWeight: "700", color: "#6B7280" },
  agendaBar: { width: 4, alignSelf: "stretch", borderRadius: 2 },
  agendaTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  agendaSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: "space-between",
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  monthLabelButton: { alignItems: "center" },
  monthLabel: { fontSize: 18, fontWeight: "800", color: "#0F172A", letterSpacing: -0.3 },
  todayHint: { fontSize: 10, color: "#9CA3AF", marginTop: 2, fontWeight: "600" },
  errorCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: "#FEE2E2", padding: 12, borderRadius: 12 },
  errorText: { color: "#991B1B", fontSize: 13 },
  bannerWrap: { paddingHorizontal: 16, marginBottom: 12 },
  weekdays: { flexDirection: "row", paddingHorizontal: 14, marginBottom: 6, marginTop: 4 },
  weekdayLabel: { flex: 1, textAlign: "center", fontSize: 10, fontWeight: "800", color: "#9CA3AF", letterSpacing: 0.8, textTransform: "uppercase" },
  grid: { paddingHorizontal: 14 },
  gridRow: { flexDirection: "row" },
  cell: {
    flex: 1,
    aspectRatio: 1,
    margin: 2,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  cellEmpty: { flex: 1, aspectRatio: 1, margin: 2 },
  cellToday: { borderWidth: 1.5, borderColor: "#615DFA" },
  cellSelected: {
    backgroundColor: "#615DFA",
    shadowColor: "#615DFA",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  cellDate: { fontSize: 14, fontWeight: "700", color: "#374151" },
  cellDateToday: { color: "#615DFA", fontWeight: "800" },
  cellDateSelected: { color: "#FFFFFF" },
  cellDots: { flexDirection: "row", gap: 3, marginTop: 3, height: 5 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  legend: { flexDirection: "row", justifyContent: "center", gap: 16, paddingVertical: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendText: { fontSize: 12, color: "#6B7280" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: "#E5E7EB", borderRadius: 2, alignSelf: "center", marginBottom: 12 },
  modalDate: { fontSize: 16, fontWeight: "800", color: "#111827", marginBottom: 12 },
  modalEmpty: { fontSize: 14, color: "#6B7280", textAlign: "center", paddingVertical: 24 },
  modalSection: { fontSize: 12, fontWeight: "700", color: "#6B7280", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalItemMain: { flex: 1 },
  modalItemTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  modalItemSubtitle: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  modalItemStatus: { fontSize: 12, fontWeight: "700", marginTop: 4 },
  rescheduleButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
  },
  pressed: { opacity: 0.8 },
  rescheduleText: { fontSize: 13, fontWeight: "700", color: "#615DFA" },
  eventSwatch: { width: 4, height: 36, borderRadius: 2, marginRight: 12 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#615DFA",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#615DFA",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabPressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
});
