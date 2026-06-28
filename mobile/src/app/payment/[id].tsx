import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { supabase } from "@/lib/supabase";

type PaymentDetail = {
  id: string;
  amount: number;
  status: "pending" | "paid" | "failed" | "refunded" | "cancelled";
  paidAt: string | null;
  createdAt: string;
  dueDate: string | null;
  studentId: string;
  childNames: string[];
  courseId: string | null;
  courseName: string | null;
  invoiceNumber: string | null;
  receiptNumber: string | null;
  isShared: boolean;
  packageName: string | null;
  packageId: string | null;
  packageDuration: number | null;
  discount: number;
};

type CoveredSession = {
  index: number; // 1-based
  date: string | null;
  status: "present" | "absent" | "late" | "excused" | "upcoming";
  studentName: string;
};

const STATUS_STYLES: Record<PaymentDetail["status"], { bg: string; fg: string; label: string }> = {
  pending: { bg: "#FEF3C7", fg: "#92400E", label: "Pending" },
  paid: { bg: "#D1FAE5", fg: "#065F46", label: "Paid" },
  failed: { bg: "#FEE2E2", fg: "#991B1B", label: "Failed" },
  refunded: { bg: "#E0E7FF", fg: "#3730A3", label: "Refunded" },
  cancelled: { bg: "#F3F4F6", fg: "#374151", label: "Cancelled" },
};

const SESSION_STATUS: Record<CoveredSession["status"], { bg: string; fg: string; label: string }> = {
  present: { bg: "#D1FAE5", fg: "#065F46", label: "Present" },
  absent: { bg: "#FEE2E2", fg: "#991B1B", label: "Absent" },
  late: { bg: "#FEF3C7", fg: "#92400E", label: "Late" },
  excused: { bg: "#E0E7FF", fg: "#3730A3", label: "Excused" },
  upcoming: { bg: "#F3F4F6", fg: "#374151", label: "Upcoming" },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-MY", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatRM(amount: number): string {
  return `RM${amount.toFixed(2)}`;
}
function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}
function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "—";
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

type PaymentDetailData = {
  payment: PaymentDetail;
  coveredSessions: CoveredSession[];
};

