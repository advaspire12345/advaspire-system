import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "@/components/TopBar";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useAuth } from "@/contexts/auth";
import { useNicknames } from "@/contexts/nicknames";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { supabase } from "@/lib/supabase";
import { C, cardShadow } from "@/theme/tech";

type ProgramCard = {
  id: string;
  name: string;
  description: string | null;
  levels: number | null;
  cover: string | null;
  programType: string | null;
  enrolled: { id: string; name: string }[]; // parent's children enrolled in this program
  totalChildren: number; // how many children this parent has (to decide "all enrolled")
};

export default function MarketplaceScreen() {
  const { user } = useAuth();
  const userId = user?.id;
  const router = useRouter();
  const nick = useNicknames();

  const fetchPrograms = async (): Promise<ProgramCard[]> => {
    const { data, error } = await supabase
      .from("courses")
      .select("id, name, short_description, description, number_of_levels, cover_image_url, program_type, status")
      .is("deleted_at", null)
      .order("name", { ascending: true });
    if (error) throw error;

    // Which of THIS parent's children are enrolled, keyed by program name (same
    // course can exist per branch, so we match on name).
    const enrolledByName = new Map<string, { id: string; name: string }[]>();
    let totalChildren = 0;
    if (userId) {
      const { data: parentRow } = await supabase
        .from("parents").select("id").eq("auth_id", userId).is("deleted_at", null).maybeSingle();
      if (parentRow) {
        const { data: links } = await supabase
          .from("parent_students")
          .select("student:students!inner(id, name, deleted_at, enrollments(status, deleted_at, course:courses(name)))")
          .eq("parent_id", parentRow.id);
        for (const l of links ?? []) {
          const s = l.student as unknown as { id: string; name: string; deleted_at: string | null; enrollments: Array<{ status: string; deleted_at: string | null; course: { name: string } | null }> } | null;
          if (!s || s.deleted_at) continue;
          totalChildren += 1;
          const seenName = new Set<string>();
          for (const e of s.enrollments ?? []) {
            if (e.deleted_at || e.status !== "active" || !e.course?.name) continue;
            const key = e.course.name.toLowerCase();
            if (seenName.has(key)) continue;
            seenName.add(key);
            const arr = enrolledByName.get(key) ?? [];
            if (!arr.some((x) => x.id === s.id)) arr.push({ id: s.id, name: s.name });
            enrolledByName.set(key, arr);
          }
        }
      }
    }

    // Dedupe programs by name (each program shows once).
    const seen = new Set<string>();
    const out: ProgramCard[] = [];
    for (const c of data ?? []) {
      const name = (c.name as string) ?? "";
      if (!name || seen.has(name.toLowerCase())) continue;
      if (c.status && c.status !== "active") continue;
      seen.add(name.toLowerCase());
      out.push({
        id: c.id as string,
        name,
        description: (c.short_description as string | null) ?? (c.description as string | null) ?? null,
        levels: c.number_of_levels == null ? null : Number(c.number_of_levels),
        cover: (c.cover_image_url as string | null) ?? null,
        programType: (c.program_type as string | null) ?? null,
        enrolled: enrolledByName.get(name.toLowerCase()) ?? [],
        totalChildren,
      });
    }
    // Enrolled programs first.
    out.sort((a, b) => (b.enrolled.length ? 1 : 0) - (a.enrolled.length ? 1 : 0));
    return out;
  };

  const { data, loading, refreshing, error, isStale, updatedAt, refetch } = useCachedQuery<ProgramCard[]>(
    `marketplace:v2:${userId ?? "anon"}`, // v2 — added enrolled[]
    fetchPrograms,
    { enabled: !!userId },
  );

  const programs = data ?? [];
  const errorMessage = error && !data ? "Couldn't load programs. Check your connection and pull down to refresh." : null;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <TopBar crumb="Store" />
        <View style={styles.center}><ActivityIndicator color={C.red} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <TopBar crumb="Store" />
      <View style={styles.body}>
        <View style={styles.intro}>
          <Text style={styles.title}>Programs</Text>
          <Text style={styles.subtitle}>Everything Advaspire teaches across both branches.</Text>
        </View>

        {errorMessage ? (
          <View style={styles.errorCard}><Text style={styles.errorText}>{errorMessage}</Text></View>
        ) : null}
        {isStale ? (
          <View style={styles.bannerWrap}><OfflineBanner updatedAt={updatedAt} /></View>
        ) : null}

        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor={C.red} />}
        >
          {programs.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="storefront-outline" size={44} color={C.textMute} />
              <Text style={styles.emptyText}>No programs to show yet.</Text>
            </View>
          ) : (
            programs.map((p) => (
              <Pressable
                key={p.id}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={() => router.push(`/program/${p.id}` as Href)}
              >
                {p.cover ? (
                  <Image source={{ uri: p.cover }} style={styles.cover} />
                ) : (
                  <View style={[styles.cover, styles.coverFallback]}>
                    <Ionicons name="cube-outline" size={32} color="#FFFFFF" />
                  </View>
                )}
                {p.enrolled.length > 0 ? (
                  (p.totalChildren <= 1 || p.enrolled.length >= p.totalChildren) ? (
                    <View style={styles.enrolledBanner}>
                      <Text style={styles.enrolledBannerText}>ENROLLED</Text>
                    </View>
                  ) : (
                    <View style={styles.enrolledBanner}>
                      <View style={styles.enrolledPills}>
                        {p.enrolled.map((c) => (
                          <View key={c.id} style={styles.enrolledPill}>
                            <Text style={styles.enrolledPillText}>{(nick.raw(c.id) ?? c.name).split(" ")[0]} enrolled</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )
                ) : null}
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{p.name}</Text>
                  {p.description ? <Text style={styles.cardDesc} numberOfLines={2}>{p.description}</Text> : null}
                  <View style={styles.metaRow}>
                    {p.levels ? (
                      <View style={styles.metaChip}>
                        <Text style={styles.metaText}>{p.levels} levels</Text>
                      </View>
                    ) : null}
                    <View style={styles.metaChip}>
                      <Text style={styles.metaText}>Ages 7–15</Text>
                    </View>
                    <View style={styles.viewMore}>
                      <Text style={styles.viewMoreText}>{p.enrolled.length > 0 ? "Buy more" : "View & buy"}</Text>
                      <Ionicons name="chevron-forward" size={12} color={C.red} />
                    </View>
                  </View>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.card },
  body: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg },
  intro: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 26, fontWeight: "600", color: C.ink, letterSpacing: -0.7 },
  subtitle: { fontSize: 13, color: C.textDim, marginTop: 6 },
  errorCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: C.redChip, padding: 14, borderRadius: 14 },
  errorText: { color: C.red, fontSize: 13 },
  bannerWrap: { paddingHorizontal: 16, marginBottom: 12 },
  list: { padding: 16, paddingTop: 0, gap: 14 },
  empty: { padding: 48, alignItems: "center", gap: 10 },
  emptyText: { fontSize: 14, color: C.textDim },
  card: { backgroundColor: C.card, borderRadius: 20, overflow: "hidden", ...cardShadow },
  cover: { width: "100%", height: 120, backgroundColor: C.blueChip },
  coverFallback: { alignItems: "center", justifyContent: "center", backgroundColor: C.red },
  enrolledBanner: { flexDirection: "row", alignItems: "center", gap: 7, flexWrap: "wrap", backgroundColor: C.yellow, paddingHorizontal: 14, paddingVertical: 9 },
  enrolledBannerText: { fontSize: 11, fontWeight: "800", color: C.ink, letterSpacing: 0.6 },
  enrolledPills: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  enrolledPill: { backgroundColor: "rgba(43,22,27,0.12)", paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  enrolledPillText: { fontSize: 11, fontWeight: "700", color: C.ink },
  cardBody: { padding: 14, gap: 6 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: C.ink },
  cardDesc: { fontSize: 13, color: C.textDim, lineHeight: 18 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.greyChip, paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999 },
  metaText: { fontSize: 11, fontWeight: "700", color: C.textDim },
  cardPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  viewMore: { flexDirection: "row", alignItems: "center", gap: 2, marginLeft: "auto" },
  viewMoreText: { fontSize: 11, fontWeight: "700", color: C.red },
});
