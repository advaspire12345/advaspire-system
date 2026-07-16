import { useCallback, useEffect, useMemo, useState } from "react";
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
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "@/components/TopBar";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useAuth } from "@/contexts/auth";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { useProgressBadge } from "@/contexts/progressBadge";
import { useNicknames } from "@/contexts/nicknames";
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

type LedgerRow = {
  id: string;
  originalDate: string;
  originalTime: string | null;
  newDate: string;
  newDay: string | null;
  newTime: string | null;
  createdAt: string | null;
  courseName: string | null;
};

type Section = "attendance" | "certifications" | "ledger";

type ProgressData = {
  attendance: AttendanceRow[];
  certifications: Certification[];
  ledger: LedgerRow[];
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}
function shortDate(iso: string): string {
  return new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short" });
}
function time12(t: string | null): string {
  if (!t) return "";
  const [h, m] = t.split(":").map((n) => parseInt(n, 10));
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
// System palette (mirrors the Schedule tab) — a child's default colour by order.
const CHILD_PALETTE = ["#2563EB", "#F97316", "#7C3AED", "#0D9488", "#DB2777", "#CA8A04"];

// "New this week" highlight: attended within the last 7 days.
function isRecent(iso: string): boolean {
  const d = new Date(iso + "T00:00:00").getTime();
  return Date.now() - d <= 7 * 86_400_000 && d <= Date.now();
}

export default function ProgressScreen() {
  const { user } = useAuth();
  const userId = user?.id;
  const { studentId: paramStudentId } = useLocalSearchParams<{ studentId?: string }>();
  const { markSeen } = useProgressBadge();
  const nick = useNicknames();
  // Opening Progress clears the "new" dot on the tab.
  useFocusEffect(useCallback(() => { markSeen(); }, [markSeen]));
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [nickEditFor, setNickEditFor] = useState<Child | null>(null);
  const [section, setSection] = useState<Section>("attendance");
  const [photoViewer, setPhotoViewer] = useState<string[] | null>(null);
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
    const [{ data: att, error: attErr }, { data: exams, error: examErr }, { data: resched, error: reschedErr }] = await Promise.all([
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
      // Class-credit ledger = the child's reschedule history. Best-effort:
      // parents may lack RLS read access, so failure must NOT block the page.
      supabase
        .from("session_reschedules")
        .select("id, original_date, original_slot_time, new_date, new_slot_day, new_slot_time, created_at, course:courses(name)")
        .eq("student_id", selectedChildId!)
        .order("created_at", { ascending: false }),
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

    const ledgerRows = reschedErr ? [] : (resched ?? []);
    const ledger: LedgerRow[] = ledgerRows.map((r) => {
      const course = r.course as unknown as { name: string } | null;
      return {
        id: r.id as string,
        originalDate: r.original_date as string,
        originalTime: (r.original_slot_time as string | null) ?? null,
        newDate: r.new_date as string,
        newDay: (r.new_slot_day as string | null) ?? null,
        newTime: (r.new_slot_time as string | null) ?? null,
        createdAt: (r.created_at as string | null) ?? null,
        courseName: course?.name ?? null,
      };
    });

    return { attendance, certifications, ledger };
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
  const ledger = dataQuery.data?.ledger ?? [];
  const newThisWeek = useMemo(() => attendance.filter((a) => isRecent(a.date)).length, [attendance]);
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

  // Each child's colour: custom override, else system palette by order.
  const childColorOf = (id: string) =>
    nick.color(id) ?? CHILD_PALETTE[Math.max(0, children.findIndex((c) => c.id === id)) % CHILD_PALETTE.length];

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
                  <View>
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
                    <View style={[styles.colorDotSmall, { backgroundColor: childColorOf(c.id) }]} />
                  </View>
                  <Text style={[styles.childChipName, isActive && styles.childChipNameActive]} numberOfLines={1}>
                    {nick.label(c.id, c.name)}
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
          <View>
            {selectedChild.photo ? (
              <Image source={{ uri: selectedChild.photo }} style={styles.heroAvatar} />
            ) : (
              <View style={[styles.heroAvatar, styles.heroAvatarFallback]}>
                <Text style={styles.heroAvatarInitial}>{selectedChild.name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={[styles.colorDotBig, { backgroundColor: childColorOf(selectedChild.id) }]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroEyebrow}>Viewing progress for</Text>
            <View style={styles.heroNameRow}>
              <View style={{ flexShrink: 1 }}>
                <Text style={styles.heroName} numberOfLines={1}>
                  {nick.raw(selectedChild.id) ?? selectedChild.name}
                </Text>
                {/* Keep the real name visible (smaller) once a nickname is set. */}
                {nick.raw(selectedChild.id) ? (
                  <Text style={styles.heroRealName} numberOfLines={1}>{selectedChild.name}</Text>
                ) : null}
              </View>
              <Pressable onPress={() => setNickEditFor(selectedChild)} hitSlop={8} style={styles.heroPen}>
                <Ionicons name="pencil" size={13} color="#FFFFFF" />
              </Pressable>
            </View>
            <View style={styles.heroStats}>
              {newThisWeek > 0 ? (
                <View style={[styles.heroStat, styles.heroStatNew]}>
                  <Text style={styles.heroStatText}>🎉 {newThisWeek} new this week</Text>
                </View>
              ) : null}
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
            Certs
          </Text>
        </Pressable>
        <Pressable
          style={[styles.sectionTab, section === "ledger" && styles.sectionTabActive]}
          onPress={() => setSection("ledger")}
        >
          <Ionicons
            name="swap-horizontal"
            size={14}
            color={section === "ledger" ? "#FFFFFF" : "#6B7280"}
          />
          <Text style={[styles.sectionTabText, section === "ledger" && styles.sectionTabTextActive]}>
            Ledger
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
      ) : section === "certifications" ? (
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
      ) : (
        <FlatList
          data={ledger}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={dataQuery.refetch} tintColor="#615DFA" />}
          ListHeaderComponent={
            ledger.length > 0 ? (
              <View style={styles.ledgerNote}>
                <Ionicons name="shield-checkmark" size={15} color="#065F46" />
                <Text style={styles.ledgerNoteText}>Rescheduling a class <Text style={{ fontWeight: "800" }}>moves</Text> it — no session credit is used up.</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            loadingData ? (
              <View style={styles.center}><ActivityIndicator color="#615DFA" /></View>
            ) : (
              <View style={styles.empty}>
                <Ionicons name="swap-horizontal" size={48} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No reschedules yet</Text>
                <Text style={styles.emptyText}>When you move a class to another day, it&apos;ll be logged here so you can see the class credit was kept, not lost.</Text>
              </View>
            )
          }
          renderItem={({ item }) => <LedgerCard row={item} />}
        />
      )}

      {nickEditFor ? (
        <NicknameModal
          child={nickEditFor}
          systemColor={CHILD_PALETTE[Math.max(0, children.findIndex((c) => c.id === nickEditFor.id)) % CHILD_PALETTE.length]}
          onClose={() => setNickEditFor(null)}
        />
      ) : null}
      {photoViewer ? <PhotoViewer uris={photoViewer} onClose={() => setPhotoViewer(null)} /> : null}
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

// Colours the parent can pick for a child. "Auto" (null) keeps the system colour.
const COLOR_CHOICES = ["#2563EB", "#F97316", "#7C3AED", "#0D9488", "#DB2777", "#CA8A04", "#DC2626", "#0891B2", "#16A34A", "#4F46E5"];

function NicknameModal({ child, systemColor, onClose }: { child: Child; systemColor: string; onClose: () => void }) {
  const nick = useNicknames();
  const [value, setValue] = useState(nick.raw(child.id) ?? "");
  const [color, setColor] = useState<string | null>(nick.color(child.id));
  const save = () => { nick.setNickname(child.id, value); nick.setColor(child.id, color); onClose(); };
  const clearAll = () => { nick.setNickname(child.id, ""); nick.setColor(child.id, null); onClose(); };
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.previewBackdrop} onPress={onClose} />
      <View style={styles.nickSheet}>
        <View style={styles.previewHandle} />
        <Text style={styles.nickTitle}>Edit {child.name.split(" ")[0]}</Text>
        <Text style={styles.nickSub}>A nickname and colour to recognise {child.name} — only you see these, on this device.</Text>

        <Text style={styles.nickLabel}>Nickname</Text>
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder={child.name.split(" ")[0]}
          placeholderTextColor="#9CA3AF"
          style={styles.nickInput}
          maxLength={24}
        />

        <Text style={styles.nickLabel}>Colour</Text>
        <View style={styles.swatchRow}>
          {/* Auto = system colour */}
          <Pressable onPress={() => setColor(null)} style={[styles.swatch, { backgroundColor: systemColor }, color === null && styles.swatchOn]}>
            <Text style={styles.swatchAuto}>A</Text>
          </Pressable>
          {COLOR_CHOICES.map((c) => (
            <Pressable key={c} onPress={() => setColor(c)} style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchOn]}>
              {color === c ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
            </Pressable>
          ))}
        </View>

        <View style={styles.nickBtns}>
          <Pressable style={[styles.nickBtn, styles.nickBtnGhost]} onPress={clearAll}>
            <Text style={styles.nickBtnGhostText}>Reset</Text>
          </Pressable>
          <Pressable style={[styles.nickBtn, styles.nickBtnPrimary]} onPress={save}>
            <Text style={styles.nickBtnPrimaryText}>Save</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function LedgerCard({ row }: { row: LedgerRow }) {
  return (
    <View style={styles.card}>
      <View style={styles.ledgerHead}>
        <View style={styles.ledgerIcon}><Ionicons name="swap-horizontal" size={16} color="#615DFA" /></View>
        <Text style={styles.ledgerCourse} numberOfLines={1}>{row.courseName ?? "Class"}</Text>
        <View style={styles.ledgerKeptPill}>
          <Ionicons name="checkmark-circle" size={12} color="#065F46" />
          <Text style={styles.ledgerKeptText}>Credit kept</Text>
        </View>
      </View>
      <View style={styles.ledgerMoveRow}>
        <View style={styles.ledgerCol}>
          <Text style={styles.ledgerColLabel}>From</Text>
          <Text style={styles.ledgerColDate}>{shortDate(row.originalDate)}</Text>
          {row.originalTime ? <Text style={styles.ledgerColTime}>{time12(row.originalTime)}</Text> : null}
        </View>
        <Ionicons name="arrow-forward" size={18} color="#9CA3AF" />
        <View style={styles.ledgerCol}>
          <Text style={styles.ledgerColLabel}>To</Text>
          <Text style={[styles.ledgerColDate, { color: "#615DFA" }]}>{shortDate(row.newDate)}</Text>
          {row.newTime ? <Text style={styles.ledgerColTime}>{time12(row.newTime)}</Text> : null}
        </View>
      </View>
      {row.createdAt ? <Text style={styles.ledgerWhen}>Requested {shortDate(row.createdAt.slice(0, 10))}</Text> : null}
    </View>
  );
}

function AttendanceCard({ row, onPhoto }: { row: AttendanceRow; onPhoto: (uris: string[]) => void }) {
  const activities = row.activities ?? [];
  const fallback = row.lastActivity ? [{ lesson: row.lastActivity, mission: "" }] : [];
  const displayed = activities.length > 0 ? activities : fallback;
  const photos = row.projectPhotos ?? [];
  const hasPhoto = photos.length > 0;
  const recent = isRecent(row.date);
  const built = displayed.find((a) => a.lesson)?.lesson ?? null;
  // Every row is a button (press feedback); a row with photo(s) opens the viewer.
  return (
    <Pressable
      style={({ pressed }) => [styles.card, styles.cardButton, recent && styles.cardRecent, pressed && styles.cardPressed]}
      onPress={hasPhoto ? () => onPhoto(photos) : undefined}
    >
      {/* Recent sessions get an achievement banner — the "completed today" moment. */}
      {recent ? (
        <View style={styles.achieveBanner}>
          <Text style={styles.achieveText} numberOfLines={2}>
            🎉 {row.courseName ? `${row.courseName}: ` : ""}{built ? `built ${built}` : "attended a session"}
          </Text>
          <View style={styles.newTag}><Text style={styles.newTagText}>NEW</Text></View>
        </View>
      ) : null}
      {/* Date/course on the left · work done on the right (no status badge —
          this list only shows present sessions). */}
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardDate}>{formatDate(row.date)}</Text>
          {row.courseName ? <Text style={styles.cardSub}>{row.courseName}</Text> : null}
        </View>
        {displayed.length > 0 ? (
          <View style={styles.workCol}>
            <Text style={styles.workLabel}>Work done</Text>
            {displayed.map((a, i) => (
              <View key={i} style={styles.workItem}>
                {a.lesson ? <Text style={styles.workLesson} numberOfLines={2}>{a.lesson}</Text> : null}
                {a.mission ? <Text style={styles.workMission} numberOfLines={2}>{a.mission}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {(hasPhoto || row.adcoin > 0 || row.instructorName) ? (
        <View style={styles.cardFooter}>
          {hasPhoto ? (
            <View style={styles.photoNotice}>
              <Ionicons name="image" size={14} color="#615DFA" />
              <Text style={styles.photoNoticeText}>
                {photos.length > 1 ? `${photos.length} photos · Tap to view` : "Photo · Tap to view"}
              </Text>
            </View>
          ) : row.instructorName ? (
            <Text style={styles.footerText}>By {row.instructorName}</Text>
          ) : (
            <View />
          )}
          {row.adcoin > 0 ? (
            <View style={styles.adcoinBadge}>
              <Ionicons name="logo-bitcoin" size={12} color="#92400E" />
              <Text style={styles.adcoinText}>+{row.adcoin}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </Pressable>
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

function PhotoViewer({ uris, onClose }: { uris: string[]; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={[StyleSheet.absoluteFillObject, styles.photoModal]}>
        {uris.length > 1 ? (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {uris.map((uri, i) => (
              <View key={i} style={{ width, alignItems: "center", justifyContent: "center" }}>
                <Image source={{ uri }} style={{ width, height: height * 0.8 }} resizeMode="contain" />
              </View>
            ))}
          </ScrollView>
        ) : (
          <Image source={{ uri: uris[0] }} style={{ width, height: height * 0.8 }} resizeMode="contain" />
        )}
        <Pressable style={styles.photoClose} onPress={onClose} hitSlop={12}>
          <Ionicons name="close" size={22} color="#FFFFFF" />
        </Pressable>
        {uris.length > 1 ? <Text style={styles.photoCount}>Swipe · {uris.length} photos</Text> : null}
      </View>
    </Modal>
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
  colorDotSmall: { position: "absolute", right: -1, bottom: -1, width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: "#FFFFFF" },
  colorDotBig: { position: "absolute", right: -2, bottom: -2, width: 16, height: 16, borderRadius: 8, borderWidth: 2.5, borderColor: "#0F172A" },
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
  heroNameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  heroName: { fontSize: 20, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.3, flexShrink: 1 },
  heroRealName: { fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: "600", marginTop: 1 },
  heroPen: { width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  nickSheet: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  nickTitle: { fontSize: 18, fontWeight: "800", color: "#111827", marginTop: 4 },
  nickSub: { fontSize: 13, color: "#6B7280", marginTop: 4, lineHeight: 18 },
  nickLabel: { fontSize: 11, fontWeight: "800", color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.6, marginTop: 16, marginBottom: 6 },
  nickInput: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: "#111827", backgroundColor: "#F9FAFB" },
  swatchRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  swatch: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "transparent" },
  swatchOn: { borderColor: "#0F172A" },
  swatchAuto: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  nickBtns: { flexDirection: "row", gap: 12, marginTop: 16 },
  nickBtn: { flex: 1, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  nickBtnGhost: { backgroundColor: "#F3F4F6" },
  nickBtnGhostText: { color: "#6B7280", fontSize: 15, fontWeight: "700" },
  nickBtnPrimary: { backgroundColor: "#615DFA" },
  nickBtnPrimaryText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
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
  heroStatNew: { backgroundColor: "rgba(97,93,250,0.55)" },
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
  cardButton: { borderWidth: 1, borderColor: "#EEF0F6" },
  cardRecent: { borderColor: "#C7D2FE", borderWidth: 1.5 },
  cardPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  achieveBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#EEF2FF", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 12 },
  achieveText: { flex: 1, fontSize: 12, fontWeight: "800", color: "#3730A3" },
  newTag: { backgroundColor: "#615DFA", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  newTagText: { fontSize: 9, fontWeight: "900", color: "#FFFFFF", letterSpacing: 0.5 },
  ledgerNote: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#BBF7D0", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 4 },
  ledgerNoteText: { flex: 1, fontSize: 12, color: "#065F46", fontWeight: "600", lineHeight: 16 },
  ledgerHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  ledgerIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" },
  ledgerCourse: { flex: 1, fontSize: 14, fontWeight: "800", color: "#111827" },
  ledgerKeptPill: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#D1FAE5", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  ledgerKeptText: { fontSize: 11, fontWeight: "800", color: "#065F46" },
  ledgerMoveRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  ledgerCol: { flex: 1, gap: 1 },
  ledgerColLabel: { fontSize: 9, fontWeight: "800", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.6 },
  ledgerColDate: { fontSize: 15, fontWeight: "800", color: "#111827" },
  ledgerColTime: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
  ledgerWhen: { fontSize: 11, color: "#9CA3AF", marginTop: 10, fontWeight: "600" },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  cardLeft: { flexShrink: 0, maxWidth: "45%" },
  cardDate: { fontSize: 14, fontWeight: "700", color: "#111827" },
  cardSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  workCol: { flex: 1, alignItems: "flex-end", gap: 2 },
  workLabel: { fontSize: 9, fontWeight: "800", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.6 },
  workItem: { alignItems: "flex-end" },
  workLesson: { fontSize: 13, color: "#111827", fontWeight: "700", textAlign: "right", lineHeight: 18 },
  workMission: { fontSize: 12, color: "#615DFA", fontWeight: "600", textAlign: "right", lineHeight: 16 },
  photoNotice: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#EEF2FF", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  photoNoticeText: { fontSize: 12, fontWeight: "700", color: "#615DFA" },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
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
  photoClose: { position: "absolute", top: 56, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  photoCount: { position: "absolute", bottom: 60, alignSelf: "center", color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "600" },
});
