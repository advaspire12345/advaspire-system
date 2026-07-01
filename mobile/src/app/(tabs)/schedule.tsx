import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  LayoutAnimation,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { TopBar } from "@/components/TopBar";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useAuth } from "@/contexts/auth";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { listLocalEvents, localEventOccursOn, type LocalEvent } from "@/lib/localEvents";
import { supabase } from "@/lib/supabase";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ROW_H = 72; // one calendar week row (month view)
const ROW_H_BIG = 122; // expanded row (pull down for more events)

const WEEKDAYS_FULL = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

type ViewMode = "year" | "month" | "week" | "day";

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
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function startOfWeek(d: Date): Date {
  return addDays(d, -d.getDay()); // weeks start Sunday
}

function buildMonthGrid(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const firstWeekday = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Only the weeks this month actually spans (4–6), so there's no empty row.
  const weeks = Math.ceil((firstWeekday + daysInMonth) / 7);
  const grid: (Date | null)[][] = [];
  let cursor = 1 - firstWeekday;
  for (let row = 0; row < weeks; row++) {
    const rowCells: (Date | null)[] = [];
    for (let col = 0; col < 7; col++) {
      rowCells.push(cursor >= 1 && cursor <= daysInMonth ? new Date(year, month, cursor) : null);
      cursor++;
    }
    grid.push(rowCells);
  }
  return grid;
}

// Year-view mini months pad to 6 rows so the 12-month grid stays aligned.
function monthGridPadded(year: number, month: number): (Date | null)[][] {
  const g = buildMonthGrid(year, month);
  while (g.length < 6) g.push([null, null, null, null, null, null, null]);
  return g;
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
      if (e.recurringStartDate && dateKey < e.recurringStartDate) return false;
      if (e.recurringEndDate && dateKey > e.recurringEndDate) return false;
    }
    return true;
  }
  if (e.endDate) return dateKey >= e.date && dateKey <= e.endDate;
  return dateKey === e.date;
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

type DayItem = {
  id: string;
  time: number | null;
  timeLabel: string | null;
  title: string;
  subtitle: string;
  color: string;
  reschedule?: { enrollmentId: string; studentId: string; courseName: string | null; date: string };
};

