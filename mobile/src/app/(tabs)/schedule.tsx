import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
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
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { TopBar } from "@/components/TopBar";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useAuth } from "@/contexts/auth";
import { useNicknames } from "@/contexts/nicknames";
import { useSettings } from "@/contexts/settings";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { addLocalEvent, deleteLocalEvent, listLocalEvents, localEventOccursOn, updateLocalEvent, type LocalEvent } from "@/lib/localEvents";
import { supabase } from "@/lib/supabase";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ROW_H = 72; // one calendar week row (month view)
const ROW_H_BIG = 122; // expanded row (pull down for more events)
const DRAG_NUDGE = 24; // drop-aim: lift the hit-test to the fingertip (touch lands lower)
const GRAB_NUDGE = 46; // pick-up: bigger lift so pressing a pill low in a cell picks THAT cell, not the one below

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
  sessions: number; // sessions_remaining (can be negative = over-used)
  branchId: string | null; // the centre — classes at the same branch don't "clash"
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
  children: { id: string; name: string }[];
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

// ── Colour means WHO, not what ──────────────────────────────────────────────
// Each child gets a fixed cheerful colour (by their order). Robotics classes are
// marked with a 🤖 icon; session balance shows as a corner tag instead of colour.
const CHILD_PALETTE = ["#2563EB", "#F97316", "#7C3AED", "#0D9488", "#DB2777", "#CA8A04"]; // blue, orange, purple, teal, pink, gold
const GENERAL_COLOR = "#65A30D"; // olive green — parent / whole-family events
function childColorFor(children: { id: string }[], studentId?: string): string {
  if (!studentId) return GENERAL_COLOR;
  const i = children.findIndex((c) => c.id === studentId);
  return i >= 0 ? CHILD_PALETTE[i % CHILD_PALETTE.length] : GENERAL_COLOR;
}

// ── Time-clash detection ────────────────────────────────────────────────────
// A clash = two future, LOCATED things that overlap in time but are at DIFFERENT
// places — so the parent (or child) can't be at both. Same location = no clash
// (e.g. 3 siblings at the same centre are together). Items with no known location
// are ignored (we can't tell). Classes have no stored end time → assume 90 min.
const DEFAULT_CLASS_MIN = 90;
function itemInterval(it: DayItem): [number, number] | null {
  if (it.time == null) return null; // all-day
  const end = it.endMin != null && it.endMin > it.time ? it.endMin : it.time + DEFAULT_CLASS_MIN;
  return [it.time, end];
}
function overlapMinutes(a: [number, number], b: [number, number]): number {
  return Math.max(0, Math.min(a[1], b[1]) - Math.max(a[0], b[0]));
}
// Returns: `border` = all clashing item ids (amber border); `banner` = later item
// id → the earlier partner it clashes with (only the later card shows the warning).
function computeClashes(items: DayItem[]): { border: Set<string>; banner: Map<string, { withTitle: string; withId?: string; overlap: number }> } {
  const border = new Set<string>();
  const banner = new Map<string, { withTitle: string; withId?: string; overlap: number }>();
  const ivs = items.map(itemInterval);
  const clashable = (it: DayItem, iv: [number, number] | null) =>
    !!iv && !it.past && !!it.location && (it.kind === "class" || it.kind === "local");
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (!clashable(it, ivs[i])) continue;
    for (let j = 0; j < i; j++) {
      const ot = items[j];
      if (!clashable(ot, ivs[j])) continue;
      if (it.location === ot.location) continue; // same place → not a clash
      const ov = overlapMinutes(ivs[i]!, ivs[j]!);
      if (ov > 0) {
        border.add(it.id); border.add(ot.id);
        if (!banner.has(it.id)) banner.set(it.id, { withTitle: ot.title, withId: ot.studentId, overlap: ov });
        break;
      }
    }
  }
  return { border, banner };
}

// Green "N left" / red "N over" tag for a robotics class (from sessions_remaining).
// Only for classes not yet attended; other items get no session tag.
function sessionTag(it: { kind?: string; sessions?: number | null; attended?: boolean; past?: boolean }): { text: string; ok: boolean } | null {
  if (it.kind !== "class" || it.sessions == null || it.attended || it.past) return null;
  const n = it.sessions;
  if (n > 0) return { text: `${n} left`, ok: true };
  if (n === 0) return { text: "0 left", ok: false };
  return { text: `${-n} over`, ok: false };
}

type DayItem = {
  id: string;
  time: number | null; // start minutes-of-day (null = all-day)
  endMin?: number | null; // end minutes-of-day (for time-grid block height)
  timeLabel: string | null;
  title: string;
  subtitle: string;
  color: string;
  kind?: "local" | "event" | "class"; // local = parent-created (editable)
  localId?: string; // the LocalEvent id when kind === "local"
  dateKey?: string; // the day this occurrence falls on
  sessions?: number | null; // class only: sessions_remaining (green if >0, red if ≤0)
  attended?: boolean; // class only: already marked (attendance exists)
  studentId?: string; // class only: which child (for the child filter)
  childColor?: string; // fixed per-child colour (WHO) — used for the card's left bar
  icon?: string; // local event only: emoji the parent picked to "sign" it
  location?: string; // where it happens (centre/branch for classes, free text for events) — used for clash detection
  assignedTo?: string[]; // local event only: child ids it's for ([] = general)
  past?: boolean; // date is before today → shown greyed
  reschedule?: { enrollmentId: string; studentId: string; courseName: string | null; date: string };
};

