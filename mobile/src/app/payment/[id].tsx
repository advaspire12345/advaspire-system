import { useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { useNicknames } from "@/contexts/nicknames";
import { supabase } from "@/lib/supabase";

// Minimal base64 → bytes (no extra deps) for uploading the picked image.
function base64ToBytes(b64: string): Uint8Array {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;
  let len = b64.length * 0.75;
  if (b64[b64.length - 1] === "=") { len--; if (b64[b64.length - 2] === "=") len--; }
  const bytes = new Uint8Array(len);
  let p = 0;
  for (let i = 0; i < b64.length; i += 4) {
    const e1 = lookup[b64.charCodeAt(i)], e2 = lookup[b64.charCodeAt(i + 1)], e3 = lookup[b64.charCodeAt(i + 2)], e4 = lookup[b64.charCodeAt(i + 3)];
    bytes[p++] = (e1 << 2) | (e2 >> 4);
    if (b64[i + 2] !== "=") bytes[p++] = ((e2 & 15) << 4) | (e3 >> 2);
    if (b64[i + 3] !== "=") bytes[p++] = ((e3 & 3) << 6) | e4;
  }
  return bytes;
}

type PaymentDetail = {
  id: string;
  amount: number;
  status: "pending" | "paid" | "failed" | "refunded" | "cancelled";
  paidAt: string | null;
  createdAt: string;
  dueDate: string | null;
  studentId: string;
  children: { id: string; name: string }[];
  courseId: string | null;
  courseName: string | null;
  invoiceNumber: string | null;
  receiptNumber: string | null;
  isShared: boolean;
  packageName: string | null;
  packageId: string | null;
  packageDuration: number | null;
  discount: number;
  receiptPhoto: string | null; // parent-uploaded slip
  parentMarkedPaidAt: string | null;
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
function joinNames(names: string[] = []): string {
  if (names.length <= 1) return names[0] ?? "—";
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

type PkgOption = { id: string; type: string; price: number; sessions: number | null; months: number | null; maxPool: number };

type PaymentDetailData = {
  payment: PaymentDetail;
  coveredSessions: CoveredSession[];
  packages: PkgOption[];
  debt: number; // over-used sessions this bill needs to cover (0 if none)
};

export default function PaymentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const nick = useNicknames();
  const [selectedPkgId, setSelectedPkgId] = useState<string | null>(null);
  const [qtyOverride, setQtyOverride] = useState<number | null>(null); // null = use the suggested (full-coverage) quantity

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
        receipt_photo,
        parent_marked_paid_at,
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
    const childList = studentIds.map((sid) => ({ id: sid, name: nameById.get(sid) ?? "Child" }));

    const duration = pkg?.duration ?? (data.custom_sessions ? Number(data.custom_sessions) : 0);
    const p: PaymentDetail = {
      id: data.id as string,
      amount: Number(data.amount ?? 0),
      status: (data.status as PaymentDetail["status"]) ?? "pending",
      paidAt: (data.paid_at as string | null) ?? null,
      createdAt: data.created_at as string,
      dueDate: (data.due_date as string | null) ?? null,
      studentId: data.student_id as string,
      children: childList,
      courseId: (data.course_id as string | null) ?? null,
      courseName: c?.name ?? null,
      invoiceNumber: (data.invoice_number as string | null) ?? null,
      receiptNumber: (data.receipt_number as string | null) ?? null,
      isShared: shared,
      packageName: pkg?.description ?? null,
      packageId: (data.package_id as string | null) ?? null,
      packageDuration: duration || null,
      discount: Number(data.discount_amount ?? 0),
      receiptPhoto: (data.receipt_photo as string | null) ?? null,
      parentMarkedPaidAt: (data.parent_marked_paid_at as string | null) ?? null,
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

    // Packages the parent can choose to pay for (this course's pricing tiers).
    // Best-effort; only shown while the bill is pending.
    let packages: PkgOption[] = [];
    let debt = 0;
    if (p.status === "pending" && p.courseId) {
      const [{ data: pr }, { data: enrs }] = await Promise.all([
        supabase
          .from("course_pricing")
          .select("id, package_type, price, limit_sess, completion_months, max_students_per_pool, deleted_at")
          .eq("course_id", p.courseId)
          .is("deleted_at", null),
        supabase
          .from("enrollments")
          .select("sessions_remaining")
          .in("student_id", studentIds)
          .eq("course_id", p.courseId)
          .is("deleted_at", null),
      ]);
      packages = (pr ?? [])
        .filter((x) => !x.deleted_at)
        .map((x) => ({
          id: x.id as string,
          type: (x.package_type as string) ?? "Package",
          price: Number(x.price ?? 0),
          sessions: x.limit_sess == null ? null : Number(x.limit_sess),
          months: x.completion_months == null ? null : Number(x.completion_months),
          maxPool: Number(x.max_students_per_pool ?? 1),
        }))
        .sort((a, b) => a.price - b.price);
      // Over-used (negative) sessions across the billed children for this course.
      const sum = (enrs ?? []).reduce((s, e) => s + Number(e.sessions_remaining ?? 0), 0);
      if (sum < 0) debt = -sum;
    }

    return { payment: p, coveredSessions, packages, debt };
  };

  // Versioned key — an older build cached PaymentDetailData without `children`/
  // `debt`/`packages`; hydrating that stale shape crashed the render. Bump on any
  // shape change.
  const { data, loading, error, isStale, updatedAt, refetch } = useCachedQuery<PaymentDetailData>(
    `payment-detail:v3:${id}`, // v3 — added receiptPhoto/parentMarkedPaidAt
    fetchPayment,
    { enabled: !!id },
  );
  const [uploadingSlip, setUploadingSlip] = useState(false);

  const payment = data?.payment ?? null;
  const coveredSessions = data?.coveredSessions ?? [];
  const errorMessage = error && !data ? error : null;

  const onPayOnline = () => {
    Alert.alert(
      "Coming soon",
      "Online payment via Billplz will go live once we add the mobile checkout endpoint. For now, please upload your transfer slip below.",
    );
  };

  const onUploadSlip = async () => {
    if (!payment || uploadingSlip) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert("Permission needed", "Please allow photo access to upload a slip."); return; }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7, base64: true });
      if (res.canceled || !res.assets?.[0]?.base64) return;
      const asset = res.assets[0];
      setUploadingSlip(true);
      const ext = (asset.uri.split(".").pop() || "jpg").toLowerCase();
      const contentType = ext === "png" ? "image/png" : "image/jpeg";
      const path = `${payment.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("payment-slips").upload(path, base64ToBytes(asset.base64!), { contentType, upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("payment-slips").getPublicUrl(path);
      const { data: rpc, error: rpcErr } = await supabase.rpc("parent_submit_slip", { p_payment_id: payment.id, p_image_url: pub.publicUrl, p_note: null });
      if (rpcErr) throw rpcErr;
      const result = rpc as { ok: boolean; error?: string } | null;
      if (result && result.ok === false) throw new Error(result.error ?? "Upload failed");
      await refetch();
      Alert.alert("Slip sent ✅", "Your payment slip was uploaded. Your centre will review and confirm it.");
    } catch (e) {
      Alert.alert("Couldn't upload", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setUploadingSlip(false);
    }
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
  const packages = data?.packages ?? [];
  const debt = data?.debt ?? 0;
  const displayNames = (payment.children ?? []).map((c) => nick.raw(c.id) ?? c.name);
  const selectedId = selectedPkgId ?? payment.packageId ?? packages[0]?.id ?? null;
  const selectedPkg = packages.find((p) => p.id === selectedId) ?? null;
  const pkgSessions = selectedPkg?.sessions ?? 0;
  // Suggested quantity = enough of this package to cover the over-used sessions.
  const suggestedQty = debt > 0 && pkgSessions > 0 ? Math.max(1, Math.ceil(debt / pkgSessions)) : 1;
  const qty = qtyOverride ?? suggestedQty;
  const coverage = pkgSessions * qty;
  const payAmount = (selectedPkg?.price ?? payment.amount) * (selectedPkg ? qty : 1);
  const selectPkg = (pid: string) => { setSelectedPkgId(pid); setQtyOverride(null); };

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
          <Row label={displayNames.length > 1 ? "Children" : "Student"} value={joinNames(displayNames)} />
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
          <Row label="Bill to" value={joinNames(displayNames)} />
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
            <Row label="Paid by" value={joinNames(displayNames)} />
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

        {isPending && packages.length > 0 ? (
          <View style={styles.detailCard}>
            <Text style={styles.coveredHeader}>Choose a package</Text>
            {debt > 0 ? (
              <Text style={styles.coveredSubtitle}>
                {joinNames(displayNames)} {displayNames.length > 1 ? "have" : "has"} <Text style={{ fontWeight: "800", color: "#B45309" }}>{debt} over-used session{debt === 1 ? "" : "s"}</Text> to settle — pick a package (and quantity) that covers them.
              </Text>
            ) : (
              <Text style={styles.coveredSubtitle}>Pick the plan you&apos;d like to pay for. Your centre confirms the final bill.</Text>
            )}
            <View style={{ gap: 10, marginTop: 12 }}>
              {packages.map((p) => {
                const on = selectedId === p.id;
                const need = debt > 0 && p.sessions ? Math.max(1, Math.ceil(debt / p.sessions)) : 1;
                return (
                  <Pressable key={p.id} style={[styles.pkgCard, on && styles.pkgCardOn]} onPress={() => selectPkg(p.id)}>
                    <View style={[styles.radio, on && styles.radioOn]}>{on ? <View style={styles.radioDot} /> : null}</View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pkgType}>{p.type.charAt(0).toUpperCase() + p.type.slice(1)}</Text>
                      <Text style={styles.pkgMeta}>
                        {[p.sessions != null ? `${p.sessions} sessions` : null, p.months != null ? `${p.months} mo` : null, p.maxPool > 1 ? `up to ${p.maxPool} siblings` : null].filter(Boolean).join(" · ")}
                      </Text>
                      {debt > 0 && p.sessions ? <Text style={styles.pkgNeed}>×{need} covers {p.sessions * need} of {debt}</Text> : null}
                    </View>
                    <Text style={styles.pkgPrice}>{formatRM(p.price)}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Quantity — how many of the chosen package (to cover the over-use). */}
            {selectedPkg && pkgSessions > 0 ? (
              <View style={styles.qtyRow}>
                <Text style={styles.qtyLabel}>Quantity</Text>
                <View style={styles.stepper}>
                  <Pressable style={styles.stepBtn} onPress={() => setQtyOverride(Math.max(1, qty - 1))} hitSlop={6}>
                    <Ionicons name="remove" size={18} color="#615DFA" />
                  </Pressable>
                  <Text style={styles.stepVal}>{qty}</Text>
                  <Pressable style={styles.stepBtn} onPress={() => setQtyOverride(qty + 1)} hitSlop={6}>
                    <Ionicons name="add" size={18} color="#615DFA" />
                  </Pressable>
                </View>
                {debt > 0 ? (
                  <Text style={[styles.coverText, coverage >= debt ? styles.coverOk : styles.coverShort]}>
                    {coverage >= debt ? `Covers ${coverage} of ${debt} ✓` : `${debt - coverage} short`}
                  </Text>
                ) : (
                  <Text style={styles.coverText}>{coverage} sessions</Text>
                )}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Uploaded slip — awaiting the centre's approval. */}
        {isPending && payment.receiptPhoto ? (
          <View style={styles.slipCard}>
            <View style={styles.slipHead}>
              <Ionicons name="checkmark-circle" size={18} color="#065F46" />
              <Text style={styles.slipTitle}>Slip uploaded — awaiting approval</Text>
            </View>
            <Image source={{ uri: payment.receiptPhoto }} style={styles.slipImage} resizeMode="cover" />
            <Text style={styles.slipNote}>Your centre will review your transfer and confirm this payment. You can re-upload a clearer slip if needed.</Text>
          </View>
        ) : null}

        {isPending ? (
          <View style={styles.actions}>
            <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} onPress={onPayOnline}>
              <Ionicons name="card" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Pay {formatRM(payAmount)}</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.secondaryButton, (uploadingSlip) && styles.pressed, pressed && styles.pressed]} onPress={onUploadSlip} disabled={uploadingSlip}>
              {uploadingSlip ? (
                <ActivityIndicator color="#615DFA" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={20} color="#615DFA" />
                  <Text style={styles.secondaryButtonText}>{payment.receiptPhoto ? "Re-upload slip" : "Upload payment slip"}</Text>
                </>
              )}
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
  pkgCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#F9FAFB", borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: "#EEF0F6" },
  pkgCardOn: { borderColor: "#615DFA", backgroundColor: "#F5F5FF" },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#D1D5DB", alignItems: "center", justifyContent: "center" },
  radioOn: { borderColor: "#615DFA" },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#615DFA" },
  pkgType: { fontSize: 15, fontWeight: "800", color: "#111827" },
  pkgMeta: { fontSize: 12, color: "#6B7280", fontWeight: "600", marginTop: 2 },
  pkgNeed: { fontSize: 11, color: "#615DFA", fontWeight: "700", marginTop: 3 },
  pkgPrice: { fontSize: 16, fontWeight: "800", color: "#615DFA" },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  qtyLabel: { fontSize: 14, fontWeight: "700", color: "#111827" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#F3F4F6", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 4 },
  stepBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  stepVal: { fontSize: 16, fontWeight: "800", color: "#0F172A", minWidth: 20, textAlign: "center" },
  coverText: { fontSize: 12, fontWeight: "800", color: "#6B7280", marginLeft: "auto" },
  coverOk: { color: "#059669" },
  coverShort: { color: "#DC2626" },
  slipCard: { backgroundColor: "#F0FDF4", borderRadius: 16, borderWidth: 1, borderColor: "#BBF7D0", padding: 14, gap: 10 },
  slipHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  slipTitle: { fontSize: 14, fontWeight: "800", color: "#065F46" },
  slipImage: { width: "100%", height: 180, borderRadius: 12, backgroundColor: "#E5E7EB" },
  slipNote: { fontSize: 12, color: "#047857", lineHeight: 17 },
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
