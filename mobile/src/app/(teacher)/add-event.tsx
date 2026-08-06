import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useRole } from "@/contexts/role";
import { supabase } from "@/lib/supabase";
import { SwipeBackView } from "@/components/SwipeBackView";

function ymd(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function time12(t: string) { const [h, m] = t.split(":").map((n) => parseInt(n, 10)); return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; }
function human(s: string) { return new Date(s + "T00:00:00").toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short" }); }
const CALENDAR = "/(teacher)/calendar" as Href;
const TIMES: string[] = (() => { const out: string[] = []; for (let h = 8; h <= 21; h++) { out.push(`${String(h).padStart(2, "0")}:00`); out.push(`${String(h).padStart(2, "0")}:30`); } return out; })();

type EventType = "activity" | "competition" | "holiday" | "bootcamp" | "event";
const TYPES: { key: EventType; label: string; color: string; icon: string }[] = [
  { key: "event", label: "Event", color: "#EC4899", icon: "✨" },
  { key: "activity", label: "Activity", color: "#10B981", icon: "🎨" },
  { key: "competition", label: "Competition", color: "#F59E0B", icon: "🏆" },
  { key: "holiday", label: "Holiday", color: "#EF4444", icon: "🎉" },
  { key: "bootcamp", label: "Bootcamp", color: "#615DFA", icon: "🚀" },
];
// DB event_type for each chip (constraint allows activity/competition/holiday/bootcamp/own_schedule).
const DB_TYPE: Record<EventType, string> = { activity: "activity", competition: "competition", holiday: "holiday", bootcamp: "bootcamp", event: "own_schedule" };
// Only a custom "Event" lets you choose icon + colour; the rest are fixed by type.
// Holiday has no repeat/audience; bootcamp has no repeat.
const canRepeat = (t: EventType) => t === "activity" || t === "competition" || t === "event";
const canAudience = (t: EventType) => t !== "holiday";
const canCustomise = (t: EventType) => t === "event";
const COLORS = ["#615DFA", "#EF4444", "#F59E0B", "#10B981", "#23D2E2", "#EC4899", "#0D9488", "#8B5CF6"];
const ICONS = ["🎉", "🏆", "🚀", "🎨", "🧱", "🤖", "♟️", "⚽", "🎵", "📚", "🍽️", "🏫", "🎁", "💻", "🧪", "🏊", "🏹", "🥋", "📸", "🎭", "🧬", "🌱", "🪙", "📈"];
const WEEKDAYS: { key: string; label: string }[] = [
  { key: "monday", label: "Mon" }, { key: "tuesday", label: "Tue" }, { key: "wednesday", label: "Wed" },
  { key: "thursday", label: "Thu" }, { key: "friday", label: "Fri" }, { key: "saturday", label: "Sat" }, { key: "sunday", label: "Sun" },
];

function DateStrip({ value, onPick, min, focusKey }: { value: string | null; onPick: (d: string) => void; min?: string; focusKey?: number }) {
  const days = useMemo(() => { const out: Date[] = []; const s = new Date(); s.setHours(0, 0, 0, 0); for (let i = 0; i < 150; i++) { const d = new Date(s); d.setDate(s.getDate() + i); out.push(d); } return out; }, []);
  const ref = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();
  // Centre the pre-selected date so a far-off tapped day sits in the middle of the
  // strip. Re-runs when focusKey changes (i.e. re-opened from a new calendar day).
  useEffect(() => { if (!value) return; const i = days.findIndex((d) => ymd(d) === value); if (i > 2) requestAnimationFrame(() => ref.current?.scrollTo({ x: Math.max(0, i * 62 + 27 - width / 2), animated: false })); }, [focusKey]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
      {days.map((d) => { const k = ymd(d); if (min && k < min) return null; const on = k === value; return (
        <Pressable key={k} style={[styles.dayChip, on && styles.dayChipOn]} onPress={() => onPick(k)}>
          <Text style={[styles.dayDow, on && styles.dayTextOn]}>{d.toLocaleDateString("en-MY", { weekday: "short" })}</Text>
          <Text style={[styles.dayNum, on && styles.dayTextOn]}>{d.getDate()}</Text>
          <Text style={[styles.dayMon, on && styles.dayTextOn]}>{d.toLocaleDateString("en-MY", { month: "short" })}</Text>
        </Pressable>
      ); })}
    </ScrollView>
  );
}

// Range picker on ONE strip: tap the start day, then the end day; the whole span
// highlights so you see from-when to-when at a glance.
function RangeStrip({ start, end, onPick }: { start: string | null; end: string | null; onPick: (d: string) => void }) {
  const days = useMemo(() => { const out: Date[] = []; const s = new Date(); s.setHours(0, 0, 0, 0); for (let i = 0; i < 150; i++) { const d = new Date(s); d.setDate(s.getDate() + i); out.push(d); } return out; }, []);
  const ref = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();
  useEffect(() => { if (!start) return; const i = days.findIndex((d) => ymd(d) === start); if (i > 2) requestAnimationFrame(() => ref.current?.scrollTo({ x: Math.max(0, i * 62 + 27 - width / 2), animated: false })); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
      {days.map((d) => {
        const k = ymd(d);
        const isStart = k === start, isEnd = k === end;
        const inRange = !!start && !!end && k > start && k < end;
        const on = isStart || isEnd; const mid = inRange;
        return (
          <Pressable key={k} style={[styles.dayChip, mid && styles.dayChipMid, on && styles.dayChipOn]} onPress={() => onPick(k)}>
            <Text style={[styles.dayDow, (on || mid) && styles.dayTextOn]}>{d.toLocaleDateString("en-MY", { weekday: "short" })}</Text>
            <Text style={[styles.dayNum, (on || mid) && styles.dayTextOn]}>{d.getDate()}</Text>
            {on ? <Text style={styles.dayTag}>{isStart && isEnd ? "•" : isStart ? "START" : "END"}</Text> : <Text style={[styles.dayMon, mid && styles.dayTextOn]}>{d.toLocaleDateString("en-MY", { month: "short" })}</Text>}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// Branch-scoped events need company_id — walk up parent_id to the company row.
async function resolveCompanyId(branchId: string): Promise<string | null> {
  let cur: string | null = branchId;
  for (let i = 0; i < 5 && cur; i++) {
    const { data } = await supabase.from("branches").select("id, type, parent_id").eq("id", cur).maybeSingle();
    if (!data) return null;
    if ((data.type as string) === "company" || !data.parent_id) return data.id as string;
    cur = data.parent_id as string;
  }
  return null;
}

export default function AddEvent() {
  const { staff } = useRole();
  const router = useRouter();
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  const initialDate = typeof dateParam === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : ymd(new Date());
  const backToCalendar = () => router.navigate(CALENDAR);

  const [type, setType] = useState<EventType>("event");
  const [title, setTitle] = useState("");
  const [color, setColor] = useState(TYPES[0].color);
  const [icon, setIcon] = useState<string | null>(TYPES[0].icon);
  const [date, setDate] = useState<string | null>(initialDate);
  const [multi, setMulti] = useState(false);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");
  const [repeats, setRepeats] = useState(false);
  const [repeatDays, setRepeatDays] = useState<string[]>([]);
  const [until, setUntil] = useState<string | null>(null);
  const [audience, setAudience] = useState<"everyone" | "staff_only">("everyone");
  const [saving, setSaving] = useState(false);
  const [dateFocus, setDateFocus] = useState(0);

  // The screen stays mounted in the tab navigator, so re-opening it from a NEW
  // calendar day only changes the param — resync the date + re-centre the strip.
  useEffect(() => {
    if (typeof dateParam === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) { setDate(dateParam); setEndDate(null); setMulti(false); setDateFocus((k) => k + 1); }
  }, [dateParam]);

  const pickType = (t: typeof TYPES[number]) => { setType(t.key); setColor(t.color); setIcon(t.icon); if (t.key === "holiday") setAllDay(true); };
  const toggleDay = (k: string) => setRepeatDays((d) => (d.includes(k) ? d.filter((x) => x !== k) : [...d, k]));
  const toggleMulti = () => setMulti((v) => {
    if (v) { setEndDate(null); return false; }
    // Turning on → default the range to the tapped day + the next day (two active dates).
    if (date) { const d = new Date(date + "T00:00:00"); d.setDate(d.getDate() + 1); setEndDate(ymd(d)); }
    return true;
  });
  // Range logic: pick start, then end; tapping before the start moves the start.
  const onPickDate = (k: string) => {
    if (!multi) { setDate(k); return; }
    if (!date || (date && endDate) || k < date) { setDate(k); setEndDate(null); }
    else if (k > date) setEndDate(k);
  };

  const save = async () => {
    if (!title.trim()) { Alert.alert("Name needed", "Give the event a name."); return; }
    if (!date) { Alert.alert("Pick a date", "Choose the date."); return; }
    if (multi && (!endDate || endDate < date)) { Alert.alert("Check dates", "The end date must be on or after the start date."); return; }
    if (!allDay && endTime <= startTime) { Alert.alert("Check times", "End time must be after the start time."); return; }
    const doRepeat = repeats && canRepeat(type);
    if (doRepeat && repeatDays.length === 0) { Alert.alert("Pick days", "Choose which weekdays it repeats on."); return; }
    if (!staff?.branchId) { Alert.alert("No branch", "Your account isn't linked to a branch."); return; }
    setSaving(true);
    const companyId = await resolveCompanyId(staff.branchId);
    if (!companyId) { setSaving(false); Alert.alert("Couldn't save", "Unable to resolve your branch's company."); return; }
    const meta = TYPES.find((t) => t.key === type)!;
    const finalColor = canCustomise(type) ? color : meta.color;
    const finalIcon = canCustomise(type) ? icon : meta.icon;
    const { error } = await supabase.from("events").insert({
      title: title.trim(), event_type: DB_TYPE[type], scope: "branch", status: "published",
      audience: canAudience(type) ? audience : "everyone",
      color: finalColor, icon: finalIcon || null,
      date, end_date: multi ? endDate : null,
      start_time: allDay ? null : `${startTime}:00`, end_time: allDay ? null : `${endTime}:00`,
      branch_id: staff.branchId, company_id: companyId, created_by_user_id: staff.id ?? null,
      is_recurring: doRepeat, is_bounded: doRepeat && !!until,
      recurring_days: doRepeat ? repeatDays : null,
      recurring_start_date: doRepeat ? date : null, recurring_end_date: doRepeat && until ? until : null,
      recurring_start_time: doRepeat && !allDay ? `${startTime}:00` : null, recurring_end_time: doRepeat && !allDay ? `${endTime}:00` : null,
    });
    setSaving(false);
    if (error) { Alert.alert("Couldn't save", error.message); return; }
    const label = TYPES.find((t) => t.key === type)?.label ?? "Event";
    Alert.alert(`${label} added 🎉`, `${title.trim()} is on the calendar.`, [{ text: "Done", onPress: backToCalendar }]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <SwipeBackView onBack={backToCalendar} style={styles.safe}>
      <View style={styles.header}>
        <Pressable hitSlop={8} onPress={backToCalendar} style={styles.back}><Ionicons name="chevron-back" size={22} color="#615DFA" /></Pressable>
        <Text style={styles.title}>Add to Calendar</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
          {TYPES.map((t) => { const on = t.key === type; return (
            <Pressable key={t.key} style={[styles.typeCard, on && { backgroundColor: t.color, borderColor: t.color }]} onPress={() => pickType(t)}>
              <Text style={styles.typeIcon}>{t.icon}</Text>
              <Text style={[styles.typeText, on && styles.typeTextOn]}>{t.label}</Text>
            </Pressable>
          ); })}
        </ScrollView>

        <Text style={styles.label}>Name *</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Robotics competition" placeholderTextColor="#9CA3AF" />

        <Text style={styles.label}>{multi ? "Dates — tap start, then end *" : "Date *"}</Text>
        {multi ? <RangeStrip start={date} end={endDate} onPick={onPickDate} /> : <DateStrip value={date} onPick={setDate} focusKey={dateFocus} />}
        <Pressable style={styles.toggleRow} onPress={toggleMulti}>
          <Ionicons name={multi ? "checkbox" : "square-outline"} size={20} color="#615DFA" />
          <Text style={styles.toggleText}>Runs for several days</Text>
        </Pressable>
        {multi ? (
          <View style={styles.rangeBar}>
            <View style={styles.rangeChip}><Text style={styles.rangeChipLabel}>FROM</Text><Text style={styles.rangeChipDate}>{date ? human(date) : "—"}</Text></View>
            <Ionicons name="arrow-forward" size={16} color="#9CA3AF" />
            <View style={[styles.rangeChip, !endDate && styles.rangeChipEmpty]}><Text style={styles.rangeChipLabel}>TO</Text><Text style={styles.rangeChipDate}>{endDate ? human(endDate) : "tap end day"}</Text></View>
          </View>
        ) : null}

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>All day</Text>
          <Switch value={allDay} onValueChange={setAllDay} trackColor={{ true: "#615DFA" }} />
        </View>
        {!allDay ? (
          <>
            <Text style={styles.label}>Start time</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
              {TIMES.map((t) => { const on = t === startTime; return <Pressable key={t} style={[styles.pill, on && styles.pillOn]} onPress={() => setStartTime(t)}><Text style={[styles.pillText, on && styles.dayTextOn]}>{time12(t)}</Text></Pressable>; })}
            </ScrollView>
            <Text style={styles.label}>End time</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
              {TIMES.map((t) => { const on = t === endTime; return <Pressable key={t} style={[styles.pill, on && styles.pillOn]} onPress={() => setEndTime(t)}><Text style={[styles.pillText, on && styles.dayTextOn]}>{time12(t)}</Text></Pressable>; })}
            </ScrollView>
          </>
        ) : null}

        {canRepeat(type) ? (
          <>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Repeat weekly</Text>
              <Switch value={repeats} onValueChange={setRepeats} trackColor={{ true: "#615DFA" }} />
            </View>
            {repeats ? (
              <>
                <Text style={styles.label}>On these days</Text>
                <View style={styles.rowWrap}>
                  {WEEKDAYS.map((w) => { const on = repeatDays.includes(w.key); return <Pressable key={w.key} style={[styles.pill, on && styles.pillOn]} onPress={() => toggleDay(w.key)}><Text style={[styles.pillText, on && styles.dayTextOn]}>{w.label}</Text></Pressable>; })}
                </View>
                <Text style={styles.label}>Until (optional)</Text>
                <DateStrip value={until} onPick={setUntil} min={date ?? undefined} />
              </>
            ) : null}
          </>
        ) : null}

        {canAudience(type) ? (
          <>
            <Text style={styles.label}>Who can see it</Text>
            <View style={styles.rowWrap}>
              <Pressable style={[styles.pill, audience === "everyone" && styles.pillOn]} onPress={() => setAudience("everyone")}><Text style={[styles.pillText, audience === "everyone" && styles.dayTextOn]}>Everyone (parents & students)</Text></Pressable>
              <Pressable style={[styles.pill, audience === "staff_only" && styles.pillOn]} onPress={() => setAudience("staff_only")}><Text style={[styles.pillText, audience === "staff_only" && styles.dayTextOn]}>Staff only</Text></Pressable>
            </View>
          </>
        ) : null}

        {canCustomise(type) ? (
          <>
            <Text style={styles.label}>Icon</Text>
            <View style={styles.rowWrap}>
              <Pressable style={[styles.iconChip, icon === null && styles.iconChipOn]} onPress={() => setIcon(null)}><Ionicons name="ban-outline" size={18} color="#9CA3AF" /></Pressable>
              {ICONS.map((e) => <Pressable key={e} style={[styles.iconChip, icon === e && styles.iconChipOn]} onPress={() => setIcon(e)}><Text style={styles.iconEmoji}>{e}</Text></Pressable>)}
            </View>

            <Text style={styles.label}>Color</Text>
            <View style={styles.rowWrap}>
              {COLORS.map((c) => <Pressable key={c} style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotOn]} onPress={() => setColor(c)} />)}
            </View>
          </>
        ) : (
          <View style={styles.fixedRow}>
            <Text style={styles.fixedIcon}>{TYPES.find((t) => t.key === type)?.icon}</Text>
            <View style={[styles.colorDot, { backgroundColor: TYPES.find((t) => t.key === type)?.color }]} />
            <Text style={styles.fixedNote}>Icon & colour are fixed for {TYPES.find((t) => t.key === type)?.label}. Pick “Event” to customise.</Text>
          </View>
        )}

        <Pressable style={[styles.saveBtn, saving && styles.saveOff]} disabled={saving} onPress={save}>
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>Add to calendar</Text>}
        </Pressable>
        <View style={{ height: 40 }} />
      </ScrollView>
      </SwipeBackView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingTop: 6, paddingBottom: 10 },
  rangeBar: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 },
  rangeChip: { flex: 1, backgroundColor: "#EEF2FF", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  rangeChipEmpty: { backgroundColor: "#F3F4F6" },
  rangeChipLabel: { fontSize: 10, fontWeight: "800", color: "#615DFA", letterSpacing: 0.5 },
  rangeChipDate: { fontSize: 14, fontWeight: "800", color: "#0F172A", marginTop: 2 },
  fixedRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16, backgroundColor: "#F8FAFC", borderRadius: 12, padding: 12 },
  fixedIcon: { fontSize: 22 },
  fixedNote: { flex: 1, fontSize: 12, color: "#6B7280" },
  back: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "800", color: "#0F172A" },
  body: { padding: 16 },
  label: { fontSize: 12, fontWeight: "800", color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 16, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#111827", backgroundColor: "#F8FAFC" },
  typeRow: { flexDirection: "row", gap: 8, paddingRight: 8 },
  typeCard: { width: 92, alignItems: "center", gap: 4, paddingVertical: 12, borderRadius: 14, backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB" },
  typeIcon: { fontSize: 20 },
  typeText: { fontSize: 12, fontWeight: "800", color: "#374151" },
  typeTextOn: { color: "#FFFFFF" },
  strip: { gap: 8, paddingVertical: 2, paddingRight: 8 },
  dayChip: { width: 54, alignItems: "center", paddingVertical: 8, borderRadius: 12, backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB" },
  dayChipOn: { backgroundColor: "#615DFA", borderColor: "#615DFA" },
  dayChipMid: { backgroundColor: "#A5B4FC", borderColor: "#A5B4FC" },
  dayDow: { fontSize: 11, fontWeight: "700", color: "#9CA3AF" },
  dayNum: { fontSize: 17, fontWeight: "800", color: "#111827" },
  dayMon: { fontSize: 10, fontWeight: "600", color: "#9CA3AF" },
  dayTag: { fontSize: 8, fontWeight: "800", color: "#FFFFFF", letterSpacing: 0.3 },
  dayTextOn: { color: "#FFFFFF" },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  toggleText: { fontSize: 14, fontWeight: "700", color: "#374151" },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18, backgroundColor: "#F8FAFC", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", paddingHorizontal: 14, paddingVertical: 10 },
  switchLabel: { fontSize: 14, fontWeight: "700", color: "#374151" },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB" },
  pillOn: { backgroundColor: "#615DFA", borderColor: "#615DFA" },
  pillText: { fontSize: 13, fontWeight: "700", color: "#374151" },
  iconChip: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#E5E7EB" },
  iconChipOn: { borderColor: "#615DFA", backgroundColor: "#EEF2FF" },
  iconEmoji: { fontSize: 22 },
  colorDot: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: "transparent" },
  colorDotOn: { borderColor: "#0F172A" },
  saveBtn: { backgroundColor: "#615DFA", height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 26 },
  saveOff: { opacity: 0.5 },
  saveText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
});
