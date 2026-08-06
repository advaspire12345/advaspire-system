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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "@/components/TopBar";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useAuth } from "@/contexts/auth";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { useProgressBadge } from "@/contexts/progressBadge";
import { useNicknames } from "@/contexts/nicknames";
import { supabase } from "@/lib/supabase";
import { MediaGallery, type MediaItem } from "@/components/MediaGallery";
import { C, cardShadow, cardShadowLg } from "@/theme/tech";

const WD3 = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MO3 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function longDay(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return `${WD3[d.getDay()]}, ${d.getDate()} ${MO3[d.getMonth()]} ${d.getFullYear()}`;
}
function shortFullDate(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return `${d.getDate()} ${MO3[d.getMonth()]} ${d.getFullYear()}`;
}

type Child = { id: string; name: string; photo: string | null; adcoinBalance: number };
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
  media: MediaItem[]; // all photos + videos for the session (per-lesson + legacy)
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

type Section = "lessons" | "results" | "skills" | "gallery";

// Derived from lesson_ratings (effort/knowledge/behaviour, 0–5) averaged over all
// rated lessons. count = how many lessons were rated (0 = no data yet).
type Skills = { problem: number; logical: number; teamwork: number; count: number };

type AsmtMeta = { title: string | null; total_marks: number | null; pass_pct: number | null; distinction_pct: number | null };

// Latest marked assessment (from assessment_attempts + assessments) for the Results tab.
type Assessment = {
  title: string;
  score: number;          // final_score
  total: number;          // total_marks
  passPct: number;
  distinctionPct: number;
  parts: { label: string; value: number; max: number; color: string }[];
} | null;

