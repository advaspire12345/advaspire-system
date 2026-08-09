import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth";
import { SwipeBackView } from "@/components/SwipeBackView";

type Slot = { id: string; day: string; time: string; duration: number; limitStudent: number; seatsLeft: number };
// A movable class: one active enrollment plus its next occurrence on/after tomorrow.
type Movable = { enrollmentId: string; studentId: string; studentName: string; courseName: string; date: string; time: string | null };

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function formatTime12h(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}
function ymdToDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function longDate(d: Date): string {
  return d.toLocaleDateString("en-MY", { weekday: "long", day: "numeric", month: "long" });
}
// Enrolment days come from schedule JSON, falling back to the day_of_week column.
function scheduleDays(scheduleRaw: string | null, dayOfWeek: string | null): { days: string[]; time: string | null } {
  let days: string[] = [];
  let time: string | null = null;
  if (scheduleRaw) {
    try {
      const parsed = JSON.parse(scheduleRaw);
      if (Array.isArray(parsed)) {
        days = parsed.map((p: { day?: string }) => String(p?.day ?? "").toLowerCase()).filter(Boolean);
        if (parsed[0]?.time) time = String(parsed[0].time);
      }
    } catch { /* malformed schedule — fall through */ }
  }
  if (!days.length && dayOfWeek) days = [dayOfWeek.toLowerCase()];
  return { days, time };
}
function nextOccurrence(days: string[]): string | null {
  if (!days.length) return null;
  const start = addDays(new Date(), 1); // 24h rule — never today
  start.setHours(0, 0, 0, 0);
  for (let i = 0; i < 14; i++) {
    const d = addDays(start, i);
    if (days.includes(WEEKDAYS[d.getDay()])) return ymd(d);
  }
  return null;
}

