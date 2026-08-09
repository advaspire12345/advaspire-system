import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Modal, PanResponder, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useRole } from "@/contexts/role";
import { supabase } from "@/lib/supabase";
import { TeacherTopBar } from "@/components/TeacherTopBar";

// company_admin and above can add events/holidays from the calendar.
const ADMIN_ROLES = ["super_admin", "group_admin", "company_admin"];

const WEEKDAYS_FULL = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const DOW = ["S", "M", "T", "W", "T", "F", "S"];
const CLASS_COLOR = "#0D9488";
const EVENT_TYPE_META: Record<string, { label: string; color: string }> = {
  holiday: { label: "Holiday", color: "#EF4444" },
  activity: { label: "Activity", color: "#10B981" },
  competition: { label: "Competition", color: "#F59E0B" },
  bootcamp: { label: "Bootcamp", color: "#615DFA" },
  own_schedule: { label: "Event", color: "#EC4899" },
};
// Toggleable calendar layers (event_type value, or "classes" for the schedule).
const FILTERS: { key: string; label: string; color: string }[] = [
  { key: "all", label: "All", color: "#0F172A" },
  { key: "classes", label: "Classes", color: CLASS_COLOR },
  { key: "holiday", label: "Holiday", color: "#EF4444" },
  { key: "activity", label: "Activity", color: "#10B981" },
  { key: "competition", label: "Competition", color: "#F59E0B" },
  { key: "bootcamp", label: "Bootcamp", color: "#615DFA" },
  { key: "own_schedule", label: "Event", color: "#EC4899" },
];
const LAYER_KEYS = FILTERS.filter((f) => f.key !== "all").map((f) => f.key);
const ROW_H = 66;        // base calendar row height
const ROW_H_BIG = 160;   // expanded (pull-down) row height — big cells, more pills
type DayPill = { id: string; color: string; icon: string | null; title: string; kind: "class" | "event" };
function addDays(d: Date, n: number): Date { const x = new Date(d); x.setDate(d.getDate() + n); return x; }
function weekDays(anchor: Date): Date[] { const s = addDays(anchor, -anchor.getDay()); return Array.from({ length: 7 }, (_, i) => addDays(s, i)); }

type ClassSlot = { weekday: string; time: string | null; courseName: string; count: number };
type EventEntry = {
  id: string; title: string; description: string | null; eventType: string; date: string; endDate: string | null; startTime: string | null; endTime: string | null;
  color: string; icon: string | null; audience: string; isRecurring: boolean; isBounded: boolean; recurringDays: string[]; recurringStartDate: string | null; recurringEndDate: string | null; occurrences: string[];
};

