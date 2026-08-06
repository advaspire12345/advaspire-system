import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as WebBrowser from "expo-web-browser";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { useNicknames } from "@/contexts/nicknames";
import { supabase } from "@/lib/supabase";
import { mobileApi } from "@/lib/api";
import { takePaymentResult } from "@/lib/paymentResult";
import { SwipeBackView } from "@/components/SwipeBackView";

// In-app checkout (react-native-webview) is NATIVE — crashes a build without it.
// FALSE on the current OTA build (uses the in-app browser tab); flip to true ONLY in a
// fresh build that bundles react-native-webview.
const IN_APP_CHECKOUT = true;

// Receipt header — mirrors the web receipt template's company defaults
// (components/payments/receipt-preview-modal.tsx).
const RECEIPT_LOGO = require("../../../assets/images/advaspire-logo.png");
const RECEIPT_CO = {
  name: "ADVASPIRE SDN BHD",
  address: ["32A-3, Jalan Ecohill 1/3C, Setia Ecohill", "43500 Semenyih, Selangor"],
  phone: "012-5804645",
  email: "advaspire@gmail.com",
  bankName: "HONG LEONG BANK",
  bankAccount: "201 000 48797",
};

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
  pending: { bg: "#FDC049", fg: "#2B161B", label: "Pending" },
  paid: { bg: "#E7F7EE", fg: "#0F8B3C", label: "Paid" },
  failed: { bg: "#FDECED", fg: "#EC2127", label: "Failed" },
  refunded: { bg: "#EAF7FD", fg: "#01A0E4", label: "Refunded" },
  cancelled: { bg: "#F5F5F5", fg: "#666666", label: "Cancelled" },
};