export default function RescheduleScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ enrollmentId?: string; originalDate?: string; studentId?: string; courseName?: string }>();

  // Home and Attendance open this screen with no params, so it starts on a
  // "which class?" step and fills these in once the parent picks one.
  // A selection is a LIST: one class, or several siblings on the same program moving
  // together. Everything downstream keys off chosen[0] and loops on confirm.
  const [chosen, setChosen] = useState<Movable[] | null>(
    params.enrollmentId && params.originalDate && params.studentId
      ? [{ enrollmentId: params.enrollmentId, studentId: params.studentId, studentName: "", courseName: params.courseName ?? "Class", date: params.originalDate, time: null }]
      : null,
  );
  const lead = chosen?.[0] ?? null;
  const [movables, setMovables] = useState<Movable[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Every active class the parent could move, newest occurrence first.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: parentRow } = await supabase
          .from("parents").select("id").eq("auth_id", user?.id ?? "").is("deleted_at", null).maybeSingle();
        if (!parentRow) { if (!cancelled) { setErrorMessage("This account isn't linked to a parent record."); setLoading(false); } return; }

        const { data: links, error } = await supabase
          .from("parent_students")
          .select("student:students!inner(id, name, deleted_at, enrollments(id, status, deleted_at, day_of_week, start_time, schedule, course:courses(name)))")
          .eq("parent_id", parentRow.id);
        if (error) throw error;

        const out: Movable[] = [];
        for (const l of links ?? []) {
          const s = l.student as unknown as {
            id: string; name: string; deleted_at: string | null;
            enrollments: Array<{ id: string; status: string; deleted_at: string | null; day_of_week: string | null; start_time: string | null; schedule: string | null; course: { name: string } | null }>;
          } | null;
          if (!s || s.deleted_at) continue;
          for (const e of s.enrollments ?? []) {
            if (e.deleted_at || e.status !== "active") continue;
            const { days, time } = scheduleDays(e.schedule, e.day_of_week);
            const date = nextOccurrence(days);
            if (!date) continue;
            out.push({ enrollmentId: e.id, studentId: s.id, studentName: s.name, courseName: e.course?.name ?? "Class", date, time: e.start_time ?? time });
          }
        }
        out.sort((a, b) => (a.date === b.date ? a.studentName.localeCompare(b.studentName) : a.date.localeCompare(b.date)));
        if (cancelled) return;
        setMovables(out);
        // Deep-linked with an enrollment: fill in the names we didn't get as params.
        setChosen((c) => (c ? c.map((x) => ({ ...x, ...(out.find((m) => m.enrollmentId === x.enrollmentId) ?? {}), date: x.date })) : c));
        // Only one class in the whole family — skip the picker entirely.
        if (!chosen && out.length === 1) setChosen([out[0]]);
      } catch (err) {
        if (!cancelled) setErrorMessage(err instanceof Error ? err.message : "Couldn't load your classes.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Seats are computed server-side (RLS hides other students), so slots reload per date.
  const loadSlots = useCallback(async (enrollmentId: string, date: Date) => {
    setSlotsLoading(true);
    setSelectedSlot(null);
    try {
      const { data, error } = await supabase.rpc("parent_reschedule_slots", { p_enrollment_id: enrollmentId, p_date: ymd(date) });
      if (error) throw error;
      const res = data as { ok: boolean; error?: string; slots?: Slot[] } | null;
      if (!res?.ok) { setErrorMessage(res?.error ?? "Couldn't load slots."); setSlots([]); return; }
      setErrorMessage(null);
      setSlots(((res.slots ?? []) as unknown as Record<string, unknown>[]).map((s) => ({
        id: String(s.id), day: String(s.day), time: String(s.time),
        duration: Number(s.duration ?? 0), limitStudent: Number(s.limit_student ?? 0), seatsLeft: Number(s.seats_left ?? 0),
      })));
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Couldn't load slots.");
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (lead && selectedDate) loadSlots(lead.enrollmentId, selectedDate);
  }, [lead, selectedDate, loadSlots]);

  // Classes run on very few weekdays (most slots are Sat/Sun), so offering 30 straight
  // dates meant nearly every tap answered "no slots on this weekday" and the screen felt
  // broken. Probe one week to learn which weekdays actually have a free seat, then only
  // offer those dates.
  const [openDays, setOpenDays] = useState<Set<string> | null>(null);
  useEffect(() => {
    if (!lead) { setOpenDays(null); return; }
    let cancelled = false;
    (async () => {
      const found = new Set<string>();
      for (let i = 0; i < 7; i++) {
        const d = addDays(new Date(), i + 1);
        const { data } = await supabase.rpc("parent_reschedule_slots", { p_enrollment_id: lead.enrollmentId, p_date: ymd(d) });
        const res = data as { ok?: boolean; slots?: { seats_left?: number }[] } | null;
        if (res?.ok && (res.slots ?? []).some((s) => Number(s.seats_left ?? 0) > 0)) found.add(WEEKDAYS[d.getDay()]);
      }
      if (!cancelled) setOpenDays(found);
    })();
    return () => { cancelled = true; };
  }, [lead]);

  // Same program + same next occurrence + more than one child = a movable group.
  const siblingGroups = Object.values(
    movables.reduce((acc, m) => {
      const key = `${m.courseName}|${m.date}|${m.time ?? ""}`;
      (acc[key] ??= { key, members: [] as Movable[] }).members.push(m);
      return acc;
    }, {} as Record<string, { key: string; members: Movable[] }>),
  ).filter((g) => new Set(g.members.map((m) => m.studentId)).size > 1);

  const allDates: Date[] = [];
  const tomorrow = addDays(new Date(), 1);
  for (let i = 0; i < 30; i++) allDates.push(addDays(tomorrow, i));
  const dateOptions = openDays ? allDates.filter((d) => openDays.has(WEEKDAYS[d.getDay()])) : allDates;
  // Full slots are removed from the list entirely rather than shown greyed out.
  const needed = chosen?.length ?? 1; // a group of 2 needs 2 free seats, not 1
  const openSlots = slots.filter((s) => s.seatsLeft >= needed);

  // Moving N siblings needs N seats on the target slot.
  const canConfirm = !!(chosen && selectedDate && selectedSlot && selectedSlot.seatsLeft >= chosen.length);

  const onConfirm = async () => {
    if (!canConfirm || !chosen || !selectedDate || !selectedSlot) return;
    setSubmitting(true);
    try {
      // One call per sibling. Seats are re-checked server-side each time, so a partial
      // success is possible — report exactly who moved rather than claiming all did.
      const moved: string[] = [];
      let failure: string | null = null;
      for (const m of chosen) {
        const { data, error } = await supabase.rpc("parent_request_reschedule", {
          p_enrollment_id: m.enrollmentId,
          p_original_date: m.date,
          p_new_slot_id: selectedSlot.id,
          p_new_date: ymd(selectedDate),
        });
        if (error) { failure = error.message; break; }
        const res = data as { ok: boolean; error?: string } | null;
        if (!res?.ok) { failure = res?.error ?? "Please try again."; break; }
        moved.push(m.studentName || "Your child");
      }
      if (failure && !moved.length) {
        Alert.alert("Couldn't move the class", failure);
        loadSlots(chosen[0].enrollmentId, selectedDate); // seats may have just changed
        return;
      }
      Alert.alert(
        failure ? "Partly moved" : moved.length > 1 ? "Classes moved" : "Class moved",
        `${moved.join(" & ")} now ${moved.length > 1 ? "run" : "runs"} on ${longDate(selectedDate)} at ${formatTime12h(selectedSlot.time)}.`
          + (failure ? `\n\nThe rest couldn't be moved: ${failure}` : "\n\nIt shows as cancelled on the original day and booked on the new day."),
        [{ text: "Done", onPress: () => router.back() }],
      );
    } catch (err) {
      Alert.alert("Couldn't move the class", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <Stack.Screen options={{ title: "Reschedule", headerShown: true }} />
        <ActivityIndicator color="#EC2127" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen options={{ title: "Reschedule", headerShown: true, headerTintColor: "#EC2127" }} />
      <SwipeBackView onBack={() => router.back()} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {chosen && lead ? (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{chosen.length > 1 ? "Cancel & move classes" : "Cancel & move class"}</Text>
            <Text style={styles.summaryTitle}>{chosen.map((c) => c.studentName).filter(Boolean).join(" & ") || "Your child"}</Text>
            <Text style={styles.summarySubtitle}>
              {lead.courseName} · originally {ymdToDate(lead.date).toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short" })}
              {lead.time ? ` · ${formatTime12h(lead.time)}` : ""}
            </Text>
            {movables.length > 1 ? (
              <Pressable onPress={() => { setChosen(null); setSelectedDate(null); setSlots([]); }}>
                <Text style={styles.changeLink}>Change class ›</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {errorMessage ? (
          <View style={styles.errorCard}><Text style={styles.errorText}>{errorMessage}</Text></View>
        ) : null}

        {!chosen ? (
          <>
            <Text style={styles.stepLabel}>Which class do you want to move?</Text>
            {movables.length === 0 ? (
              <Text style={styles.helperText}>No upcoming classes to move. Classes can only be moved at least 24 hours ahead.</Text>
            ) : (
              <>
                {/* Siblings on the SAME program and the same occurrence can move as one. */}
                {siblingGroups.map((g) => (
                  <Pressable key={`grp-${g.key}`} style={[styles.classRow, styles.groupRow]} onPress={() => setChosen(g.members)}>
                    <View style={styles.groupIcon}><Ionicons name="people" size={16} color="#FFFFFF" /></View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.classChild} numberOfLines={1}>{g.members.map((m) => m.studentName).join(" & ")}</Text>
                      <Text style={styles.classMeta} numberOfLines={1}>
                        {g.members.length} children · {g.members[0].courseName} · move together
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#EC2127" />
                  </Pressable>
                ))}
                {movables.map((m) => (
                  <Pressable key={m.enrollmentId} style={styles.classRow} onPress={() => setChosen([m])}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.classChild} numberOfLines={1}>{m.studentName}</Text>
                      <Text style={styles.classMeta} numberOfLines={1}>
                        {m.courseName} · {ymdToDate(m.date).toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short" })}
                        {m.time ? ` · ${formatTime12h(m.time)}` : ""}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#EC2127" />
                  </Pressable>
                ))}
              </>
            )}
          </>
        ) : (
          <>
            <Text style={styles.stepLabel}>1. Pick a new date</Text>
            {openDays === null ? (
              <ActivityIndicator color="#EC2127" style={{ marginVertical: 16 }} />
            ) : dateOptions.length === 0 ? (
              <Text style={styles.helperText}>Every class for this program is full for the next month. Message your branch and they&apos;ll find a slot.</Text>
            ) : null}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.datesRow}>
              {dateOptions.map((d) => {
                const isSelected = selectedDate && ymd(selectedDate) === ymd(d);
                return (
                  <Pressable key={ymd(d)} style={[styles.datePill, isSelected && styles.datePillSelected]} onPress={() => setSelectedDate(d)}>
                    <Text style={[styles.datePillWeekday, isSelected && styles.datePillTextSelected]}>{d.toLocaleDateString("en-MY", { weekday: "short" })}</Text>
                    <Text style={[styles.datePillNumber, isSelected && styles.datePillTextSelected]}>{d.getDate()}</Text>
                    <Text style={[styles.datePillMonth, isSelected && styles.datePillTextSelected]}>{d.toLocaleDateString("en-MY", { month: "short" })}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.stepLabel}>2. Pick an available slot</Text>
            {!selectedDate ? (
              <Text style={styles.helperText}>Select a date first to see available slots</Text>
            ) : slotsLoading ? (
              <ActivityIndicator color="#EC2127" style={{ marginVertical: 16 }} />
            ) : openSlots.length === 0 ? (
              <Text style={styles.helperText}>No seats left on this date. Try another.</Text>
            ) : (
              <View style={styles.slotsGrid}>
                {openSlots.map((s) => {
                  const isSelected = selectedSlot?.id === s.id;
                  return (
                    <Pressable
                      key={s.id}
                      style={[styles.slotChip, isSelected && styles.slotChipSelected]}
                      onPress={() => setSelectedSlot(s)}
                    >
                      <Text style={[styles.slotTime, isSelected && styles.slotTextSelected]}>{formatTime12h(s.time)}</Text>
                      <Text style={[styles.slotDuration, isSelected && styles.slotTextSelected]}>{s.duration} min</Text>
                      <View style={[styles.slotCapPill, isSelected && styles.slotCapPillSelected]}>
                        <Ionicons name="people" size={10} color={isSelected ? "#FFFFFF" : "#EC2127"} />
                        <Text style={[styles.slotCapText, isSelected && styles.slotTextSelected]}>
                          {s.seatsLeft} of {s.limitStudent} left
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <Text style={styles.note}>
              ℹ️ Classes can only be moved at least 24 hours ahead, which is why today isn&apos;t shown. Seat counts are live — a full class can&apos;t be picked. The class then shows as cancelled on the original day and booked on the new day.
            </Text>

            <Pressable style={[styles.confirmButton, !canConfirm && styles.confirmDisabled]} onPress={onConfirm} disabled={!canConfirm || submitting}>
              {submitting ? <ActivityIndicator color="#FFFFFF" /> : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.confirmText}>Confirm reschedule</Text>
                </>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
      </SwipeBackView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F3F5" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F7F3F5" },
  scroll: { padding: 16, gap: 12 },
  summaryCard: { backgroundColor: "#EC2127", padding: 20, borderRadius: 16 },
  summaryLabel: { fontSize: 11, fontWeight: "700", color: "#E0E7FF", letterSpacing: 1, textTransform: "uppercase" },
  summaryTitle: { fontSize: 22, fontWeight: "800", color: "#FFFFFF", marginTop: 4 },
  summarySubtitle: { fontSize: 13, color: "#E0E7FF", marginTop: 4 },
  changeLink: { fontSize: 12, fontWeight: "700", color: "#FFFFFF", marginTop: 10, textDecorationLine: "underline" },
  errorCard: { backgroundColor: "#FEE2E2", padding: 12, borderRadius: 12 },
  errorText: { color: "#991B1B", fontSize: 13 },
  stepLabel: { fontSize: 14, fontWeight: "700", color: "#2B161B", marginTop: 8 },
  helperText: { fontSize: 13, color: "#666666", paddingVertical: 12 },
  classRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFFFFF", borderRadius: 14, padding: 16 },
  groupRow: { borderWidth: 1.5, borderColor: "#EC2127" },
  groupIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: "#EC2127", alignItems: "center", justifyContent: "center" },
  classChild: { fontSize: 15, fontWeight: "700", color: "#2B161B" },
  classMeta: { fontSize: 12, color: "#666666", marginTop: 3 },
  datesRow: { flexDirection: "row" },
  datePill: { width: 64, paddingVertical: 10, marginRight: 8, borderRadius: 12, backgroundColor: "#FFFFFF", alignItems: "center" },
  datePillSelected: { backgroundColor: "#EC2127" },
  datePillWeekday: { fontSize: 11, color: "#666666", fontWeight: "600" },
  datePillNumber: { fontSize: 20, fontWeight: "800", color: "#2B161B", marginVertical: 2 },
  datePillMonth: { fontSize: 10, color: "#666666" },
  datePillTextSelected: { color: "#FFFFFF" },
  slotsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slotChip: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 1.5, borderColor: "transparent", minWidth: 100, alignItems: "center" },
  slotChipSelected: { backgroundColor: "#EC2127", borderColor: "#EC2127" },
  slotChipFull: { backgroundColor: "#F0EAEC", opacity: 0.7 },
  slotTime: { fontSize: 14, fontWeight: "700", color: "#2B161B" },
  slotDuration: { fontSize: 11, color: "#666666", marginTop: 2 },
  slotTextSelected: { color: "#FFFFFF" },
  slotTextFull: { color: "#999999" },
  slotCapPill: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 6, backgroundColor: "#EAF7FD", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  slotCapPillSelected: { backgroundColor: "rgba(255,255,255,0.25)" },
  slotCapPillFull: { backgroundColor: "#E5E5E5" },
  slotCapText: { fontSize: 10, fontWeight: "800", color: "#EC2127" },
  note: { fontSize: 12, color: "#666666", lineHeight: 18, marginTop: 16, paddingHorizontal: 4 },
  confirmButton: { marginTop: 24, height: 52, backgroundColor: "#EC2127", borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  confirmDisabled: { opacity: 0.5 },
  confirmText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
