import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/auth";
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

export default function CalendarScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<EnrollmentSchedule[]>([]);
  const [attendance, setAttendance] = useState<AttendanceMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [month, setMonth] = useState<Date>(startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const load = async () => {
    if (!user) return;
    setErrorMessage(null);
    try {
      const { data: parentRow } = await supabase
        .from("parents")
        .select("id")
        .eq("auth_id", user.id)
        .is("deleted_at", null)
        .maybeSingle();
      if (!parentRow) return;

      const { data: links } = await supabase
        .from("parent_students")
        .select("student_id, student:students!inner(id, name, deleted_at)")
        .eq("parent_id", parentRow.id);
      const studentRows = (links ?? [])
        .map((l) => l.student as unknown as { id: string; name: string; deleted_at: string | null })
        .filter((s) => s && !s.deleted_at);
      const studentIds = studentRows.map((s) => s.id);
      if (studentIds.length === 0) return;

      // Recurring schedule per active enrollment
      const { data: enrs, error: enrErr } = await supabase
        .from("enrollments")
        .select("id, student_id, day_of_week, start_time, schedule, course:courses(name)")
        .in("student_id", studentIds)
        .eq("status", "active")
        .is("deleted_at", null);
      if (enrErr) throw enrErr;

      const enrolledSchedules: EnrollmentSchedule[] = (enrs ?? []).map((e) => {
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
      setEnrollments(enrolledSchedules);

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

      const attMarkers: AttendanceMarker[] = (att ?? []).map((a) => {
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
      setAttendance(attMarkers);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load calendar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, month.getFullYear(), month.getMonth()]);

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

  // Attendance + class indicators per day key
  const dayMarkers = useMemo(() => {
    const map = new Map<DayKey, { hasAttendance: boolean; hasClass: boolean }>();
    // Mark all attendance dates
    for (const a of attendance) {
      const existing = map.get(a.date) ?? { hasAttendance: false, hasClass: false };
      existing.hasAttendance = true;
      map.set(a.date, existing);
    }
    // Mark all recurring class days within the visible window
    const winStart = new Date(month.getFullYear(), month.getMonth() - 1, 1);
    const winEnd = new Date(month.getFullYear(), month.getMonth() + 2, 0);
    for (let d = new Date(winStart); d <= winEnd; d.setDate(d.getDate() + 1)) {
      const wd = WEEKDAYS_FULL[d.getDay()];
      const hit = enrollments.some((e) => e.scheduleDays.includes(wd));
      if (hit) {
        const k = ymd(d);
        const existing = map.get(k) ?? { hasAttendance: false, hasClass: false };
        existing.hasClass = true;
        map.set(k, existing);
      }
    }
    return map;
  }, [attendance, enrollments, month]);

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
      <View style={styles.header}>
        <Pressable onPress={goPrevMonth} style={styles.navButton}>
          <Ionicons name="chevron-back" size={20} color="#615DFA" />
        </Pressable>
        <Pressable onPress={goToday} style={styles.monthLabelButton}>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <Text style={styles.todayHint}>Tap for today</Text>
        </Pressable>
        <Pressable onPress={goNextMonth} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={20} color="#615DFA" />
        </Pressable>
      </View>

      {errorMessage ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{errorMessage}</Text>
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
      </View>

      <DayDetailModal
        visible={!!selectedDay}
        day={selectedDay}
        enrollments={enrollments}
        attendance={attendance}
        onClose={() => setSelectedDay(null)}
        onReschedule={(enrollmentId, originalDate, studentId, courseName) =>
          router.push({
            pathname: "/reschedule",
            params: { enrollmentId, originalDate, studentId, courseName: courseName ?? "" },
          })
        }
      />
    </SafeAreaView>
  );
}

function DayDetailModal({
  visible,
  day,
  enrollments,
  attendance,
  onClose,
  onReschedule,
}: {
  visible: boolean;
  day: Date | null;
  enrollments: EnrollmentSchedule[];
  attendance: AttendanceMarker[];
  onClose: () => void;
  onReschedule: (enrollmentId: string, originalDate: string, studentId: string, courseName: string | null) => void;
}) {
  if (!day) return null;
  const key = ymd(day);
  const dayWeekday = WEEKDAYS_FULL[day.getDay()];
  const classesThisDay = enrollments.filter((e) => e.scheduleDays.includes(dayWeekday));
  const attendanceThisDay = attendance.filter((a) => a.date === key);
  const isFuture = day > new Date();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={styles.modalSheet}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalDate}>{day.toLocaleDateString("en-MY", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</Text>

        {classesThisDay.length === 0 && attendanceThisDay.length === 0 ? (
          <Text style={styles.modalEmpty}>Nothing scheduled on this day.</Text>
        ) : null}

        {classesThisDay.length > 0 ? (
          <ScrollView style={{ maxHeight: 320 }}>
            <Text style={styles.modalSection}>Scheduled classes</Text>
            {classesThisDay.map((c) => {
              const att = attendanceThisDay.find((a) => a.studentId === c.studentId && a.courseName === c.courseName);
              const status = att ? STATUS_COLORS[att.status] : "#9CA3AF";
              return (
                <View key={c.enrollmentId} style={styles.modalItem}>
                  <View style={styles.modalItemMain}>
                    <Text style={styles.modalItemTitle}>{c.studentName}</Text>
                    <Text style={styles.modalItemSubtitle}>
                      {c.courseName ?? "Class"}
                      {c.startTime ? ` · ${c.startTime.slice(0, 5)}` : ""}
                    </Text>
                    {att ? (
                      <Text style={[styles.modalItemStatus, { color: status }]}>
                        {att.status.charAt(0).toUpperCase() + att.status.slice(1)}
                      </Text>
                    ) : null}
                  </View>
                  {isFuture && !att ? (
                    <Pressable
                      style={({ pressed }) => [styles.rescheduleButton, pressed && styles.pressed]}
                      onPress={() => {
                        onClose();
                        onReschedule(c.enrollmentId, key, c.studentId, c.courseName);
                      }}
                    >
                      <Ionicons name="swap-horizontal" size={16} color="#615DFA" />
                      <Text style={styles.rescheduleText}>Reschedule</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F6FB" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F6F6FB" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, justifyContent: "space-between" },
  navButton: { padding: 8, borderRadius: 12, backgroundColor: "#FFFFFF" },
  monthLabelButton: { alignItems: "center" },
  monthLabel: { fontSize: 18, fontWeight: "800", color: "#111827" },
  todayHint: { fontSize: 10, color: "#9CA3AF", marginTop: 2 },
  errorCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: "#FEE2E2", padding: 12, borderRadius: 12 },
  errorText: { color: "#991B1B", fontSize: 13 },
  weekdays: { flexDirection: "row", paddingHorizontal: 12, marginBottom: 6 },
  weekdayLabel: { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "700", color: "#6B7280" },
  grid: { paddingHorizontal: 12 },
  gridRow: { flexDirection: "row" },
  cell: {
    flex: 1,
    aspectRatio: 1,
    margin: 2,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  cellEmpty: { flex: 1, aspectRatio: 1, margin: 2 },
  cellToday: { borderWidth: 2, borderColor: "#615DFA" },
  cellSelected: { backgroundColor: "#615DFA" },
  cellDate: { fontSize: 14, fontWeight: "600", color: "#374151" },
  cellDateToday: { color: "#615DFA", fontWeight: "800" },
  cellDateSelected: { color: "#FFFFFF" },
  cellDots: { flexDirection: "row", gap: 2, marginTop: 2, height: 4 },
  dot: { width: 4, height: 4, borderRadius: 2 },
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
});
