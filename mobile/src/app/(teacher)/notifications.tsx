import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useRole } from "@/contexts/role";
import { supabase } from "@/lib/supabase";
import { TeacherTopBar } from "@/components/TeacherTopBar";

type Notif = { id: string; type: string; title: string; body: string | null; link: string | null; readAt: string | null; createdAt: string };

const TYPE_ICONS: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  payment: { icon: "card", color: "#615DFA" },
  payment_due: { icon: "card", color: "#615DFA" },
  attendance: { icon: "checkmark-circle", color: "#16A34A" },
  child_attendance_marked: { icon: "checkmark-circle", color: "#16A34A" },
  exam: { icon: "school", color: "#F59E0B" },
  reminder: { icon: "alarm", color: "#0D9488" },
  reschedule: { icon: "swap-horizontal", color: "#DB2777" },
  adcoin: { icon: "logo-bitcoin", color: "#CA8A04" },
  message: { icon: "chatbubbles", color: "#0D9488" },
};
function iconFor(type: string) { return TYPE_ICONS[type] ?? { icon: "notifications", color: "#6B7280" }; }
function timeSince(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-MY", { day: "numeric", month: "short" });
}

export default function TeacherNotifications() {
  const { staff } = useRole();
  const router = useRouter();
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!staff?.id) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("id, type, title, body, link, read_at, created_at")
      .eq("user_id", staff.id).order("created_at", { ascending: false }).limit(100);
    setItems((data ?? []).map((n) => ({
      id: n.id as string, type: (n.type as string) ?? "default", title: (n.title as string) ?? "(no title)",
      body: (n.body as string | null) ?? null, link: (n.link as string | null) ?? null, readAt: (n.read_at as string | null) ?? null, createdAt: n.created_at as string,
    })));
    setLoading(false); setRefreshing(false);
  }, [staff?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const markRead = async (id: string) => {
    setItems((rows) => rows.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  };
  const markAllRead = async () => {
    if (!staff?.id) return;
    const now = new Date().toISOString();
    setItems((rows) => rows.map((n) => (n.readAt ? n : { ...n, readAt: now })));
    const { error } = await supabase.from("notifications").update({ read_at: now }).eq("user_id", staff.id).is("read_at", null);
    if (error) Alert.alert("Couldn't mark all read", error.message);
  };
  const onPress = (n: Notif) => {
    if (!n.readAt) markRead(n.id);
    if (n.link && /message/i.test(n.link)) router.push("/(teacher)/messages" as Href);
  };

  const unread = items.filter((n) => !n.readAt).length;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <TeacherTopBar />
      <View style={styles.header}>
        <View><Text style={styles.title}>Notifications</Text><Text style={styles.subtitle}>{unread > 0 ? `${unread} unread` : "All caught up"}</Text></View>
        {unread > 0 ? <Pressable style={styles.markAll} onPress={markAllRead}><Text style={styles.markAllText}>Mark all read</Text></Pressable> : null}
      </View>
      {loading ? <View style={styles.center}><ActivityIndicator color="#0D9488" /></View> : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#0D9488" />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="notifications-off-outline" size={44} color="#D1D5DB" /><Text style={styles.emptyTitle}>No notifications</Text><Text style={styles.emptyText}>Alerts about attendance, payments and schedule changes will show here.</Text></View>}
          renderItem={({ item }) => {
            const meta = iconFor(item.type);
            const isUnread = !item.readAt;
            return (
              <Pressable style={[styles.card, isUnread && styles.cardUnread]} onPress={() => onPress(item)}>
                <View style={[styles.iconWrap, { backgroundColor: meta.color + "20" }]}><Ionicons name={meta.icon} size={20} color={meta.color} /></View>
                <View style={styles.flex}>
                  <View style={styles.cardTop}><Text style={[styles.cardTitle, isUnread && styles.cardTitleUnread]} numberOfLines={2}>{item.title}</Text>{isUnread ? <View style={styles.unreadDot} /> : null}</View>
                  {item.body ? <Text style={styles.body} numberOfLines={3}>{item.body}</Text> : null}
                  <Text style={styles.time}>{timeSince(item.createdAt)}</Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F8FA" },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: "800", color: "#0F172A" },
  subtitle: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  markAll: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: "#E6FAF9" },
  markAllText: { fontSize: 12, fontWeight: "800", color: "#0D9488" },
  list: { padding: 12, gap: 8 },
  empty: { padding: 48, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  emptyText: { fontSize: 14, color: "#6B7280", textAlign: "center", maxWidth: 280 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 14, flexDirection: "row", gap: 12, borderWidth: 1, borderColor: "#EEF0F6" },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: "#0D9488" },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 6 },
  cardTitle: { fontSize: 14, color: "#374151", flex: 1, fontWeight: "600" },
  cardTitleUnread: { fontWeight: "800", color: "#111827" },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#0D9488", marginTop: 4 },
  body: { fontSize: 13, color: "#6B7280", marginTop: 4, lineHeight: 18 },
  time: { fontSize: 11, color: "#9CA3AF", marginTop: 6 },
});
