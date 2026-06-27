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

type ChildSummary = {
  studentId: string;
  studentName: string;
  photo: string | null;
  level: number;
  adcoinBalance: number;
  programName: string | null;
  sessionsRemaining: number;
  sessionsTotal: number;
  sessionsUsed: number;
};

type HomeData = {
  parent: ParentRow | null;
  children: ChildSummary[];
};

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const fetchHome = async (): Promise<HomeData> => {
    const { data: parentRow, error: parentErr } = await supabase
      .from("parents")
      .select("id, name")
      .eq("auth_id", user!.id)
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
        adcoin_balance: number;
        deleted_at: string | null;
        enrollments: Array<{
          status: string;
          sessions_remaining: number;
          package_id: string | null;
          created_at: string;
          deleted_at: string | null;
          course: { name: string } | null;
          package: { duration: number } | null;
        }>;
      })
      .filter((s) => s && !s.deleted_at)
      .map((s) => {
        const active = (s.enrollments ?? [])
          .filter((e) => !e.deleted_at && e.status === "active")
          .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
        const total = active?.package?.duration ?? 0;
        const remaining = Number(active?.sessions_remaining ?? 0);
        const used = Math.max(0, total - remaining);
        return {
          studentId: s.id,
          studentName: s.name,
          photo: s.photo,
          level: s.level,
          adcoinBalance: s.adcoin_balance ?? 0,
          programName: active?.course?.name ?? null,
          sessionsRemaining: remaining,
          sessionsTotal: total,
          sessionsUsed: used,
        };
      });

    return { parent: parentRow as ParentRow, children: rows };
  };

  const { data, loading, refreshing, error, isStale, updatedAt, refetch } = useCachedQuery<HomeData>(
    `home:${user?.id ?? "anon"}`,
    fetchHome,
    { enabled: !!user },
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

        {children.map((c) => {
          const usedFraction = c.sessionsTotal > 0 ? Math.min(1, c.sessionsUsed / c.sessionsTotal) : 0;
          const remainingPct = Math.round((1 - usedFraction) * 100);
          return (
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
                  <Text style={styles.childName} numberOfLines={1}>
                    {c.studentName}
                  </Text>
                  <View style={styles.programChip}>
                    <View style={styles.programDot} />
                    <Text style={styles.childProgram} numberOfLines={1}>
                      {c.programName ?? "No active program"}
                    </Text>
                  </View>
                </View>
                <View style={styles.chevronWrap}>
                  <Ionicons name="chevron-forward" size={18} color="#615DFA" />
                </View>
              </View>

              <View style={styles.metricsRow}>
                <View style={[styles.metric, styles.metricAccent]}>
                  <View style={styles.metricIcon}>
                    <Ionicons name="diamond" size={14} color="#FFFFFF" />
                  </View>
                  <View>
                    <Text style={styles.metricLabel}>Adcoins</Text>
                    <Text style={styles.metricValueLight}>{c.adcoinBalance.toLocaleString()}</Text>
                  </View>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Sessions left</Text>
                  <Text style={styles.metricValue}>{c.sessionsRemaining}</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Total</Text>
                  <Text style={styles.metricValue}>{c.sessionsTotal}</Text>
                </View>
              </View>

              {c.sessionsTotal > 0 ? (
                <View style={styles.progressBlock}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>
                      {c.sessionsUsed} of {c.sessionsTotal} sessions used
                    </Text>
                    <Text style={styles.progressRemaining}>{remainingPct}% left</Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${usedFraction * 100}%` }]} />
                  </View>
                </View>
              ) : null}
            </Pressable>
          );
        })}

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
