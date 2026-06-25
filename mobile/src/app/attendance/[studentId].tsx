import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";

type Activity = { lesson: string; mission: string };

type AttendanceRow = {
  id: string;
  date: string;
  status: "present" | "absent" | "late" | "excused";
  classType: "Physical" | "Online" | null;
  lastActivity: string | null;
  activities: Activity[] | null;
  instructorName: string | null;
  adcoin: number;
  projectPhotos: string[] | null;
  courseName: string | null;
};

const STATUS_STYLES: Record<AttendanceRow["status"], { bg: string; fg: string; label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  present: { bg: "#D1FAE5", fg: "#065F46", label: "Present", icon: "checkmark-circle" },
  late: { bg: "#FEF3C7", fg: "#92400E", label: "Late", icon: "time" },
  absent: { bg: "#FEE2E2", fg: "#991B1B", label: "Absent", icon: "close-circle" },
  excused: { bg: "#E0E7FF", fg: "#3730A3", label: "Excused", icon: "remove-circle" },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export default function StudentAttendanceScreen() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const router = useRouter();
  const [studentName, setStudentName] = useState<string>("");
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const load = async () => {
    if (!studentId) return;
    setErrorMessage(null);
    try {
      const { data: student, error: stuErr } = await supabase
        .from("students")
        .select("name")
        .eq("id", studentId)
        .maybeSingle();
      if (stuErr) throw stuErr;
      setStudentName((student?.name as string) ?? "");

      const { data, error } = await supabase
        .from("attendance")
        .select(`
          id,
          date,
          status,
          class_type,
          last_activity,
          activities,
          instructor_name,
          adcoin,
          project_photos,
          enrollment:enrollments!inner(
            student_id,
            course:courses(name)
          )
        `)
        .eq("enrollment.student_id", studentId)
        .order("date", { ascending: false })
        .limit(50);
      if (error) throw error;

      const mapped: AttendanceRow[] = (data ?? []).map((a) => {
        const enr = a.enrollment as unknown as { course: { name: string } | null } | null;
        return {
          id: a.id as string,
          date: a.date as string,
          status: (a.status as AttendanceRow["status"]) ?? "absent",
          classType: (a.class_type as AttendanceRow["classType"]) ?? null,
          lastActivity: (a.last_activity as string | null) ?? null,
          activities: (a.activities as Activity[] | null) ?? null,
          instructorName: (a.instructor_name as string | null) ?? null,
          adcoin: Number(a.adcoin ?? 0),
          projectPhotos: (a.project_photos as string[] | null) ?? null,
          courseName: enr?.course?.name ?? null,
        };
      });
      setRecords(mapped);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load attendance");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <Stack.Screen options={{ title: "Attendance", headerShown: true }} />
        <ActivityIndicator color="#615DFA" />
      </SafeAreaView>
    );
  }

  const presentCount = records.filter((r) => r.status === "present" || r.status === "late").length;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen options={{ title: studentName || "Attendance", headerShown: true, headerTintColor: "#615DFA" }} />
      {errorMessage ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <FlatList
        data={records}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#615DFA" />}
        ListHeaderComponent={
          <View style={styles.summary}>
            <View style={styles.summaryMetric}>
              <Text style={styles.summaryValue}>{records.length}</Text>
              <Text style={styles.summaryLabel}>Records</Text>
            </View>
            <View style={styles.summaryMetric}>
              <Text style={styles.summaryValue}>{presentCount}</Text>
              <Text style={styles.summaryLabel}>Attended</Text>
            </View>
            <View style={styles.summaryMetric}>
              <Text style={styles.summaryValue}>{records.reduce((sum, r) => sum + r.adcoin, 0)}</Text>
              <Text style={styles.summaryLabel}>Adcoins earned</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No attendance yet</Text>
            <Text style={styles.emptyText}>Records will appear here once your child attends their first class.</Text>
          </View>
        }
        renderItem={({ item }) => <AttendanceCard row={item} onPhotoPress={setSelectedPhoto} />}
      />

      {selectedPhoto ? <PhotoViewer uri={selectedPhoto} onClose={() => setSelectedPhoto(null)} /> : null}
    </SafeAreaView>
  );
}