export default function PaymentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const fetchPayment = async (): Promise<PaymentDetailData> => {
    const { data, error } = await supabase
      .from("payments")
      .select(`
        id,
        amount,
        status,
        paid_at,
        created_at,
        due_date,
        invoice_number,
        receipt_number,
        discount_amount,
        is_shared_package,
        shared_with,
        custom_sessions,
        student_id,
        course_id,
        package_id,
        course:courses(name),
        package:course_pricing(description, duration)
      `)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Payment not found");

    const c = data.course as unknown as { name: string } | null;
    const pkg = data.package as unknown as { description: string | null; duration: number | null } | null;
    const shared = !!data.is_shared_package;

    // Pooled bills cover several siblings — resolve all their names.
    let sharedWith: string[] = [];
    if (shared && data.shared_with) {
      try { sharedWith = JSON.parse(data.shared_with as string) as string[]; } catch { /* ignore */ }
    }
    const studentIds = sharedWith.length ? sharedWith : [data.student_id as string];
    const { data: studs } = await supabase.from("students").select("id, name").in("id", studentIds);
    const nameById = new Map<string, string>((studs ?? []).map((s) => [s.id as string, s.name as string]));
    const childNames = studentIds.map((sid) => nameById.get(sid) ?? "Child");

    const duration = pkg?.duration ?? (data.custom_sessions ? Number(data.custom_sessions) : 0);
    const p: PaymentDetail = {
      id: data.id as string,
      amount: Number(data.amount ?? 0),
      status: (data.status as PaymentDetail["status"]) ?? "pending",
      paidAt: (data.paid_at as string | null) ?? null,
      createdAt: data.created_at as string,
      dueDate: (data.due_date as string | null) ?? null,
      studentId: data.student_id as string,
      childNames,
      courseId: (data.course_id as string | null) ?? null,
      courseName: c?.name ?? null,
      invoiceNumber: (data.invoice_number as string | null) ?? null,
      receiptNumber: (data.receipt_number as string | null) ?? null,
      isShared: shared,
      packageName: pkg?.description ?? null,
      packageId: (data.package_id as string | null) ?? null,
      packageDuration: duration || null,
      discount: Number(data.discount_amount ?? 0),
    };

    // Sessions this payment "covered" — for a shared pool we combine ALL the
    // pooled children's attendance chronologically (they share the sessions).
    const coveredSessions: CoveredSession[] = [];
    if (p.status === "paid" && p.paidAt && duration && p.courseId) {
      const paidDate = p.paidAt.slice(0, 10);
      const { data: att } = await supabase
        .from("attendance")
        .select(`date, status, enrollment:enrollments!inner(student_id, course_id)`)
        .in("enrollment.student_id", studentIds)
        .eq("enrollment.course_id", p.courseId)
        .gte("date", paidDate)
        .order("date", { ascending: true })
        .limit(duration);
      (att ?? []).forEach((a, i) => {
        const enr = a.enrollment as unknown as { student_id: string } | null;
        coveredSessions.push({
          index: i + 1,
          date: a.date as string,
          status: (a.status as CoveredSession["status"]) ?? "present",
          studentName: nameById.get(enr?.student_id ?? "") ?? "",
        });
      });
      for (let i = coveredSessions.length; i < duration; i++) {
        coveredSessions.push({ index: i + 1, date: null, status: "upcoming", studentName: "" });
      }
    }

    return { payment: p, coveredSessions };
  };

  const { data, loading, error, isStale, updatedAt } = useCachedQuery<PaymentDetailData>(
    `payment-detail:${id}`,
    fetchPayment,
    { enabled: !!id },
  );

  const payment = data?.payment ?? null;
  const coveredSessions = data?.coveredSessions ?? [];
  const errorMessage = error && !data ? error : null;

  const onPayOnline = () => {
    Alert.alert(
      "Coming soon",
      "Online payment via Billplz will go live once we add the mobile checkout endpoint. For now, please use the web parent portal to pay online.",
    );
  };

  const onUploadSlip = () => {
    Alert.alert(
      "Coming soon",
      "Slip upload from mobile will be added in the next iteration. For now, please use the web parent portal.",
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <Stack.Screen options={{ title: "Payment", headerShown: true }} />
        <ActivityIndicator color="#615DFA" />
      </SafeAreaView>
    );
  }

  if (errorMessage || !payment) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <Stack.Screen options={{ title: "Payment", headerShown: true }} />
        <Text style={styles.errorText}>{errorMessage ?? "Payment not found"}</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const statusStyle = STATUS_STYLES[payment.status];
  const isPending = payment.status === "pending";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen options={{ title: "Payment", headerShown: true, headerTintColor: "#615DFA" }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {isStale ? <OfflineBanner updatedAt={updatedAt} /> : null}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Amount</Text>
          <Text style={styles.amount}>{formatRM(payment.amount)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.fg }]}>{statusStyle.label}</Text>
          </View>
        </View>

        <View style={styles.detailCard}>
          <Row label={payment.childNames.length > 1 ? "Children" : "Student"} value={joinNames(payment.childNames)} />
          {payment.courseName ? <Row label="Program" value={payment.courseName} /> : null}
          {payment.packageName ? <Row label="Package" value={payment.packageName} /> : null}
          <Row label="Type" value={payment.isShared ? "Shared pool (siblings)" : "Individual"} />
        </View>

        {/* Invoice */}
        <View style={styles.docCard}>
          <View style={styles.docHeader}>
            <Ionicons name="document-text-outline" size={18} color="#615DFA" />
            <Text style={styles.docTitle}>Invoice</Text>
            <Text style={styles.docNo}>{payment.invoiceNumber ?? "Pending approval"}</Text>
          </View>
          <Row label="Bill to" value={joinNames(payment.childNames)} />
          <Row label="Program" value={payment.courseName ?? "—"} />
          {payment.packageName ? <Row label="Package" value={payment.packageName} /> : null}
          {payment.packageDuration ? <Row label="Sessions" value={String(payment.packageDuration)} /> : null}
          <Row label="Issued" value={formatDateShort(payment.createdAt)} />
          {payment.dueDate ? <Row label="Due" value={formatDateShort(payment.dueDate)} /> : null}
          {payment.discount > 0 ? <Row label="Discount" value={`- ${formatRM(payment.discount)}`} /> : null}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatRM(payment.amount)}</Text>
          </View>
        </View>

        {/* Receipt — only once paid */}
        {payment.status === "paid" ? (
          <View style={[styles.docCard, styles.receiptCard]}>
            <View style={styles.docHeader}>
              <Ionicons name="receipt-outline" size={18} color="#065F46" />
              <Text style={[styles.docTitle, { color: "#065F46" }]}>Receipt</Text>
              <Text style={[styles.docNo, { color: "#047857" }]}>{payment.receiptNumber ?? "—"}</Text>
            </View>
            <Row label="Paid by" value={joinNames(payment.childNames)} />
            <Row label="Amount paid" value={formatRM(payment.amount)} />
            {payment.paidAt ? <Row label="Paid on" value={formatDate(payment.paidAt)} /> : null}
            <View style={styles.paidStamp}>
              <Ionicons name="checkmark-circle" size={16} color="#065F46" />
              <Text style={styles.paidStampText}>PAID</Text>
            </View>
          </View>
        ) : null}

        {coveredSessions.length > 0 ? (
          <View style={styles.detailCard}>
            <Text style={styles.coveredHeader}>Sessions this payment covered</Text>
            <Text style={styles.coveredSubtitle}>
              {payment.isShared ? "Shared across siblings — " : ""}computed from attendance after the payment date. Future sessions show as upcoming.
            </Text>
            <View style={styles.sessionList}>
              {coveredSessions.map((s) => {
                const meta = SESSION_STATUS[s.status];
                return (
                  <View key={s.index} style={styles.sessionRow}>
                    <View style={styles.sessionIndex}>
                      <Text style={styles.sessionIndexText}>{s.index}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sessionDate}>
                        {s.date
                          ? new Date(s.date).toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
                          : "Upcoming"}
                      </Text>
                      {s.studentName ? <Text style={styles.sessionStudent}>{s.studentName}</Text> : null}
                    </View>
                    <View style={[styles.sessionBadge, { backgroundColor: meta.bg }]}>
                      <Text style={[styles.sessionBadgeText, { color: meta.fg }]}>{meta.label}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {isPending ? (
          <View style={styles.actions}>
            <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} onPress={onPayOnline}>
              <Ionicons name="card" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Pay online</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]} onPress={onUploadSlip}>
              <Ionicons name="cloud-upload-outline" size={20} color="#615DFA" />
              <Text style={styles.secondaryButtonText}>Upload payment slip</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F6FB" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F6F6FB", gap: 12 },
  scroll: { padding: 16, gap: 12 },
  amountCard: { backgroundColor: "#FFFFFF", padding: 24, borderRadius: 16, alignItems: "center", gap: 8 },
  amountLabel: { fontSize: 12, color: "#6B7280", fontWeight: "600", letterSpacing: 1, textTransform: "uppercase" },
  amount: { fontSize: 36, fontWeight: "800", color: "#615DFA" },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, marginTop: 4 },
  statusText: { fontSize: 12, fontWeight: "700" },
  detailCard: { backgroundColor: "#FFFFFF", padding: 16, borderRadius: 16 },
  docCard: { backgroundColor: "#FFFFFF", padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "#EEF2FF" },
  receiptCard: { borderColor: "#D1FAE5", backgroundColor: "#F0FDF4" },
  docHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  docTitle: { fontSize: 15, fontWeight: "800", color: "#615DFA", flex: 1 },
  docNo: { fontSize: 12, fontWeight: "700", color: "#9CA3AF" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  totalLabel: { fontSize: 14, fontWeight: "800", color: "#111827" },
  totalValue: { fontSize: 18, fontWeight: "800", color: "#615DFA" },
  paidStamp: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginTop: 10, backgroundColor: "#D1FAE5", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  paidStampText: { fontSize: 12, fontWeight: "800", color: "#065F46", letterSpacing: 1 },
  sessionStudent: { fontSize: 11, color: "#6B7280", marginTop: 1 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  rowLabel: { fontSize: 14, color: "#6B7280", fontWeight: "500" },
  rowValue: { fontSize: 14, color: "#111827", fontWeight: "600", flex: 1, textAlign: "right", marginLeft: 16 },
  actions: { gap: 12, marginTop: 8 },
  primaryButton: {
    height: 52,
    backgroundColor: "#615DFA",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  secondaryButton: {
    height: 52,
    backgroundColor: "#FFFFFF",
    borderColor: "#615DFA",
    borderWidth: 1.5,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  secondaryButtonText: { color: "#615DFA", fontSize: 16, fontWeight: "700" },
  pressed: { opacity: 0.85 },
  errorText: { color: "#991B1B", fontSize: 14, textAlign: "center", paddingHorizontal: 24 },
  backButton: { paddingHorizontal: 24, paddingVertical: 12 },
  backText: { color: "#615DFA", fontSize: 16, fontWeight: "700" },
  coveredHeader: { fontSize: 15, fontWeight: "700", color: "#111827" },
  coveredSubtitle: { fontSize: 12, color: "#6B7280", marginTop: 4, lineHeight: 16 },
  sessionList: { marginTop: 12, gap: 8 },
  sessionRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  sessionIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  sessionIndexText: { fontSize: 12, fontWeight: "800", color: "#615DFA" },
  sessionDate: { fontSize: 13, fontWeight: "600", color: "#111827" },
  sessionBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  sessionBadgeText: { fontSize: 11, fontWeight: "700" },
});
