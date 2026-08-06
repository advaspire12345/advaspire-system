import { useMemo } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { SwipeBackView } from "@/components/SwipeBackView";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/auth";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { supabase } from "@/lib/supabase";

const WEEKDAY_ORDER: Record<string, number> = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 7 };

type Pkg = {
  id: string;
  type: string;
  price: number;
  sessions: number | null;
  months: number | null;
  maxPool: number;
  description: string | null;
};
type Slot = { day: string; time: string; duration: number };
type BranchSchedule = { branchId: string; branchName: string; slots: Slot[] };
type Lesson = { title: string; thumb: string | null };
type Section = { title: string; description: string | null; lessons: Lesson[] };
type Instructor = { id: string; name: string; role: string | null; photo: string | null };

type ProgramDetail = {
  name: string;
  description: string | null;
  cover: string | null;
  levels: number | null;
  programType: string | null;
  languages: string[];
  outcomes: string[];
  requirements: string[];
  branches: BranchSchedule[];
  sections: Section[];
  instructors: Instructor[];
  packages: Pkg[];
};

function time12(t: string): string {
  const [h, m] = t.split(":").map((n) => parseInt(n, 10));
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
function formatRM(n: number): string {
  return `RM${n.toFixed(2)}`;
}

export default function ProgramDetailScreen() {
  const { user } = useAuth();
  const userId = user?.id;
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const fetchDetail = async (): Promise<ProgramDetail> => {
    const { data: base, error: baseErr } = await supabase
      .from("courses")
      .select("id, name, description, short_description, cover_image_url, number_of_levels, program_type")
      .eq("id", id!)
      .maybeSingle();
    if (baseErr) throw baseErr;
    if (!base) throw new Error("not found");
    const name = base.name as string;

    // Same program can exist once per branch — gather all sibling course rows so
    // we can aggregate branches, slots, packages, etc. across them.
    const { data: siblings } = await supabase
      .from("courses").select("id, branch_id").eq("name", name).is("deleted_at", null);
    const courseIds = Array.from(new Set([id as string, ...(siblings ?? []).map((s) => s.id as string)]));
    const branchIds = Array.from(new Set((siblings ?? []).map((s) => s.branch_id as string).filter(Boolean)));

    const branchMap: Record<string, string> = {};
    if (branchIds.length) {
      const { data: brs } = await supabase.from("branches").select("id, name").in("id", branchIds);
      (brs ?? []).forEach((b) => { branchMap[b.id as string] = (b.name as string) ?? "Centre"; });
    }

    // All child tables best-effort (RLS may block some for parents).
    const [outc, reqs, langs, pricing, slots, sections, instr] = await Promise.all([
      supabase.from("course_outcomes").select("outcome, sort_order").in("course_id", courseIds).order("sort_order", { ascending: true }),
      supabase.from("course_requirements").select("requirement, sort_order").in("course_id", courseIds).order("sort_order", { ascending: true }),
      supabase.from("course_languages").select("language").in("course_id", courseIds),
      supabase.from("course_pricing").select("id, package_type, price, description, completion_months, limit_sess, max_students_per_pool, is_default, deleted_at").in("course_id", courseIds),
      supabase.from("course_slots").select("day, time, duration, branch_id").in("course_id", courseIds).is("deleted_at", null),
      supabase.from("course_sections").select("id, title, description, sort_order, course_id").in("course_id", courseIds).order("sort_order", { ascending: true }),
      supabase.from("course_instructors").select("user_id, users(id, name, role, photo, deleted_at)").in("course_id", courseIds),
    ]);

    // Instructor profiles — dedupe by user id (same teacher may cover branches).
    const instSeen = new Set<string>();
    const instructors: Instructor[] = [];
    for (const row of instr.data ?? []) {
      const u = row.users as unknown as { id: string; name: string; role: string | null; photo: string | null; deleted_at: string | null } | null;
      if (!u || u.deleted_at || instSeen.has(u.id)) continue;
      instSeen.add(u.id);
      instructors.push({ id: u.id, name: u.name, role: u.role ?? null, photo: u.photo ?? null });
    }

    const outcomes = Array.from(new Set((outc.data ?? []).map((o) => String(o.outcome)).filter(Boolean)));
    const requirements = Array.from(new Set((reqs.data ?? []).map((r) => String(r.requirement)).filter(Boolean)));
    const languages = Array.from(new Set((langs.data ?? []).map((l) => String(l.language)).filter(Boolean)));

    // Packages — dedupe by type+price (they may repeat per branch).
    const pkgSeen = new Set<string>();
    const packages: Pkg[] = [];
    for (const p of pricing.data ?? []) {
      if (p.deleted_at) continue;
      const key = `${p.package_type}-${p.price}`;
      if (pkgSeen.has(key)) continue;
      pkgSeen.add(key);
      packages.push({
        id: p.id as string,
        type: (p.package_type as string) ?? "Package",
        price: Number(p.price ?? 0),
        sessions: p.limit_sess == null ? null : Number(p.limit_sess),
        months: p.completion_months == null ? null : Number(p.completion_months),
        maxPool: Number(p.max_students_per_pool ?? 1),
        description: (p.description as string | null) ?? null,
      });
    }
    packages.sort((a, b) => a.price - b.price);

    // Schedule grouped by branch.
    const byBranch: Record<string, Slot[]> = {};
    for (const s of slots.data ?? []) {
      const b = (s.branch_id as string) ?? "";
      if (!byBranch[b]) byBranch[b] = [];
      byBranch[b].push({ day: String(s.day ?? "").toLowerCase(), time: String(s.time ?? ""), duration: Number(s.duration ?? 0) });
    }
    const branches: BranchSchedule[] = Object.entries(byBranch).map(([bId, sl]) => ({
      branchId: bId,
      branchName: branchMap[bId] ?? "Centre",
      slots: sl.sort((a, b) => (WEEKDAY_ORDER[a.day] ?? 8) - (WEEKDAY_ORDER[b.day] ?? 8) || a.time.localeCompare(b.time)),
    })).sort((a, b) => a.branchName.localeCompare(b.branchName));

    // Curriculum — sections + lessons (lesson thumbnails double as the gallery).
    const sectionRows = sections.data ?? [];
    let sectionsOut: Section[] = [];
    if (sectionRows.length) {
      const sectionIds = sectionRows.map((s) => s.id as string);
      const { data: lessons } = await supabase
        .from("course_lessons").select("section_id, title, thumbnail_url, sort_order").in("section_id", sectionIds).order("sort_order", { ascending: true });
      const bySection: Record<string, Lesson[]> = {};
      for (const l of lessons ?? []) {
        const sid = l.section_id as string;
        if (!bySection[sid]) bySection[sid] = [];
        bySection[sid].push({ title: (l.title as string) ?? "Lesson", thumb: (l.thumbnail_url as string | null) ?? null });
      }
      const titleSeen = new Set<string>();
      for (const s of sectionRows) {
        const title = (s.title as string) ?? "";
        if (titleSeen.has(title.toLowerCase())) continue;
        titleSeen.add(title.toLowerCase());
        sectionsOut.push({ title, description: (s.description as string | null) ?? null, lessons: bySection[s.id as string] ?? [] });
      }
    }

    return {
      name,
      description: (base.description as string | null) ?? (base.short_description as string | null) ?? null,
      cover: (base.cover_image_url as string | null) ?? null,
      levels: base.number_of_levels == null ? null : Number(base.number_of_levels),
      programType: (base.program_type as string | null) ?? null,
      languages,
      outcomes,
      requirements,
      branches,
      sections: sectionsOut,
      instructors,
      packages,
    };
  };

  // NOTE: key is versioned — an older build cached this under `program:${id}`
  // WITHOUT the newer fields (e.g. instructors); hydrating that stale shape and
  // calling `.map` on a missing array blanked the screen. Bump the version on any
  // ProgramDetail shape change.
  const { data, loading, error } = useCachedQuery<ProgramDetail>(
    `program:v3:${id}`, // v3 — branch schedule now readable by parents (RLS)
    fetchDetail,
    { enabled: !!id && !!userId },
  );

  const packages = useMemo(() => data?.packages ?? [], [data]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <Stack.Screen options={{ title: "Program", headerShown: true, headerTintColor: "#EC2127" }} />
        <ActivityIndicator color="#EC2127" />
      </SafeAreaView>
    );
  }
  if (error && !data) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <Stack.Screen options={{ title: "Program", headerShown: true, headerTintColor: "#EC2127" }} />
        <Text style={styles.errText}>Couldn&apos;t load this program. Please check your connection.</Text>
      </SafeAreaView>
    );
  }
  if (!data) return null;

  // Defensive defaults — never call .map/.length on a possibly-missing array
  // (e.g. a stale cached shape from an older build).
  const languages = data.languages ?? [];
  const outcomes = data.outcomes ?? [];
  const requirements = data.requirements ?? [];
  const instructors = data.instructors ?? [];
  const branches = data.branches ?? [];
  const sections = data.sections ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <Stack.Screen options={{ title: data.name, headerShown: true, headerTintColor: "#EC2127" }} />
      <SwipeBackView onBack={() => router.back()} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        {data.cover ? (
          <Image source={{ uri: data.cover }} style={styles.hero} />
        ) : (
          <View style={[styles.hero, styles.heroFallback]}><Ionicons name="cube-outline" size={44} color="#FFFFFF" /></View>
        )}

        <View style={styles.body}>
          <Text style={styles.title}>{data.name}</Text>
          <View style={styles.factRow}>
            {data.programType ? <Fact icon="pricetag-outline" text={cap(data.programType)} /> : null}
            {data.levels ? <Fact icon="layers-outline" text={`${data.levels} levels`} /> : null}
            {languages.length ? <Fact icon="language-outline" text={languages.map(cap).join(", ")} /> : null}
          </View>
          {data.description ? <Text style={styles.desc}>{data.description}</Text> : null}

          {outcomes.length ? (
            <Section title="What your child will learn">
              {outcomes.map((o, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Ionicons name="checkmark-circle" size={17} color="#10B981" />
                  <Text style={styles.bulletText}>{o}</Text>
                </View>
              ))}
            </Section>
          ) : null}

          {requirements.length ? (
            <Section title="Requirements">
              {requirements.map((r, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Ionicons name="ellipse" size={7} color="#999999" style={{ marginTop: 6, marginHorizontal: 5 }} />
                  <Text style={styles.bulletText}>{r}</Text>
                </View>
              ))}
            </Section>
          ) : null}

          {/* Instructors */}
          {instructors.length ? (
            <Section title="Meet the instructors">
              {instructors.map((ins) => (
                <View key={ins.id} style={styles.instrRow}>
                  {ins.photo ? (
                    <Image source={{ uri: ins.photo }} style={styles.instrAvatar} />
                  ) : (
                    <View style={[styles.instrAvatar, styles.instrAvatarFallback]}>
                      <Text style={styles.instrInitial}>{ins.name.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={styles.flex}>
                    <Text style={styles.instrName}>{ins.name}</Text>
                    {ins.role ? <Text style={styles.instrRole}>{cap(ins.role.replace(/_/g, " "))}</Text> : null}
                  </View>
                </View>
              ))}
            </Section>
          ) : null}

          {/* Schedule by branch */}
          {branches.length ? (
            <Section title="Schedule by centre">
              {branches.map((b) => (
                <View key={b.branchId} style={styles.branchBlock}>
                  <View style={styles.branchHead}>
                    <Ionicons name="location" size={14} color="#EC2127" />
                    <Text style={styles.branchName}>{b.branchName}</Text>
                  </View>
                  {b.slots.length ? (
                    <View style={styles.slotWrap}>
                      {b.slots.map((s, i) => (
                        <View key={i} style={styles.slotChip}>
                          <Text style={styles.slotDay}>{cap(s.day).slice(0, 3)}</Text>
                          <Text style={styles.slotTime}>{s.time ? time12(s.time) : ""}</Text>
                        </View>
                      ))}
                    </View>
                  ) : <Text style={styles.muted}>Schedule to be announced.</Text>}
                </View>
              ))}
            </Section>
          ) : null}

          {/* Curriculum */}
          {sections.length ? (
            <Section title="Curriculum">
              {sections.map((s, i) => (
                <View key={i} style={styles.currSection}>
                  <Text style={styles.currTitle}>{s.title}</Text>
                  {s.description ? <Text style={styles.currDesc}>{s.description}</Text> : null}
                  {s.lessons.length ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.lessonRow}>
                      {s.lessons.map((l, j) => (
                        <View key={j} style={styles.lessonCard}>
                          {l.thumb ? (
                            <Image source={{ uri: l.thumb }} style={styles.lessonThumb} />
                          ) : (
                            <View style={[styles.lessonThumb, styles.lessonThumbFallback]}><Ionicons name="play-circle" size={22} color="#EC2127" /></View>
                          )}
                          <Text style={styles.lessonTitle} numberOfLines={2}>{l.title}</Text>
                        </View>
                      ))}
                    </ScrollView>
                  ) : null}
                </View>
              ))}
            </Section>
          ) : null}

          {/* Packages — informational only (enrolment is arranged with the centre). */}
          {packages.length ? (
            <Section title="Packages">
              {packages.map((p) => (
                <View key={p.id} style={styles.pkgCard}>
                  <View style={styles.flex}>
                    <Text style={styles.pkgType}>{cap(p.type)}</Text>
                    <View style={styles.pkgMeta}>
                      {p.sessions != null ? <Text style={styles.pkgMetaText}>{p.sessions} sessions</Text> : null}
                      {p.months != null ? <Text style={styles.pkgMetaText}>· {p.months} mo</Text> : null}
                      {p.maxPool > 1 ? <Text style={styles.pkgMetaText}>· up to {p.maxPool} siblings</Text> : null}
                    </View>
                  </View>
                  <Text style={styles.pkgPrice}>{formatRM(p.price)}</Text>
                </View>
              ))}
              <Text style={styles.enrolNote}>To enrol your child in this program, please speak to your centre.</Text>
            </Section>
          ) : (
            <Text style={styles.muted}>Package pricing isn&apos;t available here yet — ask your centre for details.</Text>
          )}
        </View>
      </ScrollView>
      </SwipeBackView>
    </SafeAreaView>
  );
}

