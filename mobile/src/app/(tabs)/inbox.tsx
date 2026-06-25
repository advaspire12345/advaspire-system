import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

function timeSince(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-MY", { day: "numeric", month: "short" });
}

const TYPE_ICONS: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  payment: { icon: "card", color: "#615DFA" },
  attendance: { icon: "checkmark-circle", color: "#22C55E" },
  exam: { icon: "school", color: "#F59E0B" },
  reminder: { icon: "alarm", color: "#23D2E2" },
  reschedule: { icon: "swap-horizontal", color: "#FB06D4" },
  adcoin: { icon: "logo-bitcoin", color: "#92400E" },
};

function iconFor(type: string) {
  return TYPE_ICONS[type] ?? { icon: "notifications", color: "#6B7280" };
}

export default function InboxScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [parentId, setParentId] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setErrorMessage(null);
    try {
      let pid = parentId;
      if (!pid) {
        const { data: parentRow, error: parentErr } = await supabase
          .from("parents")
          .select("id")
          .eq("auth_id", user.id)
          .is("deleted_at", null)
          .maybeSingle();
        if (parentErr) throw parentErr;
        pid = (parentRow?.id as string) ?? null;
        setParentId(pid);
      }
      if (!pid) {
        setItems([]);
        return;
      }
      const { data, error } = await supabase
        .from("notifications")
        .select("id, type, title, body, link, read_at, created_at")
        .eq("parent_id", pid)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      const mapped: NotificationRow[] = (data ?? []).map((n) => ({
        id: n.id as string,
        type: (n.type as string) ?? "default",
        title: (n.title as string) ?? "(no title)",
        body: (n.body as string) ?? null,
        link: (n.link as string) ?? null,
        readAt: (n.read_at as string | null) ?? null,
        createdAt: n.created_at as string,
      }));
      setItems(mapped);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, parentId]);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = async (id: string) => {
    // Optimistic update
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      // Revert on failure
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: null } : n)));
      Alert.alert("Could not mark read", error.message);
    }
  };

  const markAllRead = async () => {
    if (!parentId) return;
    const unread = items.filter((n) => !n.readAt);
    if (unread.length === 0) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: now })));
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("parent_id", parentId)
      .is("read_at", null);
    if (error) {
      Alert.alert("Could not mark all read", error.message);
      load();
    }
  };

  const onItemPress = (n: NotificationRow) => {
    if (!n.readAt) markRead(n.id);
    // The web app stores deep-link paths in n.link (e.g. /parent/payments/123).
    // For mobile we map common targets to in-app routes.
    if (n.link) {
      // Payment links
      const paymentMatch = n.link.match(/\/payment(?:s)?\/([0-9a-fA-F-]+)/);
      if (paymentMatch) {
        router.push({ pathname: "/payment/[id]", params: { id: paymentMatch[1] } });
        return;
      }
      // Otherwise just stay — future iterations can map more link shapes
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const unreadCount = items.filter((n) => !n.readAt).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <ActivityIndicator color="#615DFA" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Inbox</Text>
          <Text style={styles.subtitle}>
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </Text>
        </View>
        {unreadCount > 0 ? (
          <Pressable style={({ pressed }) => [styles.markAllButton, pressed && styles.pressed]} onPress={markAllRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
        ) : null}
      </View>

      {errorMessage ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#615DFA" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptyText}>
              When something happens with your child&apos;s classes, payments or rewards, you&apos;ll see it here.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const meta = iconFor(item.type);
          const isUnread = !item.readAt;
          return (
            <Pressable
              style={({ pressed }) => [styles.card, isUnread && styles.cardUnread, pressed && styles.pressed]}
              onPress={() => onItemPress(item)}
            >
              <View style={[styles.iconWrap, { backgroundColor: meta.color + "20" }]}>
                <Ionicons name={meta.icon} size={20} color={meta.color} />
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <Text style={[styles.cardTitle, isUnread && styles.cardTitleUnread]} numberOfLines={2}>
                    {item.title}
                  </Text>
                  {isUnread ? <View style={styles.unreadDot} /> : null}
                </View>
                {item.body ? (
                  <Text style={styles.cardBodyText} numberOfLines={3}>
                    {item.body}
                  </Text>
                ) : null}
                <Text style={styles.timestamp}>{timeSince(item.createdAt)}</Text>
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F6FB" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F6F6FB" },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: { fontSize: 24, fontWeight: "800", color: "#111827" },
  subtitle: { fontSize: 14, color: "#6B7280", marginTop: 2 },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
  },
  pressed: { opacity: 0.85 },
  markAllText: { fontSize: 12, fontWeight: "700", color: "#615DFA" },
  errorCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: "#FEE2E2", padding: 12, borderRadius: 12 },
  errorText: { color: "#991B1B", fontSize: 13 },
  list: { padding: 16, paddingTop: 0, gap: 8 },
  empty: { padding: 48, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  emptyText: { fontSize: 14, color: "#6B7280", textAlign: "center", maxWidth: 280 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    gap: 12,
  },
  cardUnread: { backgroundColor: "#FFFFFF", borderLeftWidth: 3, borderLeftColor: "#615DFA" },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 6 },
  cardTitle: { fontSize: 14, color: "#374151", flex: 1, fontWeight: "500" },
  cardTitleUnread: { fontWeight: "700", color: "#111827" },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#615DFA", marginTop: 4 },
  cardBodyText: { fontSize: 13, color: "#6B7280", marginTop: 4, lineHeight: 18 },
  timestamp: { fontSize: 11, color: "#9CA3AF", marginTop: 6 },
});
