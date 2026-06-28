import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { TopBar } from "@/components/TopBar";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useAuth } from "@/contexts/auth";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { supabase } from "@/lib/supabase";

type ParentRow = {
  id: string;
  name: string;
};

type ProgramInfo = {
  name: string;
  remaining: number;
  nextClass: string | null; // yyyy-mm-dd
  startTime: string | null; // HH:mm
};

type ChildSummary = {
  studentId: string;
  studentName: string;
  photo: string | null;
  level: number;
  programs: ProgramInfo[];
};

const WEEKDAYS_FULL = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

// Parse an enrollment's weekday schedule (schedule JSON or day_of_week JSON).
function parseScheduleDays(scheduleRaw: string | null, dayOfWeekRaw: string | null): { days: string[]; time: string | null } {
  let days: string[] = [];
  let time: string | null = null;
  if (scheduleRaw) {
    try {
      const parsed = JSON.parse(scheduleRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        days = parsed.map((p: { day: string }) => String(p.day || "").toLowerCase()).filter(Boolean);
        if (parsed[0].time) time = parsed[0].time;
      }
    } catch {
      /* ignore */
    }
  }
  if (days.length === 0 && dayOfWeekRaw) {
    try {
      const parsed = JSON.parse(dayOfWeekRaw);
      if (Array.isArray(parsed)) days = parsed.map((d: string) => String(d).toLowerCase());
    } catch {
      /* ignore */
    }
  }
  return { days, time };
}