function Fact({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.fact}>
      <Ionicons name={icon} size={13} color="#EC2127" />
      <Text style={styles.factText}>{text}</Text>
    </View>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F3F5" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F7F3F5", padding: 24 },
  errText: { fontSize: 14, color: "#666666", textAlign: "center" },
  flex: { flex: 1 },
  scroll: { paddingBottom: 120 },
  hero: { width: "100%", height: 200, backgroundColor: "#EAF7FD" },
  heroFallback: { alignItems: "center", justifyContent: "center", backgroundColor: "#EC2127" },
  body: { padding: 16, gap: 4 },
  title: { fontSize: 24, fontWeight: "800", color: "#2B161B", letterSpacing: -0.4 },
  factRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  fact: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#EAF7FD", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  factText: { fontSize: 11, fontWeight: "700", color: "#EC2127" },
  desc: { fontSize: 14, color: "#374151", lineHeight: 21, marginTop: 12 },
  section: { marginTop: 22 },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: "#2B161B", marginBottom: 10 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 8 },
  bulletText: { flex: 1, fontSize: 14, color: "#374151", lineHeight: 20 },
  muted: { fontSize: 13, color: "#999999", fontStyle: "italic" },
  branchBlock: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#F0F0F6" },
  branchHead: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  branchName: { fontSize: 14, fontWeight: "800", color: "#2B161B" },
  slotWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slotChip: { alignItems: "center", backgroundColor: "#F3F4F6", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, minWidth: 74 },
  slotDay: { fontSize: 12, fontWeight: "800", color: "#EC2127" },
  slotTime: { fontSize: 12, color: "#374151", marginTop: 2, fontWeight: "600" },
  currSection: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#F0F0F6" },
  currTitle: { fontSize: 14, fontWeight: "800", color: "#2B161B" },
  currDesc: { fontSize: 12, color: "#666666", marginTop: 3, lineHeight: 17 },
  lessonRow: { gap: 10, paddingVertical: 10 },
  lessonCard: { width: 120 },
  lessonThumb: { width: 120, height: 72, borderRadius: 10, backgroundColor: "#EAF7FD" },
  lessonThumbFallback: { alignItems: "center", justifyContent: "center" },
  lessonTitle: { fontSize: 11, color: "#374151", fontWeight: "600", marginTop: 5, lineHeight: 15 },
  instrRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFFFFF", borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: "#F0F0F6" },
  instrAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#EAF7FD" },
  instrAvatarFallback: { alignItems: "center", justifyContent: "center", backgroundColor: "#EC2127" },
  instrInitial: { color: "#FFFFFF", fontSize: 19, fontWeight: "800" },
  instrName: { fontSize: 15, fontWeight: "800", color: "#2B161B" },
  instrRole: { fontSize: 12, color: "#EC2127", fontWeight: "700", marginTop: 2 },
  pkgCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#F0F0F6" },
  pkgType: { fontSize: 15, fontWeight: "800", color: "#2B161B" },
  pkgMeta: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 2 },
  pkgMetaText: { fontSize: 12, color: "#666666", fontWeight: "600" },
  pkgPrice: { fontSize: 17, fontWeight: "800", color: "#EC2127" },
  enrolNote: { fontSize: 12, color: "#666666", lineHeight: 17, marginTop: 4, fontStyle: "italic" },
});
