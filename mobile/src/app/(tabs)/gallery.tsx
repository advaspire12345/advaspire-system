import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "@/components/TopBar";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useAuth } from "@/contexts/auth";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { useNicknames } from "@/contexts/nicknames";
import { supabase } from "@/lib/supabase";
import { MediaGallery, type MediaItem } from "@/components/MediaGallery";
import { C, cardShadow } from "@/theme/tech";

type Child = { id: string; name: string };
type GalleryItem = MediaItem & { title: string; date: string; kind: "Photo" | "Video" };

type GalleryData = { children: Child[]; itemsByChild: Record<string, GalleryItem[]> };

function shortDate(iso: string): string {
  return new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString("en-MY", { day: "numeric", month: "short" });
}

export default function GalleryScreen() {
  const { user } = useAuth();
  const userId = user?.id;
  const nick = useNicknames();
  const [childId, setChildId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "photo" | "video">("all");
  const [gallery, setGallery] = useState<{ items: MediaItem[]; index: number } | null>(null);

  const fetchGallery = async (): Promise<GalleryData> => {
    const { data: parentRow } = await supabase
      .from("parents").select("id").eq("auth_id", userId!).is("deleted_at", null).maybeSingle();
    if (!parentRow) return { children: [], itemsByChild: {} };

    const { data: links } = await supabase
      .from("parent_students")
      .select("student:students!inner(id, name, deleted_at)")
      .eq("parent_id", parentRow.id);
    const children: Child[] = (links ?? [])
      .map((l) => l.student as unknown as { id: string; name: string; deleted_at: string | null })
      .filter((s) => s && !s.deleted_at)
      .map((s) => ({ id: s.id, name: s.name }));

    const itemsByChild: Record<string, GalleryItem[]> = {};
    for (const child of children) {
      const { data: att } = await supabase
        .from("attendance")
        .select("id, date, last_activity, activities, project_photos, enrollment:enrollments!inner(student_id, course:courses(name))")
        .eq("enrollment.student_id", child.id)
        .eq("status", "present")
        .order("date", { ascending: false })
        .limit(80);
      const items: GalleryItem[] = [];
      for (const a of att ?? []) {
        const enr = a.enrollment as unknown as { course: { name: string } | null } | null;
        const title = (a.last_activity as string | null) || enr?.course?.name || "Session";
        const date = a.date as string;
        const acts = (a.activities as { photos?: string[]; video?: string | null }[] | null) ?? [];
        for (const act of acts) {
          for (const p of act?.photos ?? []) if (p && !items.some((m) => m.url === p)) items.push({ type: "photo", url: p, title, date, kind: "Photo" });
          if (act?.video && !items.some((m) => m.url === act.video)) items.push({ type: "video", url: act.video, title, date, kind: "Video" });
        }
        for (const p of (a.project_photos as string[] | null) ?? []) if (p && !items.some((m) => m.url === p)) items.push({ type: "photo", url: p, title, date, kind: "Photo" });
      }
      itemsByChild[child.id] = items;
    }
    return { children, itemsByChild };
  };

  const { data, loading, error, isStale, updatedAt } = useCachedQuery<GalleryData>(
    `gallery:${userId ?? "anon"}`,
    fetchGallery,
    { enabled: !!userId },
  );

  const children = data?.children ?? [];
  const activeChild = childId ?? children[0]?.id ?? null;
  const allItems = (activeChild && data?.itemsByChild[activeChild]) || [];
  const items = useMemo(
    () => (filter === "all" ? allItems : allItems.filter((m) => (filter === "video" ? m.type === "video" : m.type === "photo"))),
    [allItems, filter],
  );
  const childName = children.find((c) => c.id === activeChild)?.name ?? "";
  const firstName = (nick.raw(activeChild ?? "") ?? childName).split(" ")[0];

  const photoCount = allItems.filter((m) => m.type === "photo").length;
  const videoCount = allItems.filter((m) => m.type === "video").length;

  const openAt = (m: GalleryItem) => {
    const idx = items.findIndex((x) => x.url === m.url);
    setGallery({ items, index: Math.max(0, idx) });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <TopBar crumb="Gallery" />
        <View style={styles.center}><ActivityIndicator color={C.red} /></View>
      </SafeAreaView>
    );
  }

  const FILTERS: { key: typeof filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: allItems.length },
    { key: "photo", label: "Photos", count: photoCount },
    { key: "video", label: "Videos", count: videoCount },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <TopBar crumb="Gallery" />

      {children.length > 1 ? (
        <View style={styles.childRow}>
          {children.map((c) => {
            const on = c.id === activeChild;
            return (
              <Pressable key={c.id} onPress={() => setChildId(c.id)} style={[styles.childPill, on && styles.childPillOn]}>
                <Text style={[styles.childPillText, on && styles.childPillTextOn]} numberOfLines={1}>
                  {nick.raw(c.id) ?? c.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <FlatList
        style={styles.list}
        data={items}
        keyExtractor={(m, i) => `${i}-${m.url}`}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>Gallery</Text>
            <Text style={styles.subtitle}>
              {children.length === 0 ? "No children enrolled yet." : `Photos and builds shared by ${firstName || "your child"}'s trainer.`}
            </Text>
            {isStale ? <View style={{ marginTop: 12 }}><OfflineBanner updatedAt={updatedAt} /></View> : null}
            {children.length > 0 ? (
              <View style={styles.filterRow}>
                {FILTERS.map((f) => {
                  const on = filter === f.key;
                  return (
                    <Pressable key={f.key} onPress={() => setFilter(f.key)} style={[styles.filterPill, on && styles.filterPillOn]}>
                      <Text style={[styles.filterText, on && styles.filterTextOn]}>{f.label} {f.count}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={() => openAt(item)}>
            <View style={styles.thumbWrap}>
              {item.type === "photo" ? (
                <Image source={{ uri: item.url }} style={styles.thumb} resizeMode="cover" />
              ) : (
                <View style={[styles.thumb, styles.videoThumb]}>
                  <Ionicons name="play-circle" size={40} color="#FFFFFF" />
                </View>
              )}
              <View style={styles.kindTag}>
                {item.type === "video" ? <Ionicons name="videocam" size={10} color="#FFFFFF" /> : null}
                <Text style={styles.kindTagText}>{item.kind.toUpperCase()}</Text>
              </View>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.cardDate}>{shortDate(item.date)}</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          error && !data ? (
            <View style={styles.empty}>
              <Ionicons name="cloud-offline-outline" size={40} color={C.textMute} />
              <Text style={styles.emptyTitle}>Couldn&apos;t load the gallery</Text>
              <Text style={styles.emptyText}>Check your connection and try again.</Text>
            </View>
          ) : children.length === 0 ? null : (
            <View style={styles.empty}>
              <Ionicons name="images-outline" size={40} color={C.textMute} />
              <Text style={styles.emptyTitle}>No photos yet</Text>
              <Text style={styles.emptyText}>When {firstName || "your child"}&apos;s trainer shares photos or videos from class, they&apos;ll appear here.</Text>
            </View>
          )
        }
      />

      <MediaGallery
        key={gallery ? `${gallery.items[0]?.url ?? ""}:${gallery.index}` : "none"}
        items={gallery?.items ?? null}
        index={gallery?.index ?? 0}
        onClose={() => setGallery(null)}
      />
    </SafeAreaView>
  );
}

const GAP = 12;
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.card },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg },
  scroll: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 32, fontWeight: "800", color: C.text, letterSpacing: -0.8 },
  subtitle: { fontSize: 14, color: C.textDim, marginTop: 6, lineHeight: 20 },
  list: { flex: 1, backgroundColor: C.bg },
  childRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6, backgroundColor: C.bg },
  childPill: { flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 999, paddingVertical: 12, alignItems: "center" },
  childPillOn: { backgroundColor: C.ink, borderColor: C.ink },
  childPillText: { fontSize: 14, fontWeight: "800", color: C.textDim },
  childPillTextOn: { color: "#FFFFFF" },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16, marginBottom: 4 },
  filterPill: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999 },
  filterPillOn: { backgroundColor: C.ink, borderColor: C.ink },
  filterText: { fontSize: 13, fontWeight: "800", color: C.textDim },
  filterTextOn: { color: "#FFFFFF" },
  gridRow: { gap: GAP },
  card: { flex: 1, backgroundColor: C.card, borderRadius: 18, overflow: "hidden", marginBottom: GAP, ...cardShadow },
  cardPressed: { opacity: 0.92 },
  thumbWrap: { position: "relative" },
  thumb: { width: "100%", aspectRatio: 1, backgroundColor: C.sunken },
  videoThumb: { alignItems: "center", justifyContent: "center", backgroundColor: C.ink },
  kindTag: { position: "absolute", left: 8, bottom: 8, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(20,10,12,0.62)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  kindTagText: { fontSize: 9, fontWeight: "800", color: "#FFFFFF", letterSpacing: 0.6 },
  cardBody: { padding: 12, gap: 2 },
  cardTitle: { fontSize: 14, fontWeight: "800", color: C.text },
  cardDate: { fontSize: 12, color: C.textMute, fontWeight: "600" },
  empty: { alignItems: "center", justifyContent: "center", gap: 8, paddingTop: 60, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: C.text },
  emptyText: { fontSize: 13, color: C.textDim, textAlign: "center", lineHeight: 19 },
});