export default function CalendarScreen() {
  const { user } = useAuth();
  const userId = user?.id;
  const router = useRouter();
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const settings = useSettings();
  const [view, setView] = useState<ViewMode>("week"); // weekly-focused by default
  const [month, setMonth] = useState<Date>(startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [searchOpen, setSearchOpen] = useState(false);
  const [reschedTarget, setReschedTarget] = useState<{ enrollmentId: string; date: string; studentId: string; courseName: string | null } | null>(null);
  const nick = useNicknames();
  // Apply the parent's saved default view once settings have loaded.
  const appliedDefault = useRef(false);
  useEffect(() => {
    if (!appliedDefault.current && settings.loaded) {
      appliedDefault.current = true;
      setView(settings.defaultView);
    }
  }, [settings.loaded, settings.defaultView]);
  // Month view's own vertical zoom, independent of the Week tab:
  //   row   = collapsed to the selected week (more room for the event list below)
  //   month = normal
  //   big   = taller cells (more events per day)
  const [monthZoom, setMonthZoom] = useState<"row" | "month" | "big">("month");
  // Finger-following vertical resize: an animated height that only exists DURING
  // a drag (grid mounts fresh in it, never re-renders inside it → no Android blank).
  const [dragging, setDragging] = useState(false);
  const dragH = useMemo(() => new Animated.Value(0), []);
  const dragBase = useRef(0);

  const [localEvents, setLocalEvents] = useState<LocalEvent[]>([]);
  const reloadLocal = useCallback(() => {
    if (userId) listLocalEvents(userId).then(setLocalEvents);
  }, [userId]);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (userId) listLocalEvents(userId).then((evs) => { if (active) setLocalEvents(evs); });
      return () => { active = false; };
    }, [userId]),
  );
  // Week (reached by the tab OR by pulling the month up) is always the time grid.
  // The tap-an-event card is a pager over a day+time-sorted list: detailList is
  // the sorted items, detailIndex the current one (swipe left/right = prev/next).
  const [detailList, setDetailList] = useState<DayItem[] | null>(null);
  const [detailIndex, setDetailIndex] = useState(0);
  // Hold-and-drag to move an event: movingItem = the picked event, hoverKey = the
  // day under the finger, dragPos = the floating pill position (window coords).
  const [movingItem, setMovingItem] = useState<DayItem | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  // When a day has several of your events, long-press fans them out (cascade menu)
  // at the finger. menuHidden keeps the menu mounted-but-invisible while one of its
  // items is being dragged, so that drag gesture survives onto the calendar.
  const [menuState, setMenuState] = useState<{ items: DayItem[]; x: number; y: number } | null>(null);
  const [menuHidden, setMenuHidden] = useState(false);
  const dragPos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const gridGeom = useRef({ x: 0, y: 0 });
  const gridWrapRef = useRef<View>(null);
  // Gentle fade-in for the week grid so pull-up→week reads as a smooth change.
  const weekFade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (view === "week") {
      weekFade.setValue(0);
      Animated.timing(weekFade, { toValue: 1, duration: 240, useNativeDriver: true }).start();
    }
  }, [view, weekFade]);

  const fetchCalendar = async (): Promise<CalendarData> => {
    const empty: CalendarData = { parentId: null, enrollments: [], attendance: [], events: [], children: [] };
    const { data: parentRow, error: parentErr } = await supabase
      .from("parents")
      .select("id")
      .eq("auth_id", userId!)
      .is("deleted_at", null)
      .maybeSingle();
    if (parentErr) console.warn("calendar parent load failed", parentErr.message);
    if (!parentRow) return empty;
    const parentId = parentRow.id as string;

    const { data: links } = await supabase
      .from("parent_students")
      .select("student_id, student:students!inner(id, name, branch_id, deleted_at)")
      .eq("parent_id", parentRow.id);
    const studentRows = (links ?? [])
      .map((l) => l.student as unknown as { id: string; name: string; branch_id: string | null; deleted_at: string | null })
      .filter((s) => s && !s.deleted_at);
    const studentIds = studentRows.map((s) => s.id);
    if (studentIds.length === 0) return { ...empty, parentId };

    const { data: enrs, error: enrErr } = await supabase
      .from("enrollments")
      .select("id, student_id, day_of_week, start_time, schedule, sessions_remaining, course:courses(name)")
      .in("student_id", studentIds)
      .eq("status", "active")
      .is("deleted_at", null);
    if (enrErr) console.warn("calendar enrollments load failed", enrErr.message);

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
        // day_of_week may be a JSON array (["monday",…]) OR a plain weekday string ("monday").
        const raw = String(e.day_of_week).trim();
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) days = parsed.map((d: string) => String(d).toLowerCase());
          else if (typeof parsed === "string") days = [parsed.toLowerCase()];
        } catch {
          if (raw) days = raw.toLowerCase().split(/[,\s]+/).filter(Boolean);
        }
      }
      const stu = studentRows.find((s) => s.id === (e.student_id as string));
      const c = e.course as unknown as { name: string } | null;
      return {
        enrollmentId: e.id as string,
        studentId: e.student_id as string,
        studentName: stu?.name ?? "Unknown",
        courseName: c?.name ?? null,
        scheduleDays: days,
        startTime,
        sessions: Number(e.sessions_remaining ?? 0),
        branchId: stu?.branch_id ?? null,
      };
    });

    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 2, 0);
    // Filter attendance by enrollment_id (a real column) rather than an embedded
    // filter, and NON-FATALLY — a failure here must not blank the classes above.
    const enrollmentIds = (enrs ?? []).map((e) => e.id as string);
    let att: Array<{ date: string; status: string; enrollment: unknown }> = [];
    if (enrollmentIds.length) {
      const { data: attData, error: attErr } = await supabase
        .from("attendance")
        .select(`date, status, enrollment:enrollments(student_id, course:courses(name))`)
        .in("enrollment_id", enrollmentIds)
        .gte("date", ymd(monthStart))
        .lte("date", ymd(monthEnd));
      if (attErr) console.warn("calendar attendance load failed", attErr.message);
      else att = (attData ?? []) as typeof att;
    }

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

    return { parentId, enrollments, attendance, events, children: studentRows.map((s) => ({ id: s.id, name: s.name })) };
  };

  const { data, loading, error, isStale, updatedAt } = useCachedQuery<CalendarData>(
    `schedule:${userId ?? "anon"}:${month.getFullYear()}-${month.getMonth()}`,
    fetchCalendar,
    { enabled: !!userId },
  );

  const enrollments = useMemo(() => data?.enrollments ?? [], [data]);
  const attendance = useMemo(() => data?.attendance ?? [], [data]);
  const events = useMemo(() => data?.events ?? [], [data]);
  const children = useMemo(() => data?.children ?? [], [data]);
  const parentId = data?.parentId ?? null;
  const errorMessage = error && !data ? "Couldn't load your calendar. Check your connection." : null;
  // Child filter chips: empty = show everyone; otherwise only the selected children.
  const [childFilter, setChildFilter] = useState<string[]>([]);

  // Build the time-ordered items for a day (events + local + classes).
  const buildDayItems = useCallback(
    (dateKey: string): DayItem[] => {
      const d = new Date(dateKey + "T00:00:00");
      const wd = WEEKDAYS_FULL[d.getDay()];
      const todayK = ymd(new Date());
      const isPast = dateKey < todayK;
      const GREY = "#9CA3AF";
      const items: DayItem[] = [];
      for (const e of localEvents.filter((ev) => localEventOccursOn(ev, dateKey))) {
        // Child filter: general events (no assignedTo) always show; assigned ones
        // only when one of their children is selected (or nothing filtered).
        const assignedTo = e.assignedTo ?? [];
        if (childFilter.length && assignedTo.length && !assignedTo.some((id) => childFilter.includes(id))) continue;
        const typeName = e.type === "birthday" ? "Birthday" : e.type === "holiday" ? "Holiday" : "Event";
        // WHO colour: a single-child event uses that child's colour; family/parent
        // events stay the user-picked colour. (Grey when past.)
        const childColor = assignedTo.length === 1 ? (nick.color(assignedTo[0]) ?? childColorFor(children, assignedTo[0])) : undefined;
        items.push({ id: `le-${e.id}`, time: toMinutes(e.startTime), endMin: toMinutes(e.endTime), timeLabel: fmt12(e.startTime) ?? "All day", title: e.title, subtitle: e.location ? `${typeName} · ${e.location}` : typeName, color: isPast ? GREY : e.color, childColor, icon: e.icon, location: e.location ? `place:${e.location.trim().toLowerCase()}` : undefined, kind: "local", localId: e.id, dateKey, assignedTo, past: isPast });
      }
      for (const e of events.filter((ev) => eventOccursOn(ev, dateKey))) {
        const meta = EVENT_TYPE_META[e.eventType];
        const t = e.isRecurring ? e.recurringStartTime : e.startTime;
        const endT = e.isRecurring ? e.recurringEndTime : e.endTime;
        items.push({ id: `se-${e.id}`, time: toMinutes(t), endMin: toMinutes(endT), timeLabel: fmt12(t) ?? "All day", title: e.title, subtitle: meta.label, color: isPast ? GREY : (e.color || meta.color), kind: "event", dateKey, past: isPast });
      }
      const attToday = attendance.filter((a) => a.date === dateKey);
      // Editable window: at least 1 day ahead (not today/past) and within 1 month.
      const t0 = new Date(); t0.setHours(0, 0, 0, 0);
      const tomorrow = new Date(t0); tomorrow.setDate(tomorrow.getDate() + 1);
      const oneMonth = new Date(t0); oneMonth.setMonth(oneMonth.getMonth() + 1);
      for (const c of enrollments.filter((en) => en.scheduleDays.includes(wd))) {
        if (childFilter.length && !childFilter.includes(c.studentId)) continue; // child filter
        const at = attToday.find((a) => a.studentId === c.studentId && a.courseName === c.courseName);
        const editable = !at && d.getTime() >= tomorrow.getTime() && d.getTime() <= oneMonth.getTime();
        // Custom colour override wins over the system palette; nickname over full name.
        const cColor = nick.color(c.studentId) ?? childColorFor(children, c.studentId);
        items.push({
          id: `cl-${c.enrollmentId}-${dateKey}`,
          time: toMinutes(c.startTime),
          endMin: null,
          timeLabel: fmt12(c.startTime) ?? "Class",
          title: nick.raw(c.studentId) ?? c.studentName,
          subtitle: `${c.courseName ?? "Class"}${at ? ` · ${cap(at.status)}` : ""}`,
          // WHO colour: the child's fixed colour. Attended/past → grey. Session
          // balance is shown as a tag (sessionTag), not via card colour.
          color: at || isPast ? GREY : cColor,
          childColor: cColor,
          kind: "class",
          dateKey,
          sessions: c.sessions,
          attended: !!at,
          studentId: c.studentId,
          // Classes at the same centre share a location key → they never "clash"
          // (siblings are together). Prefix distinguishes from event locations.
          location: c.branchId ? `branch:${c.branchId}` : undefined,
          past: isPast,
          reschedule: editable ? { enrollmentId: c.enrollmentId, studentId: c.studentId, courseName: c.courseName, date: dateKey } : undefined,
        });
      }
      items.sort((a, b) => (a.time ?? -1) - (b.time ?? -1));
      return items;
    },
    [enrollments, attendance, events, localEvents, childFilter, children, nick],
  );

  const hasAnyItem = useCallback((dateKey: string): boolean => buildDayItems(dateKey).length > 0, [buildDayItems]);

  const todayKey = ymd(new Date());

  // ── navigation ──
  // LayoutAnimation (native, committed layout) is used for the vertical resize
  // instead of a per-frame Animated height — the latter leaves cells un-redrawn
  // (blank) on Android.
  const animate = () => LayoutAnimation.configureNext(LayoutAnimation.create(180, "easeInEaseOut", "opacity"));
  const resize = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  const setZoom = (z: "row" | "month" | "big") => {
    resize();
    setView("month");
    setMonthZoom(z);
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
    if (v === "month") setZoom("month");
    else { animate(); setView(v); }
  };
  // Month view swipes by month (or by week when collapsed to the week row).
  const monthShift = (dir: -1 | 1) => {
    if (monthZoom === "row") {
      setSelectedDay((d) => { const nd = addDays(d, dir * 7); setMonth(startOfMonth(nd)); return nd; });
    } else {
      const nm = addMonths(month, dir);
      setMonth(nm);
      const t = new Date();
      setSelectedDay(t.getMonth() === nm.getMonth() && t.getFullYear() === nm.getFullYear() ? t : new Date(nm.getFullYear(), nm.getMonth(), 1));
    }
  };
  // Reschedule opens a bottom-sheet drawer (no page jump) — spec requirement.
  const onReschedule = (enrollmentId: string, date: string, studentId: string, courseName: string | null) =>
    setReschedTarget({ enrollmentId, date, studentId, courseName });

  // Tapping the + in a week-grid slot opens the editor with that slot's
  // date + time pre-filled.
  const onAddSlot = (dateKey: string, hour: number) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    router.push({
      pathname: "/event/new",
      params: {
        ...(parentId ? { parentId } : {}),
        startDate: dateKey,
        startTime: `${pad(hour)}:00`,
        endDate: dateKey,
        endTime: hour < 23 ? `${pad(hour + 1)}:00` : "23:59",
      },
    });
  };
  const closeDetail = () => setDetailList(null);
  // Open the detail card on `it`, building a ±45-day, day+time-sorted list so the
  // card can swipe to the next/previous event.
  const openDetail = (it: DayItem) => {
    const center = it.dateKey ?? todayKey;
    const base = new Date(center + "T00:00:00");
    const list: DayItem[] = [];
    for (let i = -45; i <= 45; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      list.push(...buildDayItems(ymd(d)));
    }
    const idx = list.findIndex((x) => x.id === it.id && x.dateKey === it.dateKey);
    setDetailIndex(idx >= 0 ? idx : 0);
    setDetailList(list.length ? list : [it]);
  };
  const onEditLocal = (localId: string) => {
    closeDetail();
    router.push({ pathname: "/event/new", params: { id: localId, ...(parentId ? { parentId } : {}) } });
  };

  // Commit a move of local event `it` to targetKey (day). Recurring → prompt.
  const applyMove = useCallback((it: DayItem, targetKey: string) => {
    if (!it.localId || !userId || !it.dateKey || it.dateKey === targetKey) { setMovingItem(null); return; }
    const origDate = it.dateKey;
    setMovingItem(null);
    listLocalEvents(userId).then((list) => {
      const ev = list.find((e) => e.id === it.localId);
      if (!ev) return;
      if (ev.repeat !== "never") {
        Alert.alert("Repeating event", `Move "${ev.title}" — change the whole series, or just this one?`, [
          { text: "Cancel", style: "cancel" },
          {
            text: "Just this one",
            onPress: async () => {
              // Detach: the series skips origDate; a new single event lands on targetKey.
              await updateLocalEvent(userId, { ...ev, excludes: [...(ev.excludes ?? []), origDate] });
              await addLocalEvent(userId, {
                id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
                type: ev.type,
                title: ev.title,
                startDate: targetKey,
                startTime: ev.startTime,
                endDate: targetKey,
                endTime: ev.endTime,
                repeat: "never",
                custom: null,
                endRepeat: { mode: "never" },
                reminder: ev.reminder,
                alarm: false,
                color: ev.color,
                createdAt: Date.now(),
              });
              reloadLocal();
            },
          },
          { text: "Whole series", onPress: () => updateLocalEvent(userId, { ...ev, startDate: targetKey, endDate: targetKey }).then(reloadLocal) },
        ]);
      } else {
        // Non-recurring: move the whole event, keeping its day-count (span).
        const span = Math.round((new Date(ev.endDate + "T00:00:00").getTime() - new Date(ev.startDate + "T00:00:00").getTime()) / 86_400_000);
        const end = new Date(targetKey + "T00:00:00");
        end.setDate(end.getDate() + Math.max(0, span));
        updateLocalEvent(userId, { ...ev, startDate: targetKey, endDate: ymd(end) }).then(reloadLocal);
      }
    });
  }, [userId, reloadLocal]);

  // Week-grid drag: move a local event to a new day+start-time (keeps duration).
  const onMoveEventTime = useCallback((item: DayItem, newDateKey: string, newStartMin: number) => {
    if (item.kind !== "local" || !item.localId || !userId || item.time == null || item.dateKey == null) return;
    const pad = (n: number) => String(n).padStart(2, "0");
    const dur = (item.endMin != null && item.endMin > item.time ? item.endMin : item.time + 60) - item.time;
    const endM = Math.min(24 * 60 - 1, newStartMin + dur);
    const startTime = `${pad(Math.floor(newStartMin / 60))}:${pad(newStartMin % 60)}`;
    const endTime = `${pad(Math.floor(endM / 60))}:${pad(endM % 60)}`;
    if (newDateKey === item.dateKey && newStartMin === item.time) return; // no change
    const origDate = item.dateKey;
    listLocalEvents(userId).then((list) => {
      const ev = list.find((e) => e.id === item.localId);
      if (!ev) return;
      // Preserve a multi-day span: keep the same number of days between start and
      // end (dragging the block used to collapse it to a single day).
      const spanDays = Math.max(0, Math.round((new Date(ev.endDate + "T00:00:00").getTime() - new Date(ev.startDate + "T00:00:00").getTime()) / 86_400_000));
      const newEndDate = ymd(addDays(new Date(newDateKey + "T00:00:00"), spanDays));
      if (ev.repeat !== "never") {
        Alert.alert("Repeating event", `Move "${ev.title}" — change the whole series, or just this one?`, [
          { text: "Cancel", style: "cancel" },
          {
            text: "Just this one",
            onPress: async () => {
              await updateLocalEvent(userId, { ...ev, excludes: [...(ev.excludes ?? []), origDate] });
              await addLocalEvent(userId, { id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`, type: ev.type, title: ev.title, startDate: newDateKey, startTime, endDate: newEndDate, endTime, repeat: "never", custom: null, endRepeat: { mode: "never" }, reminder: ev.reminder, alarm: false, color: ev.color, createdAt: Date.now() });
              reloadLocal();
            },
          },
          { text: "Whole series", onPress: () => updateLocalEvent(userId, { ...ev, startDate: newDateKey, startTime, endDate: newEndDate, endTime }).then(reloadLocal) },
        ]);
      } else {
        updateLocalEvent(userId, { ...ev, startDate: newDateKey, startTime, endDate: newEndDate, endTime }).then(reloadLocal);
      }
    });
  }, [userId, reloadLocal]);

  // Hold-and-drag handlers (stable, so the RNGH gesture identity stays put). They
  // read live view state via dragCtx.current, which is refreshed each render below.
  const movingRef = useRef<DayItem | null>(null);
  const hoverRef = useRef<string | null>(null);
  const edgeRef = useRef(false); // throttle edge-of-screen month paging while dragging
  const dragCtx = useRef({
    rowH: ROW_H, gridView: "month" as ViewMode, month, selectedDay, winW, insetTop: insets.top,
    shift: (_d: -1 | 1) => {}, items: (_k: string) => [] as DayItem[],
  });
  // Which day is under the finger (window coords → grid cell).
  const cellFromXY = useCallback((absX: number, absY: number, nudge = DRAG_NUDGE): Date | null => {
    const c = dragCtx.current;
    const cellW = (c.winW - 12) / 7;
    const col = Math.floor((absX - gridGeom.current.x - 6) / cellW);
    const row = Math.floor((absY - nudge - gridGeom.current.y) / c.rowH);
    const grid = c.gridView === "week"
      ? [Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(c.selectedDay), i))]
      : buildMonthGrid(c.month.getFullYear(), c.month.getMonth());
    return col >= 0 && col < 7 && row >= 0 && row < grid.length ? grid[row][col] : null;
  }, []);
  // The drag gesture lives on the STABLE grid container (not the pill), so it
  // survives month paging. On start we hit-test which of your events you grabbed.
  const dragStart = useCallback((absX: number, absY: number) => {
    const day = cellFromXY(absX, absY, GRAB_NUDGE); // grab: pick the pressed cell
    if (!day) return;
    const locals = dragCtx.current.items(ymd(day)).filter((i) => i.kind === "local" && i.localId);
    if (locals.length === 0) return; // nothing draggable under the finger
    if (locals.length > 1) { setMenuState({ items: locals, x: absX, y: absY }); return; } // fan out → choose
    const ev = locals[0];
    movingRef.current = ev;
    hoverRef.current = null;
    setMovingItem(ev);
    setHoverKey(null);
    dragPos.setValue({ x: absX, y: absY - dragCtx.current.insetTop });
  }, [cellFromXY, dragPos]);
  const dragMove = useCallback((absX: number, absY: number) => {
    if (!movingRef.current) return; // long-pressed empty space → ignore
    const c = dragCtx.current;
    dragPos.setValue({ x: absX, y: absY - c.insetTop });
    // Hold near the left/right edge → page prev/next month (like dragging an app
    // icon across home-screen pages). Safe now because the gesture is on the
    // stable container, not the event that gets unmounted on the month change.
    if (!edgeRef.current) {
      const dir: -1 | 1 | 0 = absX < 34 ? -1 : absX > c.winW - 34 ? 1 : 0;
      if (dir !== 0) { edgeRef.current = true; c.shift(dir); setTimeout(() => { edgeRef.current = false; }, 480); }
    }
    const day = cellFromXY(absX, absY);
    const key = day ? ymd(day) : null;
    hoverRef.current = key;
    setHoverKey(key);
  }, [cellFromXY, dragPos]);
  const dragEnd = useCallback(() => {
    const it = movingRef.current;
    const target = hoverRef.current;
    hoverRef.current = null;
    setHoverKey(null);
    // If nothing was picked up, this release just OPENED the cascade menu — leave
    // it on screen so the parent can then grab an event from it.
    if (!it) return;
    setMenuState(null);
    setMenuHidden(false);
    if (target) { movingRef.current = null; applyMove(it, target); }
    // Released off any day → keep it picked up (tap a day to place; also cross-month).
  }, [applyMove]);
  // Grabbing an item out of the cascade menu → start dragging it (keep the menu
  // mounted-but-hidden so this gesture survives), or tap it to pick up for tapping.
  const menuItemDragStart = useCallback((it: DayItem, absX: number, absY: number) => {
    setMenuHidden(true);
    movingRef.current = it;
    hoverRef.current = null;
    setMovingItem(it);
    setHoverKey(null);
    dragPos.setValue({ x: absX, y: absY - dragCtx.current.insetTop });
  }, [dragPos]);
  const menuTapPick = (it: DayItem) => { setMenuState(null); setHoverKey(null); setMovingItem(it); };
  const menuDragProps = useMemo(() => ({ onStart: menuItemDragStart, onMove: dragMove, onEnd: dragEnd }), [menuItemDragStart, dragMove, dragEnd]);
  const eventDragGesture = useMemo(
    () => Gesture.Pan().runOnJS(true).activateAfterLongPress(260)
      .onStart((e) => dragStart(e.absoluteX, e.absoluteY))
      .onUpdate((e) => dragMove(e.absoluteX, e.absoluteY))
      .onEnd(() => dragEnd()),
    [dragStart, dragMove, dragEnd],
  );
  // Tap a day while an event is picked up → place it there (also covers cross-month).
  const onCellPress = (d: Date) => {
    if (movingItem) applyMove(movingItem, ymd(d));
    else pickDay(d);
  };
  const onDeleteLocal = (localId: string) => {
    Alert.alert("Delete event", "Delete this event? This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (userId) await deleteLocalEvent(userId, localId);
          reloadLocal();
          closeDetail();
        },
      },
    ]);
  };

  const toggleExpand = () => setZoom(monthZoom === "big" ? "month" : "big");

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
  const weekH = ROW_H;
  const monthH = currentRows * ROW_H;
  const bigH = currentRows * expandedRowH; // month with taller cells
  const rowH = monthZoom === "big" ? expandedRowH : ROW_H;
  const calcHeight = monthZoom === "row" ? weekH : monthZoom === "big" ? bigH : monthH;
  const gridView: ViewMode = monthZoom === "row" ? "week" : "month"; // row = one week
  dragCtx.current = { rowH, gridView, month, selectedDay, winW, insetTop: insets.top, shift: monthShift, items: buildDayItems };

  // Vertical drag → finger-following height across week / month / big. The
  // responder lives on a STABLE outer View so switching to the animated wrapper
  // mid-gesture doesn't drop it. Collapsing (< monthH) clips rows; expanding
  // (> monthH) scales the static grid up so cells grow with the finger.
  const vDragPan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_e, g) => Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderGrant: () => {
          dragBase.current = Math.max(weekH, Math.min(bigH, calcHeight));
          dragH.setValue(dragBase.current);
          setDragging(true);
        },
        onPanResponderMove: (_e, g) => { dragH.setValue(Math.max(weekH, Math.min(bigH, dragBase.current + g.dy))); },
        onPanResponderRelease: (_e, g) => {
          const finalH = Math.max(weekH, Math.min(bigH, dragBase.current + g.dy));
          // Stay on the Month tab; pull-up collapses to the week row (more room for
          // the event list), pull-down expands the cells.
          const level = finalH < (weekH + monthH) / 2 ? "row" : finalH > (monthH + bigH) / 2 ? "big" : "month";
          const target = level === "row" ? weekH : level === "big" ? bigH : monthH;
          Animated.timing(dragH, { toValue: target, duration: 130, useNativeDriver: false }).start(() => {
            setMonthZoom(level);
            setDragging(false);
          });
        },
        onPanResponderTerminate: () => setDragging(false),
      }),
    [calcHeight, weekH, monthH, bigH, dragH],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <ActivityIndicator color="#615DFA" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Compact child filter sits beside the "Schedule" title (small chips).
          Colour = which child; tap to filter, tap "All" to clear. */}
      <TopBar
        title="Schedule"
        center={
          settings.showFilter && children.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.miniFilterRow}>
              <Pressable onPress={() => setChildFilter([])} style={[styles.miniChip, childFilter.length === 0 && styles.miniChipActive]}>
                <Ionicons name="people" size={13} color={childFilter.length === 0 ? "#FFFFFF" : "#6B7280"} />
              </Pressable>
              {children.map((c) => {
                const on = childFilter.includes(c.id);
                const cc = nick.color(c.id) ?? childColorFor(children, c.id);
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setChildFilter((prev) => (prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id]))}
                    style={[styles.miniChip, { backgroundColor: on ? cc : "#EEF0F6" }, on && { borderColor: cc }]}
                  >
                    <View style={[styles.miniChipDot, { backgroundColor: on ? "#FFFFFF" : cc }]} />
                    <Text style={[styles.miniChipText, on && styles.miniChipTextActive]} numberOfLines={1}>
                      {nick.label(c.id, c.name)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : undefined
        }
      />

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
        <DayPager selectedDay={selectedDay} width={winW} buildDayItems={buildDayItems} onReschedule={onReschedule} onOpenEvent={openDetail} onShift={shift} />
      ) : view === "week" ? (
        <Animated.View style={[styles.flex, { opacity: weekFade }]}>
          <WeekPager
            selectedDay={selectedDay}
            width={winW}
            todayKey={todayKey}
            buildDayItems={buildDayItems}
            onAddSlot={onAddSlot}
            onOpenEvent={openDetail}
            onShift={shift}
            onMoveEvent={onMoveEventTime}
          />
        </Animated.View>
      ) : (
        <View style={styles.flex}>
          <View style={styles.weekdays}>
            {WEEKDAY_LABELS.map((w) => <Text key={w} style={styles.weekdayLabel}>{w}</Text>)}
          </View>
          {/* Horizontal = native paging ScrollView (finger-follow). Vertical =
              finger-follow height, but the animated wrapper only exists during the
              drag; at rest it's a plain View so day-taps never re-render inside an
              animated view (which is what blanked cells on Android). */}
          <GestureDetector gesture={eventDragGesture}>
            <View ref={gridWrapRef} onLayout={() => gridWrapRef.current?.measureInWindow((x, y) => { gridGeom.current = { x, y }; })} {...vDragPan.panHandlers}>
              {dragging ? (
                <Animated.View style={{ height: dragH, overflow: "hidden" }}>
                  {/* Rows flex-grow (fill) to the dragged height: below monthH they
                      stay ROW_H and clip (collapse); above monthH they grow so cells
                      get taller with the finger — day numbers/pills keep their real
                      size (no scale = no stretch). */}
                  <MonthPager fill view="month" month={month} selectedDay={selectedDay} rowH={ROW_H} width={winW} height={monthH} todayKey={todayKey} buildDayItems={buildDayItems} onPickDay={onCellPress} onShift={monthShift} movingItem={movingItem} hoverKey={hoverKey} />
                </Animated.View>
              ) : (
                <View style={{ height: calcHeight, overflow: "hidden" }}>
                  <MonthPager view={gridView} month={month} selectedDay={selectedDay} rowH={rowH} width={winW} height={calcHeight} todayKey={todayKey} buildDayItems={buildDayItems} onPickDay={onCellPress} onShift={monthShift} movingItem={movingItem} hoverKey={hoverKey} />
                </View>
              )}
            </View>
          </GestureDetector>
          {/* grabber — tap to toggle, OR press-drag up/down to resize (same as
              dragging the calendar; shares the vertical-resize pan responder). */}
          <View style={styles.handleWrap} {...vDragPan.panHandlers}>
            <Pressable onPress={toggleExpand} hitSlop={20}>
              <View style={styles.handleBar} />
            </Pressable>
          </View>
          <DayAgenda day={selectedDay} items={buildDayItems(ymd(selectedDay))} onReschedule={onReschedule} onOpenEvent={openDetail} />
        </View>
      )}

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => router.push({ pathname: "/event/new", params: parentId ? { parentId } : {} })}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>

      {detailList ? (
        <QuickSheetPager
          list={detailList}
          index={detailIndex}
          width={winW}
          onIndex={setDetailIndex}
          onClose={closeDetail}
          onEdit={onEditLocal}
          onDelete={onDeleteLocal}
          onReschedule={(r) => { closeDetail(); onReschedule(r.enrollmentId, r.date, r.studentId, r.courseName); }}
        />
      ) : null}

      {menuState ? (
        <CascadeMenu
          state={menuState}
          hidden={menuHidden}
          winW={winW}
          winH={winH}
          insetTop={insets.top}
          onClose={() => setMenuState(null)}
          onTapPick={menuTapPick}
          dragProps={menuDragProps}
        />
      ) : null}

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

      {reschedTarget ? (
        <RescheduleSheet target={reschedTarget} onClose={() => setReschedTarget(null)} />
      ) : null}

      {/* Move banner — absolute so it never shifts the calendar (which would throw
          off the drop-target hit-testing). */}
      {movingItem ? (
        <View style={styles.moveBanner}>
          <Ionicons name="move" size={15} color="#615DFA" />
          <Text style={styles.moveBannerText} numberOfLines={2}>Moving “{movingItem.title}” — drop on a day, or tap a day (change month first for another month)</Text>
          <Pressable onPress={() => { setMovingItem(null); setHoverKey(null); }} hitSlop={8}><Text style={styles.moveBannerCancel}>Cancel</Text></Pressable>
        </View>
      ) : null}

      {/* Floating pill that follows the finger while dragging an event. */}
      {movingItem ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.floatPill,
            { borderLeftColor: movingItem.color, transform: [{ translateX: Animated.subtract(dragPos.x, 54) }, { translateY: Animated.add(dragPos.y, 12) }] },
          ]}
        >
          <Text style={styles.floatPillText} numberOfLines={1}>{movingItem.title}</Text>
        </Animated.View>
      ) : null}
    </SafeAreaView>
  );
}

// ── Month / Week grid with pills (static heights — Android-safe) ──
function MonthOrWeekGrid({
  view, periodDate, selectedDay, rowH, todayKey, buildDayItems, onPickDay, fill, movingItem, hoverKey,
}: {
  view: ViewMode;
  periodDate: Date;
  selectedDay: Date;
  rowH: number;
  todayKey: string;
  buildDayItems: (k: string) => DayItem[];
  onPickDay: (d: Date) => void;
  fill?: boolean; // rows flex-grow to fill parent height (during a resize drag)
  movingItem?: DayItem | null;
  hoverKey?: string | null;
}) {
  const rows = view === "week"
    ? [Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(periodDate), i))]
    : buildMonthGrid(periodDate.getFullYear(), periodDate.getMonth());
  const selKey = ymd(selectedDay);
  const maxPills = fill || rowH > ROW_H ? 5 : 3;

  return (
    <View style={fill ? styles.gridFill : styles.grid}>
      {rows.map((row, ri) => (
        <View key={ri} style={fill ? styles.gridRowFill : [styles.gridRow, { height: rowH }]}>
          {row.map((d, ci) => {
            if (!d) return <View key={ci} style={styles.cell} />;
            const key = ymd(d);
            const items = buildDayItems(key);
            const isToday = key === todayKey;
            const isSelected = key === selKey;
            const dim = view === "month" && d.getMonth() !== periodDate.getMonth();
            // While moving an event, every day except its origin is a green target;
            // the day under the finger is the strong drop-target.
            const isTarget = !!movingItem && key !== movingItem.dateKey;
            const isHover = !!movingItem && key === hoverKey;
            return (
              <Pressable key={ci} style={[styles.cell, isSelected && styles.cellSelected, isTarget && styles.cellTarget, isHover && styles.cellHover]} onPress={() => onPickDay(d)}>
                <View style={[styles.cellDateWrap, isToday && styles.cellTodayWrap]}>
                  <Text style={[styles.cellDate, dim && styles.cellDim, isToday && styles.cellDateToday, isSelected && !isToday && styles.cellDateSel]}>
                    {d.getDate()}
                  </Text>
                </View>
                <View style={styles.pills}>
                  {items.slice(0, maxPills).map((it) => (
                    <GridPill
                      key={it.id}
                      item={it}
                      day={d}
                      picked={movingItem?.id === it.id}
                      onPickDay={onPickDay}
                    />
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

// One event pill. Tap selects/places the day; the hold-and-drag to move is a
// single gesture on the whole grid container (survives month paging).
function GridPill({
  item, day, picked, onPickDay,
}: {
  item: DayItem;
  day: Date;
  picked: boolean;
  onPickDay: (d: Date) => void;
}) {
  return (
    <Pressable onPress={() => onPickDay(day)} style={[styles.pill, { backgroundColor: item.color + "22", borderLeftColor: item.color }, picked && styles.pillPicked]}>
      <Text style={[styles.pillText, { color: item.color }]} numberOfLines={1}>{item.kind === "class" ? "🤖 " : item.icon ? `${item.icon} ` : ""}{item.title}</Text>
    </Pressable>
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
  view, month, selectedDay, rowH, width, height, todayKey, buildDayItems, onPickDay, onShift, fill, movingItem, hoverKey,
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
  fill?: boolean; // fill parent height (grid rows flex-grow) instead of fixed height
  movingItem?: DayItem | null;
  hoverKey?: string | null;
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
      style={fill ? { width, flex: 1 } : { width, height }}
    >
      {[-1, 0, 1].map((o) => (
        <View key={o} style={fill ? { width, alignSelf: "stretch" } : { width }}>
          <MonthOrWeekGrid
            view={view}
            periodDate={periodFor(o)}
            selectedDay={selectedDay}
            rowH={rowH}
            todayKey={todayKey}
            buildDayItems={buildDayItems}
            onPickDay={onPickDay}
            fill={fill}
            movingItem={movingItem}
            hoverKey={hoverKey}
          />
        </View>
      ))}
    </ScrollView>
  );
}

// ── Quick-view / simple-edit half sheet (tap an event in the week grid) ──────
// One event's compact content (no modal chrome) — used as a page in the swipeable
// half-sheet. Title already carries the child's nickname (set in buildDayItems).
function QuickCard({ item, onEdit, onDelete, onReschedule }: {
  item: DayItem;
  onEdit: (localId: string) => void;
  onDelete: (localId: string) => void;
  onReschedule: (r: NonNullable<DayItem["reschedule"]>) => void;
}) {
  const isClass = item.kind === "class";
  const isLocal = item.kind === "local" && !!item.localId;
  const sign = isClass ? "🤖" : item.icon ?? null;
  // Robotics classes read "Robotic class (child)"; other events keep their title.
  const displayTitle = isClass ? `Robotic class (${item.title})` : item.title;
  const dateLabel = item.dateKey
    ? new Date(item.dateKey + "T00:00:00").toLocaleDateString("en-MY", { weekday: "long", day: "numeric", month: "long" })
    : "";
  const locationLabel = item.location?.startsWith("place:")
    ? item.location.slice(6)
    : item.location?.startsWith("branch:")
      ? "At the centre"
      : null;
  const tag = sessionTag(item);
  return (
    <View style={styles.qpCard}>
      <View style={[styles.qBar, { backgroundColor: item.color }]} />
      <View style={styles.sheetHeaderRow}>
        <View style={styles.flex}>
          <Text style={styles.sheetTitle} numberOfLines={1}>{sign ? `${sign} ` : ""}{displayTitle}</Text>
          <Text style={styles.sheetSub} numberOfLines={1}>{item.subtitle}</Text>
        </View>
        {tag ? (
          <View style={[styles.sessTag, tag.ok ? styles.sessTagOk : styles.sessTagLow]}>
            <Text style={[styles.sessTagText, { color: tag.ok ? "#065F46" : "#991B1B" }]}>{tag.text}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.qMetaRow}><Ionicons name="calendar-outline" size={16} color="#615DFA" /><Text style={styles.qMetaText}>{dateLabel}</Text></View>
      <View style={styles.qMetaRow}><Ionicons name="time-outline" size={16} color="#615DFA" /><Text style={styles.qMetaText}>{item.timeLabel ?? "All day"}</Text></View>
      {locationLabel ? (
        <View style={styles.qMetaRow}><Ionicons name="location-outline" size={16} color="#615DFA" /><Text style={styles.qMetaText}>{locationLabel}</Text></View>
      ) : null}
      {isClass && item.sessions != null ? (
        <View style={styles.qMetaRow}>
          <Ionicons name="ticket-outline" size={16} color="#615DFA" />
          <Text style={styles.qMetaText}>
            {item.sessions > 0 ? `${item.sessions} session${item.sessions === 1 ? "" : "s"} left` : item.sessions === 0 ? "No sessions left" : `${-item.sessions} session${item.sessions === -1 ? "" : "s"} over`}
          </Text>
        </View>
      ) : null}

      {/* Actions: classes → Reschedule only; local events → Edit + Delete. */}
      {isClass ? (
        item.reschedule ? (
          <View style={styles.qActions}>
            <Pressable style={[styles.qBtn, styles.qBtnPrimary]} onPress={() => onReschedule(item.reschedule!)}>
              <Ionicons name="repeat" size={17} color="#FFFFFF" />
              <Text style={styles.qBtnPrimaryText}>Reschedule</Text>
            </Pressable>
          </View>
        ) : null
      ) : isLocal ? (
        <View style={styles.qActions}>
          <Pressable style={[styles.qBtn, styles.qBtnPrimary]} onPress={() => onEdit(item.localId!)}>
            <Ionicons name="create-outline" size={17} color="#FFFFFF" />
            <Text style={styles.qBtnPrimaryText}>Edit</Text>
          </Pressable>
          <Pressable style={[styles.qBtn, styles.qBtnDanger]} onPress={() => onDelete(item.localId!)}>
            <Ionicons name="trash-outline" size={17} color="#DC2626" />
            <Text style={styles.qBtnDangerText}>Delete</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.qMetaRow}><Ionicons name="lock-closed-outline" size={14} color="#9CA3AF" /><Text style={styles.qNote}>Added by your school — view only.</Text></View>
      )}
    </View>
  );
}

// Swipeable half-sheet: a bottom popup you can flick left/right through the day's
// events (finger-follows via a 3-page native paging ScrollView).
function QuickSheetPager({ list, index, width, onIndex, onClose, onEdit, onDelete, onReschedule }: {
  list: DayItem[];
  index: number;
  width: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  onEdit: (localId: string) => void;
  onDelete: (localId: string) => void;
  onReschedule: (r: NonNullable<DayItem["reschedule"]>) => void;
}) {
  const ref = useRef<ScrollView>(null);
  useLayoutEffect(() => { ref.current?.scrollTo({ x: width, animated: false }); }, [index, width]);
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      <View style={styles.qpSheet}>
        <View style={styles.sheetHandle} />
        <ScrollView
          ref={ref}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          disableIntervalMomentum
          directionalLockEnabled
          contentOffset={{ x: width, y: 0 }}
          onMomentumScrollEnd={(e) => {
            const p = Math.round(e.nativeEvent.contentOffset.x / width);
            if (p === 1) return;
            const ni = p === 0 ? index - 1 : index + 1;
            if (ni < 0 || ni >= list.length) { ref.current?.scrollTo({ x: width, animated: true }); return; }
            onIndex(ni);
          }}
        >
          {[index - 1, index, index + 1].map((pi, o) => (
            <View key={o} style={{ width }}>
              {list[pi] ? <QuickCard item={list[pi]} onEdit={onEdit} onDelete={onDelete} onReschedule={onReschedule} /> : <View />}
            </View>
          ))}
        </ScrollView>
        {list.length > 1 ? (
          <View style={styles.qpHint}>
            <Ionicons name="chevron-back" size={13} color="#9CA3AF" />
            <Text style={styles.qpHintText}>{index + 1} of {list.length} · swipe</Text>
            <Ionicons name="chevron-forward" size={13} color="#9CA3AF" />
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

// ── Reschedule bottom-sheet (drawer) ────────────────────────────────────────
// Opens over the calendar — no page jump. Fetches the course's real slots and
// lets the parent pick a new day + time. The actual booking + capacity check is
// server-side (parents can't write under RLS), so Confirm queues the request.
type ReschedSlot = { id: string; day: string; time: string; duration: number; limitStudent: number };
const WEEKDAY_ORDER: Record<string, number> = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 7 };

function RescheduleSheet({
  target, onClose, onBack,
}: {
  target: { enrollmentId: string; date: string; studentId: string; courseName: string | null };
  onClose: () => void;
  onBack?: () => void; // when opened from the class quick-sheet, go back to it
}) {
  const [studentName, setStudentName] = useState("");
  const [slots, setSlots] = useState<ReschedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [selDate, setSelDate] = useState<Date | null>(null);
  const [selSlot, setSelSlot] = useState<ReschedSlot | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: stu } = await supabase.from("students").select("name").eq("id", target.studentId).maybeSingle();
        if (!cancelled) setStudentName((stu?.name as string) ?? "");
        const { data: enr } = await supabase
          .from("enrollments").select("course_id, student:students!inner(branch_id)").eq("id", target.enrollmentId).maybeSingle();
        if (!enr) { if (!cancelled) setErr("Class not found."); return; }
        const courseId = enr.course_id as string;
        const branchId = (enr.student as unknown as { branch_id: string }).branch_id;
        const { data: rows, error } = await supabase
          .from("course_slots").select("id, day, time, duration, limit_student")
          .eq("course_id", courseId).eq("branch_id", branchId).is("deleted_at", null);
        if (error) throw error;
        const mapped: ReschedSlot[] = (rows ?? [])
          .map((s) => ({ id: s.id as string, day: (s.day as string).toLowerCase(), time: s.time as string, duration: Number(s.duration ?? 0), limitStudent: Number(s.limit_student ?? 0) }))
          .sort((a, b) => (WEEKDAY_ORDER[a.day] ?? 8) - (WEEKDAY_ORDER[b.day] ?? 8) || a.time.localeCompare(b.time));
        if (!cancelled) setSlots(mapped);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Couldn't load slots.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [target.enrollmentId, target.studentId]);

  const dateOptions = useMemo(() => {
    const out: Date[] = [];
    const tomorrow = addDays(new Date(), 1);
    for (let i = 0; i < 30; i++) out.push(addDays(tomorrow, i));
    return out;
  }, []);
  const slotsForDate = selDate
    ? slots.filter((s) => s.day === ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][selDate.getDay()])
    : [];
  const canConfirm = !!(selDate && selSlot);

  const confirm = () => {
    if (!selDate || !selSlot) return;
    Alert.alert(
      "Reschedule requested",
      `We've noted moving ${studentName || "this class"}'s ${target.courseName || "class"} to ${selDate.toLocaleDateString("en-MY", { weekday: "long", day: "numeric", month: "long" })} at ${fmt12(selSlot.time)}.\n\nOnline rescheduling is being switched on shortly — once live it moves instantly, updates class credits, and any full slot won't be offered.`,
      [{ text: "Got it", onPress: onClose }],
    );
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeaderRow}>
          {onBack ? (
            <Pressable onPress={onBack} hitSlop={8} style={styles.sheetBack}><Ionicons name="chevron-back" size={22} color="#615DFA" /></Pressable>
          ) : null}
          <View style={styles.flex}>
            <Text style={styles.sheetTitle}>🤖 Reschedule class</Text>
            <Text style={styles.sheetSub} numberOfLines={1}>
              {studentName || "…"} · {target.courseName || "Class"} · from {new Date(target.date + "T00:00:00").toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short" })}
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={8} style={styles.sheetClose}><Ionicons name="close" size={20} color="#6B7280" /></Pressable>
        </View>

        {loading ? (
          <View style={styles.sheetLoading}><ActivityIndicator color="#615DFA" /></View>
        ) : err ? (
          <Text style={styles.sheetErr}>{err}</Text>
        ) : (
          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
            <Text style={styles.sheetStep}>1 · Pick a new day</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
              {dateOptions.map((d) => {
                const on = selDate && ymd(selDate) === ymd(d);
                return (
                  <Pressable key={ymd(d)} style={[styles.rsDate, on && styles.rsDateOn]} onPress={() => { setSelDate(d); setSelSlot(null); }}>
                    <Text style={[styles.rsDateWd, on && styles.rsOnText]}>{d.toLocaleDateString("en-MY", { weekday: "short" })}</Text>
                    <Text style={[styles.rsDateNum, on && styles.rsOnText]}>{d.getDate()}</Text>
                    <Text style={[styles.rsDateMo, on && styles.rsOnText]}>{d.toLocaleDateString("en-MY", { month: "short" })}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.sheetStep}>2 · Pick a time slot</Text>
            {!selDate ? (
              <Text style={styles.sheetHelp}>Pick a day first to see the slots that run then.</Text>
            ) : slotsForDate.length === 0 ? (
              <Text style={styles.sheetHelp}>No class slots run on this weekday. Try another day.</Text>
            ) : (
              <View style={styles.rsSlots}>
                {slotsForDate.map((s) => {
                  const on = selSlot?.id === s.id;
                  return (
                    <Pressable key={s.id} style={[styles.rsSlot, on && styles.rsSlotOn]} onPress={() => setSelSlot(s)}>
                      <Text style={[styles.rsSlotTime, on && styles.rsOnText]}>{fmt12(s.time)}</Text>
                      <Text style={[styles.rsSlotDur, on && styles.rsOnText]}>{s.duration} min</Text>
                      {s.limitStudent > 0 ? (
                        <View style={[styles.rsCap, on && styles.rsCapOn]}>
                          <Ionicons name="people" size={10} color={on ? "#FFFFFF" : "#615DFA"} />
                          <Text style={[styles.rsCapText, on && styles.rsOnText]}>Up to {s.limitStudent}</Text>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            )}
            <Text style={styles.sheetNote}>Only 24h+ ahead can be moved, so today and tomorrow aren&apos;t shown. A full slot won&apos;t be offered once online rescheduling is live.</Text>
          </ScrollView>
        )}

        <Pressable style={[styles.rsConfirm, !canConfirm && styles.rsConfirmOff]} onPress={confirm} disabled={!canConfirm}>
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
          <Text style={styles.rsConfirmText}>Confirm reschedule</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

// ── Day agenda list ──
function DayAgenda({
  day, items, onReschedule, onOpenEvent, big,
}: {
  day: Date;
  items: DayItem[];
  onReschedule: (enrollmentId: string, date: string, studentId: string, courseName: string | null) => void;
  onOpenEvent: (it: DayItem) => void;
  big?: boolean;
}) {
  const clash = useMemo(() => computeClashes(items), [items]);
  return (
    <View style={styles.agenda}>
      {!big ? (
        <Text style={styles.agendaDate}>{day.toLocaleDateString("en-MY", { weekday: "long", day: "numeric", month: "long" })}</Text>
      ) : null}
      <ScrollView style={styles.flex} contentContainerStyle={styles.agendaList} showsVerticalScrollIndicator={false}>
        {items.length === 0 ? (
          <Text style={styles.agendaEmpty}>Nothing scheduled on this day.</Text>
        ) : (
          items.map((it) => {
            const tag = sessionTag(it);
            const isClass = it.kind === "class";
            const clashed = clash.border.has(it.id);
            const barColor = clashed ? "#F59E0B" : it.color;
            const warn = clash.banner.get(it.id);
            // Title already carries the nickname (resolved in buildDayItems).
            const firstName = it.title.split(" ")[0];
            const withName = warn ? warn.withTitle.split(" ")[0] : "";
            return (
              <View key={it.id}>
                <Pressable style={({ pressed }) => [styles.agendaItem, clashed && styles.agendaItemClash, it.past && styles.agendaItemPast, pressed && styles.pressed]} onPress={() => onOpenEvent(it)}>
                  <Text style={[styles.agendaTime, it.past && styles.agendaTextMuted]}>{it.timeLabel}</Text>
                  <View style={[styles.agendaBar, { backgroundColor: barColor }]} />
                  <View style={styles.flex}>
                    <View style={styles.agendaTitleRow}>
                      {isClass ? <Text style={styles.robot}>🤖</Text> : it.icon ? <Text style={styles.robot}>{it.icon}</Text> : null}
                      <Text style={[styles.agendaTitle, it.past && styles.agendaTextMuted]} numberOfLines={1}>{isClass ? `Robotic class (${it.title})` : it.title}</Text>
                    </View>
                    <Text style={[styles.agendaSub, it.past && styles.agendaTextMuted]} numberOfLines={1}>{it.subtitle}</Text>
                  </View>
                  {it.past && isClass ? (
                    <View style={styles.attendedTag}><Text style={styles.attendedTagText}>{it.attended ? "Attended" : "Done"}</Text></View>
                  ) : tag ? (
                    <View style={[styles.sessTag, tag.ok ? styles.sessTagOk : styles.sessTagLow]}>
                      <Text style={[styles.sessTagText, { color: tag.ok ? "#065F46" : "#991B1B" }]}>{tag.text}</Text>
                    </View>
                  ) : null}
                  {it.reschedule ? (
                    <Pressable style={({ pressed }) => [styles.moveButton, pressed && styles.pressed]} onPress={() => onReschedule(it.reschedule!.enrollmentId, it.reschedule!.date, it.reschedule!.studentId, it.reschedule!.courseName)}>
                      <Ionicons name="repeat" size={15} color="#615DFA" />
                      <Text style={styles.moveText}>Reschedule</Text>
                    </Pressable>
                  ) : null}
                </Pressable>
                {warn ? (
                  <View style={styles.clashWarn}>
                    <Ionicons name="warning" size={15} color="#B45309" />
                    <View style={styles.flex}>
                      <Text style={styles.clashWarnText}>
                        {firstName} & {withName} are at different places and overlap by {warn.overlap} min — you might not make both pick-up / drop-off.
                      </Text>
                    </View>
                    {it.reschedule ? (
                      <Pressable style={({ pressed }) => [styles.clashFix, pressed && styles.pressed]} onPress={() => onReschedule(it.reschedule!.enrollmentId, it.reschedule!.date, it.reschedule!.studentId, it.reschedule!.courseName)}>
                        <Text style={styles.clashFixText}>Reschedule {firstName}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

// Day pager: native horizontal paging (finger-follows), prev/cur/next day.
function DayPager({
  selectedDay, width, buildDayItems, onReschedule, onOpenEvent, onShift,
}: {
  selectedDay: Date;
  width: number;
  buildDayItems: (k: string) => DayItem[];
  onReschedule: (enrollmentId: string, date: string, studentId: string, courseName: string | null) => void;
  onOpenEvent: (it: DayItem) => void;
  onShift: (dir: -1 | 1) => void;
}) {
  const ref = useRef<ScrollView>(null);
  const pageKey = ymd(selectedDay);
  useLayoutEffect(() => {
    ref.current?.scrollTo({ x: width, animated: false });
  }, [pageKey, width]);
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
        const p = Math.round(e.nativeEvent.contentOffset.x / width);
        if (p === 0) onShift(-1);
        else if (p === 2) onShift(1);
      }}
      style={styles.flex}
    >
      {[-1, 0, 1].map((o) => {
        const day = addDays(selectedDay, o);
        return (
          <View key={o} style={{ width, alignSelf: "stretch" }}>
            <DayCard day={day} onPrev={() => onShift(-1)} onNext={() => onShift(1)} />
            <DayAgenda day={day} items={buildDayItems(ymd(day))} onReschedule={onReschedule} onOpenEvent={onOpenEvent} big />
          </View>
        );
      })}
    </ScrollView>
  );
}

// Day-view header card: shows the day, tap arrows to move day to day.
function DayCard({ day, onPrev, onNext }: { day: Date; onPrev: () => void; onNext: () => void }) {
  return (
    <View style={styles.dayCard}>
      <Pressable onPress={onPrev} hitSlop={10} style={({ pressed }) => [styles.dayCardNav, pressed && styles.pressed]}>
        <Ionicons name="chevron-back" size={20} color="#615DFA" />
      </Pressable>
      <View style={styles.dayCardCenter}>
        <Text style={styles.dayCardWd}>{day.toLocaleDateString("en-MY", { weekday: "long" })}</Text>
        <Text style={styles.dayCardDate}>{day.toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" })}</Text>
      </View>
      <Pressable onPress={onNext} hitSlop={10} style={({ pressed }) => [styles.dayCardNav, pressed && styles.pressed]}>
        <Ionicons name="chevron-forward" size={20} color="#615DFA" />
      </Pressable>
    </View>
  );
}

// ── Week pager: native horizontal paging (finger-follows), 3 weeks, recenters ──
function WeekPager({
  selectedDay, width, todayKey, buildDayItems, onAddSlot, onOpenEvent, onShift, onMoveEvent,
}: {
  selectedDay: Date;
  width: number;
  todayKey: string;
  buildDayItems: (k: string) => DayItem[];
  onAddSlot: (dateKey: string, hour: number) => void;
  onOpenEvent: (it: DayItem) => void;
  onShift: (dir: -1 | 1) => void;
  onMoveEvent: (item: DayItem, newDateKey: string, newStartMin: number) => void;
}) {
  const ref = useRef<ScrollView>(null);
  const pageKey = ymd(startOfWeek(selectedDay));
  useLayoutEffect(() => {
    ref.current?.scrollTo({ x: width, animated: false });
  }, [pageKey, width]);
  const weekFor = (o: number) => addDays(selectedDay, o * 7);
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
        const p = Math.round(e.nativeEvent.contentOffset.x / width);
        if (p === 0) onShift(-1);
        else if (p === 2) onShift(1);
      }}
      style={styles.flex}
    >
      {[-1, 0, 1].map((o) => (
        <View key={o} style={{ width, alignSelf: "stretch" }}>
          <WeekTimeGrid selectedDay={weekFor(o)} width={width} todayKey={todayKey} buildDayItems={buildDayItems} onAddSlot={onAddSlot} onOpenEvent={onOpenEvent} onMoveEvent={onMoveEvent} />
        </View>
      ))}
    </ScrollView>
  );
}

// Lay timed events into side-by-side lanes so overlapping ones don't stack.
// Returns each item with its lane index, the column count of its overlap cluster,
// and a cluster id (so a crowded cluster can be collapsed into one swipeable block).
function layoutLanes(items: DayItem[]): { it: DayItem; lane: number; cols: number; cluster: number }[] {
  const endOf = (it: DayItem) => (it.endMin != null && it.endMin > (it.time as number) ? it.endMin : (it.time as number) + 60);
  const sorted = [...items].sort((a, b) => (a.time as number) - (b.time as number) || endOf(a) - endOf(b));
  const out: { it: DayItem; lane: number; cols: number; cluster: number }[] = [];
  let cluster: { it: DayItem; lane: number }[] = [];
  let clusterEnd = -1;
  let laneEnds: number[] = [];
  let clusterId = 0;
  const flush = () => {
    if (!cluster.length) return;
    const cols = cluster.reduce((m, x) => Math.max(m, x.lane + 1), 1);
    for (const x of cluster) out.push({ it: x.it, lane: x.lane, cols, cluster: clusterId });
    clusterId += 1;
    cluster = [];
    laneEnds = [];
    clusterEnd = -1;
  };
  for (const it of sorted) {
    const s = it.time as number;
    const e = endOf(it);
    if (cluster.length && s >= clusterEnd) flush();
    let lane = laneEnds.findIndex((le) => le <= s);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = e;
    cluster.push({ it, lane });
    clusterEnd = Math.max(clusterEnd, e);
  }
  flush();
  return out;
}

// A crowded time slot (this many overlapping events or more) collapses into one
// full-width block you tap to swipe through, instead of unusably-thin lanes.
const COLLAPSE_AT = 4;

// ── Week time-grid (tap a slot → +, tap + → add; tap an event → detail) ──
function WeekTimeGrid({
  selectedDay, width, todayKey, buildDayItems, onAddSlot, onOpenEvent, onMoveEvent,
}: {
  selectedDay: Date;
  width: number;
  todayKey: string;
  buildDayItems: (k: string) => DayItem[];
  onAddSlot: (dateKey: string, hour: number) => void;
  onOpenEvent: (it: DayItem) => void;
  onMoveEvent: (item: DayItem, newDateKey: string, newStartMin: number) => void;
}) {
  const HOUR_H = 56;
  const GUTTER = 44;
  const colW = (width - GUTTER) / 7;
  const weekStart = startOfWeek(selectedDay);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const dayKeys = days.map(ymd);
  const itemsByDay = dayKeys.map((k) => buildDayItems(k));
  const [addCell, setAddCell] = useState<{ dk: string; h: number } | null>(null);
  // Press-hold-drag an event → ghost shows the target day+time; drop to move it.
  const [ghost, setGhost] = useState<{ col: number; min: number; dur: number; color: string; id: string } | null>(null);
  const ghostRef = useRef<{ col: number; min: number; dur: number; color: string; id: string } | null>(null);
  const dragItemRef = useRef<DayItem | null>(null);
  // Live layout context for the drag handlers (in a ref so the single grid
  // gesture stays stable while the ghost re-renders during a drag).
  const dctx = useRef({ colW, HOUR_H, minH: 7, maxH: 21, dayKeys, itemsByDay, onMoveEvent });
  const GUTTER_W = GUTTER;
  // Content-relative x,y (RNGH x/y on the grid content view are scroll-independent).
  const weekDragStart = useCallback((x: number, y: number) => {
    const c = dctx.current;
    const col = Math.floor((x - GUTTER_W) / c.colW);
    if (col < 0 || col > 6) return;
    const items = c.itemsByDay[col].filter((it) => it.time != null);
    const found = layoutLanes(items).find(({ it, lane, cols }) => {
      if (it.kind !== "local" || !it.localId) return false;
      const start = it.time as number;
      const top = (start / 60 - c.minH) * c.HOUR_H;
      const end = it.endMin != null && it.endMin > start ? it.endMin : start + 60;
      const h = Math.max(20, ((end - start) / 60) * c.HOUR_H - 2);
      const gap = 2;
      const w = (c.colW - gap * (cols + 1)) / cols;
      const bl = GUTTER_W + col * c.colW + gap + lane * (w + gap);
      return x >= bl && x <= bl + w && y >= top && y <= top + h;
    });
    if (!found) return;
    const it = found.it;
    const start = it.time as number;
    const dur = (it.endMin != null && it.endMin > start ? it.endMin : start + 60) - start;
    dragItemRef.current = it;
    const g = { col, min: start, dur, color: it.color, id: it.id };
    ghostRef.current = g;
    setGhost(g);
  }, [GUTTER_W]);
  const weekDragMove = useCallback((x: number, y: number) => {
    const it = dragItemRef.current;
    if (!it) return;
    const c = dctx.current;
    const start = it.time as number;
    const dur = (it.endMin != null && it.endMin > start ? it.endMin : start + 60) - start;
    const col = Math.max(0, Math.min(6, Math.floor((x - GUTTER_W) / c.colW)));
    let min = Math.round((c.minH * 60 + (y / c.HOUR_H) * 60) / 15) * 15;
    min = Math.max(c.minH * 60, Math.min(c.maxH * 60 - dur, min));
    const g = { col, min, dur, color: it.color, id: it.id };
    ghostRef.current = g;
    setGhost(g);
  }, [GUTTER_W]);
  const weekDragEnd = useCallback(() => {
    const it = dragItemRef.current;
    const g = ghostRef.current;
    dragItemRef.current = null;
    ghostRef.current = null;
    setGhost(null);
    if (it && g) dctx.current.onMoveEvent(it, dctx.current.dayKeys[g.col], g.min);
  }, []);
  const gridGesture = useMemo(
    () => Gesture.Pan().runOnJS(true).activateAfterLongPress(220)
      .onStart((e) => weekDragStart(e.x, e.y))
      .onUpdate((e) => weekDragMove(e.x, e.y))
      .onEnd(() => weekDragEnd()),
    [weekDragStart, weekDragMove, weekDragEnd],
  );

  // Hour window: 7am–9pm by default, widened to include any earlier/later item.
  let minH = 7;
  let maxH = 21;
  for (const items of itemsByDay) {
    for (const it of items) {
      if (it.time == null) continue;
      const sh = Math.floor(it.time / 60);
      if (sh < minH) minH = sh;
      const em = it.endMin != null && it.endMin > it.time ? it.endMin : it.time + 60;
      const eh = Math.ceil(em / 60);
      if (eh > maxH) maxH = eh;
    }
  }
  minH = Math.max(0, minH);
  maxH = Math.min(24, Math.max(maxH, minH + 1));
  dctx.current = { colW, HOUR_H, minH, maxH, dayKeys, itemsByDay, onMoveEvent };
  const hours: number[] = [];
  for (let h = minH; h < maxH; h++) hours.push(h);
  const gridH = hours.length * HOUR_H;
  const fmtHour = (h: number) => {
    const p = h < 12 ? "AM" : "PM";
    return `${h % 12 === 0 ? 12 : h % 12}${p}`;
  };

  const allDay = itemsByDay.map((items) => items.filter((it) => it.time == null));
  const hasAllDay = allDay.some((a) => a.length > 0);

  return (
    <View style={[styles.flex, styles.wgRoot]}>
      <View style={[styles.wgHeader, { paddingLeft: GUTTER }]}>
        {days.map((d) => {
          const k = ymd(d);
          const isToday = k === todayKey;
          return (
            <View key={k} style={{ width: colW, alignItems: "center" }}>
              <Text style={styles.wgHeaderWd}>{WEEKDAY_LABELS[d.getDay()]}</Text>
              <View style={[styles.wgHeaderNumWrap, isToday && styles.wgHeaderTodayWrap]}>
                <Text style={[styles.wgHeaderNum, isToday && styles.wgHeaderNumToday]}>{d.getDate()}</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* All-day / holiday row — only shown when a day this week has an all-day
          item (holiday/birthday). No all-day items → not rendered at all. */}
      {hasAllDay ? (
        <View style={styles.wgAllDay}>
          <View style={{ width: GUTTER, justifyContent: "center" }}>
            <Text style={styles.wgAllDayLabel}>all-day</Text>
          </View>
          {allDay.map((items, di) => (
            <View key={dayKeys[di]} style={{ width: colW, gap: 2, paddingHorizontal: 1 }}>
              {items.map((it) => (
                <Pressable key={it.id} style={[styles.wgAllDayChip, { backgroundColor: it.color + "22", borderLeftColor: it.color }]} onPress={() => onOpenEvent(it)}>
                  <Text style={[styles.wgAllDayText, { color: it.color }]} numberOfLines={1}>{it.title}</Text>
                </Pressable>
              ))}
            </View>
          ))}
        </View>
      ) : null}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <GestureDetector gesture={gridGesture}>
        <View style={{ flexDirection: "row", height: gridH }}>
          <View style={{ width: GUTTER }}>
            {hours.map((h) => (
              <View key={h} style={{ height: HOUR_H }}>
                <Text style={styles.wgHourLabel}>{fmtHour(h)}</Text>
              </View>
            ))}
          </View>
          {days.map((d, di) => {
            const dk = dayKeys[di];
            const timed = itemsByDay[di].filter((it) => it.time != null);
            return (
              <View key={dk} style={{ width: colW, borderLeftWidth: 1, borderLeftColor: "#F1F1F6" }}>
                {hours.map((h) => {
                  const active = addCell?.dk === dk && addCell?.h === h;
                  return (
                    <Pressable key={h} style={[styles.wgCell, { height: HOUR_H }]} onPress={() => setAddCell(active ? null : { dk, h })}>
                      {active ? (
                        <Pressable style={styles.wgPlus} onPress={() => { onAddSlot(dk, h); setAddCell(null); }} hitSlop={6}>
                          <Ionicons name="add" size={18} color="#FFFFFF" />
                        </Pressable>
                      ) : null}
                    </Pressable>
                  );
                })}
                {layoutLanes(timed).map(({ it, lane, cols }) => {
                  const start = it.time as number;
                  const top = (start / 60 - minH) * HOUR_H;
                  const end = it.endMin != null && it.endMin > start ? it.endMin : start + 60;
                  const height = Math.max(20, ((end - start) / 60) * HOUR_H - 2);
                  // Overlapping events split the column into even vertical strips.
                  const gap = 2;
                  const w = (colW - gap * (cols + 1)) / cols;
                  const left = gap + lane * (w + gap);
                  return (
                    <Pressable
                      key={it.id}
                      style={[styles.wgEvent, { top, height, left, width: w, backgroundColor: it.color + "22", borderLeftColor: it.color }, ghost?.id === it.id && { opacity: 0.25 }]}
                      onPress={() => onOpenEvent(it)}
                    >
                      <Text style={[styles.wgEventTitle, { color: it.color }]} numberOfLines={cols > 2 ? 1 : 2}>{it.kind === "class" ? "🤖 " : it.icon ? `${it.icon} ` : ""}{it.title}</Text>
                      {height > 30 && cols < 3 ? <Text style={styles.wgEventTime} numberOfLines={1}>{it.timeLabel}</Text> : null}
                    </Pressable>
                  );
                })}
                {/* ghost: where the dragged event will land (this day column) */}
                {ghost && ghost.col === di ? (
                  <View pointerEvents="none" style={[styles.wgGhost, {
                    top: (ghost.min / 60 - minH) * HOUR_H,
                    height: Math.max(20, (ghost.dur / 60) * HOUR_H - 2),
                    borderColor: ghost.color,
                    backgroundColor: ghost.color + "22",
                  }]}>
                    <Text style={[styles.wgEventTime, { color: ghost.color }]}>{`${String(Math.floor(ghost.min / 60) % 12 || 12)}:${String(ghost.min % 60).padStart(2, "0")} ${ghost.min < 720 ? "AM" : "PM"}`}</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
        </GestureDetector>
      </ScrollView>
    </View>
  );
}

// ── Full-screen event detail card (Edit / Delete for parent-created events) ──
function DetailCard({ item, onClose, onEdit, onDelete, onReschedule }: {
  item: DayItem;
  onClose: () => void;
  onEdit: (localId: string) => void;
  onDelete: (localId: string) => void;
  onReschedule: (r: NonNullable<DayItem["reschedule"]>) => void;
}) {
  const localId = item.localId;
  const editable = item.kind === "local" && !!localId;
  const isClass = item.kind === "class";
  const canEditSlot = isClass && !!item.reschedule;
  const tag = sessionTag(item);
  const dateLabel = item.dateKey
    ? new Date(item.dateKey + "T00:00:00").toLocaleDateString("en-MY", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "";
  return (
    <View style={styles.detailRoot}>
      <View style={[styles.detailHeader, { backgroundColor: item.color }]}>
        <Pressable onPress={onClose} hitSlop={10} style={styles.detailCloseBtn}><Ionicons name="close" size={22} color="#FFFFFF" /></Pressable>
        <Text style={styles.detailKind}>{item.subtitle}</Text>
        <Text style={styles.detailTitle}>{isClass ? "🤖 " : item.icon ? `${item.icon} ` : ""}{item.title}</Text>
      </View>
      <View style={styles.detailBody}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={18} color="#615DFA" />
          <Text style={styles.detailRowLabel}>Date</Text>
          <Text style={styles.detailRowValue}>{dateLabel}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={18} color="#615DFA" />
          <Text style={styles.detailRowLabel}>Time</Text>
          <Text style={styles.detailRowValue}>{item.time == null ? "All day" : item.timeLabel ?? ""}</Text>
        </View>
        {tag ? (
          <View style={styles.detailRow}>
            <Ionicons name="ticket-outline" size={18} color="#615DFA" />
            <Text style={styles.detailRowLabel}>Sessions</Text>
            <View style={[styles.sessTag, tag.ok ? styles.sessTagOk : styles.sessTagLow]}>
              <Text style={[styles.sessTagText, { color: tag.ok ? "#065F46" : "#991B1B" }]}>{tag.text}</Text>
            </View>
          </View>
        ) : null}
        {isClass && !canEditSlot ? (
          <View style={styles.detailNote}>
            <Ionicons name="lock-closed-outline" size={14} color="#9CA3AF" />
            <Text style={styles.detailNoteText}>Class slots can only be changed at least a day ahead and within a month — this one is outside that window.</Text>
          </View>
        ) : null}
        {!editable && !isClass ? (
          <View style={styles.detailNote}>
            <Ionicons name="lock-closed-outline" size={14} color="#9CA3AF" />
            <Text style={styles.detailNoteText}>Added by your school — view only.</Text>
          </View>
        ) : null}
        <View style={styles.detailSwipe}>
          <Ionicons name="chevron-back" size={14} color="#9CA3AF" />
          <Text style={styles.detailSwipeText}>swipe for other events</Text>
          <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
        </View>
      </View>
      {editable ? (
        <View style={styles.detailActions}>
          <Pressable style={[styles.detailBtn, styles.detailEdit]} onPress={() => localId && onEdit(localId)}>
            <Ionicons name="create-outline" size={18} color="#615DFA" />
            <Text style={styles.detailEditText}>Edit</Text>
          </Pressable>
          <Pressable style={[styles.detailBtn, styles.detailDelete]} onPress={() => localId && onDelete(localId)}>
            <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
            <Text style={styles.detailDeleteText}>Delete</Text>
          </Pressable>
        </View>
      ) : canEditSlot ? (
        <View style={styles.detailActions}>
          <Pressable style={[styles.detailBtn, styles.detailEdit, styles.flex]} onPress={() => item.reschedule && onReschedule(item.reschedule)}>
            <Ionicons name="swap-horizontal" size={18} color="#615DFA" />
            <Text style={styles.detailEditText}>Change slot</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.detailActions}>
          <Pressable style={[styles.detailBtn, styles.detailEdit, styles.flex]} onPress={onClose}>
            <Text style={styles.detailEditText}>Close</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// Swipeable detail: a native paging ScrollView over the sorted list (finger-
// follows), stepping to the prev/next event on commit.
function DetailPager({ list, index, width, onIndex, onClose, onEdit, onDelete, onReschedule }: {
  list: DayItem[];
  index: number;
  width: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  onEdit: (localId: string) => void;
  onDelete: (localId: string) => void;
  onReschedule: (r: NonNullable<DayItem["reschedule"]>) => void;
}) {
  const ref = useRef<ScrollView>(null);
  useLayoutEffect(() => {
    ref.current?.scrollTo({ x: width, animated: false });
  }, [index, width]);
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        disableIntervalMomentum
        directionalLockEnabled
        contentOffset={{ x: width, y: 0 }}
        onMomentumScrollEnd={(e) => {
          const p = Math.round(e.nativeEvent.contentOffset.x / width);
          if (p === 1) return;
          const ni = p === 0 ? index - 1 : index + 1;
          if (ni < 0 || ni >= list.length) { ref.current?.scrollTo({ x: width, animated: true }); return; }
          onIndex(ni);
        }}
        style={styles.flex}
      >
        {[index - 1, index, index + 1].map((pi, o) => (
          <View key={o} style={{ width, alignSelf: "stretch" }}>
            {list[pi] ? <DetailCard item={list[pi]} onClose={onClose} onEdit={onEdit} onDelete={onDelete} onReschedule={onReschedule} /> : <View style={styles.flex} />}
          </View>
        ))}
      </ScrollView>
    </Modal>
  );
}

// ── Cascade menu: a day's events fan out at the finger; grab one and drag it ──
type ItemDragProps = { onStart: (it: DayItem, absX: number, absY: number) => void; onMove: (absX: number, absY: number) => void; onEnd: () => void };

function CascadeItem({ item, index, onTapPick, dragProps }: { item: DayItem; index: number; onTapPick: (it: DayItem) => void; dragProps: ItemDragProps }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 200, delay: index * 55, useNativeDriver: true }).start();
  }, [anim, index]);
  const gesture = useMemo(
    () => Gesture.Pan().runOnJS(true).activateAfterLongPress(140)
      .onStart((e) => dragProps.onStart(item, e.absoluteX, e.absoluteY))
      .onUpdate((e) => dragProps.onMove(e.absoluteX, e.absoluteY))
      .onEnd(() => dragProps.onEnd()),
    [item, dragProps],
  );
  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) }] }}>
      <GestureDetector gesture={gesture}>
        <Pressable style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]} onPress={() => onTapPick(item)}>
          <View style={[styles.menuBar, { backgroundColor: item.color }]} />
          <View style={styles.flex}>
            <Text style={styles.menuItemTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.menuItemSub} numberOfLines={1}>{item.timeLabel ?? "All day"}{item.subtitle ? ` · ${item.subtitle}` : ""}</Text>
          </View>
          <Ionicons name="reorder-three" size={18} color="#9CA3AF" />
        </Pressable>
      </GestureDetector>
    </Animated.View>
  );
}

function CascadeMenu({
  state, hidden, winW, winH, insetTop, onClose, onTapPick, dragProps,
}: {
  state: { items: DayItem[]; x: number; y: number };
  hidden: boolean;
  winW: number;
  winH: number;
  insetTop: number;
  onClose: () => void;
  onTapPick: (it: DayItem) => void;
  dragProps: ItemDragProps;
}) {
  const CARD_W = 200;
  const estH = 44 + state.items.length * 52;
  const left = Math.max(10, Math.min(state.x - CARD_W / 2, winW - CARD_W - 10));
  const top = Math.max(70, Math.min(state.y - insetTop - 30, winH - insetTop - estH - 30));
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {!hidden ? <Pressable style={styles.menuBackdrop} onPress={onClose} /> : null}
      <View style={[styles.menuCard, { left, top, width: CARD_W, opacity: hidden ? 0 : 1 }]}>
        <Text style={styles.menuCardTitle}>Grab one to move</Text>
        {state.items.map((it, i) => (
          <CascadeItem key={it.id} item={it} index={i} onTapPick={onTapPick} dragProps={dragProps} />
        ))}
      </View>
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
  miniFilterRow: { gap: 6, alignItems: "center", paddingRight: 4 },
  miniChip: { flexDirection: "row", alignItems: "center", gap: 4, height: 28, paddingHorizontal: 8, borderRadius: 14, backgroundColor: "#EEF0F6", borderWidth: 1.5, borderColor: "transparent" },
  miniChipActive: { backgroundColor: "#615DFA" },
  miniChipDot: { width: 8, height: 8, borderRadius: 4 },
  miniChipText: { fontSize: 12, fontWeight: "700", color: "#4B5563", maxWidth: 74 },
  miniChipTextActive: { color: "#FFFFFF" },
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
  gridFill: { paddingHorizontal: 6, flex: 1 },
  gridRow: { flexDirection: "row" },
  // rows grow (never shrink) from a ROW_H basis to fill the dragged height, so
  // cells get taller while their contents keep natural size (no stretch)
  gridRowFill: { flexDirection: "row", flexBasis: ROW_H, flexGrow: 1, flexShrink: 0 },
  cell: { flex: 1, margin: 1.5, borderRadius: 10, backgroundColor: "#FFFFFF", paddingTop: 4, paddingHorizontal: 3 },
  cellSelected: { borderWidth: 1.5, borderColor: "#615DFA" },
  cellTarget: { backgroundColor: "#DCFCE7", borderWidth: 1, borderColor: "#86EFAC" },
  cellHover: { backgroundColor: "#86EFAC", borderWidth: 1.5, borderColor: "#16A34A" },
  cellDateWrap: { alignSelf: "flex-start", minWidth: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  cellTodayWrap: { backgroundColor: "#615DFA" },
  cellDate: { fontSize: 12, fontWeight: "700", color: "#374151" },
  cellDateToday: { color: "#FFFFFF" },
  cellDateSel: { color: "#615DFA" },
  cellDim: { color: "#D1D5DB" },
  pills: { marginTop: 2, gap: 2, flex: 1, overflow: "hidden" },
  pill: { borderLeftWidth: 2, borderRadius: 3, paddingHorizontal: 3, paddingVertical: 1 },
  pillPicked: { borderWidth: 1.5, borderColor: "#615DFA", opacity: 0.6 },
  pillText: { fontSize: 9, fontWeight: "700" },
  moveBanner: { position: "absolute", left: 12, right: 12, bottom: 24, zIndex: 50, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#EEF2FF", borderWidth: 1, borderColor: "#C7D2FE", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, shadowColor: "#0F172A", shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  moveBannerText: { flex: 1, fontSize: 12, fontWeight: "700", color: "#4338CA", lineHeight: 16 },
  moveBannerCancel: { fontSize: 13, fontWeight: "800", color: "#615DFA" },
  floatPill: { position: "absolute", top: 0, left: 0, minWidth: 90, maxWidth: 150, borderLeftWidth: 3, borderRadius: 8, backgroundColor: "#FFFFFF", paddingHorizontal: 8, paddingVertical: 6, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 10, zIndex: 100 },
  floatPillText: { fontSize: 11, fontWeight: "800", color: "#0F172A" },
  menuBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,23,42,0.28)" },
  menuCard: { position: "absolute", backgroundColor: "#FFFFFF", borderRadius: 16, padding: 8, shadowColor: "#0F172A", shadowOpacity: 0.22, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 14 },
  menuCardTitle: { fontSize: 10, fontWeight: "800", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.6, paddingHorizontal: 6, paddingTop: 2, paddingBottom: 6 },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, paddingHorizontal: 6, borderRadius: 10 },
  menuBar: { width: 4, height: 30, borderRadius: 2 },
  menuItemTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  menuItemSub: { fontSize: 11, color: "#6B7280", marginTop: 1 },
  pillMore: { fontSize: 11, fontWeight: "800", color: "#9CA3AF", marginTop: -2, paddingLeft: 2 },
  handleWrap: { alignItems: "center", paddingVertical: 14 },
  handleBar: { width: 56, height: 6, borderRadius: 3, backgroundColor: "#D1D5DB" },
  agenda: { flex: 1 },
  agendaDate: { fontSize: 14, fontWeight: "800", color: "#0F172A", paddingHorizontal: 16, marginBottom: 8 },
  agendaList: { paddingHorizontal: 16, paddingBottom: 100, gap: 10 },
  agendaEmpty: { fontSize: 13, color: "#9CA3AF", textAlign: "center", paddingVertical: 24 },
  dayCard: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginTop: 4, marginBottom: 8, backgroundColor: "#FFFFFF", borderRadius: 16, paddingVertical: 12, paddingHorizontal: 8, shadowColor: "#0F172A", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  dayCardNav: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" },
  dayCardCenter: { flex: 1, alignItems: "center" },
  dayCardWd: { fontSize: 12, fontWeight: "800", color: "#615DFA", textTransform: "uppercase", letterSpacing: 0.8 },
  dayCardDate: { fontSize: 18, fontWeight: "800", color: "#0F172A", marginTop: 2 },
  demoChip: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#EEF2FF", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  demoChipText: { flex: 1, fontSize: 13, fontWeight: "700", color: "#615DFA" },
  // week time-grid
  wgRoot: { backgroundColor: "#FFFFFF" },
  wgAllDayLabel: { fontSize: 8, fontWeight: "800", color: "#9CA3AF", textTransform: "uppercase", textAlign: "right", paddingRight: 6 },
  wgHeader: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#EEF0F6" },
  wgHeaderWd: { fontSize: 10, fontWeight: "800", color: "#9CA3AF", textTransform: "uppercase" },
  wgHeaderNumWrap: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", marginTop: 2 },
  wgHeaderTodayWrap: { backgroundColor: "#615DFA" },
  wgHeaderNum: { fontSize: 13, fontWeight: "800", color: "#0F172A" },
  wgHeaderNumToday: { color: "#FFFFFF" },
  wgAllDay: { flexDirection: "row", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: "#EEF0F6", backgroundColor: "#FBFBFE" },
  wgAllDayChip: { borderLeftWidth: 3, borderRadius: 5, paddingHorizontal: 4, paddingVertical: 3 },
  wgAllDayText: { fontSize: 9, fontWeight: "800" },
  wgHourLabel: { fontSize: 9, fontWeight: "700", color: "#9CA3AF", textAlign: "right", paddingRight: 6, marginTop: -6 },
  wgCell: { borderBottomWidth: 1, borderBottomColor: "#F5F5F8", alignItems: "center", justifyContent: "center" },
  wgPlus: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#615DFA", alignItems: "center", justifyContent: "center", shadowColor: "#615DFA", shadowOpacity: 0.4, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  wgEvent: { position: "absolute", borderLeftWidth: 3, borderRadius: 6, paddingHorizontal: 3, paddingTop: 2, overflow: "hidden" },
  wgGhost: { position: "absolute", left: 2, right: 2, borderWidth: 2, borderStyle: "dashed", borderRadius: 6, paddingHorizontal: 3, paddingTop: 2, zIndex: 5 },
  wgEventTitle: { fontSize: 9, fontWeight: "800" },
  wgEventTime: { fontSize: 8, color: "#6B7280", marginTop: 1 },
  // Collapsed "many events" block: a segmented colour strip + a count badge.
  wgCluster: { position: "absolute", borderRadius: 6, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB", overflow: "hidden" },
  wgClusterStrip: { flexDirection: "row", height: 5, width: "100%" },
  wgClusterSeg: { flex: 1, height: 5 },
  wgClusterBody: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2, paddingHorizontal: 2 },
  wgClusterBadge: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: "#615DFA", alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  wgClusterBadgeText: { fontSize: 10, fontWeight: "800", color: "#FFFFFF" },
  wgClusterLabel: { fontSize: 7, fontWeight: "700", color: "#9CA3AF" },
  // event detail modal
  detailRoot: { flex: 1, backgroundColor: "#F6F6FB" },
  detailHeader: { paddingTop: 64, paddingBottom: 28, paddingHorizontal: 24 },
  detailCloseBtn: { position: "absolute", top: 56, right: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  detailKind: { fontSize: 12, fontWeight: "800", color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: 1 },
  detailTitle: { fontSize: 26, fontWeight: "800", color: "#FFFFFF", marginTop: 6, letterSpacing: -0.4 },
  detailBody: { padding: 20, gap: 4 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFFFFF", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 8 },
  detailRowLabel: { fontSize: 13, color: "#6B7280", fontWeight: "700", width: 44 },
  detailRowValue: { flex: 1, fontSize: 14, color: "#111827", fontWeight: "700", textAlign: "right" },
  detailNote: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4, paddingVertical: 8 },
  detailNoteText: { flex: 1, fontSize: 12, color: "#9CA3AF", fontWeight: "600", lineHeight: 17 },
  detailSwipe: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12 },
  detailSwipeText: { fontSize: 11, color: "#9CA3AF", fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  detailActions: { flexDirection: "row", gap: 12, padding: 20, marginTop: "auto" },
  detailBtn: { height: 52, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  detailEdit: { flex: 1, backgroundColor: "#EEF2FF" },
  detailEditText: { fontSize: 15, fontWeight: "800", color: "#615DFA" },
  detailDelete: { flex: 1, backgroundColor: "#EF4444" },
  detailDeleteText: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
  agendaItem: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFFFFF", borderRadius: 14, padding: 12, shadowColor: "#0F172A", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  agendaItemClash: { borderWidth: 1.5, borderColor: "#FCD34D" },
  agendaItemPast: { backgroundColor: "#F9FAFB", shadowOpacity: 0 },
  agendaTime: { width: 64, fontSize: 11, fontWeight: "700", color: "#6B7280" },
  agendaBar: { width: 4, alignSelf: "stretch", borderRadius: 2 },
  agendaTitleRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  robot: { fontSize: 14 },
  agendaTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  agendaSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  agendaTextMuted: { color: "#9CA3AF" },
  attendedTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, marginRight: 4, backgroundColor: "#E5E7EB" },
  attendedTagText: { fontSize: 11, fontWeight: "800", color: "#6B7280" },
  clashWarn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFFBEB", borderRadius: 12, borderWidth: 1, borderColor: "#FDE68A", paddingHorizontal: 12, paddingVertical: 10, marginTop: 6, marginLeft: 12 },
  clashWarnText: { fontSize: 12, fontWeight: "600", color: "#92400E", lineHeight: 16 },
  clashFix: { backgroundColor: "#F59E0B", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  clashFixText: { fontSize: 12, fontWeight: "800", color: "#FFFFFF" },
  moveButton: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: "#EEF2FF", borderRadius: 8 },
  moveText: { fontSize: 13, fontWeight: "700", color: "#615DFA" },
  // Reschedule bottom sheet
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,23,42,0.5)" },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 28 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#E5E7EB", alignSelf: "center", marginBottom: 10 },
  sheetHeaderRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 8 },
  sheetTitle: { fontSize: 17, fontWeight: "800", color: "#0F172A" },
  sheetSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  sheetClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  sheetBack: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" },
  sheetLoading: { paddingVertical: 40, alignItems: "center" },
  sheetErr: { fontSize: 13, color: "#991B1B", paddingVertical: 20, textAlign: "center" },
  sheetStep: { fontSize: 12, fontWeight: "800", color: "#615DFA", textTransform: "uppercase", letterSpacing: 0.6, marginTop: 14, marginBottom: 6 },
  sheetHelp: { fontSize: 13, color: "#6B7280", paddingVertical: 10 },
  sheetNote: { fontSize: 11, color: "#9CA3AF", lineHeight: 16, marginTop: 12 },
  rsDate: { width: 60, paddingVertical: 9, borderRadius: 12, backgroundColor: "#F3F4F6", alignItems: "center" },
  rsDateOn: { backgroundColor: "#615DFA" },
  rsDateWd: { fontSize: 11, fontWeight: "600", color: "#6B7280" },
  rsDateNum: { fontSize: 19, fontWeight: "800", color: "#111827", marginVertical: 1 },
  rsDateMo: { fontSize: 10, color: "#6B7280" },
  rsOnText: { color: "#FFFFFF" },
  rsSlots: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  rsSlot: { paddingHorizontal: 16, paddingVertical: 11, backgroundColor: "#F3F4F6", borderRadius: 12, borderWidth: 1.5, borderColor: "transparent", minWidth: 96, alignItems: "center" },
  rsSlotOn: { backgroundColor: "#615DFA", borderColor: "#615DFA" },
  rsSlotTime: { fontSize: 14, fontWeight: "700", color: "#111827" },
  rsSlotDur: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  rsCap: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 6, backgroundColor: "#EEF2FF", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  rsCapOn: { backgroundColor: "rgba(255,255,255,0.25)" },
  rsCapText: { fontSize: 10, fontWeight: "800", color: "#615DFA" },
  rsConfirm: { marginTop: 16, height: 52, borderRadius: 14, backgroundColor: "#615DFA", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  rsConfirmOff: { opacity: 0.45 },
  rsConfirmText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  // Quick-view sheet
  qBar: { height: 4, borderRadius: 2, marginBottom: 12 },
  qMetaRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  qMetaText: { fontSize: 14, color: "#374151", fontWeight: "600" },
  qActions: { flexDirection: "row", gap: 10, marginTop: 14 },
  qBtn: { flex: 1, height: 48, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  qBtnPrimary: { backgroundColor: "#615DFA" },
  qBtnPrimaryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  qBtnDanger: { backgroundColor: "#FEE2E2" },
  qBtnDangerText: { color: "#DC2626", fontSize: 14, fontWeight: "800" },
  qBtnGhost: { backgroundColor: "#EEF2FF" },
  qBtnGhostText: { color: "#615DFA", fontSize: 14, fontWeight: "800" },
  qNote: { fontSize: 13, color: "#9CA3AF", fontStyle: "italic" },
  // Swipeable half-sheet pager
  qpSheet: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 10, paddingBottom: 20 },
  qpCard: { paddingHorizontal: 16, paddingTop: 4, gap: 2 },
  qpHint: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingTop: 8 },
  qpHintText: { fontSize: 12, fontWeight: "700", color: "#9CA3AF" },
  sessTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, marginRight: 4 },
  sessTagOk: { backgroundColor: "#D1FAE5" },
  sessTagLow: { backgroundColor: "#FEE2E2" },
  sessTagText: { fontSize: 11, fontWeight: "800" },
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
