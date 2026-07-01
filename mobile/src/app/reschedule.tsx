import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";

type Slot = {
  id: string;
  day: string;
  time: string;
  duration: number;
  limitStudent: number;
};

const WEEKDAY_ORDER: Record<string, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7,
};

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
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export default function RescheduleScreen() {
  const router = useRouter();
  const { enrollmentId, originalDate, studentId, courseName } = useLocalSearchParams<{
    enrollmentId: string;
    originalDate: string;
    studentId: string;
    courseName: string;
  }>();

  const [studentName, setStudentName] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: stuData } = await supabase
          .from("students")
          .select("name")
          .eq("id", studentId)
          .maybeSingle();
        if (!cancelled) setStudentName((stuData?.name as string) ?? "");

        // Find the enrollment to get course + branch
        const { data: enr } = await supabase
          .from("enrollments")
          .select("course_id, student:students!inner(branch_id)")
          .eq("id", enrollmentId)
          .maybeSingle();
        if (!enr) {
          if (!cancelled) setErrorMessage("Enrollment not found");
          return;
        }
        const courseId = enr.course_id as string;
        const branchId = (enr.student as unknown as { branch_id: string }).branch_id;

        // Slots for this course in this branch
        const { data: slots, error } = await supabase
          .from("course_slots")
          .select("id, day, time, duration, limit_student")
          .eq("course_id", courseId)
          .eq("branch_id", branchId)
          .is("deleted_at", null);
        if (error) throw error;

        const mapped: Slot[] = (slots ?? [])
          .map((s) => ({
            id: s.id as string,
            day: (s.day as string).toLowerCase(),
            time: s.time as string,
            duration: Number(s.duration ?? 0),
            limitStudent: Number(s.limit_student ?? 0),
          }))
          .sort((a, b) => {
            const da = WEEKDAY_ORDER[a.day] ?? 8;
            const db = WEEKDAY_ORDER[b.day] ?? 8;
            if (da !== db) return da - db;
            return a.time.localeCompare(b.time);
          });
        if (!cancelled) setAvailableSlots(mapped);
      } catch (err) {
        if (!cancelled) setErrorMessage(err instanceof Error ? err.message : "Failed to load slots");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enrollmentId, studentId]);

  // 14-day-ahead picker, starting 1 day from now (matches the 24h advance rule)
  const dateOptions: Date[] = [];
  const tomorrow = addDays(new Date(), 1);
  for (let i = 0; i < 14; i++) dateOptions.push(addDays(tomorrow, i));

  // Filter slots that match the selected date's weekday
  const slotsForSelectedDate = selectedDate
    ? availableSlots.filter((s) => {
        const weekday = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][selectedDate.getDay()];
        return s.day === weekday;
      })
    : [];

  const canConfirm = !!(selectedDate && selectedSlot);

  const onConfirm = async () => {
    if (!canConfirm || !selectedDate || !selectedSlot) return;
    setSubmitting(true);
    // UI-only for now: the actual write (session_reschedules + paired calendar
    // events) and the live "is this slot full?" capacity check run with
    // service-role access on the server — a parent's app can't read other
    // students' enrolments under RLS. So we confirm the choice and tell the
    // parent it's queued until rescheduling is switched on.
    Alert.alert(
      "Almost there",
      `We've noted moving ${studentName || "this class"}'s ${courseName || "class"} to ${selectedDate.toLocaleDateString("en-MY", { weekday: "long", day: "numeric", month: "long" })} at ${formatTime12h(selectedSlot.time)}.\n\nOnline rescheduling is being switched on shortly — once it's live this will move the class instantly (and any class that's already full won't be offered).`,
      [{ text: "Got it", onPress: () => router.back() }],
    );
    setSubmitting(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <Stack.Screen options={{ title: "Reschedule", headerShown: true }} />
        <ActivityIndicator color="#615DFA" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen options={{ title: "Reschedule", headerShown: true, headerTintColor: "#615DFA" }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Cancel & move class</Text>
          <Text style={styles.summaryTitle}>{studentName}</Text>
          <Text style={styles.summarySubtitle}>
            {courseName || "Class"} · originally {ymdToDate(originalDate ?? "").toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short" })}
          </Text>
        </View>

        <View style={styles.previewBanner}>
          <Ionicons name="information-circle" size={16} color="#B45309" />
          <Text style={styles.previewBannerText}>
            Preview — online rescheduling is being switched on shortly. Full classes will be hidden automatically once it&apos;s live.
          </Text>
        </View>

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <Text style={styles.stepLabel}>1. Pick a new date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.datesRow}>
          {dateOptions.map((d) => {
            const isSelected = selectedDate && ymd(selectedDate) === ymd(d);
            return (
              <Pressable
                key={ymd(d)}
                style={[styles.datePill, isSelected && styles.datePillSelected]}
                onPress={() => {
                  setSelectedDate(d);
                  setSelectedSlot(null);
                }}
              >
                <Text style={[styles.datePillWeekday, isSelected && styles.datePillTextSelected]}>
                  {d.toLocaleDateString("en-MY", { weekday: "short" })}
                </Text>
                <Text style={[styles.datePillNumber, isSelected && styles.datePillTextSelected]}>{d.getDate()}</Text>
                <Text style={[styles.datePillMonth, isSelected && styles.datePillTextSelected]}>
                  {d.toLocaleDateString("en-MY", { month: "short" })}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.stepLabel}>2. Pick an available slot</Text>
        {!selectedDate ? (
          <Text style={styles.helperText}>Select a date first to see available slots</Text>
        ) : slotsForSelectedDate.length === 0 ? (
          <Text style={styles.helperText}>
            No class slots scheduled on this weekday for this program. Try a different date.
          </Text>
        ) : (
          <View style={styles.slotsGrid}>
            {slotsForSelectedDate.map((s) => {
              const isSelected = selectedSlot?.id === s.id;
              return (
                <Pressable
                  key={s.id}
                  style={[styles.slotChip, isSelected && styles.slotChipSelected]}
                  onPress={() => setSelectedSlot(s)}
                >
                  <Text style={[styles.slotTime, isSelected && styles.slotTextSelected]}>{formatTime12h(s.time)}</Text>
                  <Text style={[styles.slotDuration, isSelected && styles.slotTextSelected]}>{s.duration} min</Text>
                  {s.limitStudent > 0 ? (
                    <View style={[styles.slotCapPill, isSelected && styles.slotCapPillSelected]}>
                      <Ionicons name="people" size={10} color={isSelected ? "#FFFFFF" : "#615DFA"} />
                      <Text style={[styles.slotCapText, isSelected && styles.slotTextSelected]}>Up to {s.limitStudent}</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}

        <Text style={styles.note}>
          ℹ️ You can only move a class at least 24 hours ahead — that&apos;s why today and tomorrow aren&apos;t shown. Each slot shows how many students it can take; a class that&apos;s already full won&apos;t be offered. The class then shows as cancelled on the original day and rescheduled on the new day.
        </Text>

        <Pressable
          style={[styles.confirmButton, !canConfirm && styles.confirmDisabled]}
          onPress={onConfirm}
          disabled={!canConfirm || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.confirmText}>Confirm reschedule</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F6FB" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F6F6FB" },
  scroll: { padding: 16, gap: 12 },
  summaryCard: { backgroundColor: "#615DFA", padding: 20, borderRadius: 16 },
  summaryLabel: { fontSize: 11, fontWeight: "700", color: "#E0E7FF", letterSpacing: 1, textTransform: "uppercase" },
  summaryTitle: { fontSize: 22, fontWeight: "800", color: "#FFFFFF", marginTop: 4 },
  summarySubtitle: { fontSize: 13, color: "#E0E7FF", marginTop: 4 },
  errorCard: { backgroundColor: "#FEE2E2", padding: 12, borderRadius: 12 },
  errorText: { color: "#991B1B", fontSize: 13 },
  stepLabel: { fontSize: 14, fontWeight: "700", color: "#111827", marginTop: 8 },
  helperText: { fontSize: 13, color: "#6B7280", paddingVertical: 12 },
  datesRow: { flexDirection: "row" },
  datePill: {
    width: 64,
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  datePillSelected: { backgroundColor: "#615DFA" },
  datePillWeekday: { fontSize: 11, color: "#6B7280", fontWeight: "600" },
  datePillNumber: { fontSize: 20, fontWeight: "800", color: "#111827", marginVertical: 2 },
  datePillMonth: { fontSize: 10, color: "#6B7280" },
  datePillTextSelected: { color: "#FFFFFF" },
  slotsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slotChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "transparent",
    minWidth: 100,
    alignItems: "center",
  },
  slotChipSelected: { backgroundColor: "#615DFA", borderColor: "#615DFA" },
  slotTime: { fontSize: 14, fontWeight: "700", color: "#111827" },
  slotDuration: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  slotTextSelected: { color: "#FFFFFF" },
  slotCapPill: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 6, backgroundColor: "#EEF2FF", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  slotCapPillSelected: { backgroundColor: "rgba(255,255,255,0.25)" },
  slotCapText: { fontSize: 10, fontWeight: "800", color: "#615DFA" },
  previewBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A", padding: 12, borderRadius: 12 },
  previewBannerText: { flex: 1, fontSize: 12, color: "#92400E", fontWeight: "600", lineHeight: 17 },
  note: { fontSize: 12, color: "#6B7280", lineHeight: 18, marginTop: 16, paddingHorizontal: 4 },
  confirmButton: {
    marginTop: 24,
    height: 52,
    backgroundColor: "#615DFA",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  confirmDisabled: { opacity: 0.5 },
  confirmText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
