import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useRole } from "@/contexts/role";
import { supabase } from "@/lib/supabase";
import { TeacherTopBar } from "@/components/TeacherTopBar";

const WEEKDAYS_FULL = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const DOW = ["S", "M", "T", "W", "T", "F", "S"];
const CLASS_COLOR = "#0D9488";
const EVENT_TYPE_META: Record<string, { label: string; color: string }> = {
  holiday: { label: "Holiday", color: "#EF4444" },
  activity: { label: "Activity", color: "#10B981" },
  competition: { label: "Competition", color: "#F59E0B" },
  own_schedule: { label: "Event", color: "#615DFA" },
};

type ClassSlot = { weekday: string; time: string | null; courseName: string; count: number };
type EventEntry = {
  id: string; title: string; eventType: string; date: string; endDate: string | null; startTime: string | null; endTime: string | null;
  color: string; isRecurring: boolean; isBounded: boolean; recurringDays: string[]; recurringStartDate: string | null; recurringEndDate: string | null; occurrences: string[];
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

export default function TeacherCalendar() {
  const { staff } = useRole();
  const [month, setMonth] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [selected, setSelected] = useState(() => ymd(new Date()));
  const [slots, setSlots] = useState<ClassSlot[]>([]);
  const [events, setEvents] = useState<EventEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!staff?.branchId) { setLoading(false); return; }
    setLoading(true);
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
      .select("id, title, event_type, date, end_date, start_time, end_time, color, is_recurring, is_bounded, recurring_days, recurring_start_date, recurring_end_date, branch_id, occurrences:event_occurrences(date)")
      .is("deleted_at", null).neq("status", "rejected").or(`branch_id.eq.${staff.branchId},branch_id.is.null`);
    setEvents((evs ?? []).map((e) => ({
      id: e.id as string, title: (e.title as string) ?? "", eventType: (e.event_type as string) ?? "own_schedule", date: e.date as string, endDate: (e.end_date as string | null) ?? null,
      startTime: (e.start_time as string | null) ?? null, endTime: (e.end_time as string | null) ?? null, color: (e.color as string) ?? "#615DFA",
      isRecurring: !!e.is_recurring, isBounded: !!e.is_bounded, recurringDays: ((e.recurring_days as string[] | null) ?? []).map((d) => String(d).toLowerCase()),
      recurringStartDate: (e.recurring_start_date as string | null) ?? null, recurringEndDate: (e.recurring_end_date as string | null) ?? null,
      occurrences: (((e.occurrences as unknown as { date: string }[] | null) ?? []).map((o) => o.date)),
    })));
    setLoading(false);
  }, [staff?.branchId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const grid = useMemo(() => buildMonthGrid(month.getFullYear(), month.getMonth()), [month]);
  const todayKey = ymd(new Date());
  const slotsForWeekday = (wd: string) => slots.filter((s) => s.weekday === wd);

  const dayHasClass = (key: string) => slots.some((s) => s.weekday === WEEKDAYS_FULL[new Date(key + "T00:00:00").getDay()]);
  const eventsForDay = (key: string) => events.filter((e) => eventOccursOn(e, key));

  // Selected day's items, time-ordered.
  const selWd = WEEKDAYS_FULL[new Date(selected + "T00:00:00").getDay()];
  const dayClasses = useMemo(() => slotsForWeekday(selWd).sort((a, b) => toMin(a.time) - toMin(b.time)), [slots, selWd]);
  const dayEvents = useMemo(() => eventsForDay(selected).sort((a, b) => toMin(a.startTime) - toMin(b.startTime)), [events, selected]);
  const selDate = new Date(selected + "T00:00:00");

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <TeacherTopBar />
      <View style={styles.header}>
        <Text style={styles.title}>Calendar</Text>
        <View style={styles.monthRow}>
          <Pressable hitSlop={8} onPress={() => setMonth((m) => addMonths(m, -1))} style={styles.navBtn}><Ionicons name="chevron-back" size={18} color="#0D9488" /></Pressable>
          <Text style={styles.monthText}>{month.toLocaleDateString("en-MY", { month: "long", year: "numeric" })}</Text>
          <Pressable hitSlop={8} onPress={() => setMonth((m) => addMonths(m, 1))} style={styles.navBtn}><Ionicons name="chevron-forward" size={18} color="#0D9488" /></Pressable>
          <View style={styles.flex} />
          <Pressable style={styles.todayBtn} onPress={() => { const n = new Date(); setMonth(new Date(n.getFullYear(), n.getMonth(), 1)); setSelected(ymd(n)); }}><Text style={styles.todayBtnText}>Today</Text></Pressable>
        </View>
      </View>

      {loading ? <View style={styles.center}><ActivityIndicator color="#0D9488" /></View> : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.dowRow}>{DOW.map((d, i) => <Text key={i} style={styles.dowText}>{d}</Text>)}</View>
          {grid.map((row, ri) => (
            <View key={ri} style={styles.weekRow}>
              {row.map((d, ci) => {
                if (!d) return <View key={ci} style={styles.cell} />;
                const key = ymd(d);
                const isSel = key === selected; const isToday = key === todayKey;
                const evs = eventsForDay(key);
                return (
                  <Pressable key={ci} style={styles.cell} onPress={() => setSelected(key)}>
                    <View style={[styles.dayNumWrap, isSel && styles.daySel, !isSel && isToday && styles.dayToday]}>
                      <Text style={[styles.dayNum, isSel && styles.dayNumSel, !isSel && isToday && styles.dayNumToday]}>{d.getDate()}</Text>
                    </View>
                    <View style={styles.dotRow}>
                      {dayHasClass(key) ? <View style={[styles.dot, { backgroundColor: CLASS_COLOR }]} /> : null}
                      {evs.slice(0, 3).map((e) => <View key={e.id} style={[styles.dot, { backgroundColor: EVENT_TYPE_META[e.eventType]?.color ?? e.color }]} />)}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}

          <View style={styles.legendRow}>
            <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: CLASS_COLOR }]} /><Text style={styles.legendText}>Classes</Text></View>
            <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: "#EF4444" }]} /><Text style={styles.legendText}>Holiday</Text></View>
            <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: "#10B981" }]} /><Text style={styles.legendText}>Activity</Text></View>
            <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: "#F59E0B" }]} /><Text style={styles.legendText}>Competition</Text></View>
          </View>

          <Text style={styles.dayHeader}>{selDate.toLocaleDateString("en-MY", { weekday: "long", day: "numeric", month: "long" })}</Text>

          {dayEvents.map((e) => {
            const meta = EVENT_TYPE_META[e.eventType] ?? { label: "Event", color: e.color };
            return (
              <View key={e.id} style={styles.itemCard}>
                <View style={[styles.itemBar, { backgroundColor: meta.color }]} />
                <View style={styles.flex}>
                  <Text style={styles.itemTitle} numberOfLines={2}>{e.title}</Text>
                  <Text style={styles.itemSub}>{meta.label}{e.startTime ? ` · ${fmt12(e.startTime)}${e.endTime ? `–${fmt12(e.endTime)}` : ""}` : " · All day"}</Text>
                </View>
              </View>
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
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F8FA" },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  header: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8, gap: 8 },
  title: { fontSize: 24, fontWeight: "800", color: "#0F172A" },
  monthRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  navBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#E6FAF9", alignItems: "center", justifyContent: "center" },
  monthText: { fontSize: 16, fontWeight: "800", color: "#111827" },
  todayBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: "#E6FAF9" },
  todayBtnText: { fontSize: 12, fontWeight: "800", color: "#0D9488" },
  scroll: { paddingHorizontal: 10, paddingBottom: 20 },
  dowRow: { flexDirection: "row", paddingVertical: 6 },
  dowText: { flex: 1, textAlign: "center", fontSize: 12, fontWeight: "800", color: "#9CA3AF" },
  weekRow: { flexDirection: "row" },
  cell: { flex: 1, alignItems: "center", paddingVertical: 4, minHeight: 52 },
  dayNumWrap: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
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
  dayHeader: { fontSize: 15, fontWeight: "800", color: "#0F172A", paddingHorizontal: 6, marginTop: 4, marginBottom: 10 },
  itemCard: { flexDirection: "row", backgroundColor: "#FFFFFF", borderRadius: 12, padding: 12, marginHorizontal: 4, marginBottom: 8, borderWidth: 1, borderColor: "#EEF0F6", gap: 10, overflow: "hidden" },
  itemBar: { width: 4, borderRadius: 2, alignSelf: "stretch" },
  itemTitle: { fontSize: 14, fontWeight: "800", color: "#111827" },
  itemSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  empty: { textAlign: "center", color: "#9CA3AF", fontSize: 14, marginTop: 20 },
});