export default function CalendarScreen() {
  const { user } = useAuth();
  const userId = user?.id;
  const router = useRouter();
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [view, setView] = useState<ViewMode>("month");
  const [month, setMonth] = useState<Date>(startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [searchOpen, setSearchOpen] = useState(false);
  const [expanded, setExpanded] = useState(false); // month cells taller (more events)

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
          if (Array.isArray(parsed)) days = parsed.map((d: string) => String(d).toLowerCase());
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

    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 2, 0);
    const { data: att, error: attErr } = await supabase
      .from("attendance")
      .select(`date, status, enrollment:enrollments!inner(student_id, course:courses(name))`)
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
    if (evErr) console.warn("events load failed", evErr.message);
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

  // Build the time-ordered items for a day (events + local + classes).
  const buildDayItems = useCallback(
    (dateKey: string): DayItem[] => {
      const d = new Date(dateKey + "T00:00:00");
      const wd = WEEKDAYS_FULL[d.getDay()];
      const items: DayItem[] = [];
      for (const e of localEvents.filter((ev) => localEventOccursOn(ev, dateKey))) {
        const typeName = e.type === "birthday" ? "Birthday" : e.type === "holiday" ? "Holiday" : "Event";
        items.push({ id: `le-${e.id}`, time: toMinutes(e.startTime), timeLabel: fmt12(e.startTime) ?? "All day", title: e.title, subtitle: typeName, color: e.color });
      }
      for (const e of events.filter((ev) => eventOccursOn(ev, dateKey))) {
        const meta = EVENT_TYPE_META[e.eventType];
        const t = e.isRecurring ? e.recurringStartTime : e.startTime;
        items.push({ id: `se-${e.id}`, time: toMinutes(t), timeLabel: fmt12(t) ?? "All day", title: e.title, subtitle: meta.label, color: e.color || meta.color });
      }
      const attToday = attendance.filter((a) => a.date === dateKey);
      const isFuture = d.getTime() > new Date().setHours(0, 0, 0, 0);
      for (const c of enrollments.filter((en) => en.scheduleDays.includes(wd))) {
        const at = attToday.find((a) => a.studentId === c.studentId && a.courseName === c.courseName);
        items.push({
          id: `cl-${c.enrollmentId}-${dateKey}`,
          time: toMinutes(c.startTime),
          timeLabel: fmt12(c.startTime) ?? "Class",
          title: c.studentName,
          subtitle: `${c.courseName ?? "Class"}${at ? ` · ${cap(at.status)}` : ""}`,
          color: at ? STATUS_COLORS[at.status] : "#23D2E2",
          reschedule: isFuture && !at ? { enrollmentId: c.enrollmentId, studentId: c.studentId, courseName: c.courseName, date: dateKey } : undefined,
        });
      }
      items.sort((a, b) => (a.time ?? -1) - (b.time ?? -1));
      return items;
    },
    [enrollments, attendance, events, localEvents],
  );

  const hasAnyItem = useCallback((dateKey: string): boolean => buildDayItems(dateKey).length > 0, [buildDayItems]);

  const todayKey = ymd(new Date());

  // ── navigation ──
  // LayoutAnimation (native, committed layout) is used for the vertical resize
  // instead of a per-frame Animated height — the latter leaves cells un-redrawn
  // (blank) on Android.
  const animate = () => LayoutAnimation.configureNext(LayoutAnimation.create(180, "easeInEaseOut", "opacity"));
  const resize = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  const setMode = (mode: "week" | "month" | "big") => {
    resize();
    setView(mode === "week" ? "week" : "month");
    setExpanded(mode === "big");
  };

  // Shift the focused period by dir for the current view. Month/week stay scoped
  // so the agenda below never shows another month's day.
  const shift = useCallback(
    (dir: -1 | 1) => {
      if (view === "year") setMonth((m) => new Date(m.getFullYear() + dir, m.getMonth(), 1));
      else if (view === "month") {
        const nm = addMonths(month, dir);
        setMonth(nm);
        const t = new Date();
        setSelectedDay(t.getMonth() === nm.getMonth() && t.getFullYear() === nm.getFullYear() ? t : new Date(nm.getFullYear(), nm.getMonth(), 1));
      } else if (view === "week") setSelectedDay((d) => { const nd = addDays(d, dir * 7); setMonth(startOfMonth(nd)); return nd; });
      else setSelectedDay((d) => { const nd = addDays(d, dir); setMonth(startOfMonth(nd)); return nd; });
    },
    [view, month],
  );
  const goToday = () => {
    const t = new Date();
    setMonth(startOfMonth(t));
    setSelectedDay(t);
  };
  const pickDay = (d: Date) => {
    setSelectedDay(d);
    if (d.getMonth() !== month.getMonth() || d.getFullYear() !== month.getFullYear()) setMonth(startOfMonth(d));
  };
  const switchView = (v: ViewMode) => {
    if (v === "week") setMode("week");
    else if (v === "month") setMode("month");
    else { animate(); setView(v); }
  };
  const onReschedule = (enrollmentId: string, date: string, studentId: string, courseName: string | null) =>
    router.push({ pathname: "/reschedule", params: { enrollmentId, originalDate: date, studentId, courseName: courseName ?? "" } });

  const toggleExpand = () => {
    if (view === "week") setMode("month");
    else setMode(expanded ? "month" : "big");
  };

  const periodTitle = useMemo(() => {
    if (view === "year") return String(month.getFullYear());
    if (view === "month") return `${month.toLocaleDateString("en-MY", { month: "long" })} ${month.getFullYear()}`;
    if (view === "week") {
      const s = startOfWeek(selectedDay);
      const e = addDays(s, 6);
      return `${MONTH_NAMES[s.getMonth()]} ${s.getDate()} – ${s.getMonth() === e.getMonth() ? "" : MONTH_NAMES[e.getMonth()] + " "}${e.getDate()}`;
    }
    return selectedDay.toLocaleDateString("en-MY", { weekday: "long", day: "numeric", month: "long" });
  }, [view, month, selectedDay]);

  // Static calendar-area sizing (no per-frame Animated height — Android-safe).
  // Height is the CURRENT month's rows so the pager's neighbour months add no
  // phantom space; expanded row height is capped to fit above the tab bar.
  const currentRows = buildMonthGrid(month.getFullYear(), month.getMonth()).length;
  const maxCalH = Math.max(ROW_H * 4, winH - insets.top - insets.bottom - 300);
  const expandedRowH = Math.max(ROW_H, Math.min(ROW_H_BIG, Math.floor(maxCalH / Math.max(1, currentRows))));
  const rowH = view === "week" ? ROW_H : expanded ? expandedRowH : ROW_H;
  const calcHeight = view === "week" ? ROW_H : currentRows * rowH;

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

      {/* View tabs */}
      <View style={styles.tabs}>
        {(["year", "month", "week", "day"] as ViewMode[]).map((v) => (
          <Pressable key={v} style={[styles.tab, view === v && styles.tabActive]} onPress={() => switchView(v)}>
            <Text style={[styles.tabText, view === v && styles.tabTextActive]}>{cap(v)}</Text>
          </Pressable>
        ))}
      </View>

      {/* Header: title + today + search (swipe/drag to navigate — no arrows) */}
      <View style={styles.header}>
        <Text style={styles.headerTitle} numberOfLines={1}>{periodTitle}</Text>
        <Pressable onPress={goToday} style={({ pressed }) => [styles.todayButton, pressed && styles.pressed]}>
          <Ionicons name="today-outline" size={14} color="#615DFA" />
          <Text style={styles.todayText}>Today</Text>
        </Pressable>
        <Pressable onPress={() => setSearchOpen(true)} style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}>
          <Ionicons name="search" size={18} color="#615DFA" />
        </Pressable>
      </View>

      {errorMessage ? (
        <View style={styles.errorCard}><Text style={styles.errorText}>{errorMessage}</Text></View>
      ) : null}
      {isStale ? (
        <View style={styles.bannerWrap}><OfflineBanner updatedAt={updatedAt} /></View>
      ) : null}

      {view === "year" ? (
        <SwipeArea horizontalOnly style={styles.flex} onLeft={() => shift(1)} onRight={() => shift(-1)}>
          <YearView year={month.getFullYear()} hasAnyItem={hasAnyItem} todayKey={todayKey}
            onPickMonth={(mi) => { animate(); setMonth(new Date(month.getFullYear(), mi, 1)); setView("month"); }} />
        </SwipeArea>
      ) : view === "day" ? (
        <SwipeArea horizontalOnly style={styles.flex} onLeft={() => shift(1)} onRight={() => shift(-1)}>
          <DayAgenda day={selectedDay} items={buildDayItems(ymd(selectedDay))} onReschedule={onReschedule} big />
        </SwipeArea>
      ) : (
        <View style={styles.flex}>
          <View style={styles.weekdays}>
            {WEEKDAY_LABELS.map((w) => <Text key={w} style={styles.weekdayLabel}>{w}</Text>)}
          </View>
          {/* Horizontal = native paging ScrollView (real finger-follow, Android-safe).
              Vertical = SwipeArea snap (resize). */}
          <SwipeArea
            verticalOnly
            onUp={() => setMode(view === "week" ? "week" : expanded ? "month" : "week")}
            onDown={() => setMode(view === "week" ? "month" : "big")}
          >
            <MonthPager
              view={view}
              month={month}
              selectedDay={selectedDay}
              rowH={rowH}
              width={winW}
              height={calcHeight}
              todayKey={todayKey}
              buildDayItems={buildDayItems}
              onPickDay={pickDay}
              onShift={shift}
            />
          </SwipeArea>
          {/* visual grabber — tap to toggle, or drag the calendar up/down */}
          <View style={styles.handleWrap}>
            <Pressable onPress={toggleExpand} hitSlop={14}>
              <View style={styles.handleBar} />
            </Pressable>
          </View>
          <DayAgenda day={selectedDay} items={buildDayItems(ymd(selectedDay))} onReschedule={onReschedule} />
        </View>
      )}

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => router.push({ pathname: "/event/new", params: parentId ? { parentId } : {} })}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>

      {searchOpen ? (
        <SearchModal
          localEvents={localEvents}
          events={events}
          onClose={() => setSearchOpen(false)}
          onPick={(dateKey) => {
            const d = new Date(dateKey + "T00:00:00");
            animate();
            setSelectedDay(d);
            setMonth(startOfMonth(d));
            setView("day");
            setSearchOpen(false);
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

// ── Month / Week grid with pills (static heights — Android-safe) ──
function MonthOrWeekGrid({
  view, periodDate, selectedDay, rowH, todayKey, buildDayItems, onPickDay,
}: {
  view: ViewMode;
  periodDate: Date;
  selectedDay: Date;
  rowH: number;
  todayKey: string;
  buildDayItems: (k: string) => DayItem[];
  onPickDay: (d: Date) => void;
}) {
  const rows = view === "week"
    ? [Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(periodDate), i))]
    : buildMonthGrid(periodDate.getFullYear(), periodDate.getMonth());
  const selKey = ymd(selectedDay);
  const maxPills = rowH > ROW_H ? 5 : 3;

  return (
    <View style={styles.grid}>
      {rows.map((row, ri) => (
        <View key={ri} style={[styles.gridRow, { height: rowH }]}>
          {row.map((d, ci) => {
            if (!d) return <View key={ci} style={styles.cell} />;
            const key = ymd(d);
            const items = buildDayItems(key);
            const isToday = key === todayKey;
            const isSelected = key === selKey;
            const dim = view === "month" && d.getMonth() !== periodDate.getMonth();
            return (
              <Pressable key={ci} style={[styles.cell, isSelected && styles.cellSelected]} onPress={() => onPickDay(d)}>
                <View style={[styles.cellDateWrap, isToday && styles.cellTodayWrap]}>
                  <Text style={[styles.cellDate, dim && styles.cellDim, isToday && styles.cellDateToday, isSelected && !isToday && styles.cellDateSel]}>
                    {d.getDate()}
                  </Text>
                </View>
                <View style={styles.pills}>
                  {items.slice(0, maxPills).map((it) => (
                    <View key={it.id} style={[styles.pill, { backgroundColor: it.color + "22", borderLeftColor: it.color }]}>
                      <Text style={[styles.pillText, { color: it.color }]} numberOfLines={1}>{it.title}</Text>
                    </View>
                  ))}
                  {items.length > maxPills ? <Text style={styles.pillMore}>···</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ── Year view: 12 mini months ──
function YearView({
  year, hasAnyItem, onPickMonth, todayKey,
}: {
  year: number;
  hasAnyItem: (k: string) => boolean;
  onPickMonth: (m: number) => void;
  todayKey: string;
}) {
  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.yearScroll}>
      <View style={styles.yearGrid}>
        {Array.from({ length: 12 }, (_, mi) => (
          <Pressable key={mi} style={styles.miniMonth} onPress={() => onPickMonth(mi)}>
            <Text style={styles.miniTitle}>{MONTH_NAMES[mi]}</Text>
            <View>
              {monthGridPadded(year, mi).map((row, ri) => (
                <View key={ri} style={styles.miniRow}>
                  {row.map((d, ci) => {
                    if (!d) return <View key={ci} style={styles.miniCell} />;
                    const key = ymd(d);
                    const isToday = key === todayKey;
                    return (
                      <View key={ci} style={styles.miniCell}>
                        <Text style={[styles.miniDay, isToday && styles.miniToday]}>{d.getDate()}</Text>
                        {hasAnyItem(key) ? <View style={styles.miniDot} /> : <View style={styles.miniDotEmpty} />}
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

// ── Swipe detector: static children, fires a direction on release. No animated
// layout / no offscreen panels, so Android always redraws the grid cells. ──
function SwipeArea({
  horizontalOnly, verticalOnly, style, onLeft, onRight, onUp, onDown, children,
}: {
  horizontalOnly?: boolean;
  verticalOnly?: boolean;
  style?: object;
  onLeft?: () => void;
  onRight?: () => void;
  onUp?: () => void;
  onDown?: () => void;
  children: React.ReactNode;
}) {
  const responder = useMemo(
    () =>
      PanResponder.create({
        // Capture the swipe at the parent BEFORE the day cells so a drag reliably
        // becomes a swipe. Taps don't move far enough to trigger, so they still
        // reach the cells. (Capture is why the previous version didn't swipe.)
        onMoveShouldSetPanResponderCapture: (_e, g) => {
          const v = Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx);
          if (verticalOnly) return v;
          const h = Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy);
          if (horizontalOnly) return h;
          return h || v;
        },
        onPanResponderRelease: (_e, g) => {
          if (Math.abs(g.dx) >= Math.abs(g.dy)) {
            if (g.dx < -14 || g.vx < -0.12) onLeft?.();
            else if (g.dx > 14 || g.vx > 0.12) onRight?.();
          } else {
            if (g.dy < -14 || g.vy < -0.12) onUp?.();
            else if (g.dy > 14 || g.vy > 0.12) onDown?.();
          }
        },
      }),
    [horizontalOnly, verticalOnly, onLeft, onRight, onUp, onDown],
  );
  return <View style={style} {...responder.panHandlers}>{children}</View>;
}

// ── Native horizontal paging pager: real finger-following swipe that redraws
// correctly on Android (unlike Animated transforms). 3 pages; recenter on commit. ──
function MonthPager({
  view, month, selectedDay, rowH, width, height, todayKey, buildDayItems, onPickDay, onShift,
}: {
  view: ViewMode;
  month: Date;
  selectedDay: Date;
  rowH: number;
  width: number;
  height: number;
  todayKey: string;
  buildDayItems: (k: string) => DayItem[];
  onPickDay: (d: Date) => void;
  onShift: (dir: -1 | 1) => void;
}) {
  const ref = useRef<ScrollView>(null);
  const pageKey = view === "week" ? `w-${ymd(startOfWeek(selectedDay))}` : `m-${month.getFullYear()}-${month.getMonth()}`;
  // Recenter to the middle page (before paint) whenever the period commits, so
  // the swiped-to month becomes the centred one with no flash.
  useLayoutEffect(() => {
    ref.current?.scrollTo({ x: width, animated: false });
  }, [pageKey, width]);
  const periodFor = (o: number) => (view === "week" ? addDays(selectedDay, o * 7) : addMonths(month, o));

  return (
    <ScrollView
      ref={ref}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      disableIntervalMomentum
      directionalLockEnabled
      contentOffset={{ x: width, y: 0 }}
      onMomentumScrollEnd={(e) => {
        const page = Math.round(e.nativeEvent.contentOffset.x / width);
        if (page === 0) onShift(-1);
        else if (page === 2) onShift(1);
      }}
      style={{ width, height }}
    >
      {[-1, 0, 1].map((o) => (
        <View key={o} style={{ width }}>
          <MonthOrWeekGrid
            view={view}
            periodDate={periodFor(o)}
            selectedDay={selectedDay}
            rowH={rowH}
            todayKey={todayKey}
            buildDayItems={buildDayItems}
            onPickDay={onPickDay}
          />
        </View>
      ))}
    </ScrollView>
  );
}

// ── Day agenda list ──
function DayAgenda({
  day, items, onReschedule, big,
}: {
  day: Date;
  items: DayItem[];
  onReschedule: (enrollmentId: string, date: string, studentId: string, courseName: string | null) => void;
  big?: boolean;
}) {
  return (
    <View style={styles.agenda}>
      {!big ? (
        <Text style={styles.agendaDate}>{day.toLocaleDateString("en-MY", { weekday: "long", day: "numeric", month: "long" })}</Text>
      ) : null}
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
                <Pressable style={({ pressed }) => [styles.moveButton, pressed && styles.pressed]} onPress={() => onReschedule(it.reschedule!.enrollmentId, it.reschedule!.date, it.reschedule!.studentId, it.reschedule!.courseName)}>
                  <Ionicons name="swap-horizontal" size={16} color="#615DFA" />
                  <Text style={styles.moveText}>Move</Text>
                </Pressable>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ── Search ──
function SearchModal({
  localEvents, events, onClose, onPick,
}: {
  localEvents: LocalEvent[];
  events: EventEntry[];
  onClose: () => void;
  onPick: (dateKey: string) => void;
}) {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [] as { id: string; title: string; date: string; color: string; sub: string }[];
    const out: { id: string; title: string; date: string; color: string; sub: string }[] = [];
    for (const e of localEvents) {
      if (e.title.toLowerCase().includes(needle)) out.push({ id: `le-${e.id}`, title: e.title, date: e.startDate, color: e.color, sub: cap(e.type) });
    }
    for (const e of events) {
      if ((e.title ?? "").toLowerCase().includes(needle)) {
        const meta = EVENT_TYPE_META[e.eventType];
        out.push({ id: `se-${e.id}`, title: e.title, date: e.isRecurring ? e.recurringStartDate ?? e.date : e.date, color: e.color || meta.color, sub: meta.label });
      }
    }
    return out.sort((a, b) => a.date.localeCompare(b.date));
  }, [q, localEvents, events]);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.searchSafe} edges={["top"]}>
        <View style={styles.searchHeader}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#9CA3AF" />
            <TextInput value={q} onChangeText={setQ} placeholder="Search events" placeholderTextColor="#9CA3AF" style={styles.searchInput} autoFocus />
          </View>
          <Pressable onPress={onClose} hitSlop={8}><Text style={styles.searchCancel}>Cancel</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.searchList} keyboardShouldPersistTaps="handled">
          {q.trim() && results.length === 0 ? <Text style={styles.agendaEmpty}>No events found.</Text> : null}
          {results.map((r) => (
            <Pressable key={r.id} style={styles.searchRow} onPress={() => onPick(r.date)}>
              <View style={[styles.searchDot, { backgroundColor: r.color }]} />
              <View style={styles.flex}>
                <Text style={styles.searchTitle} numberOfLines={1}>{r.title}</Text>
                <Text style={styles.searchSub}>{r.sub} · {new Date(r.date + "T00:00:00").toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F6FB" },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F6F6FB" },
  tabs: { flexDirection: "row", marginHorizontal: 16, backgroundColor: "#EEF0F6", borderRadius: 12, padding: 4, gap: 4 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: "center" },
  tabActive: { backgroundColor: "#FFFFFF", shadowColor: "#0F172A", shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  tabText: { fontSize: 13, fontWeight: "700", color: "#6B7280" },
  tabTextActive: { color: "#615DFA" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, gap: 6 },
  navButton: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", shadowColor: "#0F172A", shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: "#0F172A", letterSpacing: -0.3 },
  todayButton: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, height: 36, borderRadius: 12, backgroundColor: "#EEF2FF", justifyContent: "center" },
  todayText: { fontSize: 13, fontWeight: "800", color: "#615DFA" },
  pressed: { opacity: 0.7 },
  errorCard: { marginHorizontal: 16, marginBottom: 8, backgroundColor: "#FEE2E2", padding: 12, borderRadius: 12 },
  errorText: { color: "#991B1B", fontSize: 13 },
  bannerWrap: { paddingHorizontal: 16, marginBottom: 8 },
  weekdays: { flexDirection: "row", paddingHorizontal: 8, marginBottom: 2 },
  weekdayLabel: { flex: 1, textAlign: "center", fontSize: 10, fontWeight: "800", color: "#9CA3AF", letterSpacing: 0.6, textTransform: "uppercase" },
  grid: { paddingHorizontal: 6 },
  gridRow: { flexDirection: "row" },
  cell: { flex: 1, margin: 1.5, borderRadius: 10, backgroundColor: "#FFFFFF", paddingTop: 4, paddingHorizontal: 3 },
  cellSelected: { borderWidth: 1.5, borderColor: "#615DFA" },
  cellDateWrap: { alignSelf: "flex-start", minWidth: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  cellTodayWrap: { backgroundColor: "#615DFA" },
  cellDate: { fontSize: 12, fontWeight: "700", color: "#374151" },
  cellDateToday: { color: "#FFFFFF" },
  cellDateSel: { color: "#615DFA" },
  cellDim: { color: "#D1D5DB" },
  pills: { marginTop: 2, gap: 2, flex: 1, overflow: "hidden" },
  pill: { borderLeftWidth: 2, borderRadius: 3, paddingHorizontal: 3, paddingVertical: 1 },
  pillText: { fontSize: 9, fontWeight: "700" },
  pillMore: { fontSize: 11, fontWeight: "800", color: "#9CA3AF", marginTop: -2, paddingLeft: 2 },
  handleWrap: { alignItems: "center", paddingVertical: 8 },
  handleBar: { width: 44, height: 5, borderRadius: 3, backgroundColor: "#D1D5DB" },
  agenda: { flex: 1 },
  agendaDate: { fontSize: 14, fontWeight: "800", color: "#0F172A", paddingHorizontal: 16, marginBottom: 8 },
  agendaList: { paddingHorizontal: 16, paddingBottom: 100, gap: 10 },
  agendaEmpty: { fontSize: 13, color: "#9CA3AF", textAlign: "center", paddingVertical: 24 },
  agendaItem: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFFFFF", borderRadius: 14, padding: 12, shadowColor: "#0F172A", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  agendaTime: { width: 64, fontSize: 11, fontWeight: "700", color: "#6B7280" },
  agendaBar: { width: 4, alignSelf: "stretch", borderRadius: 2 },
  agendaTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  agendaSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  moveButton: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: "#F3F4F6", borderRadius: 8 },
  moveText: { fontSize: 13, fontWeight: "700", color: "#615DFA" },
  yearScroll: { padding: 12, paddingBottom: 100 },
  yearGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  miniMonth: { width: "31%", backgroundColor: "#FFFFFF", borderRadius: 12, padding: 8, marginBottom: 12 },
  miniTitle: { fontSize: 12, fontWeight: "800", color: "#615DFA", marginBottom: 4, textAlign: "center" },
  miniRow: { flexDirection: "row" },
  miniCell: { flex: 1, alignItems: "center", justifyContent: "center", height: 16 },
  miniDay: { fontSize: 7, color: "#374151", fontWeight: "600" },
  miniToday: { color: "#FFFFFF", backgroundColor: "#615DFA", borderRadius: 6, width: 12, height: 12, textAlign: "center", overflow: "hidden", lineHeight: 12 },
  miniDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: "#F59E0B", marginTop: 1 },
  miniDotEmpty: { width: 3, height: 3, marginTop: 1 },
  fab: { position: "absolute", right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: "#615DFA", alignItems: "center", justifyContent: "center", shadowColor: "#615DFA", shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  fabPressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
  searchSafe: { flex: 1, backgroundColor: "#F6F6FB" },
  searchHeader: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  searchBox: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFFFFF", borderRadius: 12, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, fontSize: 15, color: "#111827" },
  searchCancel: { fontSize: 15, color: "#615DFA", fontWeight: "700" },
  searchList: { padding: 16, gap: 10 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFFFFF", borderRadius: 12, padding: 14 },
  searchDot: { width: 10, height: 10, borderRadius: 5 },
  searchTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  searchSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
});