const SESSION_STATUS: Record<CoveredSession["status"], { bg: string; fg: string; label: string }> = {
  present: { bg: "#E7F7EE", fg: "#0F8B3C", label: "Present" },
  absent: { bg: "#FDECED", fg: "#EC2127", label: "Absent" },
  late: { bg: "#FEF0D6", fg: "#B57614", label: "Late" },
  excused: { bg: "#EAF7FD", fg: "#01A0E4", label: "Excused" },
  upcoming: { bg: "#F5F5F5", fg: "#666666", label: "Upcoming" },
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
// dd/MM/yyyy — matches the web receipt template's date format.
function formatDDMMYYYY(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
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
  const [payMethod, setPayMethod] = useState<"fpx" | "duitnow" | "slip">("fpx");

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
  const [payingOnline, setPayingOnline] = useState(false);
  // Refetch when the screen regains focus (e.g. returning from checkout), but skip
  // the very first focus (useCachedQuery already loads on mount). Also tell the
  // parent whether the payment succeeded or failed.
  //
  // Billplz reliably redirects back only on SUCCESS, so the in-app WebView's
  // billplz[paid] signal often never arrives on a failed/abandoned payment. So the
  // source of truth for the message is the payment's ACTUAL status after a checkout
  // attempt: paid → success; still-pending → not completed. (The WebView result is
  // used as a fast-path when present.)
  const firstFocus = useRef(true);
  const attemptedCheckout = useRef(false);
  useFocusEffect(useCallback(() => {
    if (firstFocus.current) { firstFocus.current = false; return; }
    const result = takePaymentResult();
    const attempted = attemptedCheckout.current;
    attemptedCheckout.current = false;
    refetch();
    if (result?.status === "paid") {
      Alert.alert("Payment successful 🎉", "Your payment is confirmed — your receipt is ready below.");
      return;
    }
    if (!attempted && !result) return; // returned here for some other reason
    // Confirm the real status straight from the DB (a completed payment is already
    // marked paid server-side by the Billplz redirect handler).
    (async () => {
      const { data: fresh } = await supabase.from("payments").select("status").eq("id", id).maybeSingle();
      if (fresh?.status === "paid") {
        Alert.alert("Payment successful 🎉", "Your payment is confirmed — your receipt is ready below.");
      } else {
        Alert.alert("Payment not completed", "Your payment wasn't completed and no charge was made. You can try again, or upload a payment slip instead.");
      }
    })();
  }, [refetch, id]));

  const payment = data?.payment ?? null;
  const coveredSessions = data?.coveredSessions ?? [];
  const errorMessage = error && !data ? error : null;

  // Build a tidy text receipt and share it (WhatsApp first, else the system sheet).
  const shareReceipt = async () => {
    if (!payment) return;
    const lines = [
      `🧾 ${RECEIPT_CO.name} — RECEIPT`,
      payment.receiptNumber ? `Receipt No: ${payment.receiptNumber}` : "",
      payment.invoiceNumber ? `Invoice No: ${payment.invoiceNumber}` : "",
      `Bill to: ${joinNames(displayNames)}`,
      payment.courseName ? `Product: ${payment.courseName}${payment.packageDuration ? ` (${payment.packageDuration} sessions)` : ""}` : "",
      `Amount received: ${formatRM(payment.amount)}`,
      payment.paidAt ? `Date: ${formatDate(payment.paidAt)}` : "",
      "Status: PAID ✅",
      `${RECEIPT_CO.phone} · ${RECEIPT_CO.email}`,
    ].filter(Boolean);
    const text = lines.join("\n");
    const wa = `whatsapp://send?text=${encodeURIComponent(text)}`;
    const canWa = await Linking.canOpenURL(wa).catch(() => false);
    if (canWa) { Linking.openURL(wa); return; }
    try { const { Share } = await import("react-native"); await Share.share({ message: text }); }
    catch { Alert.alert("Couldn't share", "No sharing app is available."); }
  };
  const goHome = () => router.replace("/(tabs)" as Href);

  // Create a Billplz bill via the web endpoint, open its hosted checkout in an
  // in-app browser, then refetch so a completed payment shows as paid on return.
  const onPayOnline = async () => {
    if (!payment || payingOnline) return;
    setPayingOnline(true);
    const res = await mobileApi<{ url?: string }>("/api/mobile/payments/checkout", { paymentId: payment.id });
    if (!res.ok || !res.data.url) {
      setPayingOnline(false);
      Alert.alert("Couldn't start payment", res.ok ? "No checkout link was returned. Please try again." : res.error);
      return;
    }
    setPayingOnline(false);
    attemptedCheckout.current = true; // so the focus handler reports the outcome on return
    // Fresh build (react-native-webview bundled): open the checkout INSIDE the app.
    if (IN_APP_CHECKOUT) {
      router.push(`/payment/checkout?url=${encodeURIComponent(res.data.url)}` as Href);
      return;
    }
    // Current build: in-app browser tab (Custom Tab), external browser as last resort.
    try {
      await WebBrowser.openBrowserAsync(res.data.url);
    } catch {
      await Linking.openURL(res.data.url).catch(() => {});
    }
    // The webhook confirms server-side; refetch to reflect a just-completed payment.
    refetch();
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
        <ActivityIndicator color="#EC2127" />
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
      <Stack.Screen options={{ title: "Payment", headerShown: true, headerTintColor: "#EC2127", headerStyle: { backgroundColor: "#FFFFFF" }, headerTitleStyle: { color: "#2B161B" }, headerShadowVisible: false }} />
      <SwipeBackView onBack={() => router.back()} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {isStale ? <OfflineBanner updatedAt={updatedAt} /> : null}
        <View style={[styles.amountCard, isPending && styles.amountCardDue]}>
          <Text style={[styles.amountLabel, isPending && styles.amountLabelDue]}>{isPending ? "AMOUNT DUE" : "Amount"}</Text>
          <Text style={[styles.amount, isPending && styles.amountDue]}>{formatRM(payment.amount)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: isPending ? "#FFFFFF" : statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: isPending ? "#EC2127" : statusStyle.fg }]}>{statusStyle.label}</Text>
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
            <Ionicons name="document-text-outline" size={18} color="#EC2127" />
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

        {/* Receipt — only once paid. Faithfully mirrors the web receipt template
            (components/payments/receipt-preview-modal.tsx): logo + company header,
            big RECEIPT title, BILL TO / date meta, items table, AMOUNT RECEIVED,
            bank details + notes + THANK YOU. */}
        {payment.status === "paid" ? (
          <View style={styles.receiptDoc}>
            {/* Header: logo + company (left), RECEIPT title (right) */}
            <View style={styles.rcHeader}>
              <View style={styles.rcHeaderLeft}>
                <View style={styles.rcBrandRow}>
                  <Image source={RECEIPT_LOGO} style={styles.rcLogo} resizeMode="contain" />
                  <Text style={styles.rcCompany}>{RECEIPT_CO.name}</Text>
                </View>
                {RECEIPT_CO.address.map((line, i) => (
                  <Text key={i} style={styles.rcCoLine}>{line}</Text>
                ))}
                <Text style={styles.rcCoLine}>Contact: {RECEIPT_CO.phone}</Text>
                <Text style={styles.rcCoLine}>Email: {RECEIPT_CO.email}</Text>
              </View>
              <Text style={styles.rcTitle}>RECEIPT</Text>
            </View>

            <View style={styles.rcRule} />

            {/* BILL TO (left) + date / receipt / invoice meta (right) */}
            <View style={styles.rcMeta}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rcBillToLabel}>BILL TO:</Text>
                <Text style={styles.rcBillName}>{joinNames(displayNames)}</Text>
              </View>
              <View style={styles.rcMetaKV}>
                <View style={styles.rcKVCol}>
                  <Text style={styles.rcKVKey}>DATE:</Text>
                  <Text style={styles.rcKVKey}>RECEIPT NO:</Text>
                  <Text style={styles.rcKVKey}>INVOICE NO:</Text>
                  <Text style={styles.rcKVKey}>PAGE:</Text>
                </View>
                <View style={styles.rcKVValCol}>
                  <Text style={styles.rcKVVal}>{formatDDMMYYYY(payment.paidAt ?? payment.createdAt)}</Text>
                  <Text style={[styles.rcKVVal, styles.rcKVRed]}>{payment.receiptNumber ?? "—"}</Text>
                  <Text style={[styles.rcKVVal, styles.rcKVRed]}>{payment.invoiceNumber ?? "—"}</Text>
                  <Text style={styles.rcKVVal}>1 of 1</Text>
                </View>
              </View>
            </View>

            {/* Items table */}
            <View style={styles.rcTableHead}>
              <Text style={[styles.rcTh, { width: 26 }]}>#</Text>
              <Text style={[styles.rcTh, { flex: 1 }]}>PRODUCT</Text>
              <Text style={[styles.rcTh, styles.rcThRight, { width: 34 }]}>QTY</Text>
              <Text style={[styles.rcTh, styles.rcThRight, { width: 62 }]}>RATE</Text>
              <Text style={[styles.rcTh, styles.rcThRight, { width: 72 }]}>AMOUNT</Text>
            </View>
            {(() => {
              const qty = payment.packageDuration && payment.packageDuration > 0 ? payment.packageDuration : 1;
              const rate = payment.amount / qty;
              return (
                <View style={styles.rcRow}>
                  <Text style={[styles.rcTd, { width: 26 }]}>1</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rcTd} numberOfLines={2}>{payment.courseName ?? payment.packageName ?? "Course payment"}</Text>
                    {payment.packageName && payment.courseName ? <Text style={styles.rcTdSub}>{payment.packageName}</Text> : null}
                    {payment.packageDuration ? <Text style={styles.rcTdSub}>{payment.packageDuration} sessions</Text> : null}
                  </View>
                  <Text style={[styles.rcTd, styles.rcThRight, { width: 34 }]}>{qty}</Text>
                  <Text style={[styles.rcTd, styles.rcThRight, { width: 62 }]}>{rate.toFixed(2)}</Text>
                  <Text style={[styles.rcTd, styles.rcThRight, { width: 72 }]}>{payment.amount.toFixed(2)}</Text>
                </View>
              );
            })()}
            {payment.discount > 0 ? (
              <View style={styles.rcRow}>
                <Text style={[styles.rcTd, { width: 26 }]} />
                <Text style={[styles.rcTd, { flex: 1 }]}>Discount</Text>
                <Text style={[styles.rcTd, styles.rcThRight, { width: 72 + 62 + 34 }]}>- {payment.discount.toFixed(2)}</Text>
              </View>
            ) : null}

            {/* Amount received */}
            <View style={styles.rcTotalWrap}>
              <View style={styles.rcTotalRow}>
                <Text style={styles.rcTotalLabel}>AMOUNT RECEIVED</Text>
                <Text style={styles.rcTotalValue}>RM {payment.amount.toFixed(2)}</Text>
              </View>
            </View>

            {/* Bank details + notes (left), THANK YOU (right) */}
            <View style={styles.rcFooter}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rcBankHead}>BANK DETAILS:</Text>
                <Text style={styles.rcBankLine}>{RECEIPT_CO.bankName}</Text>
                <Text style={styles.rcBankLine}>ACC NO: {RECEIPT_CO.bankAccount}</Text>
                <Text style={styles.rcNotesHead}>Notes:</Text>
                <Text style={styles.rcNote}>1. All cheques should be crossed and made payable to {RECEIPT_CO.name}.</Text>
                <Text style={styles.rcNote}>2. Goods sold are neither returnable nor refundable. Otherwise a cancellation fee of at least 20% on purchase price may be imposed.</Text>
              </View>
              <View style={styles.rcThankWrap}>
                <Text style={styles.rcThank}>THANK YOU!</Text>
              </View>
            </View>

            <View style={styles.receiptActions}>
              <Pressable style={({ pressed }) => [styles.waButton, pressed && styles.pressed]} onPress={shareReceipt}>
                <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
                <Text style={styles.waButtonText}>Share receipt</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.homeButton, pressed && styles.pressed]} onPress={goHome}>
                <Ionicons name="home-outline" size={18} color="#2B161B" />
                <Text style={styles.homeButtonText}>Home</Text>
              </Pressable>
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
                    <Ionicons name="remove" size={18} color="#EC2127" />
                  </Pressable>
                  <Text style={styles.stepVal}>{qty}</Text>
                  <Pressable style={styles.stepBtn} onPress={() => setQtyOverride(qty + 1)} hitSlop={6}>
                    <Ionicons name="add" size={18} color="#EC2127" />
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
            <Text style={styles.payWithLabel}>PAY WITH</Text>
            {([
              { key: "fpx", title: "Online banking (FPX)", sub: "Maybank, CIMB, Public Bank…" },
              { key: "duitnow", title: "DuitNow QR", sub: "Scan with any Malaysian bank app" },
              { key: "slip", title: payment.receiptPhoto ? "Re-upload payment slip" : "Upload payment slip", sub: "Staff confirm within 1 working day" },
            ] as const).map((m) => {
              const on = payMethod === m.key;
              return (
                <Pressable key={m.key} style={[styles.payOption, on && styles.payOptionOn]} onPress={() => setPayMethod(m.key)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.payOptionTitle}>{m.title}</Text>
                    <Text style={styles.payOptionSub}>{m.sub}</Text>
                  </View>
                  <View style={[styles.payRadio, on && styles.payRadioOn]}>
                    {on ? <Ionicons name="checkmark" size={13} color="#FFFFFF" /> : null}
                  </View>
                </Pressable>
              );
            })}
            <Pressable
              style={({ pressed }) => [styles.primaryButton, (payingOnline || uploadingSlip) && styles.pressed, pressed && styles.pressed]}
              onPress={payMethod === "slip" ? onUploadSlip : onPayOnline}
              disabled={payingOnline || uploadingSlip}
            >
              {(payingOnline || uploadingSlip) ? <ActivityIndicator color="#FFFFFF" /> : null}
              <Text style={styles.primaryButtonText}>
                {payingOnline ? "Opening checkout…" : uploadingSlip ? "Uploading…" : payMethod === "slip" ? "UPLOAD SLIP" : `PAY ${formatRM(payment.amount)}`}
              </Text>
            </Pressable>
            <Text style={styles.payFoot}>Sessions are credited as soon as payment clears.</Text>
          </View>
        ) : null}
      </ScrollView>
      </SwipeBackView>
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
  safe: { flex: 1, backgroundColor: "#F7F3F5" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F7F3F5", gap: 12 },
  scroll: { padding: 16, gap: 12 },
  amountCard: { backgroundColor: "#FFFFFF", padding: 24, borderRadius: 22, alignItems: "center", gap: 8, shadowColor: "#000000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  amountCardDue: { backgroundColor: "#EC2127", shadowColor: "#EC2127", shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  amountLabel: { fontSize: 12, color: "#666666", fontWeight: "600", letterSpacing: 1, textTransform: "uppercase" },
  amountLabelDue: { color: "rgba(255,255,255,0.85)", letterSpacing: 2 },
  amount: { fontSize: 36, fontWeight: "800", color: "#EC2127" },
  amountDue: { color: "#FFFFFF" },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, marginTop: 4 },
  statusText: { fontSize: 12, fontWeight: "700" },
  detailCard: { backgroundColor: "#FFFFFF", padding: 16, borderRadius: 16 },
  docCard: { backgroundColor: "#FFFFFF", padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "#EAF7FD" },
  receiptCard: { borderColor: "#D1FAE5", backgroundColor: "#F0FDF4" },
  docHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  docTitle: { fontSize: 15, fontWeight: "800", color: "#EC2127", flex: 1 },
  docNo: { fontSize: 12, fontWeight: "700", color: "#999999" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  totalLabel: { fontSize: 14, fontWeight: "800", color: "#2B161B" },
  totalValue: { fontSize: 18, fontWeight: "800", color: "#EC2127" },
  paidStamp: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginTop: 10, backgroundColor: "#D1FAE5", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  paidStampText: { fontSize: 12, fontWeight: "800", color: "#065F46", letterSpacing: 1 },
  receiptDoc: { backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", padding: 16, marginBottom: 12 },
  rcHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  rcHeaderLeft: { flex: 1 },
  rcBrandRow: { flexDirection: "row", alignItems: "flex-end", gap: 6, marginBottom: 4 },
  rcLogo: { width: 42, height: 42 },
  rcCompany: { fontSize: 14, fontWeight: "900", color: "#2B161B", textTransform: "uppercase", paddingBottom: 2 },
  rcCoLine: { fontSize: 10, color: "#374151", marginTop: 1 },
  rcTitle: { fontSize: 30, fontWeight: "900", color: "#2B161B", letterSpacing: 1, textTransform: "uppercase" },
  rcRule: { height: 2, backgroundColor: "#2B161B", marginTop: 10, marginBottom: 10 },
  rcMeta: { flexDirection: "row", gap: 12, marginBottom: 12 },
  rcBillToLabel: { fontSize: 11, fontWeight: "700", color: "#2B161B", textTransform: "uppercase" },
  rcBillName: { fontSize: 13, fontWeight: "800", color: "#2B161B", marginTop: 3 },
  rcMetaKV: { flexDirection: "row", gap: 8 },
  rcKVCol: { alignItems: "flex-end", gap: 3 },
  rcKVValCol: { alignItems: "flex-start", gap: 3, minWidth: 74 },
  rcKVKey: { fontSize: 10, fontWeight: "800", color: "#2B161B" },
  rcKVVal: { fontSize: 10, fontWeight: "800", color: "#2B161B" },
  rcKVRed: { color: "#EF4444" },
  rcTableHead: { flexDirection: "row", paddingHorizontal: 4, paddingVertical: 6, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#2B161B" },
  rcTh: { fontSize: 9.5, fontWeight: "800", color: "#2B161B", letterSpacing: 0.3 },
  rcThRight: { textAlign: "right" },
  rcRow: { flexDirection: "row", paddingHorizontal: 4, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  rcTd: { fontSize: 11.5, color: "#2B161B", fontWeight: "600" },
  rcTdSub: { fontSize: 10, color: "#666666", marginTop: 1 },
  rcTotalWrap: { alignItems: "flex-end", marginTop: 4, marginBottom: 14 },
  rcTotalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16, minWidth: 220, borderBottomWidth: 1, borderTopWidth: 1, borderColor: "#2B161B", paddingHorizontal: 6, paddingVertical: 6 },
  rcTotalLabel: { fontSize: 11, fontWeight: "900", color: "#2B161B", letterSpacing: 0.3 },
  rcTotalValue: { fontSize: 14, fontWeight: "900", color: "#2B161B" },
  rcFooter: { flexDirection: "row", gap: 12, marginTop: 4 },
  rcBankHead: { fontSize: 10, fontWeight: "800", color: "#2B161B", textTransform: "uppercase", textDecorationLine: "underline" },
  rcBankLine: { fontSize: 10, fontWeight: "800", color: "#2B161B", textTransform: "uppercase", marginTop: 2 },
  rcNotesHead: { fontSize: 10, fontWeight: "700", color: "#374151", marginTop: 10, marginBottom: 2 },
  rcNote: { fontSize: 9.5, color: "#4B5563", lineHeight: 13, marginTop: 2 },
  rcThankWrap: { width: 90, alignItems: "center", justifyContent: "flex-start", paddingTop: 4 },
  rcThank: { fontSize: 13, fontWeight: "900", color: "#2B161B" },
  receiptActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  waButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 46, borderRadius: 12, backgroundColor: "#25D366" },
  waButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  homeButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 46, paddingHorizontal: 16, borderRadius: 12, backgroundColor: "#F1F5F9" },
  homeButtonText: { color: "#2B161B", fontSize: 15, fontWeight: "800" },
  sessionStudent: { fontSize: 11, color: "#666666", marginTop: 1 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  rowLabel: { fontSize: 14, color: "#666666", fontWeight: "500" },
  rowValue: { fontSize: 14, color: "#2B161B", fontWeight: "600", flex: 1, textAlign: "right", marginLeft: 16 },
  actions: { gap: 10, marginTop: 8 },
  payWithLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 2, color: "#666666", marginTop: 4, marginBottom: 2 },
  payOption: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 15, borderWidth: 2, borderColor: "transparent", shadowColor: "#000000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  payOptionOn: { borderColor: "#EC2127" },
  payOptionTitle: { fontSize: 14, fontWeight: "600", color: "#2B161B" },
  payOptionSub: { fontSize: 12, color: "#666666", marginTop: 3 },
  payRadio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#DDDDDD", alignItems: "center", justifyContent: "center" },
  payRadioOn: { backgroundColor: "#EC2127", borderColor: "#EC2127" },
  payFoot: { fontSize: 11, color: "#999999", textAlign: "center", marginTop: 2 },
  primaryButton: {
    minHeight: 52,
    backgroundColor: "#EC2127",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  secondaryButton: {
    height: 52,
    backgroundColor: "#FFFFFF",
    borderColor: "#EC2127",
    borderWidth: 1.5,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  secondaryButtonText: { color: "#EC2127", fontSize: 16, fontWeight: "700" },
  pressed: { opacity: 0.85 },
  errorText: { color: "#991B1B", fontSize: 14, textAlign: "center", paddingHorizontal: 24 },
  backButton: { paddingHorizontal: 24, paddingVertical: 12 },
  backText: { color: "#EC2127", fontSize: 16, fontWeight: "700" },
  pkgCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#F9FAFB", borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: "#EEF0F6" },
  pkgCardOn: { borderColor: "#EC2127", backgroundColor: "#F5F5FF" },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#D1D5DB", alignItems: "center", justifyContent: "center" },
  radioOn: { borderColor: "#EC2127" },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#EC2127" },
  pkgType: { fontSize: 15, fontWeight: "800", color: "#2B161B" },
  pkgMeta: { fontSize: 12, color: "#666666", fontWeight: "600", marginTop: 2 },
  pkgNeed: { fontSize: 11, color: "#EC2127", fontWeight: "700", marginTop: 3 },
  pkgPrice: { fontSize: 16, fontWeight: "800", color: "#EC2127" },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  qtyLabel: { fontSize: 14, fontWeight: "700", color: "#2B161B" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#F3F4F6", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 4 },
  stepBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  stepVal: { fontSize: 16, fontWeight: "800", color: "#2B161B", minWidth: 20, textAlign: "center" },
  coverText: { fontSize: 12, fontWeight: "800", color: "#666666", marginLeft: "auto" },
  coverOk: { color: "#059669" },
  coverShort: { color: "#DC2626" },
  slipCard: { backgroundColor: "#F0FDF4", borderRadius: 16, borderWidth: 1, borderColor: "#BBF7D0", padding: 14, gap: 10 },
  slipHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  slipTitle: { fontSize: 14, fontWeight: "800", color: "#065F46" },
  slipImage: { width: "100%", height: 180, borderRadius: 12, backgroundColor: "#E5E7EB" },
  slipNote: { fontSize: 12, color: "#047857", lineHeight: 17 },
  coveredHeader: { fontSize: 15, fontWeight: "700", color: "#2B161B" },
  coveredSubtitle: { fontSize: 12, color: "#666666", marginTop: 4, lineHeight: 16 },
  sessionList: { marginTop: 12, gap: 8 },
  sessionRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  sessionIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EAF7FD",
    alignItems: "center",
    justifyContent: "center",
  },
  sessionIndexText: { fontSize: 12, fontWeight: "800", color: "#EC2127" },
  sessionDate: { fontSize: 13, fontWeight: "600", color: "#2B161B" },
  sessionBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  sessionBadgeText: { fontSize: 11, fontWeight: "700" },
});
