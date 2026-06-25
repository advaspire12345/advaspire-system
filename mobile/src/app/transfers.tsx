import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";

type TransferRow = {
  id: string;
  fromStudentId: string;
  fromStudentName: string;
  toStudentId: string;
  toStudentName: string;
  courseName: string;
  sessions: number;
  status: "pending_sender" | "pending_receiver" | "approved" | "completed" | "rejected" | "cancelled";
  notes: string | null;
  createdAt: string;
  // Kind from the current parent's perspective:
  //  - "outgoing-approve": parent owns from_student, needs to approve sending
  //  - "incoming-accept":  parent owns to_student, needs to accept receiving
  kind: "outgoing-approve" | "incoming-accept";
};

export default function TransfersScreen() {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<TransferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setErrorMessage(null);
    try {
      const { data: parentRow } = await supabase
        .from("parents")
        .select("id")
        .eq("auth_id", user.id)
        .is("deleted_at", null)
        .maybeSingle();
      if (!parentRow) {
        setTransfers([]);
        return;
      }
      const { data: links } = await supabase
        .from("parent_students")
        .select("student_id")
        .eq("parent_id", parentRow.id);
      const studentIds = (links ?? []).map((l) => l.student_id as string);
      if (studentIds.length === 0) {
        setTransfers([]);
        return;
      }

      // Two queries in parallel: outgoing-to-approve, incoming-to-accept.
      const [outRes, inRes] = await Promise.all([
        supabase
          .from("session_transfers")
          .select(`
            id, from_student_id, to_student_id, sessions, status, notes, created_at,
            from_student:students!session_transfers_from_student_id_fkey(name),
            to_student:students!session_transfers_to_student_id_fkey(name),
            course:courses(name)
          `)
          .in("from_student_id", studentIds)
          .eq("status", "pending_sender")
          .order("created_at", { ascending: false }),
        supabase
          .from("session_transfers")
          .select(`
            id, from_student_id, to_student_id, sessions, status, notes, created_at,
            from_student:students!session_transfers_from_student_id_fkey(name),
            to_student:students!session_transfers_to_student_id_fkey(name),
            course:courses(name)
          `)
          .in("to_student_id", studentIds)
          .eq("status", "pending_receiver")
          .order("created_at", { ascending: false }),
      ]);

      if (outRes.error) throw outRes.error;
      if (inRes.error) throw inRes.error;

      const map = (raw: typeof outRes.data, kind: TransferRow["kind"]): TransferRow[] =>
        (raw ?? []).map((t) => {
          const from = t.from_student as unknown as { name: string } | null;
          const to = t.to_student as unknown as { name: string } | null;
          const c = t.course as unknown as { name: string } | null;
          return {
            id: t.id as string,
            fromStudentId: t.from_student_id as string,
            fromStudentName: from?.name ?? "Unknown",
            toStudentId: t.to_student_id as string,
            toStudentName: to?.name ?? "Unknown",
            courseName: c?.name ?? "Class",
            sessions: Number(t.sessions ?? 0),
            status: t.status as TransferRow["status"],
            notes: (t.notes as string | null) ?? null,
            createdAt: t.created_at as string,
            kind,
          };
        });

      setTransfers([...map(outRes.data, "outgoing-approve"), ...map(inRes.data, "incoming-accept")]);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load transfers");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const onAct = (action: "approve" | "accept" | "reject", _id: string) => {
    Alert.alert(
      "Backend needed",
      `Action "${action}" needs a mobile-facing endpoint that wraps the existing PATCH /api/session-transfers logic — the web action also adjusts session balances and emits notifications, which we shouldn't bypass. UI is wired; one-line swap when the endpoint exists.`,
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <Stack.Screen options={{ title: "Session transfers", headerShown: true }} />
        <ActivityIndicator color="#615DFA" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen options={{ title: "Session transfers", headerShown: true, headerTintColor: "#615DFA" }} />
      {errorMessage ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <FlatList
        data={transfers}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#615DFA" />}
        ListHeaderComponent={
          <View style={styles.intro}>
            <Text style={styles.introTitle}>Sibling session transfers</Text>
            <Text style={styles.introText}>
              Move sessions between your children in the same program. Each transfer needs both sides
              to confirm.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="swap-horizontal-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Nothing to confirm</Text>
            <Text style={styles.emptyText}>
              When a session transfer needs your approval, it&apos;ll appear here.
            </Text>
          </View>
        }
        renderItem={({ item }) => <TransferCard row={item} onAct={onAct} />}
      />
    </SafeAreaView>
  );
}

function TransferCard({ row, onAct }: { row: TransferRow; onAct: (action: "approve" | "accept" | "reject", id: string) => void }) {
  const isOutgoing = row.kind === "outgoing-approve";
  const accent = isOutgoing ? "#F17521" : "#22C55E";
  const action = isOutgoing ? "approve" : "accept";
  const label = isOutgoing ? "Approve sending" : "Accept";
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.kindBadge, { backgroundColor: accent + "1A" }]}>
          <Ionicons name={isOutgoing ? "arrow-up-circle" : "arrow-down-circle"} size={14} color={accent} />
          <Text style={[styles.kindText, { color: accent }]}>
            {isOutgoing ? "Outgoing" : "Incoming"}
          </Text>
        </View>
        <Text style={styles.sessionsBadge}>{row.sessions} session{row.sessions === 1 ? "" : "s"}</Text>
      </View>

      <View style={styles.flow}>
        <View style={styles.flowSide}>
          <Text style={styles.flowLabel}>From</Text>
          <Text style={styles.flowName}>{row.fromStudentName}</Text>
        </View>
        <Ionicons name="arrow-forward" size={20} color="#9CA3AF" />
        <View style={styles.flowSide}>
          <Text style={styles.flowLabel}>To</Text>
          <Text style={styles.flowName}>{row.toStudentName}</Text>
        </View>
      </View>

      <Text style={styles.course}>{row.courseName}</Text>
      {row.notes ? <Text style={styles.notes}>“{row.notes}”</Text> : null}

      <View style={styles.actionsRow}>
        <Pressable
          style={({ pressed }) => [styles.rejectButton, pressed && styles.pressed]}
          onPress={() => onAct("reject", row.id)}
        >
          <Ionicons name="close" size={16} color="#DC2626" />
          <Text style={styles.rejectText}>Reject</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.confirmButton, pressed && styles.pressed]}
          onPress={() => onAct(action, row.id)}
        >
          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          <Text style={styles.confirmText}>{label}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F6FB" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F6F6FB" },
  errorCard: { marginHorizontal: 16, marginTop: 12, backgroundColor: "#FEE2E2", padding: 12, borderRadius: 12 },
  errorText: { color: "#991B1B", fontSize: 13 },
  list: { padding: 16, gap: 12 },
  intro: { paddingBottom: 4 },
  introTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  introText: { fontSize: 13, color: "#6B7280", marginTop: 4, lineHeight: 18 },
  empty: { padding: 48, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  emptyText: { fontSize: 14, color: "#6B7280", textAlign: "center", maxWidth: 280 },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    shadowColor: "#615DFA",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    gap: 12,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  kindBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  kindText: { fontSize: 12, fontWeight: "700" },
  sessionsBadge: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  flow: { flexDirection: "row", alignItems: "center", gap: 12 },
  flowSide: { flex: 1 },
  flowLabel: { fontSize: 10, color: "#9CA3AF", fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" },
  flowName: { fontSize: 15, color: "#111827", fontWeight: "700", marginTop: 2 },
  course: { fontSize: 13, color: "#6B7280" },
  notes: { fontSize: 13, color: "#6B7280", fontStyle: "italic", lineHeight: 18 },
  actionsRow: { flexDirection: "row", gap: 8 },
  rejectButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#FECACA",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  rejectText: { color: "#DC2626", fontSize: 14, fontWeight: "700" },
  confirmButton: {
    flex: 2,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#615DFA",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  confirmText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  pressed: { opacity: 0.85 },
});
