import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "@/components/TopBar";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useAuth } from "@/contexts/auth";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { supabase } from "@/lib/supabase";

type Child = { id: string; name: string; photo: string | null };
type Activity = { lesson: string; mission: string };
type AttendanceRow = {
  id: string;
  date: string;
  status: "present" | "absent" | "late" | "excused";
  lastActivity: string | null;
  activities: Activity[] | null;
  instructorName: string | null;
  adcoin: number;
  projectPhotos: string[] | null;
  courseName: string | null;
};
type Certification = {
  id: string;
  courseName: string | null;
  grade: string | null;
  code: string | null;
  dateIssued: string | null;
  template: string | null;
};

type Section = "attendance" | "certifications";

type ProgressData = {
  attendance: AttendanceRow[];
  certifications: Certification[];
};

const STATUS = {
  present: { bg: "#D1FAE5", fg: "#065F46", label: "Present", icon: "checkmark-circle" as const },
  late: { bg: "#FEF3C7", fg: "#92400E", label: "Late", icon: "time" as const },
  absent: { bg: "#FEE2E2", fg: "#991B1B", label: "Absent", icon: "close-circle" as const },
  excused: { bg: "#E0E7FF", fg: "#3730A3", label: "Excused", icon: "remove-circle" as const },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export default function ProgressScreen() {
  const { user } = useAuth();
  const userId = user?.id;
  const { studentId: paramStudentId } = useLocalSearchParams<{ studentId?: string }>();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [section, setSection] = useState<Section>("attendance");
  const [photoViewer, setPhotoViewer] = useState<string | null>(null);
  const [certPreview, setCertPreview] = useState<Certification | null>(null);

  // Stage 1: the parent's children (rarely changes, cached for offline).
  const fetchChildren = async (): Promise<Child[]> => {
    const { data: parentRow } = await supabase
      .from("parents")
      .select("id")
      .eq("auth_id", userId!)
      .is("deleted_at", null)
      .maybeSingle();
    if (!parentRow) return [];
    const { data: links } = await supabase
      .from("parent_students")
      .select("student:students!inner(id, name, photo, deleted_at)")
      .eq("parent_id", parentRow.id);
    return (links ?? [])
      .map((l) => l.student as unknown as { id: string; name: string; photo: string | null; deleted_at: string | null })
      .filter((s) => s && !s.deleted_at)
      .map((s) => ({ id: s.id, name: s.name, photo: s.photo }));
  };

  const childrenQuery = useCachedQuery<Child[]>(
    `progress:children:${userId ?? "anon"}`,
    fetchChildren,
    { enabled: !!userId },
  );
  const children = useMemo(() => childrenQuery.data ?? [], [childrenQuery.data]);

  // Pick the active child once children load — preferring a deep-linked id.
  useEffect(() => {
    if (children.length === 0) return;
    if (paramStudentId && children.some((c) => c.id === paramStudentId)) {
      setSelectedChildId(paramStudentId);
    } else if (!selectedChildId) {
      setSelectedChildId(children[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children, paramStudentId]);

  // Stage 2: attendance + certifications for the selected child (cached per child).
  const fetchProgress = async (): Promise<ProgressData> => {
    const [{ data: att, error: attErr }, { data: exams, error: examErr }] = await Promise.all([
      supabase
        .from("attendance")
        .select(`
          id,
          date,
          status,
          last_activity,
          activities,
          instructor_name,
          adcoin,
          project_photos,
          enrollment:enrollments!inner(student_id, course:courses(name))
        `)
        .eq("enrollment.student_id", selectedChildId!)
        .eq("status", "present")
        .order("date", { ascending: false })
        .limit(50),
      // Certificates live in the `certificates` table keyed directly by
      // student_id (not via examinations/enrollment). Best-effort: parents
      // may lack RLS read access, so its failure must NOT block attendance.
      supabase
        .from("certificates")
        .select("id, course_name, grade, code, date_issued, template")
        .eq("student_id", selectedChildId!)
        .order("date_issued", { ascending: false }),
    ]);
    if (attErr) throw attErr;

    const attendance: AttendanceRow[] = (att ?? []).map((a) => {
      const enr = a.enrollment as unknown as { course: { name: string } | null } | null;
      return {
        id: a.id as string,
        date: a.date as string,
        status: (a.status as AttendanceRow["status"]) ?? "absent",
        lastActivity: (a.last_activity as string | null) ?? null,
        activities: (a.activities as Activity[] | null) ?? null,
        instructorName: (a.instructor_name as string | null) ?? null,
        adcoin: Number(a.adcoin ?? 0),
        projectPhotos: (a.project_photos as string[] | null) ?? null,
        courseName: enr?.course?.name ?? null,
      };
    });
    const certRows = examErr ? [] : (exams ?? []);
    const certifications: Certification[] = certRows.map((c) => ({
      id: c.id as string,
      courseName: (c.course_name as string | null) ?? null,
      grade: (c.grade as string | null) ?? null,
      code: (c.code as string | null) ?? null,
      dateIssued: (c.date_issued as string | null) ?? null,
      template: (c.template as string | null) ?? null,
    }));
    return { attendance, certifications };
  };

  const dataQuery = useCachedQuery<ProgressData>(
    `progress:data:present:${selectedChildId ?? "none"}`,
    fetchProgress,
    { enabled: !!selectedChildId },
  );

  const loadingChildren = childrenQuery.loading;
  const loadingData = dataQuery.loading;
  const refreshing = dataQuery.refreshing;
  const attendance = dataQuery.data?.attendance ?? [];
  const certifications = dataQuery.data?.certifications ?? [];
  const isStale = childrenQuery.isStale || dataQuery.isStale;
  const updatedAt = dataQuery.updatedAt ?? childrenQuery.updatedAt;
  const errorMessage =
    (childrenQuery.error && !childrenQuery.data) || (dataQuery.error && !dataQuery.data)
      ? "Couldn't load progress. Check your connection and pull down to refresh."
      : null;

  const selectedChild = useMemo(
    () => children.find((c) => c.id === selectedChildId) ?? null,
    [children, selectedChildId],
  );

  if (loadingChildren) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <TopBar title="Progress" />
        <View style={styles.center}>
          <ActivityIndicator color="#615DFA" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <TopBar title="Progress" />

      {/* Child picker (horizontal scroll handles any number of children) */}
      {children.length > 1 ? (
        <View style={styles.pickerWrap}>
          <Text style={styles.pickerLabel}>
            {children.length} children · tap to switch
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.childPicker}
            contentContainerStyle={styles.childPickerContent}
          >
            {children.map((c) => {
              const isActive = c.id === selectedChildId;
              return (
                <Pressable
                  key={c.id}
                  style={[styles.childChip, isActive && styles.childChipActive]}
                  onPress={() => setSelectedChildId(c.id)}
                >
                  {c.photo ? (
                    <Image source={{ uri: c.photo }} style={styles.childChipAvatar} />
                  ) : (
                    <View
                      style={[
                        styles.childChipAvatar,
                        isActive ? styles.childChipAvatarFallbackActive : styles.childChipAvatarFallback,
                      ]}
                    >
                      <Text style={[styles.childChipInitial, isActive && { color: "#FFFFFF" }]}>
                        {c.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.childChipName, isActive && styles.childChipNameActive]} numberOfLines={1}>
                    {c.name.split(" ")[0]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {/* Selected child hero */}
      {selectedChild ? (
        <View style={styles.heroCard}>
          {selectedChild.photo ? (
            <Image source={{ uri: selectedChild.photo }} style={styles.heroAvatar} />
          ) : (
            <View style={[styles.heroAvatar, styles.heroAvatarFallback]}>
              <Text style={styles.heroAvatarInitial}>{selectedChild.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.heroEyebrow}>Viewing progress for</Text>
            <Text style={styles.heroName}>{selectedChild.name}</Text>
            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Ionicons name="ribbon-outline" size={12} color="#FFFFFF" />
                <Text style={styles.heroStatText}>{certifications.length} certs</Text>
              </View>
              <View style={styles.heroStat}>
                <Ionicons name="calendar-outline" size={12} color="#FFFFFF" />
                <Text style={styles.heroStatText}>{attendance.length} sessions</Text>
              </View>
            </View>
          </View>
        </View>
      ) : null}

      {/* Section switcher */}
      <View style={styles.sectionSwitcher}>
        <Pressable
          style={[styles.sectionTab, section === "attendance" && styles.sectionTabActive]}
          onPress={() => setSection("attendance")}
        >
          <Ionicons
            name="calendar"
            size={14}
            color={section === "attendance" ? "#FFFFFF" : "#6B7280"}
          />
          <Text style={[styles.sectionTabText, section === "attendance" && styles.sectionTabTextActive]}>
            Attendance
          </Text>
        </Pressable>
        <Pressable
          style={[styles.sectionTab, section === "certifications" && styles.sectionTabActive]}
          onPress={() => setSection("certifications")}
        >
          <Ionicons
            name="ribbon"
            size={14}
            color={section === "certifications" ? "#FFFFFF" : "#6B7280"}
          />
          <Text style={[styles.sectionTabText, section === "certifications" && styles.sectionTabTextActive]}>
            Certifications
          </Text>
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

      {section === "attendance" ? (
        <FlatList
          data={attendance}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={dataQuery.refetch} tintColor="#615DFA" />}
          ListEmptyComponent={
            loadingData ? (
              <View style={styles.center}><ActivityIndicator color="#615DFA" /></View>
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No attendance yet</Text>
                <Text style={styles.emptyText}>Records appear here once your child attends their first class.</Text>
              </View>
            )
          }
          renderItem={({ item }) => <AttendanceCard row={item} onPhoto={setPhotoViewer} />}
        />
      ) : (
        <FlatList
          data={certifications}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={dataQuery.refetch} tintColor="#615DFA" />}
          ListEmptyComponent={
            loadingData ? (
              <View style={styles.center}><ActivityIndicator color="#615DFA" /></View>
            ) : (
              <View style={styles.empty}>
                <Ionicons name="ribbon-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No certifications yet</Text>
                <Text style={styles.emptyText}>Certifications appear here when your child passes an exam.</Text>
              </View>
            )
          }
          renderItem={({ item }) => <CertCard cert={item} onPress={() => setCertPreview(item)} />}
        />
      )}

      {photoViewer ? <PhotoViewer uri={photoViewer} onClose={() => setPhotoViewer(null)} /> : null}
      {certPreview ? (
        <CertPreview
          cert={certPreview}
          studentName={selectedChild?.name ?? ""}
          onClose={() => setCertPreview(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}

function AttendanceCard({ row, onPhoto }: { row: AttendanceRow; onPhoto: (uri: string) => void }) {
  const meta = STATUS[row.status];
  const activities = row.activities ?? [];
  const fallback = row.lastActivity ? [{ lesson: row.lastActivity, mission: "" }] : [];
  const displayed = activities.length > 0 ? activities : fallback;
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardDate}>{formatDate(row.date)}</Text>
          {row.courseName ? <Text style={styles.cardSub}>{row.courseName}</Text> : null}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={14} color={meta.fg} />
          <Text style={[styles.statusText, { color: meta.fg }]}>{meta.label}</Text>
        </View>
      </View>
      {displayed.length > 0 ? (
        <View style={{ gap: 4, marginBottom: 8 }}>
          {displayed.map((a, i) => (
            <View key={i}>
              {a.lesson ? <Text style={styles.activityText}>📘 {a.lesson}</Text> : null}
              {a.mission ? <Text style={styles.activityText}>🎯 {a.mission}</Text> : null}
            </View>
          ))}
        </View>
      ) : null}
      {row.projectPhotos && row.projectPhotos.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          {row.projectPhotos.map((url, idx) => (
            <Pressable key={idx} onPress={() => onPhoto(url)}>
              <Image source={{ uri: url }} style={styles.photo} />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      <View style={styles.cardFooter}>
        {row.instructorName ? <Text style={styles.footerText}>By {row.instructorName}</Text> : <View />}
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

function CertCard({ cert, onPress }: { cert: Certification; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.certCard, pressed && styles.cardPressed]} onPress={onPress}>
      <View style={styles.certIconWrap}>
        <Ionicons name="ribbon" size={28} color="#F59E0B" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.certTitle}>{cert.courseName ?? "Certificate"}</Text>
        <View style={styles.certRow}>
          {cert.grade ? <Text style={styles.certMark}>Grade {cert.grade}</Text> : null}
          {cert.dateIssued ? (
            <Text style={styles.certDate}>{new Date(cert.dateIssued).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}</Text>
          ) : null}
        </View>
        {cert.code ? <Text style={styles.certNumber}>{cert.code}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </Pressable>
  );
}

function CertPreview({ cert, studentName, onClose }: { cert: Certification; studentName: string; onClose: () => void }) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.previewBackdrop} onPress={onClose} />
      <View style={styles.previewSheet}>
        <View style={styles.previewHandle} />
        <View style={styles.previewHeader}>
          <Ionicons name="ribbon" size={28} color="#F59E0B" />
          <Text style={styles.previewTitle}>Certificate of completion</Text>
        </View>
        <View style={styles.previewBody}>
          <PreviewRow label="Student" value={studentName} />
          {cert.courseName ? <PreviewRow label="Course" value={cert.courseName} /> : null}
          {cert.grade ? <PreviewRow label="Grade" value={cert.grade} /> : null}
          {cert.dateIssued ? (
            <PreviewRow
              label="Date"
              value={new Date(cert.dateIssued).toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" })}
            />
          ) : null}
          {cert.code ? <PreviewRow label="Cert. no." value={cert.code} /> : null}
        </View>
        <Pressable style={styles.previewClose} onPress={onClose}>
          <Text style={styles.previewCloseText}>Close</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.previewRow}>
      <Text style={styles.previewRowLabel}>{label}</Text>
      <Text style={styles.previewRowValue}>{value}</Text>
    </View>
  );
}

function PhotoViewer({ uri, onClose }: { uri: string; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  return (
    <Pressable style={[StyleSheet.absoluteFillObject, styles.photoModal]} onPress={onClose}>
      <Image source={{ uri }} style={{ width, height: height * 0.8 }} resizeMode="contain" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F6FB" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  pickerWrap: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  pickerLabel: { fontSize: 10, fontWeight: "800", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  childPicker: { flexGrow: 0 },
  childPickerContent: { gap: 8, paddingRight: 12 },
  childChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 6,
    paddingRight: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  childChipActive: {
    backgroundColor: "#615DFA",
    shadowColor: "#615DFA",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  childChipAvatar: { width: 32, height: 32, borderRadius: 16 },
  childChipAvatarFallback: { backgroundColor: "#E0E7FF", alignItems: "center", justifyContent: "center" },
  childChipAvatarFallbackActive: { backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
  childChipInitial: { color: "#615DFA", fontWeight: "800", fontSize: 13 },
  childChipName: { fontSize: 13, fontWeight: "700", color: "#0F172A", maxWidth: 100 },
  childChipNameActive: { color: "#FFFFFF" },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: "#0F172A",
    shadowColor: "#0F172A",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  heroAvatar: { width: 56, height: 56, borderRadius: 18 },
  heroAvatarFallback: { backgroundColor: "#615DFA", alignItems: "center", justifyContent: "center" },
  heroAvatarInitial: { color: "#FFFFFF", fontSize: 22, fontWeight: "800" },
  heroEyebrow: { fontSize: 10, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 1, fontWeight: "700" },
  heroName: { fontSize: 20, fontWeight: "800", color: "#FFFFFF", marginTop: 2, letterSpacing: -0.3 },
  heroStats: { flexDirection: "row", gap: 8, marginTop: 8 },
  heroStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  heroStatText: { fontSize: 11, color: "#FFFFFF", fontWeight: "700" },
  sectionSwitcher: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 4,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  sectionTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  sectionTabActive: { backgroundColor: "#615DFA" },
  sectionTabText: { fontSize: 13, fontWeight: "700", color: "#6B7280" },
  sectionTabTextActive: { color: "#FFFFFF" },
  errorCard: { marginHorizontal: 16, marginBottom: 8, backgroundColor: "#FEE2E2", padding: 12, borderRadius: 12 },
  errorText: { color: "#991B1B", fontSize: 13 },
  bannerWrap: { paddingHorizontal: 16, marginBottom: 8 },
  list: { padding: 16, gap: 12 },
  empty: { padding: 48, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  emptyText: { fontSize: 14, color: "#6B7280", textAlign: "center", maxWidth: 280 },
  card: { backgroundColor: "#FFFFFF", padding: 16, borderRadius: 16, shadowColor: "#615DFA", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  cardPressed: { opacity: 0.85 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  cardDate: { fontSize: 14, fontWeight: "700", color: "#111827" },
  cardSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 12, fontWeight: "700" },
  activityText: { fontSize: 13, color: "#374151", lineHeight: 18 },
  photo: { width: 80, height: 80, borderRadius: 8, marginRight: 8, backgroundColor: "#F3F4F6" },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerText: { fontSize: 12, color: "#9CA3AF" },
  adcoinBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FEF3C7", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  adcoinText: { fontSize: 12, fontWeight: "700", color: "#92400E" },
  certCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#615DFA",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  certIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#FEF3C7", alignItems: "center", justifyContent: "center" },
  certTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  certRow: { flexDirection: "row", gap: 12, marginTop: 4, alignItems: "center" },
  certMark: { fontSize: 16, fontWeight: "800", color: "#615DFA" },
  certDate: { fontSize: 12, color: "#6B7280" },
  certNumber: { fontSize: 11, color: "#9CA3AF", marginTop: 4 },
  previewBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  previewSheet: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  previewHandle: { width: 40, height: 4, backgroundColor: "#E5E7EB", borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  previewHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  previewTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  previewBody: { gap: 4 },
  previewRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  previewRowLabel: { fontSize: 13, color: "#6B7280" },
  previewRowValue: { fontSize: 13, color: "#111827", fontWeight: "700", flex: 1, textAlign: "right", marginLeft: 16 },
  previewImage: { width: "100%", height: 200, borderRadius: 8, marginTop: 16, backgroundColor: "#F3F4F6" },
  previewButton: { marginTop: 16, height: 48, backgroundColor: "#615DFA", borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  previewButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  previewPending: { marginTop: 16, fontSize: 13, color: "#9CA3AF", fontStyle: "italic", textAlign: "center" },
  previewClose: { marginTop: 12, alignItems: "center", paddingVertical: 12 },
  previewCloseText: { color: "#6B7280", fontSize: 14, fontWeight: "700" },
  photoModal: { backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center", zIndex: 999 },
});
