import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { setPaymentResult } from "@/lib/paymentResult";

// In-app Billplz checkout — loads the payment page INSIDE the app (not an external
// browser). Uses react-native-webview, lazy-required so a build without the native
// module never crashes at import (the payment screen only routes here when the
// IN_APP_CHECKOUT flag is on, i.e. a fresh build that bundles the module).
export default function CheckoutWebView() {
  const router = useRouter();
  const { url } = useLocalSearchParams<{ url?: string }>();
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let WebView: any = null;
  try { WebView = require("react-native-webview").WebView; } catch { /* not in this build */ }

  const target = typeof url === "string" ? url : "";
  const finished = useRef(false);

  // Pop back once, recording the outcome (if known) so the payment screen can show
  // a success/failure message. `paid` gets a longer hold so the server redirect
  // (which marks the payment paid) is sure to have landed before we leave.
  const finish = (status: "paid" | "failed" | null, paymentId: string | null) => {
    if (finished.current) return;
    finished.current = true;
    if (status) setPaymentResult({ id: paymentId, status });
    setTimeout(() => router.back(), status === "failed" ? 300 : 1400);
  };

  const onNav = (state: { url?: string }) => {
    const u = state?.url ?? "";
    if (!u || u === "about:blank" || finished.current) return;
    const stillOnBillplz = /billplz(-sandbox)?\.com/i.test(u);
    // Left Billplz → our /api/billplz/redirect is settling the payment. Cover the
    // screen so the web /parent login never flashes while it resolves.
    if (!stillOnBillplz && /^https?:\/\//i.test(u) && !done) setDone(true);

    // AUTHORITATIVE outcome: Billplz appends billplz[paid]=true|false straight onto
    // our redirect_url (…/api/billplz/redirect?billplz[id]=…&billplz[paid]=true). We
    // read it the instant we leave Billplz — before the web /parent→/login redirect
    // can strip our own ?paid=/?failed= params. Brackets may be URL-encoded (%5B/%5D).
    const billplzPaid = u.match(/billplz(?:%5b|\[)paid(?:%5d|\])=(true|false)/i);
    if (billplzPaid) { finish(billplzPaid[1].toLowerCase() === "true" ? "paid" : "failed", null); return; }

    // Secondary: if our redirect's ?paid=/?failed= params do survive to the browser.
    const paidMatch = u.match(/[?&]paid=([^&]+)/);
    const failMatch = u.match(/[?&]failed=([^&]+)/);
    if (paidMatch) { finish("paid", decodeURIComponent(paidMatch[1])); return; }
    if (failMatch) { finish("failed", null); return; }

    // Fallback: left Billplz but never saw an outcome (e.g. redirect stalled) → pop
    // anyway after a few seconds; the payment screen's refetch reflects reality.
    if (!stillOnBillplz && /^https?:\/\//i.test(u)) setTimeout(() => finish(null, null), 4000);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable hitSlop={8} onPress={() => router.back()} style={styles.close}><Ionicons name="close" size={22} color="#0F172A" /></Pressable>
        <Text style={styles.title}>{done ? "Finishing…" : "Payment"}</Text>
        {loading && !done ? <ActivityIndicator color="#23D2E2" /> : <View style={{ width: 34 }} />}
      </View>
      {!WebView || !target ? (
        <View style={styles.center}><Text style={styles.msg}>Couldn&apos;t open the payment page in-app. Please update to the latest build.</Text></View>
      ) : (
        <WebView
          source={{ uri: target }}
          onLoadEnd={() => setLoading(false)}
          onNavigationStateChange={onNav}
          startInLoadingState
          javaScriptEnabled
          domStorageEnabled
          style={styles.flex}
        />
      )}
      {done ? (
        <View style={styles.cover}>
          <ActivityIndicator size="large" color="#23D2E2" />
          <Text style={styles.coverText}>Finishing your payment…</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#EEF0F6" },
  close: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontSize: 17, fontWeight: "800", color: "#0F172A" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28 },
  msg: { fontSize: 14, color: "#6B7280", textAlign: "center", lineHeight: 20 },
  cover: { ...StyleSheet.absoluteFillObject, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", gap: 14 },
  coverText: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
});
