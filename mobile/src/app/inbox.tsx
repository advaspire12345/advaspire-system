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
import { OfflineBanner } from "@/components/OfflineBanner";
import { useAuth } from "@/contexts/auth";
import { useCachedQuery } from "@/hooks/useCachedQuery";
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

type InboxData = {
  parentId: string | null;
  items: NotificationRow[];
  pendingTransferCount: number;
};

export default function InboxScreen() {
  const { user } = useAuth();
  const userId = user?.id;
  const router = useRouter();

  const fetchInbox = async (): Promise<InboxData> => {
    const { data: parentRow, error: parentErr } = await supabase
      .from("parents")
      .select("id")
      .eq("auth_id", userId!)
      .is("deleted_at", null)
      .maybeSingle();
    if (parentErr) throw parentErr;
    const pid = (parentRow?.id as string) ?? null;
    if (!pid) return { parentId: null, items: [], pendingTransferCount: 0 };

    const { data, error } = await supabase
      .from("notifications")
      .select("id, type, title, body, link, read_at, created_at")
      .eq("parent_id", pid)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;

    // Count pending session transfers (sender or receiver side) so the
    // "Session transfers" entry shows a badge when action is needed.
    const { data: links } = await supabase
      .from("parent_students")
      .select("student_id")
      .eq("parent_id", pid);
    const sids = (links ?? []).map((l) => l.student_id as string);
    let pendingTransferCount = 0;
    if (sids.length > 0) {
      const [{ count: outCount }, { count: inCount }] = await Promise.all([
        supabase
          .from("session_transfers")
          .select("id", { count: "exact", head: true })
          .in("from_student_id", sids)
          .eq("status", "pending_sender"),
        supabase
          .from("session_transfers")
          .select("id", { count: "exact", head: true })
          .in("to_student_id", sids)
          .eq("status", "pending_receiver"),
      ]);
      pendingTransferCount = (outCount ?? 0) + (inCount ?? 0);
    }
    const items: NotificationRow[] = (data ?? []).map((n) => ({
      id: n.id as string,
      type: (n.type as string) ?? "default",
      title: (n.title as string) ?? "(no title)",
      body: (n.body as string) ?? null,
      link: (n.link as string) ?? null,
      readAt: (n.read_at as string | null) ?? null,
      createdAt: n.created_at as string,
    }));
    return { parentId: pid, items, pendingTransferCount };
  };

  const { data, loading, refreshing, error, isStale, updatedAt, refetch, setData } = useCachedQuery<InboxData>(
    `inbox:${userId ?? "anon"}`,
    fetchInbox,
    { enabled: !!userId },
  );

  const items = data?.items ?? [];
  const parentId = data?.parentId ?? null;
  const pendingTransferCount = data?.pendingTransferCount ?? 0;
  const errorMessage =
    error && !data ? "Couldn't load notifications. Check your connection and pull down to refresh." : null;

  const patchItems = (fn: (rows: NotificationRow[]) => NotificationRow[]) =>
    setData((prev) => (prev ? { ...prev, items: fn(prev.items) } : prev));

  const markRead = async (id: string) => {
    // Optimistic update
    patchItems((rows) => rows.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    const { error: updErr } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    if (updErr) {
      // Revert on failure
      patchItems((rows) => rows.map((n) => (n.id === id ? { ...n, readAt: null } : n)));
      Alert.alert("Could not mark read", updErr.message);
    }
  };

  const markAllRead = async () => {
    if (!parentId) return;
    const unread = items.filter((n) => !n.readAt);
    if (unread.length === 0) return;
    const now = new Date().toISOString();
    patchItems((rows) => rows.map((n) => (n.readAt ? n : { ...n, readAt: now })));
    const { error: updErr } = await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("parent_id", parentId)
      .is("read_at", null);
    if (updErr) {
      Alert.alert("Could not mark all read", updErr.message);
      refetch();
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

      {isStale ? (
        <View style={styles.bannerWrap}>
          <OfflineBanner updatedAt={updatedAt} />
        </View>
      ) : null}

      <Pressable
        style={({ pressed }) => [styles.transfersBanner, pressed && styles.pressed]}
        onPress={() => router.push("/transfers")}
      >
        <View style={[styles.iconWrap, { backgroundColor: "#FB06D420" }]}>
          <Ionicons name="swap-horizontal" size={20} color="#FB06D4" />
        </View>
        <View style={styles.bannerBody}>
          <Text style={styles.bannerTitle}>Session transfers</Text>
          <Text style={styles.bannerSubtitle}>
            {pendingTransferCount > 0
              ? `${pendingTransferCount} pending your confirmation`
              : "Move sessions between siblings"}
          </Text>
        </View>
        {pendingTransferCount > 0 ? (
          <View style={styles.bannerBadge}>
            <Text style={styles.bannerBadgeText}>{pendingTransferCount}</Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        )}
      </Pressable>

      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor="#615DFA" />}
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
  bannerWrap: { paddingHorizontal: 16, marginBottom: 12 },
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
  transfersBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
  },
  bannerBody: { flex: 1 },
  bannerTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  bannerSubtitle: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  bannerBadge: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: "#FB06D4",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerBadgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
});
