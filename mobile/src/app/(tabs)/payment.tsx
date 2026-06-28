import { useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useAuth } from "@/contexts/auth";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { supabase } from "@/lib/supabase";

type Bill = {
  id: string;
  amount: number;
  status: "pending" | "paid" | "failed" | "refunded" | "cancelled";
  paidAt: string | null;
  createdAt: string;
  courseId: string | null;
  courseName: string;
  childNames: string[];
  isShared: boolean;
};

type Program = { courseId: string; courseName: string; bills: Bill[] };

const STATUS_STYLES: Record<Bill["status"], { bg: string; fg: string; label: string }> = {
  pending: { bg: "#FEF3C7", fg: "#92400E", label: "Pending" },
  paid: { bg: "#D1FAE5", fg: "#065F46", label: "Paid" },
  failed: { bg: "#FEE2E2", fg: "#991B1B", label: "Failed" },
  refunded: { bg: "#E0E7FF", fg: "#3730A3", label: "Refunded" },
  cancelled: { bg: "#F3F4F6", fg: "#374151", label: "Cancelled" },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}
function formatRM(amount: number): string {
  return `RM${amount.toFixed(2)}`;
}
function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "—";
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

export default function PaymentsScreen() {
  const { user } = useAuth();
  const userId = user?.id;
  const router = useRouter();
  const [programId, setProgramId] = useState<string | null>(null);

  const fetchBills = async (): Promise<Bill[]> => {
    const { data: parentRow, error: parentErr } = await supabase
      .from("parents")
      .select("id")
      .eq("auth_id", userId!)
      .is("deleted_at", null)
      .maybeSingle();
    if (parentErr) throw parentErr;
    if (!parentRow) return [];

    const { data: links } = await supabase
      .from("parent_students")
      .select("student_id, student:students!inner(name, deleted_at)")
      .eq("parent_id", parentRow.id);
    const nameById = new Map<string, string>();
    const studentIds: string[] = [];
    for (const l of links ?? []) {
      const s = l.student as unknown as { name: string; deleted_at: string | null } | null;
      if (s && !s.deleted_at) {
        nameById.set(l.student_id as string, s.name);
        studentIds.push(l.student_id as string);
      }
    }
    if (!studentIds.length) return [];

    // One row per bill already (pooled bills carry shared_with = all sibling ids).
    const { data, error } = await supabase
      .from("payments")
      .select(`id, amount, status, paid_at, created_at, student_id, course_id, is_shared_package, shared_with, course:courses(name)`)
      .in("student_id", studentIds)
      .order("created_at", { ascending: false })
      .limit(80);
    if (error) throw error;

    return (data ?? []).map((p) => {
      const c = p.course as unknown as { name: string } | null;
      const shared = !!p.is_shared_package;
      let childNames: string[] = [];
      if (shared && p.shared_with) {
        try {
          const ids = JSON.parse(p.shared_with as string) as string[];
          childNames = ids.map((id) => nameById.get(id)).filter((n): n is string => !!n);
        } catch {
          /* ignore */
        }
      }
      if (childNames.length === 0) {
        childNames = [nameById.get(p.student_id as string) ?? "Child"];
      }
      return {
        id: p.id as string,
        amount: Number(p.amount ?? 0),
        status: (p.status as Bill["status"]) ?? "pending",
        paidAt: (p.paid_at as string | null) ?? null,
        createdAt: p.created_at as string,
        courseId: (p.course_id as string | null) ?? null,
        courseName: c?.name ?? "Program",
        childNames,
        isShared: shared,
      };
    });
  };

  const { data, loading, refreshing, error, isStale, updatedAt, refetch } = useCachedQuery<Bill[]>(
    `payments:${userId ?? "anon"}`,
    fetchBills,
    { enabled: !!userId },
  );

  const bills = data ?? [];
  const errorMessage = error && !data ? "Couldn't load payments. Check your connection and pull down to refresh." : null;

  // Group bills by program (course).
  const order: string[] = [];
  const byCourse: Record<string, Program> = {};
  for (const b of bills) {
    const key = b.courseId ?? "none";
    if (!byCourse[key]) {
      byCourse[key] = { courseId: key, courseName: b.courseName, bills: [] };
      order.push(key);
    }
    byCourse[key].bills.push(b);
  }
  const programs = order.map((k) => byCourse[k]);
  const selected = programs.find((p) => p.courseId === programId) ?? programs[0] ?? null;
  const pendingTotal = bills.filter((b) => b.status === "pending").length;

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
        <Text style={styles.title}>Payments</Text>
        <Text style={styles.subtitle}>{pendingTotal > 0 ? `${pendingTotal} pending` : "All up to date"}</Text>
      </View>

      {errorMessage ? (
        <View style={styles.errorCard}><Text style={styles.errorText}>{errorMessage}</Text></View>
      ) : null}
      {isStale ? (
        <View style={styles.bannerWrap}><OfflineBanner updatedAt={updatedAt} /></View>
      ) : null}

      {/* Program tabs — only when the parent's children span more than one program */}
      {programs.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRow} contentContainerStyle={styles.tabsContent}>
          {programs.map((p) => {
            const active = selected?.courseId === p.courseId;
            const pend = p.bills.filter((b) => b.status === "pending").length;
            return (
              <Pressable key={p.courseId} style={[styles.tab, active && styles.tabActive]} onPress={() => setProgramId(p.courseId)}>
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{p.courseName}</Text>
                {pend > 0 ? <View style={styles.tabDot} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor="#615DFA" />}
      >
        {!selected ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No payments yet</Text>
            <Text style={styles.emptyText}>When a payment is created for your child, it&apos;ll appear here.</Text>
          </View>
        ) : (
          selected.bills.map((b) => {
            const st = STATUS_STYLES[b.status];
            return (
              <Pressable
                key={b.id}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={() => router.push({ pathname: "/payment/[id]", params: { id: b.id } })}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.amount}>{formatRM(b.amount)}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                    <Text style={[styles.statusText, { color: st.fg }]}>{st.label}</Text>
                  </View>
                </View>
                <View style={styles.childRow}>
                  {b.isShared ? <Ionicons name="people" size={14} color="#615DFA" /> : <Ionicons name="person" size={14} color="#9CA3AF" />}
                  <Text style={styles.childNames} numberOfLines={1}>{joinNames(b.childNames)}</Text>
                  {b.isShared ? <View style={styles.sharedBadge}><Text style={styles.sharedText}>Shared</Text></View> : null}
                </View>
                <Text style={styles.courseName}>{b.courseName}</Text>
                <Text style={styles.dateText}>
                  {b.paidAt ? `Paid ${formatDate(b.paidAt)}` : `Created ${formatDate(b.createdAt)}`}
                </Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F6FB" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F6F6FB" },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: "800", color: "#111827" },
  subtitle: { fontSize: 14, color: "#6B7280", marginTop: 2 },
  errorCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: "#FEE2E2", padding: 16, borderRadius: 12 },
  errorText: { color: "#991B1B", fontSize: 14 },
  bannerWrap: { paddingHorizontal: 16, marginBottom: 12 },
  tabsRow: { flexGrow: 0, marginBottom: 8 },
  tabsContent: { paddingHorizontal: 16, gap: 8 },
  tab: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: "#FFFFFF" },
  tabActive: { backgroundColor: "#615DFA" },
  tabText: { fontSize: 13, fontWeight: "700", color: "#374151" },
  tabTextActive: { color: "#FFFFFF" },
  tabDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#F59E0B" },
  list: { padding: 16, paddingTop: 0, gap: 12 },
  empty: { padding: 32, alignItems: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 4 },
  emptyText: { fontSize: 14, color: "#6B7280", textAlign: "center", maxWidth: 280 },
  card: { backgroundColor: "#FFFFFF", padding: 16, borderRadius: 16, shadowColor: "#615DFA", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  cardPressed: { opacity: 0.85 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  amount: { fontSize: 20, fontWeight: "800", color: "#111827" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 12, fontWeight: "700" },
  childRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  childNames: { fontSize: 15, fontWeight: "700", color: "#374151", flexShrink: 1 },
  sharedBadge: { backgroundColor: "#EEF2FF", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  sharedText: { fontSize: 10, fontWeight: "800", color: "#615DFA" },
  courseName: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  dateText: { fontSize: 12, color: "#9CA3AF", marginTop: 8 },
});
