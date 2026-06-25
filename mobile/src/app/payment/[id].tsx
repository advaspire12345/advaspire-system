import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";

type PaymentDetail = {
  id: string;
  amount: number;
  status: "pending" | "paid" | "failed" | "refunded" | "cancelled";
  paidAt: string | null;
  createdAt: string;
  studentName: string;
  courseName: string | null;
  invoiceNumber: string | null;
  isShared: boolean;
  packageName: string | null;
};

const STATUS_STYLES: Record<PaymentDetail["status"], { bg: string; fg: string; label: string }> = {
  pending: { bg: "#FEF3C7", fg: "#92400E", label: "Pending" },
  paid: { bg: "#D1FAE5", fg: "#065F46", label: "Paid" },
  failed: { bg: "#FEE2E2", fg: "#991B1B", label: "Failed" },
  refunded: { bg: "#E0E7FF", fg: "#3730A3", label: "Refunded" },
  cancelled: { bg: "#F3F4F6", fg: "#374151", label: "Cancelled" },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-MY", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatRM(amount: number): string {
  return `RM${amount.toFixed(2)}`;
}

export default function PaymentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("payments")
          .select(`
            id,
            amount,
            status,
            paid_at,
            created_at,
            invoice_number,
            is_shared_package,
            student:students!inner(name),
            course:courses(name),
            package:course_pricing(description)
          `)
          .eq("id", id)
          .maybeSingle();
        if (error) throw error;
        if (cancelled) return;
        if (!data) {
          setErrorMessage("Payment not found");
          return;
        }
        const s = data.student as unknown as { name: string } | null;
        const c = data.course as unknown as { name: string } | null;
        const pkg = data.package as unknown as { description: string } | null;
        setPayment({
          id: data.id as string,
          amount: Number(data.amount ?? 0),
          status: (data.status as PaymentDetail["status"]) ?? "pending",
          paidAt: (data.paid_at as string | null) ?? null,
          createdAt: data.created_at as string,
          studentName: s?.name ?? "Unknown",
          courseName: c?.name ?? null,
          invoiceNumber: (data.invoice_number as string | null) ?? null,
          isShared: !!data.is_shared_package,
          packageName: pkg?.description ?? null,
        });
      } catch (err) {
        if (!cancelled) setErrorMessage(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

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
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Amount</Text>
          <Text style={styles.amount}>{formatRM(payment.amount)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.fg }]}>{statusStyle.label}</Text>
          </View>
        </View>

        <View style={styles.detailCard}>
          <Row label="Student" value={payment.studentName} />
          {payment.courseName ? <Row label="Program" value={payment.courseName} /> : null}
          {payment.packageName ? <Row label="Package" value={payment.packageName} /> : null}
          {payment.isShared ? <Row label="Type" value="Shared (siblings)" /> : null}
          {payment.invoiceNumber ? <Row label="Invoice" value={payment.invoiceNumber} /> : null}
          <Row
            label={payment.paidAt ? "Paid at" : "Created"}
            value={formatDate(payment.paidAt ?? payment.createdAt)}
          />
        </View>

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
});
