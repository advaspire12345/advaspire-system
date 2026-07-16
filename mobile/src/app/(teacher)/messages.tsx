import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { TeacherTopBar } from "@/components/TeacherTopBar";

type Thread = {
  parentId: string;
  name: string;
  lastBody: string;
  lastAt: string;
  lastSender: "parent" | "staff";
  unread: number;
};

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return d.toLocaleDateString("en-MY", { day: "numeric", month: "short" });
}

export default function TeacherMessages() {
  const router = useRouter();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    // RLS returns only messages for parents at this teacher's branch (or all, for admins).
    const { data: msgs } = await supabase
      .from("parent_messages")
      .select("parent_id, sender, body, created_at, read_at")
      .order("created_at", { ascending: false });
    const byParent = new Map<string, Thread>();
    for (const m of msgs ?? []) {
      const pid = m.parent_id as string;
      let t = byParent.get(pid);
      if (!t) {
        t = { parentId: pid, name: "Parent", lastBody: m.body as string, lastAt: m.created_at as string, lastSender: m.sender as Thread["lastSender"], unread: 0 };
        byParent.set(pid, t); // first seen = latest (list is desc)
      }
      if (m.sender === "parent" && !m.read_at) t.unread += 1;
    }
    const list = [...byParent.values()];
    if (list.length) {
      const { data: parents } = await supabase.from("parents").select("id, name").in("id", list.map((t) => t.parentId));
      const nameById = new Map<string, string>((parents ?? []).map((p) => [p.id as string, (p.name as string) ?? "Parent"]));
      list.forEach((t) => { t.name = nameById.get(t.parentId) ?? "Parent"; });
    }
    list.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
    setThreads(list);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <TeacherTopBar />
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.subtitle}>Parents at your branch</Text>
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#0D9488" /></View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(t) => t.parentId}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#0D9488" />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={44} color="#CBD5E1" />
              <Text style={styles.emptyText}>No parent messages yet. When a parent messages you, it&apos;ll appear here.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={() => router.push(`/teacher-message/${item.parentId}` as Href)}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text></View>
              <View style={styles.flex}>
                <View style={styles.rowTop}>
                  <Text style={[styles.name, item.unread > 0 && styles.nameUnread]} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.time}>{timeAgo(item.lastAt)}</Text>
                </View>
                <Text style={[styles.snippet, item.unread > 0 && styles.snippetUnread]} numberOfLines={1}>
                  {item.lastSender === "staff" ? "You: " : ""}{item.lastBody}
                </Text>
              </View>
              {item.unread > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{item.unread}</Text></View> : null}
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F8FA" },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: "800", color: "#0F172A" },
  subtitle: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  list: { paddingHorizontal: 12, paddingBottom: 24 },
  empty: { padding: 48, alignItems: "center", gap: 12 },
  emptyText: { fontSize: 14, color: "#6B7280", textAlign: "center", maxWidth: 280, lineHeight: 20 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFFFFF", borderRadius: 14, padding: 12, marginTop: 8 },
  rowPressed: { opacity: 0.9 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#0D9488", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  name: { fontSize: 15, fontWeight: "700", color: "#111827", flex: 1 },
  nameUnread: { fontWeight: "800" },
  time: { fontSize: 11, color: "#9CA3AF", fontWeight: "600" },
  snippet: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  snippetUnread: { color: "#111827", fontWeight: "600" },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: "#DB2777", alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  badgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
});