type ProgressData = {
  attendance: AttendanceRow[];  // ALL statuses (present + absent) newest-first
  certifications: Certification[];
  ledger: LedgerRow[];
  skills: Skills;
  assessment: Assessment;
  attStats: { present: number; missed: number; rate: number };
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
  const { studentId: paramStudentId, section: paramSection } = useLocalSearchParams<{ studentId?: string; section?: string }>();
  const { markSeen } = useProgressBadge();
  const nick = useNicknames();
  const router = useRouter();
  // Opening Progress clears the "new" dot on the tab.
  useFocusEffect(useCallback(() => { markSeen(); }, [markSeen]));
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [nickEditFor, setNickEditFor] = useState<Child | null>(null);
  const [section, setSection] = useState<Section>(
    (["lessons", "results", "skills", "gallery"] as const).includes(paramSection as Section) ? (paramSection as Section) : "lessons",
  );
  const [gallery, setGallery] = useState<{ items: MediaItem[]; index: number } | null>(null);
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
      .select("student:students!inner(id, name, photo, adcoin_balance, deleted_at)")
      .eq("parent_id", parentRow.id);
    return (links ?? [])
      .map((l) => l.student as unknown as { id: string; name: string; photo: string | null; adcoin_balance: number | null; deleted_at: string | null })
      .filter((s) => s && !s.deleted_at)
      .map((s) => ({ id: s.id, name: s.name, photo: s.photo, adcoinBalance: Number(s.adcoin_balance ?? 0) }));
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
    const [{ data: att, error: attErr }, { data: exams, error: examErr }, { data: resched, error: reschedErr }, { data: ratingRows }, { data: assessRows }] = await Promise.all([
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
        .order("date", { ascending: false })
        .limit(60),
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
      // Per-lesson skill ratings (effort/knowledge/behaviour, 0–5) — averaged for
      // the Skills sub-tab. Best-effort; empty until trainers start rating.
      supabase
        .from("lesson_ratings")
        .select("effort, knowledge, behaviour")
        .eq("student_id", selectedChildId!),
      // Latest MARKED assessment for the Results tab. Best-effort.
      supabase
        .from("assessment_attempts")
        .select("final_score, part_a_score, part_b_marks, part_c_marks, marked_at, assessment:assessments(title, level, total_marks, pass_pct, distinction_pct)")
        .eq("student_id", selectedChildId!)
        .not("final_score", "is", null)
        .order("marked_at", { ascending: false })
        .limit(1),
    ]);
    if (attErr) throw attErr;

    const attendance: AttendanceRow[] = (att ?? []).map((a) => {
      const enr = a.enrollment as unknown as { course: { name: string } | null } | null;
      // The instructor attaches media PER LESSON inside the activities JSON
      // ({ lesson, photos[], video }). Older sessions kept photos on the row's
      // project_photos column. Gather everything into one photo+video list.
      const rawActs = (a.activities as { photos?: string[]; video?: string | null }[] | null) ?? [];
      const media: MediaItem[] = [];
      for (const act of rawActs) {
        for (const p of act?.photos ?? []) if (p && !media.some((m) => m.url === p)) media.push({ type: "photo", url: p });
        if (act?.video && !media.some((m) => m.url === act.video)) media.push({ type: "video", url: act.video });
      }
      for (const p of (a.project_photos as string[] | null) ?? []) if (p && !media.some((m) => m.url === p)) media.push({ type: "photo", url: p });
      return {
        id: a.id as string,
        date: a.date as string,
        status: (a.status as AttendanceRow["status"]) ?? "absent",
        lastActivity: (a.last_activity as string | null) ?? null,
        activities: (a.activities as Activity[] | null) ?? null,
        instructorName: (a.instructor_name as string | null) ?? null,
        adcoin: Number(a.adcoin ?? 0),
        projectPhotos: (a.project_photos as string[] | null) ?? null,
        media,
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

    // Skills = average of each rating dimension across all rated lessons.
    const rr = (ratingRows ?? []) as { effort: number | null; knowledge: number | null; behaviour: number | null }[];
    const avg = (key: "effort" | "knowledge" | "behaviour") => {
      const vals = rr.map((r) => Number(r[key] ?? 0)).filter((n) => n > 0);
      return vals.length ? vals.reduce((s, n) => s + n, 0) / vals.length : 0;
    };
    const skills: Skills = { problem: avg("effort"), logical: avg("knowledge"), teamwork: avg("behaviour"), count: rr.length };

    // Attendance stats (all statuses).
    const present = attendance.filter((a) => a.status === "present").length;
    const missed = attendance.filter((a) => a.status === "absent").length;
    const attStats = { present, missed, rate: present + missed > 0 ? Math.round((present / (present + missed)) * 100) : 0 };

    // Latest marked assessment → Results card.
    const sumJson = (j: unknown): number => {
      if (Array.isArray(j)) return j.reduce((s: number, v) => s + Number(v ?? 0), 0);
      if (j && typeof j === "object") return Object.values(j as Record<string, unknown>).reduce((s: number, v) => s + Number(v ?? 0), 0);
      return 0;
    };
    let assessment: Assessment = null;
    const a0 = (assessRows ?? [])[0] as unknown as { final_score: number | null; part_a_score: number | null; part_b_marks: unknown; part_c_marks: unknown; assessment: AsmtMeta | AsmtMeta[] | null } | undefined;
    if (a0) {
      const asmt = Array.isArray(a0.assessment) ? a0.assessment[0] ?? null : a0.assessment;
      const pa = Number(a0.part_a_score ?? 0), pb = sumJson(a0.part_b_marks), pc = sumJson(a0.part_c_marks);
      const maxPart = Math.max(1, pa, pb, pc);
      assessment = {
        title: asmt?.title ?? "Assessment",
        score: Number(a0.final_score ?? 0),
        total: Number(asmt?.total_marks ?? 100),
        passPct: Number(asmt?.pass_pct ?? 50),
        distinctionPct: Number(asmt?.distinction_pct ?? 80),
        parts: [
          { label: "Part A", value: pa, max: maxPart, color: C.red },
          { label: "Part B", value: pb, max: maxPart, color: C.blue },
          { label: "Part C", value: pc, max: maxPart, color: C.ink },
        ],
      };
    }

    return { attendance, certifications, ledger, skills, assessment, attStats };
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
  const skills = dataQuery.data?.skills ?? { problem: 0, logical: 0, teamwork: 0, count: 0 };
  const assessment = dataQuery.data?.assessment ?? null;
  const attStats = dataQuery.data?.attStats ?? { present: 0, missed: 0, rate: 0 };
  const presentLessons = useMemo(() => attendance.filter((a) => a.status === "present"), [attendance]);
  const absentLessons = useMemo(() => attendance.filter((a) => a.status === "absent"), [attendance]);
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
      <SafeAreaView style={t3.safe} edges={["top"]}>
        <TopBar crumb="Progress" />
        <View style={t3.centerBody}><ActivityIndicator color={C.red} /></View>
      </SafeAreaView>
    );
  }

  const header = (
    <View>
      {children.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={t3.chipRow}>
          {children.map((c) => {
            const on = c.id === selectedChildId;
            const nm = nick.raw(c.id) ?? c.name;
            return (
              <Pressable key={c.id} onPress={() => setSelectedChildId(c.id)} style={[t3.chip, on && t3.chipOn]}>
                <View style={[t3.chipAv, on ? t3.chipAvOn : t3.chipAvOff]}>
                  {c.photo ? <Image source={{ uri: c.photo }} style={t3.chipAvImg} /> : <Text style={[t3.chipAvText, { color: on ? "#FFFFFF" : C.red }]}>{nm.charAt(0).toUpperCase()}</Text>}
                </View>
                <Text style={[t3.chipName, on && t3.chipNameOn]} numberOfLines={1}>{nm}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {selectedChild ? (
        <View style={t3.filePanel}>
          <View style={t3.fileTopRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={t3.fileEyebrow}>PROGRESS FILE</Text>
              <Text style={t3.fileName} numberOfLines={1}>{nick.raw(selectedChild.id) ?? selectedChild.name}</Text>
            </View>
            <Pressable onPress={() => setNickEditFor(selectedChild)} hitSlop={8} style={t3.filePen}><Ionicons name="pencil" size={13} color="rgba(255,255,255,0.7)" /></Pressable>
          </View>
          <View style={t3.fileStats}>
            <View style={t3.fileStat}><Text style={t3.fileStatNum}>{certifications.length}</Text><Text style={t3.fileStatLabel}>CERTIFICATES</Text></View>
            <View style={t3.fileDivider} />
            <View style={t3.fileStat}><Text style={t3.fileStatNum}>{attStats.present}</Text><Text style={t3.fileStatLabel}>SESSIONS DONE</Text></View>
            <View style={t3.fileDivider} />
            <View style={t3.fileStat}><Text style={[t3.fileStatNum, { color: C.yellow }]}>{attStats.rate}%</Text><Text style={t3.fileStatLabel}>ATTENDANCE</Text></View>
          </View>
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={t3.segRow} style={t3.segScroll}>
        {([["lessons", "LESSONS"], ["results", "RESULTS"], ["skills", "SKILLS"], ["gallery", "GALLERY"]] as [Section, string][]).map(([key, label]) => (
          <Pressable key={key} style={[t3.seg2, section === key && t3.seg2On]} onPress={() => setSection(key)}>
            <Text style={[t3.seg2Text, section === key && t3.seg2TextOn]}>{label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {errorMessage ? <View style={t3.errBox}><Text style={t3.errText}>{errorMessage}</Text></View> : null}
      {isStale ? <View style={t3.bannerPad}><OfflineBanner updatedAt={updatedAt} /></View> : null}
    </View>
  );

  return (
    <SafeAreaView style={t3.safe} edges={["top"]}>
      <TopBar crumb="Progress File" />
      <ScrollView style={t3.body} contentContainerStyle={t3.listPad} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={dataQuery.refetch} tintColor={C.red} />}>
        {header}
        {loadingData ? (
          <View style={t3.centerPad}><ActivityIndicator color={C.red} /></View>
        ) : section === "lessons" ? (
          <LessonsTab
            present={presentLessons}
            absent={absentLessons}
            summary={`${attStats.present} attended · ${attStats.missed} missed · ${attStats.rate}% rate`}
            childName={selectedChild ? (nick.raw(selectedChild.id) ?? selectedChild.name) : ""}
            onHeatmap={() => selectedChild && router.push({ pathname: "/attendance-summary", params: { child: selectedChild.id, name: nick.raw(selectedChild.id) ?? selectedChild.name } } as unknown as Href)}
            onFeedback={(r) => router.push({ pathname: "/lesson/[id]", params: { id: r.id } } as unknown as Href)}
            onOpenMedia={(items, i) => setGallery({ items, index: i })}
          />
        ) : section === "results" ? (
          <ResultsTab assessment={assessment} certifications={certifications} onCert={setCertPreview} />
        ) : section === "skills" ? (
          <SkillsPanel skills={skills} attended={attStats.present} certs={certifications.length} />
        ) : (
          <GalleryTab present={presentLessons} onOpenMedia={(items, i) => setGallery({ items, index: i })} />
        )}
      </ScrollView>

      {nickEditFor ? (
        <NicknameModal
          child={nickEditFor}
          systemColor={CHILD_PALETTE[Math.max(0, children.findIndex((c) => c.id === nickEditFor.id)) % CHILD_PALETTE.length]}
          onClose={() => setNickEditFor(null)}
        />
      ) : null}
      <MediaGallery
        key={gallery ? `${gallery.items[0]?.url ?? ""}:${gallery.index}` : "none"}
        items={gallery?.items ?? null}
        index={gallery?.index ?? 0}
        onClose={() => setGallery(null)}
      />
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
          placeholderTextColor="#999999"
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
        <View style={styles.ledgerIcon}><Ionicons name="swap-horizontal" size={16} color="#EC2127" /></View>
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
        <Ionicons name="arrow-forward" size={18} color="#999999" />
        <View style={styles.ledgerCol}>
          <Text style={styles.ledgerColLabel}>To</Text>
          <Text style={[styles.ledgerColDate, { color: "#EC2127" }]}>{shortDate(row.newDate)}</Text>
          {row.newTime ? <Text style={styles.ledgerColTime}>{time12(row.newTime)}</Text> : null}
        </View>
      </View>
      {row.createdAt ? <Text style={styles.ledgerWhen}>Requested {shortDate(row.createdAt.slice(0, 10))}</Text> : null}
    </View>
  );
}

function AttendanceCard({ row, index, onOpenMedia }: { row: AttendanceRow; index: number; onOpenMedia: (items: MediaItem[], index: number) => void }) {
  const activities = row.activities ?? [];
  const fallback = row.lastActivity ? [{ lesson: row.lastActivity, mission: "" }] : [];
  const displayed = activities.length > 0 ? activities : fallback;
  const media = row.media ?? [];
  const hasMedia = media.length > 0;
  const photoCount = media.filter((m) => m.type === "photo").length;
  const videoCount = media.filter((m) => m.type === "video").length;
  return (
    <Pressable
      style={({ pressed }) => [t3.attCard, pressed && hasMedia && t3.pressedCard]}
      onPress={hasMedia ? () => onOpenMedia(media, 0) : undefined}
    >
      <View style={t3.attTop}>
        <Text style={t3.attDate}>{longDay(row.date)}</Text>
        {row.adcoin > 0 ? <View style={t3.coinTag}><Text style={t3.coinTagText}>+{row.adcoin}</Text></View> : null}
      </View>
      {(row.courseName || row.instructorName) ? (
        <Text style={t3.attSub}>{[row.courseName, row.instructorName].filter(Boolean).join(" · ")}</Text>
      ) : null}
      {displayed.length > 0 ? (
        <>
          <View style={t3.attDivider} />
          <Text style={t3.workLabel}>WORK DONE</Text>
          {displayed.map((a, i) => (
            <View key={i} style={i > 0 ? { marginTop: 9 } : undefined}>
              {a.lesson ? (
                <View style={t3.workRow}>
                  <View style={t3.tagLesson}><Text style={t3.tagLessonText}>LESSON</Text></View>
                  <Text style={t3.workText}>{a.lesson}</Text>
                </View>
              ) : null}
              {a.mission ? (
                <View style={[t3.workRow, { marginTop: 7 }]}>
                  <View style={t3.tagMission}><Text style={t3.tagMissionText}>MISSION</Text></View>
                  <Text style={t3.workText}>{a.mission}</Text>
                </View>
              ) : null}
            </View>
          ))}
        </>
      ) : null}
      {hasMedia ? (
        <View style={t3.mediaRow}>
          <Ionicons name={videoCount > 0 ? "videocam" : "image"} size={14} color={C.red} />
          <Text style={t3.mediaRowText}>
            {[photoCount > 0 ? `${photoCount} photo${photoCount > 1 ? "s" : ""}` : null, videoCount > 0 ? `${videoCount} video${videoCount > 1 ? "s" : ""}` : null].filter(Boolean).join(" · ")} · tap to view
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

// Skills sub-tab — bars derived from lesson_ratings averages + auto-awarded badges.
function SkillsPanel({ skills, attended, certs }: { skills: Skills; attended: number; certs: number }) {
  const bars: { label: string; value: number; color: string }[] = [
    { label: "Problem solving", value: skills.problem, color: C.red },
    { label: "Logical thinking", value: skills.logical, color: C.blue },
    { label: "Teamwork", value: skills.teamwork, color: C.yellow },
  ];
  // Auto badges (no teacher entry): simple, transparent rules.
  const badges: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap; color: string; earned: boolean }[] = [
    { key: "first", label: "First build", icon: "cube", color: C.red, earned: attended > 0 },
    { key: "loop", label: "Loop master", icon: "repeat", color: C.blue, earned: skills.logical >= 4 },
    { key: "cert", label: "Certified", icon: "ribbon", color: C.yellow, earned: certs > 0 },
    { key: "regular", label: "Regular", icon: "calendar", color: C.green, earned: attended >= 8 },
    { key: "maze", label: "Maze solver", icon: "git-branch", color: C.blue, earned: attended >= 12 },
    { key: "allstar", label: "All-star", icon: "star", color: C.yellow, earned: skills.problem >= 4 && skills.logical >= 4 && skills.teamwork >= 4 },
  ];
  return (
    <View>
      <Text style={t3.skillsIntro}>What robotics is building — rated by the trainer each term.</Text>
      <View style={t3.skillsCard}>
        {skills.count === 0 ? (
          <Text style={t3.skillsEmpty}>No skill ratings yet. Once the trainer rates a few lessons, {"\n"}the levels will show here.</Text>
        ) : (
          bars.map((b) => {
            const level = Math.round(b.value);
            return (
              <View key={b.label} style={t3.skillRow}>
                <View style={t3.skillTop}>
                  <Text style={t3.skillLabel}>{b.label}</Text>
                  <Text style={t3.skillLevel}>Level {level} of 5</Text>
                </View>
                <View style={t3.skillTrack}>
                  <View style={[t3.skillFill, { width: `${Math.max(4, (b.value / 5) * 100)}%`, backgroundColor: b.color }]} />
                </View>
              </View>
            );
          })
        )}
      </View>

      <View style={t3.badgeHead}>
        <Text style={t3.badgeHeadText}>BADGES EARNED</Text>
        <View style={t3.badgeHeadLine} />
      </View>
      <View style={t3.badgeGrid}>
        {badges.map((bd) => (
          <View key={bd.key} style={[t3.badgeCard, !bd.earned && t3.badgeCardOff]}>
            <View style={[t3.badgeIcon, { backgroundColor: bd.earned ? bd.color : "#DDDDDD" }]}>
              <Ionicons name={bd.icon} size={18} color="#FFFFFF" />
            </View>
            <Text style={[t3.badgeLabel, !bd.earned && t3.badgeLabelOff]}>{bd.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── LESSONS tab ──
function LessonsTab({ present, absent, summary, childName, onHeatmap, onFeedback, onOpenMedia }: {
  present: AttendanceRow[]; absent: AttendanceRow[]; summary: string; childName: string;
  onHeatmap: () => void; onFeedback: (r: AttendanceRow) => void; onOpenMedia: (items: MediaItem[], index: number) => void;
}) {
  return (
    <View style={{ gap: 11, marginTop: 12 }}>
      <Pressable style={t3.amCard} onPress={onHeatmap}>
        <View style={t3.amIcon}><Ionicons name="calendar" size={19} color={C.blue} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={t3.amTitle}>Attendance & makeup</Text>
          <Text style={t3.amSub}>{summary}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={C.red} />
      </Pressable>
      {present.length === 0 && absent.length === 0 ? (
        <View style={t3.empty}><Text style={t3.emptyTitle}>No lessons yet</Text><Text style={t3.emptyText}>Lessons appear after the first class.</Text></View>
      ) : null}
      {present.map((r) => <LessonFeedCard key={r.id} row={r} childName={childName} onFeedback={onFeedback} onOpenMedia={onOpenMedia} />)}
      {absent.map((r) => (
        <View key={r.id} style={t3.absentCard}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={t3.absentDate}>{longDay(r.date)}</Text>
            <Text style={t3.absentSub}>{childName} · makeup credit kept</Text>
          </View>
          <View style={t3.absentTag}><Text style={t3.absentTagText}>ABSENT</Text></View>
        </View>
      ))}
    </View>
  );
}

function LessonFeedCard({ row, childName, onFeedback, onOpenMedia }: { row: AttendanceRow; childName: string; onFeedback: (r: AttendanceRow) => void; onOpenMedia: (items: MediaItem[], index: number) => void }) {
  const acts = row.activities ?? (row.lastActivity ? [{ lesson: row.lastActivity, mission: "" }] : []);
  const lesson = acts[0]?.lesson ?? row.lastActivity ?? "—";
  const mission = acts[0]?.mission ?? "";
  const media = row.media ?? [];
  const photoCount = media.filter((m) => m.type === "photo").length;
  return (
    <Pressable style={({ pressed }) => [t3.lfCard, pressed && t3.pressedCard]} onPress={() => onFeedback(row)}>
      <View style={t3.attTop}>
        <Text style={t3.attDate}>{longDay(row.date)}</Text>
        {row.adcoin > 0 ? <View style={t3.coinTag}><Text style={t3.coinTagText}>+{row.adcoin}</Text></View> : null}
      </View>
      <View style={t3.lfWho}>
        <View style={t3.lfDot} />
        <Text style={t3.lfWhoText} numberOfLines={1}>{[childName, row.courseName, row.instructorName].filter(Boolean).join(" · ")}</Text>
      </View>
      <View style={t3.attDivider} />
      <View style={t3.lfRow}><Text style={t3.lfTag}>LESSON</Text><Text style={t3.lfText}>{lesson}</Text></View>
      {mission ? <View style={[t3.lfRow, { marginTop: 9 }]}><Text style={[t3.lfTag, { color: C.red }]}>MISSION</Text><Text style={t3.lfText}>{mission}</Text></View> : null}
      <View style={t3.lfFoot}>
        {media.length > 0 ? (
          <Pressable style={t3.lfMedia} onPress={() => onOpenMedia(media, 0)}>
            <Ionicons name="image" size={14} color={C.red} />
            <Text style={t3.lfMediaText}>{photoCount || media.length} {photoCount === 1 ? "photo" : "photos"}</Text>
          </Pressable>
        ) : <View />}
        <Text style={t3.lfReadFeedback}>READ FEEDBACK ›</Text>
      </View>
    </Pressable>
  );
}

// ── RESULTS tab ──
function ResultsTab({ assessment, certifications, onCert }: { assessment: Assessment; certifications: Certification[]; onCert: (c: Certification) => void }) {
  return (
    <View style={{ gap: 11, marginTop: 12 }}>
      {assessment ? (
        <View style={t3.asmtCard}>
          <Text style={t3.asmtEyebrow}>LATEST ASSESSMENT</Text>
          <Text style={t3.asmtTitle}>{assessment.title}</Text>
          <View style={t3.asmtScoreRow}>
            <Text style={t3.asmtScore}>{assessment.score}</Text>
            <View style={{ paddingBottom: 6 }}>
              <View style={[t3.asmtPill, { backgroundColor: assessment.score >= assessment.distinctionPct ? C.yellow : C.greenChip }]}>
                <Text style={[t3.asmtPillText, { color: assessment.score >= assessment.distinctionPct ? C.ink : C.green }]}>
                  {assessment.score >= assessment.distinctionPct ? "DISTINCTION" : assessment.score >= assessment.passPct ? "PASS" : "SCORE"}
                </Text>
              </View>
              <Text style={t3.asmtOf}>out of {assessment.total}</Text>
            </View>
          </View>
          <View style={{ marginTop: 16, gap: 11 }}>
            {assessment.parts.map((p) => (
              <View key={p.label}>
                <View style={t3.asmtBarTop}><Text style={t3.asmtBarLabel}>{p.label}</Text><Text style={t3.asmtBarVal}>{p.value}</Text></View>
                <View style={t3.asmtTrack}><View style={[t3.asmtFill, { width: `${Math.max(4, (p.value / p.max) * 100)}%`, backgroundColor: p.color }]} /></View>
              </View>
            ))}
          </View>
        </View>
      ) : null}
      <View style={t3.badgeHead}><Text style={t3.badgeHeadText}>CERTIFICATES</Text><View style={t3.badgeHeadLine} /></View>
      {certifications.length === 0 ? (
        <View style={t3.empty}><Text style={t3.emptyTitle}>No certificates yet</Text><Text style={t3.emptyText}>Certificates appear when your child passes an exam.</Text></View>
      ) : certifications.map((c, i) => <CertCard key={c.id} cert={c} index={i} onPress={() => onCert(c)} />)}
    </View>
  );
}

// ── GALLERY tab ──
function GalleryTab({ present, onOpenMedia }: { present: AttendanceRow[]; onOpenMedia: (items: MediaItem[], index: number) => void }) {
  const items = useMemo(() => {
    const out: (MediaItem & { title: string })[] = [];
    for (const r of present) for (const m of r.media ?? []) if (!out.some((x) => x.url === m.url)) out.push({ ...m, title: r.lastActivity ?? r.courseName ?? "Class" });
    return out;
  }, [present]);
  if (!items.length) return <View style={t3.empty}><Ionicons name="images-outline" size={40} color={C.textMute} /><Text style={t3.emptyTitle}>No photos yet</Text><Text style={t3.emptyText}>Photos and builds the trainer shares appear here.</Text></View>;
  return (
    <View style={t3.galGrid}>
      {items.map((m, i) => (
        <Pressable key={i} style={t3.galCard} onPress={() => onOpenMedia(items, i)}>
          {m.type === "photo" ? <Image source={{ uri: m.url }} style={t3.galThumb} /> : <View style={[t3.galThumb, t3.galVideo]}><Ionicons name="play-circle" size={34} color="#FFFFFF" /></View>}
          <View style={t3.galBody}><Text style={t3.galTitle} numberOfLines={1}>{m.title}</Text></View>
        </Pressable>
      ))}
    </View>
  );
}

function CertCard({ cert, onPress }: { cert: Certification; index: number; onPress: () => void }) {
  const gradeColor = (cert.grade ?? "").toUpperCase().startsWith("A") ? C.red : C.blue;
  const meta = [cert.code, cert.dateIssued ? shortFullDate(cert.dateIssued) : null].filter(Boolean).join(" · ");
  return (
    <Pressable style={({ pressed }) => [t3.certCard, pressed && t3.pressedCard]} onPress={onPress}>
      <View style={t3.certTop}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={t3.certTitle} numberOfLines={2}>{cert.courseName ?? "Certificate"}</Text>
          {meta ? <Text style={t3.certCode}>{meta}</Text> : null}
        </View>
        {cert.grade ? (
          <View style={t3.certGradeWrap}>
            <Text style={[t3.certGrade, { color: gradeColor }]}>{cert.grade}</Text>
            <Text style={t3.certGradeLabel}>GRADE</Text>
          </View>
        ) : null}
      </View>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F6FB" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  pickerWrap: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  pickerLabel: { fontSize: 10, fontWeight: "800", color: "#999999", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
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
    shadowColor: "#2B161B",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  childChipActive: {
    backgroundColor: "#EC2127",
    shadowColor: "#EC2127",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  childChipAvatar: { width: 32, height: 32, borderRadius: 16 },
  colorDotSmall: { position: "absolute", right: -1, bottom: -1, width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: "#FFFFFF" },
  colorDotBig: { position: "absolute", right: -2, bottom: -2, width: 16, height: 16, borderRadius: 8, borderWidth: 2.5, borderColor: "#2B161B" },
  childChipAvatarFallback: { backgroundColor: "#E0E7FF", alignItems: "center", justifyContent: "center" },
  childChipAvatarFallbackActive: { backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
  childChipInitial: { color: "#EC2127", fontWeight: "800", fontSize: 13 },
  childChipName: { fontSize: 13, fontWeight: "700", color: "#2B161B", maxWidth: 100 },
  childChipNameActive: { color: "#FFFFFF" },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: "#2B161B",
    shadowColor: "#2B161B",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  heroAvatar: { width: 56, height: 56, borderRadius: 18 },
  heroAvatarFallback: { backgroundColor: "#EC2127", alignItems: "center", justifyContent: "center" },
  heroAvatarInitial: { color: "#FFFFFF", fontSize: 22, fontWeight: "800" },
  heroEyebrow: { fontSize: 10, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 1, fontWeight: "700" },
  heroNameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  heroName: { fontSize: 20, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.3, flexShrink: 1 },
  heroRealName: { fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: "600", marginTop: 1 },
  heroPen: { width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  nickSheet: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  nickTitle: { fontSize: 18, fontWeight: "800", color: "#2B161B", marginTop: 4 },
  nickSub: { fontSize: 13, color: "#666666", marginTop: 4, lineHeight: 18 },
  nickLabel: { fontSize: 11, fontWeight: "800", color: "#666666", textTransform: "uppercase", letterSpacing: 0.6, marginTop: 16, marginBottom: 6 },
  nickInput: { borderWidth: 1, borderColor: "#DDDDDD", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: "#2B161B", backgroundColor: "#F7F3F5" },
  swatchRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  swatch: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "transparent" },
  swatchOn: { borderColor: "#2B161B" },
  swatchAuto: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  nickBtns: { flexDirection: "row", gap: 12, marginTop: 16 },
  nickBtn: { flex: 1, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  nickBtnGhost: { backgroundColor: "#F3F4F6" },
  nickBtnGhostText: { color: "#666666", fontSize: 15, fontWeight: "700" },
  nickBtnPrimary: { backgroundColor: "#EC2127" },
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
    shadowColor: "#2B161B",
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
  sectionTabActive: { backgroundColor: "#EC2127" },
  sectionTabText: { fontSize: 13, fontWeight: "700", color: "#666666" },
  sectionTabTextActive: { color: "#FFFFFF" },
  errorCard: { marginHorizontal: 16, marginBottom: 8, backgroundColor: "#FEE2E2", padding: 12, borderRadius: 12 },
  errorText: { color: "#991B1B", fontSize: 13 },
  bannerWrap: { paddingHorizontal: 16, marginBottom: 8 },
  list: { padding: 16, gap: 12 },
  empty: { padding: 48, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#2B161B" },
  emptyText: { fontSize: 14, color: "#666666", textAlign: "center", maxWidth: 280 },
  card: { backgroundColor: "#FFFFFF", padding: 16, borderRadius: 16, shadowColor: "#EC2127", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  cardButton: { borderWidth: 1, borderColor: "#EEF0F6" },
  cardRecent: { borderColor: "#C7D2FE", borderWidth: 1.5 },
  cardPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  achieveBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#EEF2FF", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 12 },
  achieveText: { flex: 1, fontSize: 12, fontWeight: "800", color: "#3730A3" },
  newTag: { backgroundColor: "#EC2127", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  newTagText: { fontSize: 9, fontWeight: "900", color: "#FFFFFF", letterSpacing: 0.5 },
  ledgerNote: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#BBF7D0", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 4 },
  ledgerNoteText: { flex: 1, fontSize: 12, color: "#065F46", fontWeight: "600", lineHeight: 16 },
  ledgerHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  ledgerIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" },
  ledgerCourse: { flex: 1, fontSize: 14, fontWeight: "800", color: "#2B161B" },
  ledgerKeptPill: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#D1FAE5", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  ledgerKeptText: { fontSize: 11, fontWeight: "800", color: "#065F46" },
  ledgerMoveRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  ledgerCol: { flex: 1, gap: 1 },
  ledgerColLabel: { fontSize: 9, fontWeight: "800", color: "#999999", textTransform: "uppercase", letterSpacing: 0.6 },
  ledgerColDate: { fontSize: 15, fontWeight: "800", color: "#2B161B" },
  ledgerColTime: { fontSize: 12, color: "#666666", fontWeight: "600" },
  ledgerWhen: { fontSize: 11, color: "#999999", marginTop: 10, fontWeight: "600" },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  cardLeft: { flexShrink: 0, maxWidth: "45%" },
  cardDate: { fontSize: 14, fontWeight: "700", color: "#2B161B" },
  cardSub: { fontSize: 12, color: "#666666", marginTop: 2 },
  workCol: { flex: 1, alignItems: "flex-end", gap: 2 },
  workLabel: { fontSize: 9, fontWeight: "800", color: "#999999", textTransform: "uppercase", letterSpacing: 0.6 },
  workItem: { alignItems: "flex-end" },
  workLesson: { fontSize: 13, color: "#2B161B", fontWeight: "700", textAlign: "right", lineHeight: 18 },
  workMission: { fontSize: 12, color: "#EC2127", fontWeight: "600", textAlign: "right", lineHeight: 16 },
  photoNotice: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#EEF2FF", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  photoNoticeText: { fontSize: 12, fontWeight: "700", color: "#EC2127" },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  footerText: { fontSize: 12, color: "#999999" },
  adcoinBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FEF3C7", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  adcoinText: { fontSize: 12, fontWeight: "700", color: "#92400E" },
  certCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#EC2127",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  certIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#FEF3C7", alignItems: "center", justifyContent: "center" },
  certTitle: { fontSize: 15, fontWeight: "700", color: "#2B161B" },
  certRow: { flexDirection: "row", gap: 12, marginTop: 4, alignItems: "center" },
  certMark: { fontSize: 16, fontWeight: "800", color: "#EC2127" },
  certDate: { fontSize: 12, color: "#666666" },
  certNumber: { fontSize: 11, color: "#999999", marginTop: 4 },
  previewBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  previewSheet: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  previewHandle: { width: 40, height: 4, backgroundColor: "#DDDDDD", borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  previewHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  previewTitle: { fontSize: 18, fontWeight: "800", color: "#2B161B" },
  previewBody: { gap: 4 },
  previewRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  previewRowLabel: { fontSize: 13, color: "#666666" },
  previewRowValue: { fontSize: 13, color: "#2B161B", fontWeight: "700", flex: 1, textAlign: "right", marginLeft: 16 },
  previewImage: { width: "100%", height: 200, borderRadius: 8, marginTop: 16, backgroundColor: "#F3F4F6" },
  previewButton: { marginTop: 16, height: 48, backgroundColor: "#EC2127", borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  previewButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  previewPending: { marginTop: 16, fontSize: 13, color: "#999999", fontStyle: "italic", textAlign: "center" },
  previewClose: { marginTop: 12, alignItems: "center", paddingVertical: 12 },
  previewCloseText: { color: "#666666", fontSize: 14, fontWeight: "700" },
  photoModal: { backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center", zIndex: 999 },
  photoClose: { position: "absolute", top: 56, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  photoCount: { position: "absolute", bottom: 60, alignSelf: "center", color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "600" },
});

// ── Turn-3 "Brand-tech" styles (separate object so the legacy modal styles above
// stay intact). ──
const t3 = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.card },
  body: { flex: 1, backgroundColor: C.bg },
  centerBody: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg },
  centerPad: { paddingVertical: 40, alignItems: "center" },
  listPad: { paddingHorizontal: 14, paddingBottom: 28 },

  // Child chips (Turn-4: maroon active / white inactive, sentence case)
  chipRow: { flexDirection: "row", gap: 8, paddingTop: 14, paddingBottom: 12 },
  chip: { flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 7, paddingRight: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: C.card, ...cardShadow },
  chipOn: { backgroundColor: C.ink },
  chipAv: { width: 28, height: 28, borderRadius: 999, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  chipAvOn: { backgroundColor: "rgba(255,255,255,0.2)" },
  chipAvOff: { backgroundColor: C.redChip },
  chipAvImg: { width: "100%", height: "100%" },
  chipAvText: { fontSize: 13, fontWeight: "700" },
  chipName: { fontSize: 13, fontWeight: "600", color: C.ink },
  chipNameOn: { color: "#FFFFFF" },

  // PROGRESS maroon panel (no circuit texture in Turn-4)
  filePanel: { backgroundColor: C.ink, borderRadius: 22, padding: 18, marginHorizontal: 0 },
  fileRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  fileAvatar: { width: 56, height: 56, borderRadius: 18, backgroundColor: C.red, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  fileAvatarImg: { width: "100%", height: "100%" },
  fileAvatarText: { fontSize: 23, fontWeight: "700", color: "#FFFFFF" },
  fileEyebrow: { fontSize: 10, fontWeight: "700", letterSpacing: 2, color: C.yellow },
  fileName: { fontSize: 20, fontWeight: "600", color: "#FFFFFF", letterSpacing: -0.4, marginTop: 4 },
  fileTags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 9 },
  fileTag: { backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  fileTagText: { fontWeight: "500", fontSize: 11, color: "#FFFFFF" },
  filePen: { width: 30, height: 30, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
  // PROGRESS FILE 3-stat panel
  fileTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  fileStats: { flexDirection: "row", marginTop: 17 },
  fileStat: { flex: 1, paddingRight: 10 },
  fileStatNum: { fontSize: 21, fontWeight: "800", color: "#FFFFFF" },
  fileStatLabel: { fontSize: 8, fontWeight: "700", letterSpacing: 1.3, color: "rgba(255,255,255,0.55)", marginTop: 4 },
  fileDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.16)", marginRight: 14 },
  // 4-segment scroll bar
  segScroll: { flexGrow: 0, marginTop: 14 },
  segRow: { flexDirection: "row", gap: 7 },
  seg2: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, backgroundColor: C.card, ...cardShadow },
  seg2On: { backgroundColor: C.red },
  seg2Text: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6, color: C.textDim },
  seg2TextOn: { color: "#FFFFFF" },
  // Attendance & makeup card
  amCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderRadius: 18, padding: 15, ...cardShadow },
  amIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: C.blueChip, alignItems: "center", justifyContent: "center" },
  amTitle: { fontSize: 14, fontWeight: "600", color: C.ink },
  amSub: { fontSize: 11, color: C.textDim, marginTop: 3 },
  // Lesson feedback card
  lfCard: { backgroundColor: C.card, borderRadius: 18, padding: 16, ...cardShadowLg },
  lfWho: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 6 },
  lfDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.red },
  lfWhoText: { flex: 1, fontSize: 11, color: C.textDim },
  lfRow: { flexDirection: "row", gap: 11, alignItems: "flex-start" },
  lfTag: { width: 58, fontSize: 8, fontWeight: "700", letterSpacing: 1, color: C.textDim, paddingTop: 3 },
  lfText: { flex: 1, fontSize: 14, color: C.ink, lineHeight: 20 },
  lfFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 14, paddingTop: 13, borderTopWidth: 1, borderTopColor: C.borderFaint },
  lfMedia: { flexDirection: "row", alignItems: "center", gap: 6 },
  lfMediaText: { fontSize: 12, fontWeight: "500", color: C.red },
  lfReadFeedback: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8, color: C.red },
  absentCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.card, borderRadius: 18, padding: 16, ...cardShadow },
  absentDate: { fontSize: 14, fontWeight: "600", color: "#8A8085" },
  absentSub: { fontSize: 11, color: C.textDim, marginTop: 4 },
  absentTag: { borderWidth: 1, borderColor: C.red, borderRadius: 3, paddingHorizontal: 7, paddingVertical: 4 },
  absentTagText: { fontSize: 9, fontWeight: "700", letterSpacing: 1, color: C.red },
  // Assessment (Results) card
  asmtCard: { backgroundColor: C.card, borderRadius: 20, padding: 18, ...cardShadowLg },
  asmtEyebrow: { fontSize: 9, fontWeight: "700", letterSpacing: 2, color: C.red },
  asmtTitle: { fontSize: 18, fontWeight: "600", color: C.ink, letterSpacing: -0.3, marginTop: 9 },
  asmtScoreRow: { flexDirection: "row", alignItems: "flex-end", gap: 13, marginTop: 14 },
  asmtScore: { fontSize: 42, fontWeight: "800", letterSpacing: -1.8, color: C.ink, lineHeight: 42 },
  asmtPill: { alignSelf: "flex-start", borderRadius: 3, paddingHorizontal: 8, paddingVertical: 4 },
  asmtPillText: { fontSize: 9, fontWeight: "700", letterSpacing: 1 },
  asmtOf: { fontSize: 11, color: C.textDim, marginTop: 7 },
  asmtBarTop: { flexDirection: "row", justifyContent: "space-between" },
  asmtBarLabel: { fontSize: 12, color: C.textDim },
  asmtBarVal: { fontSize: 12, fontWeight: "700", color: C.ink },
  asmtTrack: { height: 6, borderRadius: 3, backgroundColor: C.sunken, marginTop: 6, overflow: "hidden" },
  asmtFill: { height: "100%", borderRadius: 3 },
  // Gallery grid
  galGrid: { flexDirection: "row", flexWrap: "wrap", gap: 11, marginTop: 12 },
  galCard: { width: "47%", backgroundColor: C.card, borderRadius: 14, overflow: "hidden", ...cardShadow },
  galThumb: { width: "100%", aspectRatio: 4 / 3, backgroundColor: C.sunken },
  galVideo: { alignItems: "center", justifyContent: "center", backgroundColor: C.ink },
  galBody: { padding: 11 },
  galTitle: { fontSize: 13, fontWeight: "600", color: C.ink },

  // Segmented control (white card, red active)
  segWrap: { flexDirection: "row", backgroundColor: C.card, borderRadius: 16, padding: 4, marginTop: 12, ...cardShadow },
  seg: { flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: "center" },
  segOn: { backgroundColor: C.red },
  segText: { fontSize: 13, fontWeight: "600", color: C.textDim },
  segTextOn: { color: "#FFFFFF", fontWeight: "700" },

  errBox: { backgroundColor: C.redChip, borderRadius: 14, padding: 12, marginTop: 12 },
  errText: { color: C.red, fontSize: 13 },
  bannerPad: { marginTop: 12 },

  // Attendance card (clean white, no accent, soft shadow)
  attCard: { backgroundColor: C.card, borderRadius: 20, padding: 17, marginTop: 11, ...cardShadow },
  pressedCard: { opacity: 0.94 },
  attTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  attDate: { fontSize: 14, fontWeight: "600", color: C.ink },
  coinTag: { backgroundColor: C.yellow, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  coinTagText: { fontWeight: "700", fontSize: 11, color: C.ink },
  attSub: { fontSize: 12, color: C.textDim, marginTop: 3 },
  attDivider: { height: 1, backgroundColor: C.borderFaint, marginVertical: 13 },
  workLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 1.6, color: C.textDim, marginBottom: 9 },
  workRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  tagLesson: { backgroundColor: C.ink, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  tagLessonText: { color: "#FFFFFF", fontSize: 8, fontWeight: "700", letterSpacing: 1 },
  tagMission: { backgroundColor: C.blue, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  tagMissionText: { color: "#FFFFFF", fontSize: 8, fontWeight: "700", letterSpacing: 1 },
  workText: { flex: 1, fontSize: 14, fontWeight: "500", color: C.ink, lineHeight: 20 },
  mediaRow: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.redChip, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, marginTop: 12, alignSelf: "flex-start" },
  mediaRowText: { fontSize: 12, fontWeight: "700", color: C.red },

  // Certificate card (clean white, grade letter)
  certCard: { backgroundColor: C.card, borderRadius: 20, padding: 18, marginTop: 11, ...cardShadow },
  certTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  certTitle: { fontSize: 16, fontWeight: "600", color: C.ink, letterSpacing: -0.2 },
  certCode: { fontSize: 11, color: C.textDim, marginTop: 6 },
  certGradeWrap: { alignItems: "center" },
  certGrade: { fontSize: 28, fontWeight: "800", lineHeight: 30 },
  certGradeLabel: { fontSize: 8, fontWeight: "700", letterSpacing: 1.4, color: C.textMute, marginTop: 3 },
  certBtns: { flexDirection: "row", gap: 8, marginTop: 16 },
  certBtnGhost: { flex: 1, borderWidth: 1, borderColor: C.red, borderRadius: 12, minHeight: 42, alignItems: "center", justifyContent: "center" },
  certBtnGhostText: { fontSize: 11, fontWeight: "700", letterSpacing: 1, color: C.red },
  certBtnDark: { flex: 1, backgroundColor: C.red, borderRadius: 12, minHeight: 42, alignItems: "center", justifyContent: "center" },
  certBtnDarkText: { fontSize: 11, fontWeight: "700", letterSpacing: 1, color: "#FFFFFF" },

  empty: { alignItems: "center", gap: 8, paddingTop: 48, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: C.ink },
  emptyText: { fontSize: 13, color: C.textDim, textAlign: "center", lineHeight: 19 },

  // Skills sub-tab
  skillsIntro: { fontSize: 13, color: C.textDim, lineHeight: 20, marginTop: 12 },
  skillsCard: { backgroundColor: C.card, borderRadius: 20, padding: 18, marginTop: 14, gap: 16, ...cardShadow },
  skillsEmpty: { fontSize: 13, color: C.textMute, textAlign: "center", lineHeight: 19, paddingVertical: 10 },
  skillRow: { gap: 8 },
  skillTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  skillLabel: { fontSize: 14, fontWeight: "600", color: C.ink },
  skillLevel: { fontSize: 11, color: C.textDim, fontWeight: "600" },
  skillTrack: { height: 8, borderRadius: 4, backgroundColor: C.sunken, overflow: "hidden" },
  skillFill: { height: "100%", borderRadius: 4 },
  badgeHead: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 22 },
  badgeHeadText: { fontSize: 10, fontWeight: "700", letterSpacing: 2.4, color: C.ink },
  badgeHeadLine: { flex: 1, height: 1, backgroundColor: C.border },
  badgeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  badgeCard: { width: "31%", backgroundColor: C.card, borderRadius: 16, paddingVertical: 15, paddingHorizontal: 8, alignItems: "center", ...cardShadow },
  badgeCardOff: { opacity: 0.5 },
  badgeIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  badgeLabel: { fontSize: 11, fontWeight: "600", color: C.ink, marginTop: 9, textAlign: "center" },
  badgeLabelOff: { color: C.textDim },
});