function ymd(d: Date): string { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function addMonths(d: Date, n: number): Date { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function fmt12(t: string | null): string { if (!t) return ""; const [h, m] = t.split(":").map((n) => parseInt(n, 10)); return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; }
function toMin(t: string | null): number { if (!t) return 9999; const [h, m] = t.split(":").map((n) => parseInt(n, 10)); return h * 60 + m; }
function buildMonthGrid(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const fw = first.getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const weeks = Math.ceil((fw + days) / 7);
  const grid: (Date | null)[][] = [];
  let cur = 1 - fw;
  for (let r = 0; r < weeks; r++) { const row: (Date | null)[] = []; for (let c = 0; c < 7; c++) { row.push(cur >= 1 && cur <= days ? new Date(year, month, cur) : null); cur++; } grid.push(row); }
  return grid;
}
function eventOccursOn(e: EventEntry, key: string): boolean {
  if (e.occurrences.includes(key)) return true;
  if (e.isRecurring) {
    if (key === e.date) return true; // always show on the start/anchor date too
    const wd = WEEKDAYS_FULL[new Date(key + "T00:00:00").getDay()];
    if (!e.recurringDays.includes(wd)) return false;
    if (e.isBounded) { if (e.recurringStartDate && key < e.recurringStartDate) return false; if (e.recurringEndDate && key > e.recurringEndDate) return false; }
    return true;
  }
  if (e.endDate) return key >= e.date && key <= e.endDate;
  return key === e.date;
}
function parseSchedule(scheduleRaw: string | null, dayOfWeekRaw: string | null, startTime: string | null): { day: string; time: string | null }[] {
  const out: { day: string; time: string | null }[] = [];
  if (scheduleRaw) { try { const p = JSON.parse(scheduleRaw); if (Array.isArray(p)) for (const s of p) { const day = String(s.day || "").toLowerCase(); if (day) out.push({ day, time: s.time ?? startTime ?? null }); } } catch { /* ignore */ } }
  if (out.length === 0 && dayOfWeekRaw) {
    const raw = String(dayOfWeekRaw).trim();
    try { const p = JSON.parse(raw); if (Array.isArray(p)) p.forEach((d: string) => out.push({ day: String(d).toLowerCase(), time: startTime })); else if (typeof p === "string") out.push({ day: p.toLowerCase(), time: startTime }); }
    catch { raw.toLowerCase().split(/[,\s]+/).filter(Boolean).forEach((d) => out.push({ day: d, time: startTime })); }
  }
  return out;
}

// "Repeats" told the teacher nothing — name the days it actually runs.
const DOW_LABEL: Record<string, string> = { monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun" };
function recurLabel(e: { isRecurring?: boolean; recurringDays?: string[] }): string {
  if (!e.isRecurring) return "";
  const days = (e.recurringDays ?? []).map((d) => DOW_LABEL[d]).filter(Boolean);
  return days.length ? ` · Every ${days.join(", ")}` : " · Repeats";
}

export default function TeacherCalendar() {
  const { staff } = useRole();
  const router = useRouter();
  const isAdmin = ADMIN_ROLES.includes(staff?.role ?? "");
  // Full-detail sheet for a calendar entry — read for everyone, editable by admins.
  const [detail, setDetail] = useState<EventEntry | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDesc, setDraftDesc] = useState("");
  const [savingDetail, setSavingDetail] = useState(false);

  const saveDetail = async () => {
    if (!detail || !draftTitle.trim()) { Alert.alert("Name needed", "The event needs a title."); return; }
    setSavingDetail(true);
    const { error } = await supabase.from("events")
      .update({ title: draftTitle.trim(), description: draftDesc.trim() || null, updated_at: new Date().toISOString() })
      .eq("id", detail.id);
    setSavingDetail(false);
    if (error) { Alert.alert("Couldn't save", error.message); return; }
    setDetail({ ...detail, title: draftTitle.trim(), description: draftDesc.trim() || null });
    setEditing(false);
    load();
  };

  const deleteDetail = () => {
    if (!detail) return;
    Alert.alert("Delete event", `Remove "${detail.title}" from the calendar?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        const { error } = await supabase.from("events").update({ deleted_at: new Date().toISOString() }).eq("id", detail.id);
        if (error) { Alert.alert("Couldn't delete", error.message); return; }
        setDetail(null);
        load();
      } },
    ]);
  };
  const [month, setMonth] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [selected, setSelected] = useState(() => ymd(new Date()));
  const [slots, setSlots] = useState<ClassSlot[]>([]);
  const [events, setEvents] = useState<EventEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const loadedOnce = useRef(false);
  // Multi-select filter. From "All", tapping one layer shows ONLY it; tapping more
  // adds them; "All" resets to everything.
  const [visible, setVisible] = useState<Set<string>>(new Set(LAYER_KEYS));
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const allOn = visible.size === LAYER_KEYS.length;
  const shown = (key: string) => visible.has(key);
  const tapFilter = (key: string) => {
    if (key === "all") { setVisible(new Set(LAYER_KEYS)); return; }
    setVisible((v) => {
      if (v.size === LAYER_KEYS.length) return new Set([key]); // from All → only this
      const n = new Set(v); if (n.has(key)) n.delete(key); else n.add(key);
      return n.size === 0 ? new Set(LAYER_KEYS) : n; // never empty → reset to All
    });
  };

  const load = useCallback(async (silent = false) => {
    if (!staff?.branchId) { setLoading(false); return; }
    if (!silent) setLoading(true);
    const { data: studs } = await supabase.from("students").select("id").eq("branch_id", staff.branchId).is("deleted_at", null);
    const ids = (studs ?? []).map((s) => s.id as string);
    let classSlots: ClassSlot[] = [];
    if (ids.length) {
      const { data: enrs } = await supabase.from("enrollments").select("day_of_week, start_time, schedule, course:courses(name)").in("student_id", ids).eq("status", "active").is("deleted_at", null);
      const agg = new Map<string, ClassSlot>();
      for (const e of enrs ?? []) {
        const c = e.course as unknown as { name: string } | null;
        const name = c?.name ?? "Class";
        for (const s of parseSchedule(e.schedule as string | null, e.day_of_week as string | null, e.start_time as string | null)) {
          const key = `${s.day}|${s.time ?? ""}|${name}`;
          const cur = agg.get(key) ?? { weekday: s.day, time: s.time, courseName: name, count: 0 };
          cur.count += 1; agg.set(key, cur);
        }
      }
      classSlots = [...agg.values()];
    }
    setSlots(classSlots);

    const { data: evs } = await supabase
      .from("events")
      .select("id, title, description, event_type, date, end_date, start_time, end_time, color, icon, audience, is_recurring, is_bounded, recurring_days, recurring_start_date, recurring_end_date, branch_id, occurrences:event_occurrences(date)")
      .is("deleted_at", null).neq("status", "rejected")
      .is("created_by_parent_id", null) // parent reschedules live on the attendance grid
      .or(`branch_id.eq.${staff.branchId},branch_id.is.null`);
    setEvents((evs ?? []).map((e) => ({
      id: e.id as string, title: (e.title as string) ?? "", description: (e.description as string | null) ?? null, eventType: (e.event_type as string) ?? "own_schedule", date: e.date as string, endDate: (e.end_date as string | null) ?? null,
      startTime: (e.start_time as string | null) ?? null, endTime: (e.end_time as string | null) ?? null, color: (e.color as string) ?? "#615DFA",
      icon: (e.icon as string | null) ?? null, audience: (e.audience as string) ?? "everyone",
      isRecurring: !!e.is_recurring, isBounded: !!e.is_bounded, recurringDays: ((e.recurring_days as string[] | null) ?? []).map((d) => String(d).toLowerCase()),
      recurringStartDate: (e.recurring_start_date as string | null) ?? null, recurringEndDate: (e.recurring_end_date as string | null) ?? null,
      occurrences: (((e.occurrences as unknown as { date: string }[] | null) ?? []).map((o) => o.date)),
    })));
    setLoading(false);
  }, [staff?.branchId]);

  // First focus shows the spinner; later focuses reload quietly (no blank flash).
  useFocusEffect(useCallback(() => { load(loadedOnce.current); loadedOnce.current = true; }, [load]));
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(true); setRefreshing(false); }, [load]);

  // Only the current month is rendered (natural height → no phantom trailing row).
  const grid = useMemo(() => buildMonthGrid(month.getFullYear(), month.getMonth()), [month]);
  const todayKey = ymd(new Date());
  const slotsForWeekday = (wd: string) => slots.filter((s) => s.weekday === wd);

  // Calendar sizing — like the parent portal. weekH = one row (pull up), monthH =
  // the month at base height, bigH = the month with taller cells (pull down).
  const { width: winW, height: winH } = useWindowDimensions();
  const selectedDay = useMemo(() => new Date(selected + "T00:00:00"), [selected]);
  const currentRows = grid.length;
  const weekH = ROW_H;
  const monthH = currentRows * ROW_H;
  const maxCalH = Math.max(ROW_H * 4, winH - 300);
  const expandedRowH = Math.max(ROW_H, Math.min(ROW_H_BIG, Math.floor(maxCalH / Math.max(1, currentRows))));
  const bigH = currentRows * expandedRowH;
  const [monthZoom, setMonthZoom] = useState<"row" | "month" | "big">("month");
  const rowH = monthZoom === "big" ? expandedRowH : ROW_H;
  const calcHeight = monthZoom === "row" ? weekH : monthZoom === "big" ? bigH : monthH;
  const gridView: "week" | "month" = monthZoom === "row" ? "week" : "month";
  const dragH = useRef(new Animated.Value(monthH)).current;
  const dragBase = useRef(monthH);
  const [dragging, setDragging] = useState(false);
  const vDragPan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_e, g) => Math.abs(g.dy) > 10 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderGrant: () => { dragBase.current = Math.max(weekH, Math.min(bigH, calcHeight)); dragH.setValue(dragBase.current); setDragging(true); },
    onPanResponderMove: (_e, g) => { dragH.setValue(Math.max(weekH, Math.min(bigH, dragBase.current + g.dy))); },
    onPanResponderRelease: (_e, g) => {
      const finalH = Math.max(weekH, Math.min(bigH, dragBase.current + g.dy));
      const level: "row" | "month" | "big" = finalH < (weekH + monthH) / 2 ? "row" : finalH > (monthH + bigH) / 2 ? "big" : "month";
      const target = level === "row" ? weekH : level === "big" ? bigH : monthH;
      Animated.timing(dragH, { toValue: target, duration: 130, useNativeDriver: false }).start(() => { setMonthZoom(level); setDragging(false); });
    },
    onPanResponderTerminate: () => setDragging(false),
  }), [calcHeight, weekH, monthH, bigH, dragH]);

  const onShift = (dir: -1 | 1) => {
    if (gridView === "week") { const nd = addDays(selectedDay, dir * 7); setSelected(ymd(nd)); setMonth(new Date(nd.getFullYear(), nd.getMonth(), 1)); }
    else setMonth((m) => addMonths(m, dir));
  };

  const dayHasClass = (key: string) => shown("classes") && slots.some((s) => s.weekday === WEEKDAYS_FULL[new Date(key + "T00:00:00").getDay()]);
  const eventsForDay = (key: string) => events.filter((e) => shown(e.eventType) && eventOccursOn(e, key));
  const q = search.trim().toLowerCase();
  const searchResults = useMemo(() => (searchOpen && q ? events.filter((e) => shown(e.eventType) && e.title.toLowerCase().includes(q)).sort((a, b) => a.date.localeCompare(b.date)) : []), [events, searchOpen, q, visible]);

  // Selected day's items, time-ordered.
  const selWd = WEEKDAYS_FULL[new Date(selected + "T00:00:00").getDay()];
  const dayClasses = useMemo(() => (shown("classes") ? slotsForWeekday(selWd).sort((a, b) => toMin(a.time) - toMin(b.time)) : []), [slots, selWd, visible]);
  const dayEvents = useMemo(() => eventsForDay(selected).sort((a, b) => toMin(a.startTime) - toMin(b.startTime)), [events, selected]);
  const selDate = new Date(selected + "T00:00:00");

  // Tap a day = select it (drives the agenda + week view). Admins long-press = add.
  const openAdd = (key: string) => router.push(`/(teacher)/add-event?date=${key}` as Href);
  const onPickDay = (d: Date) => setSelected(ymd(d));
  const onLongPressDay = (d: Date) => { if (isAdmin) openAdd(ymd(d)); };
  const buildDayPills = useCallback((key: string): DayPill[] => {
    const out: DayPill[] = [];
    if (dayHasClass(key)) out.push({ id: `c-${key}`, color: CLASS_COLOR, icon: "🤖", title: "Class", kind: "class" });
    for (const e of eventsForDay(key)) out.push({ id: e.id, color: e.color || EVENT_TYPE_META[e.eventType]?.color || "#615DFA", icon: e.icon, title: e.title, kind: "event" });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots, events, visible]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <TeacherTopBar />
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Calendar</Text>
          <View style={styles.flex} />
          <Pressable hitSlop={8} onPress={() => { setSearchOpen((v) => !v); setSearch(""); }} style={styles.iconBtn}><Ionicons name={searchOpen ? "close" : "search"} size={18} color="#615DFA" /></Pressable>
          {isAdmin ? (
            <Pressable style={styles.holidayBtn} onPress={() => router.push(`/(teacher)/add-event?date=${selected}` as Href)}>
              <Ionicons name="add" size={16} color="#615DFA" /><Text style={styles.holidayBtnText}>Add event</Text>
            </Pressable>
          ) : null}
        </View>
        {searchOpen ? (
          <TextInput style={styles.searchBar} value={search} onChangeText={setSearch} placeholder="Search events by name…" placeholderTextColor="#9CA3AF" autoFocus autoCorrect={false} />
        ) : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((f) => { const on = f.key === "all" ? allOn : visible.has(f.key); return (
            <Pressable key={f.key} style={[styles.filterChip, on && { backgroundColor: f.color, borderColor: f.color }]} onPress={() => tapFilter(f.key)}>
              {!on && f.key !== "all" ? <View style={[styles.filterDot, { backgroundColor: f.color }]} /> : null}
              <Text style={[styles.filterText, on && styles.filterTextOn]}>{f.label}</Text>
            </Pressable>
          ); })}
        </ScrollView>
        {!searchOpen ? (
          <View style={styles.monthRow}>
            <Pressable hitSlop={8} onPress={() => setMonth((m) => addMonths(m, -1))} style={styles.navBtn}><Ionicons name="chevron-back" size={18} color="#0D9488" /></Pressable>
            <Text style={styles.monthText}>{month.toLocaleDateString("en-MY", { month: "long", year: "numeric" })}</Text>
            <Pressable hitSlop={8} onPress={() => setMonth((m) => addMonths(m, 1))} style={styles.navBtn}><Ionicons name="chevron-forward" size={18} color="#0D9488" /></Pressable>
            <View style={styles.flex} />
            <Pressable style={styles.todayBtn} onPress={() => { const n = new Date(); setMonth(new Date(n.getFullYear(), n.getMonth(), 1)); setSelected(ymd(n)); }}><Text style={styles.todayBtnText}>Today</Text></Pressable>
          </View>
        ) : null}
      </View>

      {searchOpen ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {!q ? <Text style={styles.empty}>Type to search events.</Text>
            : searchResults.length === 0 ? <Text style={styles.empty}>No event matches “{search.trim()}”.</Text>
            : searchResults.map((e) => {
              const meta = EVENT_TYPE_META[e.eventType] ?? { label: "Event", color: e.color };
              return (
                <Pressable key={e.id} style={styles.itemCard} onPress={() => { const d = new Date(e.date + "T00:00:00"); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); setSelected(e.date); setSearchOpen(false); setSearch(""); }}>
                  <View style={[styles.itemBar, { backgroundColor: e.color || meta.color }]} />
                  <View style={styles.flex}>
                    <Text style={styles.itemTitle} numberOfLines={1}>{e.icon ? `${e.icon} ` : ""}{e.title}</Text>
                    <Text style={styles.itemSub}>{meta.label} · {new Date(e.date + "T00:00:00").toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short" })}{recurLabel(e)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </Pressable>
              );
            })}
          <View style={{ height: 40 }} />
        </ScrollView>
      ) : loading ? <View style={styles.center}><ActivityIndicator color="#0D9488" /></View> : (
        <View style={styles.flex}>
          <View style={styles.dowRow}>{DOW.map((d, i) => <Text key={i} style={styles.dowText}>{d}</Text>)}</View>
          <View {...vDragPan.panHandlers}>
            {dragging ? (
              <Animated.View style={{ height: dragH, overflow: "hidden" }}>
                <MonthPager fill view="month" month={month} selectedDay={selectedDay} width={winW} height={monthH} rowH={ROW_H} todayKey={todayKey} selectedKey={selected} isAdmin={isAdmin} buildDayPills={buildDayPills} onPickDay={onPickDay} onLongPressDay={onLongPressDay} onShift={onShift} />
              </Animated.View>
            ) : (
              <View style={{ height: calcHeight, overflow: "hidden" }}>
                <MonthPager view={gridView} month={month} selectedDay={selectedDay} width={winW} height={calcHeight} rowH={rowH} todayKey={todayKey} selectedKey={selected} isAdmin={isAdmin} buildDayPills={buildDayPills} onPickDay={onPickDay} onLongPressDay={onLongPressDay} onShift={onShift} />
              </View>
            )}
          </View>
          <View style={styles.handleZone} {...vDragPan.panHandlers}>
            <View style={styles.handleBar} />
            <Text style={styles.handleHint}>{monthZoom === "row" ? "Pull down for month · swipe = week" : "Pull up = week · pull down = bigger"}</Text>
          </View>

          <ScrollView style={styles.flex} contentContainerStyle={styles.agenda} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0D9488" />}>
          <Text style={styles.dayHeader}>{selDate.toLocaleDateString("en-MY", { weekday: "long", day: "numeric", month: "long" })}</Text>

          {dayEvents.map((e) => {
            const meta = EVENT_TYPE_META[e.eventType] ?? { label: "Event", color: e.color };
            return (
              <Pressable key={e.id} style={styles.itemCard} onPress={() => { setDetail(e); setEditing(false); setDraftTitle(e.title); setDraftDesc(e.description ?? ""); }}>
                <View style={[styles.itemBar, { backgroundColor: e.color || meta.color }]} />
                <View style={styles.flex}>
                  <Text style={styles.itemTitle} numberOfLines={2}>{e.icon ? `${e.icon} ` : ""}{e.title}</Text>
                  <Text style={styles.itemSub}>{meta.label}{e.startTime ? ` · ${fmt12(e.startTime)}${e.endTime ? `–${fmt12(e.endTime)}` : ""}` : " · All day"}{e.audience === "staff_only" ? " · Staff only" : ""}{recurLabel(e)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </Pressable>
            );
          })}
          {dayClasses.map((c, i) => (
            <View key={`c${i}`} style={styles.itemCard}>
              <View style={[styles.itemBar, { backgroundColor: CLASS_COLOR }]} />
              <View style={styles.flex}>
                <Text style={styles.itemTitle} numberOfLines={1}>🤖 {c.courseName}</Text>
                <Text style={styles.itemSub}>{c.time ? fmt12(c.time) : "Class"} · {c.count} student{c.count === 1 ? "" : "s"}</Text>
              </View>
            </View>
          ))}
          {dayEvents.length === 0 && dayClasses.length === 0 ? <Text style={styles.empty}>Nothing scheduled on this day.</Text> : null}
          <View style={{ height: 30 }} />
          </ScrollView>
        </View>
      )}

      {/* Full event detail — read-only for instructors, editable for admins. */}
      <Modal visible={!!detail} transparent animationType="slide" onRequestClose={() => setDetail(null)}>
        <Pressable style={styles.dBackdrop} onPress={() => setDetail(null)} />
        <View style={styles.dSheet}>
          {detail ? (
            <ScrollView contentContainerStyle={styles.dScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.dGrab} />
              <View style={[styles.dSwatch, { backgroundColor: detail.color || "#615DFA" }]} />
              {editing ? (
                <>
                  <Text style={styles.dLabel}>TITLE</Text>
                  <TextInput style={styles.dInput} value={draftTitle} onChangeText={setDraftTitle} placeholder="Event name" placeholderTextColor="#9CA3AF" />
                  <Text style={styles.dLabel}>DESCRIPTION</Text>
                  <TextInput style={[styles.dInput, styles.dInputMulti]} value={draftDesc} onChangeText={setDraftDesc} multiline placeholder="What is this event about?" placeholderTextColor="#9CA3AF" />
                </>
              ) : (
                <>
                  <Text style={styles.dTitle}>{detail.icon ? `${detail.icon} ` : ""}{detail.title}</Text>
                  <Text style={styles.dMeta}>
                    {(EVENT_TYPE_META[detail.eventType] ?? { label: "Event" }).label}
                    {" · "}{new Date(detail.date + "T00:00:00").toLocaleDateString("en-MY", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    {detail.endDate && detail.endDate !== detail.date ? ` → ${new Date(detail.endDate + "T00:00:00").toLocaleDateString("en-MY", { day: "numeric", month: "short" })}` : ""}
                  </Text>
                  <Text style={styles.dMeta}>
                    {detail.startTime ? `${fmt12(detail.startTime)}${detail.endTime ? `–${fmt12(detail.endTime)}` : ""}` : "All day"}
                    {detail.audience === "staff_only" ? " · Staff only" : " · Everyone"}
                    {recurLabel(detail)}
                  </Text>
                  <Text style={styles.dBody}>{detail.description?.trim() || "No description was added for this event."}</Text>
                </>
              )}

              <View style={styles.dBtns}>
                {isAdmin ? (
                  editing ? (
                    <>
                      <Pressable style={[styles.dBtn, styles.dBtnGhost]} onPress={() => setEditing(false)}><Text style={styles.dBtnGhostText}>Cancel</Text></Pressable>
                      <Pressable style={[styles.dBtn, styles.dBtnPrimary]} onPress={saveDetail} disabled={savingDetail}>
                        {savingDetail ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.dBtnPrimaryText}>Save</Text>}
                      </Pressable>
                    </>
                  ) : (
                    <>
                      <Pressable style={[styles.dBtn, styles.dBtnDanger]} onPress={deleteDetail}><Text style={styles.dBtnDangerText}>Delete</Text></Pressable>
                      <Pressable style={[styles.dBtn, styles.dBtnPrimary]} onPress={() => { const id = detail.id; setDetail(null); router.push(`/(teacher)/add-event?eventId=${id}` as Href); }}><Text style={styles.dBtnPrimaryText}>Edit</Text></Pressable>
                    </>
                  )
                ) : (
                  <Pressable style={[styles.dBtn, styles.dBtnGhost]} onPress={() => setDetail(null)}><Text style={styles.dBtnGhostText}>Close</Text></Pressable>
                )}
              </View>
            </ScrollView>
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Finger-follow month/week pager (3 pages; recenter to the middle on commit). Renders
// a fixed-height grid so neighbour months add no phantom row (parent-portal model).
function MonthPager({ view, month, selectedDay, width, height, rowH, todayKey, selectedKey, isAdmin, fill, buildDayPills, onPickDay, onLongPressDay, onShift }: {
  view: "week" | "month"; month: Date; selectedDay: Date; width: number; height: number; rowH: number;
  todayKey: string; selectedKey: string; isAdmin: boolean; fill?: boolean;
  buildDayPills: (key: string) => DayPill[]; onPickDay: (d: Date) => void; onLongPressDay: (d: Date) => void; onShift: (dir: -1 | 1) => void;
}) {
  const ref = useRef<ScrollView>(null);
  const pageKey = view === "week" ? `w-${ymd(weekDays(selectedDay)[0])}` : `m-${month.getFullYear()}-${month.getMonth()}`;
  useLayoutEffect(() => { ref.current?.scrollTo({ x: width, animated: false }); }, [pageKey, width]);
  const periodFor = (o: number) => (view === "week" ? addDays(selectedDay, o * 7) : addMonths(month, o));
  const maxPills = fill || rowH > ROW_H ? 5 : 3;
  return (
    <ScrollView ref={ref} horizontal pagingEnabled showsHorizontalScrollIndicator={false} disableIntervalMomentum directionalLockEnabled contentOffset={{ x: width, y: 0 }}
      onMomentumScrollEnd={(e) => { const p = Math.round(e.nativeEvent.contentOffset.x / width); if (p === 0) onShift(-1); else if (p === 2) onShift(1); }} style={fill ? { width, flex: 1 } : { width, height }}>
      {[-1, 0, 1].map((o) => {
        const period = periodFor(o);
        const rows = view === "week" ? [weekDays(period)] : buildMonthGrid(period.getFullYear(), period.getMonth());
        return (
          <View key={o} style={fill ? { width, flex: 1 } : { width }}>
            {rows.map((row, ri) => (
              <View key={ri} style={fill ? styles.gRowFill : [styles.gRow, { height: rowH }]}>
                {row.map((d, ci) => {
                  if (!d) return <View key={ci} style={styles.gCell} />;
                  const key = ymd(d);
                  const isToday = key === todayKey; const isSel = key === selectedKey;
                  const dim = view === "month" && d.getMonth() !== period.getMonth();
                  const pills = buildDayPills(key);
                  return (
                    <Pressable key={ci} style={[styles.gCell, isSel && styles.gCellSel]} onPress={() => onPickDay(d)} onLongPress={isAdmin ? () => onLongPressDay(d) : undefined} delayLongPress={250}>
                      <View style={[styles.gDateWrap, isToday && styles.gDateToday]}>
                        <Text style={[styles.gDate, dim && styles.gDim, isToday && styles.gDateTodayText, isSel && !isToday && styles.gDateSelText]}>{d.getDate()}</Text>
                      </View>
                      <View style={styles.gPills}>
                        {pills.slice(0, maxPills).map((p) => (
                          <View key={p.id} style={[styles.gPill, { backgroundColor: p.color + "22", borderLeftColor: p.color }]}>
                            <Text style={[styles.gPillText, { color: p.color }]} numberOfLines={1}>{p.icon ? `${p.icon} ` : ""}{p.title}</Text>
                          </View>
                        ))}
                        {pills.length > maxPills ? <Text style={styles.gPillMore}>+{pills.length - maxPills}</Text> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  header: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8, gap: 8 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 24, fontWeight: "800", color: "#0F172A" },
  iconBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" },
  searchBar: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: "#111827", backgroundColor: "#F8FAFC" },
  filterRow: { gap: 8, paddingVertical: 2, paddingRight: 8 },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB" },
  filterDot: { width: 7, height: 7, borderRadius: 4 },
  filterText: { fontSize: 12, fontWeight: "800", color: "#6B7280" },
  filterTextOn: { color: "#FFFFFF" },
  holidayBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#EEF2FF", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  holidayBtnText: { fontSize: 13, fontWeight: "800", color: "#615DFA" },
  monthRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  navBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#E6FAF9", alignItems: "center", justifyContent: "center" },
  monthText: { fontSize: 16, fontWeight: "800", color: "#111827" },
  todayBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: "#E6FAF9" },
  todayBtnText: { fontSize: 12, fontWeight: "800", color: "#0D9488" },
  scroll: { paddingHorizontal: 10, paddingBottom: 20 },
  agenda: { paddingHorizontal: 10, paddingBottom: 20, paddingTop: 4 },
  dowRow: { flexDirection: "row", paddingVertical: 6 },
  dowText: { flex: 1, textAlign: "center", fontSize: 12, fontWeight: "800", color: "#9CA3AF" },
  weekRow: { flexDirection: "row" },
  cell: { flex: 1, paddingVertical: 3, paddingHorizontal: 2, minHeight: 78 },
  pillCol: { width: "100%", gap: 2, marginTop: 2, alignItems: "stretch" },
  cellPill: { borderRadius: 4, paddingHorizontal: 3, paddingVertical: 1 },
  cellPillText: { fontSize: 8, fontWeight: "700", color: "#FFFFFF" },
  cellMore: { fontSize: 8, fontWeight: "800", color: "#9CA3AF", marginLeft: 3 },
  dayNumWrap: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  daySel: { backgroundColor: "#0D9488" },
  dayToday: { backgroundColor: "#E6FAF9" },
  dayNum: { fontSize: 15, fontWeight: "700", color: "#111827" },
  dayNumSel: { color: "#FFFFFF", fontWeight: "800" },
  dayNumToday: { color: "#0D9488", fontWeight: "800" },
  dotRow: { flexDirection: "row", gap: 2, marginTop: 2, height: 6, alignItems: "center" },
  dot: { width: 5, height: 5, borderRadius: 3 },
  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 6, paddingVertical: 12, borderTopWidth: 1, borderTopColor: "#EEF0F6", marginTop: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendText: { fontSize: 11, fontWeight: "700", color: "#6B7280" },
  gRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#EEF2F6" },
  gRowFill: { flexDirection: "row", flexGrow: 1, flexShrink: 0, minHeight: ROW_H, borderTopWidth: 1, borderTopColor: "#EEF2F6" },
  gCell: { flex: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: "#EEF2F6", paddingTop: 3, paddingHorizontal: 2, overflow: "hidden" },
  gCellSel: { backgroundColor: "#EEF2FF" },
  gDateWrap: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  gDateToday: { backgroundColor: "#0D9488" },
  gDate: { fontSize: 13, fontWeight: "700", color: "#111827" },
  gDim: { color: "#CBD5E1" },
  gDateTodayText: { color: "#FFFFFF", fontWeight: "800" },
  gDateSelText: { color: "#0D9488", fontWeight: "800" },
  gPills: { marginTop: 2, gap: 2 },
  gPill: { borderLeftWidth: 3, borderRadius: 3, paddingHorizontal: 3, paddingVertical: 1 },
  gPillText: { fontSize: 8, fontWeight: "700" },
  gPillMore: { fontSize: 8, fontWeight: "800", color: "#9CA3AF", marginLeft: 3 },
  handleZone: { alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  handleBar: { width: 44, height: 5, borderRadius: 3, backgroundColor: "#CBD5E1", alignSelf: "center" },
  handleHint: { fontSize: 10, fontWeight: "700", color: "#9CA3AF", marginTop: 4, textAlign: "center" },
  dayHeader: { fontSize: 15, fontWeight: "800", color: "#0F172A", paddingHorizontal: 6, marginTop: 4, marginBottom: 10 },
  itemCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", borderRadius: 12, padding: 12, marginHorizontal: 4, marginBottom: 8, borderWidth: 1, borderColor: "#EEF0F6", gap: 10, overflow: "hidden" },
  itemBar: { width: 4, borderRadius: 2, alignSelf: "stretch" },
  itemTitle: { fontSize: 14, fontWeight: "800", color: "#111827" },
  dBackdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)" },
  dSheet: { position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "78%", backgroundColor: "#FFFFFF", borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  dScroll: { padding: 20, paddingBottom: 34 },
  dGrab: { alignSelf: "center", width: 38, height: 4, borderRadius: 2, backgroundColor: "#E5E7EB", marginBottom: 16 },
  dSwatch: { width: 40, height: 5, borderRadius: 3, marginBottom: 14 },
  dTitle: { fontSize: 22, fontWeight: "800", color: "#0F172A", letterSpacing: -0.4 },
  dMeta: { fontSize: 13, color: "#6B7280", marginTop: 7, lineHeight: 19 },
  dBody: { fontSize: 14, color: "#374151", marginTop: 16, lineHeight: 22 },
  dLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1.4, color: "#6B7280", marginTop: 12, marginBottom: 6 },
  dInput: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#0F172A", backgroundColor: "#F9FAFB" },
  dInputMulti: { minHeight: 96, textAlignVertical: "top" },
  dBtns: { flexDirection: "row", gap: 10, marginTop: 22 },
  dBtn: { flex: 1, minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  dBtnPrimary: { backgroundColor: "#0D9488" },
  dBtnPrimaryText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  dBtnGhost: { borderWidth: 1, borderColor: "#E5E7EB" },
  dBtnGhostText: { color: "#374151", fontSize: 15, fontWeight: "700" },
  dBtnDanger: { backgroundColor: "#FEE2E2" },
  dBtnDangerText: { color: "#B91C1C", fontSize: 15, fontWeight: "800" },
  itemSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  empty: { textAlign: "center", color: "#9CA3AF", fontSize: 14, marginTop: 20 },
});
