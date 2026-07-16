import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "@/components/TopBar";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useAuth } from "@/contexts/auth";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { supabase } from "@/lib/supabase";

type ProgramCard = {
  id: string;
  name: string;
  description: string | null;
  levels: number | null;
  cover: string | null;
  programType: string | null;
};

export default function MarketplaceScreen() {
  const { user } = useAuth();
  const userId = user?.id;
  const router = useRouter();

  const fetchPrograms = async (): Promise<ProgramCard[]> => {
    const { data, error } = await supabase
      .from("courses")
      .select("id, name, short_description, description, number_of_levels, cover_image_url, program_type, status")
      .is("deleted_at", null)
      .order("name", { ascending: true });
    if (error) throw error;

    // Every program of the Advaspire group — dedupe by name (same course can
    // exist per branch) so each program shows once.
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
      });
    }
    return out;
  };

  const { data, loading, refreshing, error, isStale, updatedAt, refetch } = useCachedQuery<ProgramCard[]>(
    `marketplace:${userId ?? "anon"}`,
    fetchPrograms,
    { enabled: !!userId },
  );

  const programs = data ?? [];
  const errorMessage = error && !data ? "Couldn't load programs. Check your connection and pull down to refresh." : null;

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <ActivityIndicator color="#615DFA" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <TopBar title="Marketplace" />
      <View style={styles.intro}>
        <Text style={styles.title}>Programs</Text>
        <Text style={styles.subtitle}>Everything Advaspire offers across the group</Text>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor="#615DFA" />}
      >
        {programs.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="storefront-outline" size={44} color="#D1D5DB" />
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
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={1}>{p.name}</Text>
                {p.description ? <Text style={styles.cardDesc} numberOfLines={2}>{p.description}</Text> : null}
                <View style={styles.metaRow}>
                  {p.levels ? (
                    <View style={styles.metaChip}>
                      <Ionicons name="layers-outline" size={12} color="#615DFA" />
                      <Text style={styles.metaText}>{p.levels} levels</Text>
                    </View>
                  ) : null}
                  {p.programType ? (
                    <View style={styles.metaChip}>
                      <Ionicons name="pricetag-outline" size={12} color="#615DFA" />
                      <Text style={styles.metaText}>{p.programType}</Text>
                    </View>
                  ) : null}
                  <View style={styles.viewMore}>
                    <Text style={styles.viewMoreText}>View & buy</Text>
                    <Ionicons name="chevron-forward" size={12} color="#615DFA" />
                  </View>
                </View>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F6FB" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F6F6FB" },
  intro: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: "800", color: "#111827" },
  subtitle: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  errorCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: "#FEE2E2", padding: 14, borderRadius: 12 },
  errorText: { color: "#991B1B", fontSize: 13 },
  bannerWrap: { paddingHorizontal: 16, marginBottom: 12 },
  list: { padding: 16, paddingTop: 0, gap: 14 },
  empty: { padding: 48, alignItems: "center", gap: 10 },
  emptyText: { fontSize: 14, color: "#6B7280" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cover: { width: "100%", height: 120, backgroundColor: "#EEF2FF" },
  coverFallback: { alignItems: "center", justifyContent: "center", backgroundColor: "#615DFA" },
  cardBody: { padding: 14, gap: 6 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  cardDesc: { fontSize: 13, color: "#6B7280", lineHeight: 18 },
  metaRow: { flexDirection: "row", gap: 8, marginTop: 2 },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#EEF2FF", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  metaText: { fontSize: 11, fontWeight: "700", color: "#615DFA" },
  cardPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  viewMore: { flexDirection: "row", alignItems: "center", gap: 2, marginLeft: "auto" },
  viewMoreText: { fontSize: 11, fontWeight: "800", color: "#615DFA" },
});
