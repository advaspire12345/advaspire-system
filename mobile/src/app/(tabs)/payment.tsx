import { ActivityIndicator, Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useAuth } from "@/contexts/auth";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { supabase } from "@/lib/supabase";

type PaymentRow = {
  id: string;
  amount: number;
  status: "pending" | "paid" | "failed" | "refunded" | "cancelled";
  paidAt: string | null;
  createdAt: string;
  studentId: string;
  studentName: string;
  courseName: string | null;
  invoiceNumber: string | null;
};

const STATUS_STYLES: Record<PaymentRow["status"], { bg: string; fg: string; label: string }> = {
  pending: { bg: "#FEF3C7", fg: "#92400E", label: "Pending" },
  paid: { bg: "#D1FAE5", fg: "#065F46", label: "Paid" },
  failed: { bg: "#FEE2E2", fg: "#991B1B", label: "Failed" },
  refunded: { bg: "#E0E7FF", fg: "#3730A3", label: "Refunded" },
  cancelled: { bg: "#F3F4F6", fg: "#374151", label: "Cancelled" },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

function formatRM(amount: number): string {
  return `RM${amount.toFixed(2)}`;
}

export default function PaymentsScreen() {
  const { user } = useAuth();
  const userId = user?.id;
  const router = useRouter();

  const fetchPayments = async (): Promise<PaymentRow[]> => {
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
      .select("student_id, student:students!inner(deleted_at)")
      .eq("parent_id", parentRow.id);
    const studentIds = (links ?? [])
      .filter((l) => !(l.student as unknown as { deleted_at: string | null })?.deleted_at)
      .map((l) => l.student_id as string);
    if (!studentIds.length) return [];

    const { data, error } = await supabase
      .from("payments")
      .select(`
        id,
        amount,
        status,
        paid_at,
        created_at,
        student_id,
        invoice_number,
        student:students!inner(name),
        course:courses(name)
      `)
      .in("student_id", studentIds)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;

    return (data ?? []).map((p) => {
      const s = p.student as unknown as { name: string } | null;
      const c = p.course as unknown as { name: string } | null;
      return {
        id: p.id as string,
        amount: Number(p.amount ?? 0),
        status: (p.status as PaymentRow["status"]) ?? "pending",
        paidAt: (p.paid_at as string | null) ?? null,
        createdAt: p.created_at as string,
        studentId: p.student_id as string,
        studentName: s?.name ?? "Unknown",
        courseName: c?.name ?? null,
        invoiceNumber: (p.invoice_number as string | null) ?? null,
      };
    });
  };

  const { data, loading, refreshing, error, isStale, updatedAt, refetch } = useCachedQuery<PaymentRow[]>(
    `payments:${userId ?? "anon"}`,
    fetchPayments,
    { enabled: !!userId },
  );

  const payments = data ?? [];
  const errorMessage = error && !data ? "Couldn't load payments. Check your connection and pull down to refresh." : null;

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <ActivityIndicator color="#615DFA" />
      </SafeAreaView>
    );
  }

  const pendingCount = payments.filter((p) => p.status === "pending").length;

  // Group payments under each child so siblings don't get mixed together.
  const childOrder: string[] = [];
  const byChild: Record<string, { studentId: string; title: string; data: PaymentRow[] }> = {};
  for (const p of payments) {
    if (!byChild[p.studentId]) {
      byChild[p.studentId] = { studentId: p.studentId, title: p.studentName, data: [] };
      childOrder.push(p.studentId);
    }
    byChild[p.studentId].data.push(p);
  }
  const sections = childOrder
    .map((id) => byChild[id])
    .sort((a, b) => a.title.localeCompare(b.title));

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Payments</Text>
        <Text style={styles.subtitle}>
          {pendingCount > 0 ? `${pendingCount} pending` : "All up to date"}
        </Text>
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

      <SectionList
        sections={sections}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor="#615DFA" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No payments yet</Text>
            <Text style={styles.emptyText}>
              When a payment is created for your child, it&apos;ll appear here.
            </Text>
          </View>
        }
        renderSectionHeader={({ section }) => {
          const pending = section.data.filter((p) => p.status === "pending").length;
          return (
            <View style={styles.sectionHeader}>
              <View style={styles.sectionAvatar}>
                <Text style={styles.sectionAvatarText}>{section.title.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.sectionHeaderText} numberOfLines={1}>{section.title}</Text>
              {pending > 0 ? (
                <View style={styles.sectionPendingBadge}>
                  <Text style={styles.sectionPendingText}>{pending} pending</Text>
                </View>
              ) : null}
            </View>
          );
        }}
        renderItem={({ item }) => {
          const statusStyle = STATUS_STYLES[item.status];
          return (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => router.push({ pathname: "/payment/[id]", params: { id: item.id } })}
            >
              <View style={styles.cardTop}>
                <Text style={styles.amount}>{formatRM(item.amount)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                  <Text style={[styles.statusText, { color: statusStyle.fg }]}>{statusStyle.label}</Text>
                </View>
              </View>
              <Text style={styles.studentName}>{item.studentName}</Text>
              {item.courseName ? <Text style={styles.courseName}>{item.courseName}</Text> : null}
              <Text style={styles.dateText}>
                {item.paidAt ? `Paid ${formatDate(item.paidAt)}` : `Created ${formatDate(item.createdAt)}`}
              </Text>
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
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: "800", color: "#111827" },
  subtitle: { fontSize: 14, color: "#6B7280", marginTop: 2 },
  errorCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: "#FEE2E2", padding: 16, borderRadius: 12 },
  bannerWrap: { paddingHorizontal: 16, marginBottom: 12 },
  errorText: { color: "#991B1B", fontSize: 14 },
  list: { padding: 16, paddingTop: 0, gap: 12 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 8,
    paddingBottom: 2,
  },
  sectionAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#615DFA",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionAvatarText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  sectionHeaderText: { flex: 1, fontSize: 16, fontWeight: "800", color: "#0F172A", letterSpacing: -0.3 },
  sectionPendingBadge: { backgroundColor: "#FEF3C7", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  sectionPendingText: { fontSize: 11, fontWeight: "800", color: "#92400E" },
  empty: { padding: 32, alignItems: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 4 },
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
  },
  cardPressed: { opacity: 0.85 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  amount: { fontSize: 20, fontWeight: "800", color: "#111827" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 12, fontWeight: "700" },
  studentName: { fontSize: 15, fontWeight: "600", color: "#374151" },
  courseName: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  dateText: { fontSize: 12, color: "#9CA3AF", marginTop: 8 },
});