// Next date (today or later) that matches one of the scheduled weekdays.
function nextClassDate(days: string[]): string | null {
  if (!days.length) return null;
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  for (let i = 0; i <= 7; i++) {
    const d = new Date(t);
    d.setDate(d.getDate() + i);
    if (days.includes(WEEKDAYS_FULL[d.getDay()])) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${dd}`;
    }
  }
  return null;
}

function fmtClassDate(ymd: string, time: string | null): string {
  const d = new Date(ymd + "T00:00:00");
  const dateStr = d.toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short" });
  if (!time) return dateStr;
  const [h, m] = time.split(":").map((n) => parseInt(n, 10));
  const period = h < 12 ? "AM" : "PM";
  return `${dateStr} · ${h % 12 || 12}:${String(m).padStart(2, "0")} ${period}`;
}

type HomeData = {
  parent: ParentRow | null;
  children: ChildSummary[];
};

export default function HomeScreen() {
  const { user } = useAuth();
  const userId = user?.id;
  const router = useRouter();

  const fetchHome = async (): Promise<HomeData> => {
    const { data: parentRow, error: parentErr } = await supabase
      .from("parents")
      .select("id, name")
      .eq("auth_id", userId!)
      .is("deleted_at", null)
      .maybeSingle();
    if (parentErr) throw parentErr;

    if (!parentRow) {
      return { parent: null, children: [] };
    }

    const { data: links, error: linksErr } = await supabase
      .from("parent_students")
      .select(`
        student:students!inner(
          id,
          name,
          photo,
          level,
          adcoin_balance,
          deleted_at,
          enrollments(
            status,
            sessions_remaining,
            day_of_week,
            start_time,
            schedule,
            package_id,
            created_at,
            deleted_at,
            course:courses(name),
            package:course_pricing(duration)
          )
        )
      `)
      .eq("parent_id", parentRow.id);
    if (linksErr) throw linksErr;

    const rows: ChildSummary[] = (links ?? [])
      .map((l) => l.student as unknown as {
        id: string;
        name: string;
        photo: string | null;
        level: number;
        deleted_at: string | null;
        enrollments: Array<{
          status: string;
          sessions_remaining: number;
          day_of_week: string | null;
          start_time: string | null;
          schedule: string | null;
          package_id: string | null;
          created_at: string;
          deleted_at: string | null;
          course: { name: string } | null;
          package: { duration: number } | null;
        }>;
      })
      .filter((s) => s && !s.deleted_at)
      .map((s) => {
        // All active enrollments, newest first, one entry per program (course).
        const actives = (s.enrollments ?? [])
          .filter((e) => !e.deleted_at && e.status === "active")
          .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
        const seen = new Set<string>();
        const programs: ProgramInfo[] = [];
        for (const e of actives) {
          const name = e.course?.name ?? "Program";
          if (seen.has(name)) continue;
          seen.add(name);
          const { days, time } = parseScheduleDays(e.schedule, e.day_of_week);
          programs.push({
            name,
            remaining: Number(e.sessions_remaining ?? 0),
            nextClass: nextClassDate(days),
            startTime: e.start_time ?? time,
          });
        }
        return {
          studentId: s.id,
          studentName: s.name,
          photo: s.photo,
          level: s.level,
          programs,
        };
      });

    return { parent: parentRow as ParentRow, children: rows };
  };

  const { data, loading, refreshing, error, isStale, updatedAt, refetch } = useCachedQuery<HomeData>(
    `home:${userId ?? "anon"}`,
    fetchHome,
    { enabled: !!userId },
  );

  const parent = data?.parent ?? null;
  const children = data?.children ?? [];
  // Only a hard failure with nothing cached to fall back on.
  const errorMessage =
    error && !data ? "Couldn't load your dashboard. Check your connection and pull down to refresh." : null;
  const firstName = parent?.name?.split(" ")[0] ?? "";

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <TopBar showLogo />
        <View style={styles.center}>
          <ActivityIndicator color="#615DFA" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.heroBg}>
        <View style={styles.heroOrb} />
        <View style={styles.heroOrb2} />
      </View>
      <TopBar showLogo />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor="#615DFA" />
        }
      >
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>
            {new Date().toLocaleDateString("en-MY", { weekday: "long", day: "numeric", month: "long" })}
          </Text>
          <Text style={styles.heroTitle}>Hello{firstName ? `, ${firstName}` : ""}</Text>
          <Text style={styles.heroSub}>
            {children.length === 0
              ? "No children enrolled yet"
              : `Tracking ${children.length} ${children.length === 1 ? "child" : "children"} today`}
          </Text>
        </View>

        {isStale ? <OfflineBanner updatedAt={updatedAt} /> : null}

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={16} color="#B91C1C" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {!parent && !errorMessage ? (
          <View style={styles.emptyCard}>
            <Ionicons name="person-outline" size={28} color="#615DFA" />
            <Text style={styles.emptyTitle}>No parent record</Text>
            <Text style={styles.emptyText}>
              This account isn&apos;t linked to a parent record yet. Contact your branch admin to complete setup.
            </Text>
          </View>
        ) : null}

        {children.length > 0 ? (
          <Text style={styles.sectionLabel}>My children</Text>
        ) : null}

        {children.map((c) => (
          <Pressable
            key={c.studentId}
            style={({ pressed }) => [styles.childCard, pressed && styles.cardPressed]}
            onPress={() => router.push({ pathname: "/(tabs)/progress", params: { studentId: c.studentId } })}
          >
            <View style={styles.childTop}>
              <View style={styles.avatarStack}>
                {c.photo ? (
                  <Image source={{ uri: c.photo }} style={styles.childAvatar} />
                ) : (
                  <View style={[styles.childAvatar, styles.childAvatarFallback]}>
                    <Text style={styles.childAvatarInitial}>{c.studentName.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={styles.levelBadge}>
                  <Text style={styles.levelBadgeText}>Lv {c.level}</Text>
                </View>
              </View>
              <View style={styles.childInfo}>
                <Text style={styles.childName} numberOfLines={1}>{c.studentName}</Text>
                <View style={styles.programChip}>
                  <View style={styles.programDot} />
                  <Text style={styles.childProgram} numberOfLines={1}>
                    {c.programs.length === 0
                      ? "No active program"
                      : `${c.programs.length} program${c.programs.length === 1 ? "" : "s"}`}
                  </Text>
                </View>
              </View>
              <View style={styles.chevronWrap}>
                <Ionicons name="chevron-forward" size={18} color="#615DFA" />
              </View>
            </View>

            {c.programs.length === 0 ? (
              <Text style={styles.noProgram}>No active program</Text>
            ) : (
              <View style={styles.programsList}>
                {c.programs.map((pr) => {
                  const ok = pr.remaining > 0;
                  return (
                    <View key={pr.name} style={styles.progBlock}>
                      <View style={styles.progTopRow}>
                        <View style={styles.progDot} />
                        <Text style={styles.progName} numberOfLines={1}>{pr.name}</Text>
                        <View style={[styles.usedPill, ok ? styles.sessOk : styles.sessLow]}>
                          <Ionicons name={ok ? "checkmark-circle" : "alert-circle"} size={12} color={ok ? "#065F46" : "#991B1B"} />
                          <Text style={[styles.usedText, { color: ok ? "#065F46" : "#991B1B" }]}>{pr.remaining} left</Text>
                        </View>
                      </View>
                      <View style={styles.nextClassRow}>
                        <Ionicons name="calendar-outline" size={13} color="#615DFA" />
                        <Text style={styles.nextClassText}>
                          {pr.nextClass ? `Next class ${fmtClassDate(pr.nextClass, pr.startTime)}` : "No upcoming class"}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </Pressable>
        ))}

        {children.length > 0 ? (
          <View style={styles.tipCard}>
            <View style={styles.tipIcon}>
              <Ionicons name="sparkles" size={16} color="#615DFA" />
            </View>
            <Text style={styles.tipText}>Tap any child to see attendance, projects and certifications.</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F6FB" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  heroBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 320,
    overflow: "hidden",
  },
  heroOrb: {
    position: "absolute",
    top: -80,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "#615DFA",
    opacity: 0.12,
  },
  heroOrb2: {
    position: "absolute",
    top: 40,
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#23D2E2",
    opacity: 0.1,
  },
  scroll: { padding: 16, gap: 12, paddingBottom: 32 },
  hero: { paddingHorizontal: 4, paddingTop: 4, paddingBottom: 8 },
  heroEyebrow: { fontSize: 11, fontWeight: "700", color: "#615DFA", textTransform: "uppercase", letterSpacing: 1 },
  heroTitle: { fontSize: 28, fontWeight: "800", color: "#0F172A", marginTop: 6, letterSpacing: -0.6 },
  heroSub: { fontSize: 14, color: "#6B7280", marginTop: 4 },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: "#6B7280", textTransform: "uppercase", letterSpacing: 1, marginTop: 4, paddingHorizontal: 4 },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    padding: 14,
    borderRadius: 12,
  },
  errorText: { color: "#991B1B", fontSize: 13, flex: 1 },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  emptyText: { fontSize: 13, color: "#6B7280", textAlign: "center", lineHeight: 19 },
  childCard: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 20,
    gap: 14,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardPressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  noProgram: { fontSize: 13, color: "#9CA3AF", fontStyle: "italic" },
  programsList: { gap: 10, marginTop: 2 },
  progBlock: { backgroundColor: "#F9FAFB", borderRadius: 12, padding: 12, gap: 6, borderWidth: 1, borderColor: "#F3F4F6" },
  progTopRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  progDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#615DFA" },
  progName: { flex: 1, fontSize: 14, fontWeight: "700", color: "#111827" },
  usedPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  usedText: { fontSize: 12, fontWeight: "800" },
  sessOk: { backgroundColor: "#D1FAE5" },
  sessLow: { backgroundColor: "#FEE2E2" },
  nextClassRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 16 },
  nextClassText: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
  childTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatarStack: { position: "relative", width: 56, height: 56 },
  childAvatar: { width: 56, height: 56, borderRadius: 18, backgroundColor: "#F3F4F6" },
  childAvatarFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#615DFA",
  },
  childAvatarInitial: { color: "#FFFFFF", fontSize: 22, fontWeight: "800" },
  levelBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: "#0F172A",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  levelBadgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  childInfo: { flex: 1, gap: 6 },
  childName: { fontSize: 18, fontWeight: "800", color: "#0F172A", letterSpacing: -0.3 },
  programChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  programDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#615DFA" },
  childProgram: { fontSize: 12, color: "#4338CA", fontWeight: "700", maxWidth: 160 },
  chevronWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  metricsRow: { flexDirection: "row", gap: 8 },
  metric: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  metricAccent: {
    backgroundColor: "#615DFA",
    borderColor: "#615DFA",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metricIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  metricLabel: { fontSize: 9, color: "#6B7280", textTransform: "uppercase", fontWeight: "800", letterSpacing: 0.6 },
  metricValue: { fontSize: 18, fontWeight: "800", color: "#0F172A", marginTop: 2 },
  metricValueLight: { fontSize: 16, fontWeight: "800", color: "#FFFFFF", marginTop: 1 },
  progressBlock: { gap: 8 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressBarBg: { height: 8, backgroundColor: "#F3F4F6", borderRadius: 4, overflow: "hidden" },
  progressBarFill: { height: "100%", backgroundColor: "#615DFA", borderRadius: 4 },
  progressLabel: { fontSize: 11, color: "#6B7280", fontWeight: "600" },
  progressRemaining: { fontSize: 11, color: "#615DFA", fontWeight: "800" },
  tipCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  tipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  tipText: { flex: 1, fontSize: 12, color: "#6B7280", fontWeight: "500", lineHeight: 16 },
});