function AttendanceCard({ row, onPhotoPress }: { row: AttendanceRow; onPhotoPress: (uri: string) => void }) {
  const statusStyle = STATUS_STYLES[row.status];
  const activities = row.activities ?? [];
  const fallbackLessonMission = row.lastActivity ? [{ lesson: row.lastActivity, mission: "" }] : [];
  const displayed = activities.length > 0 ? activities : fallbackLessonMission;
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.dateBlock}>
          <Text style={styles.dateText}>{formatDate(row.date)}</Text>
          {row.courseName ? <Text style={styles.courseText}>{row.courseName}</Text> : null}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Ionicons name={statusStyle.icon} size={14} color={statusStyle.fg} />
          <Text style={[styles.statusText, { color: statusStyle.fg }]}>{statusStyle.label}</Text>
        </View>
      </View>

      {displayed.length > 0 ? (
        <View style={styles.activitiesBlock}>
          {displayed.map((a, i) => (
            <View key={i} style={styles.activityRow}>
              {a.lesson ? <Text style={styles.activityText}>📘 {a.lesson}</Text> : null}
              {a.mission ? <Text style={styles.activityText}>🎯 {a.mission}</Text> : null}
            </View>
          ))}
        </View>
      ) : null}

      {row.projectPhotos && row.projectPhotos.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosRow}>
          {row.projectPhotos.map((url, idx) => (
            <Pressable key={idx} onPress={() => onPhotoPress(url)}>
              <Image source={{ uri: url }} style={styles.photo} />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.cardFooter}>
        {row.instructorName ? <Text style={styles.footerText}>Marked by {row.instructorName}</Text> : null}
        {row.adcoin > 0 ? (
          <View style={styles.adcoinBadge}>
            <Ionicons name="logo-bitcoin" size={12} color="#92400E" />
            <Text style={styles.adcoinText}>+{row.adcoin}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function PhotoViewer({ uri, onClose }: { uri: string; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  return (
    <Pressable style={[StyleSheet.absoluteFillObject, styles.photoModal]} onPress={onClose}>
      <Image source={{ uri }} style={{ width, height: height * 0.8 }} resizeMode="contain" />
      <View style={styles.photoCloseHint}>
        <Text style={styles.photoCloseText}>Tap anywhere to close</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F6FB" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F6F6FB" },
  errorCard: { marginHorizontal: 16, marginTop: 12, backgroundColor: "#FEE2E2", padding: 16, borderRadius: 12 },
  errorText: { color: "#991B1B", fontSize: 14 },
  list: { padding: 16, gap: 12 },
  summary: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    marginBottom: 4,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  summaryMetric: { alignItems: "center" },
  summaryValue: { fontSize: 24, fontWeight: "800", color: "#615DFA" },
  summaryLabel: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  empty: { padding: 32, alignItems: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 4 },
  emptyText: { fontSize: 14, color: "#6B7280", textAlign: "center", maxWidth: 280 },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    shadowColor: "#615DFA",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  dateBlock: { flex: 1 },
  dateText: { fontSize: 14, fontWeight: "700", color: "#111827" },
  courseText: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 12, fontWeight: "700" },
  activitiesBlock: { gap: 4, marginBottom: 12 },
  activityRow: { gap: 2 },
  activityText: { fontSize: 13, color: "#374151", lineHeight: 18 },
  photosRow: { marginBottom: 12 },
  photo: { width: 80, height: 80, borderRadius: 8, marginRight: 8, backgroundColor: "#F3F4F6" },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerText: { fontSize: 12, color: "#9CA3AF" },
  adcoinBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FEF3C7", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  adcoinText: { fontSize: 12, fontWeight: "700", color: "#92400E" },
  photoModal: { backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center", zIndex: 999 },
  photoCloseHint: { position: "absolute", bottom: 60 },
  photoCloseText: { color: "#FFFFFF", fontSize: 14, opacity: 0.7 },
});
