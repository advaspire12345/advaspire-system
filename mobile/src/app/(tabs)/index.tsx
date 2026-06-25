import { useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";

type ParentRow = {
  id: string;
  name: string;
  email: string | null;
};

type ChildSummary = {
  studentId: string;
  studentName: string;
  level: number;
  adcoinBalance: number;
};

export default function HomeScreen() {
  const { user } = useAuth();
  const [parent, setParent] = useState<ParentRow | null>(null);
  const [children, setChildren] = useState<ChildSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setErrorMessage(null);
    try {
      const { data: parentRow, error: parentErr } = await supabase
        .from("parents")
        .select("id, name, email")
        .eq("auth_id", user.id)
        .is("deleted_at", null)
        .maybeSingle();
      if (parentErr) throw parentErr;
      setParent(parentRow as ParentRow | null);

      if (parentRow) {
        const { data: links, error: linksErr } = await supabase
          .from("parent_students")
          .select("student:students!inner(id, name, level, adcoin_balance, deleted_at)")
          .eq("parent_id", parentRow.id);
        if (linksErr) throw linksErr;

        const rows = (links ?? [])
          .map((l) => l.student as unknown as { id: string; name: string; level: number; adcoin_balance: number; deleted_at: string | null })
          .filter((s) => s && !s.deleted_at)
          .map((s) => ({ studentId: s.id, studentName: s.name, level: s.level, adcoinBalance: s.adcoin_balance ?? 0 }));
        setChildren(rows);
      } else {
        setChildren([]);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color="#615DFA" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#615DFA" />}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Hi{parent?.name ? `, ${parent.name}` : ""}</Text>
          <Text style={styles.subtitle}>{children.length} {children.length === 1 ? "child" : "children"} enrolled</Text>
        </View>

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {!parent && !errorMessage ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No parent record</Text>
            <Text style={styles.emptyText}>
              This account is signed in but isn&apos;t linked to a parent record yet.
              Contact your branch admin to complete setup.
            </Text>
          </View>
        ) : null}

        {children.map((c) => (
          <View key={c.studentId} style={styles.childCard}>
            <Text style={styles.childName}>{c.studentName}</Text>
            <View style={styles.childRow}>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Level</Text>
                <Text style={styles.metricValue}>{c.level}</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Adcoins</Text>
                <Text style={styles.metricValue}>{c.adcoinBalance.toLocaleString()}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F6FB" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F6F6FB" },
  scroll: { padding: 16, gap: 12 },
  header: { marginBottom: 8 },
  greeting: { fontSize: 24, fontWeight: "800", color: "#111827" },
  subtitle: { fontSize: 14, color: "#6B7280", marginTop: 2 },
  errorCard: { backgroundColor: "#FEE2E2", padding: 16, borderRadius: 12 },
  errorText: { color: "#991B1B", fontSize: 14 },
  emptyCard: { backgroundColor: "#FFFFFF", padding: 16, borderRadius: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 4 },
  emptyText: { fontSize: 14, color: "#6B7280", lineHeight: 20 },
  childCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    shadowColor: "#615DFA",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  childName: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 12 },
  childRow: { flexDirection: "row", gap: 12 },
  metric: { flex: 1, backgroundColor: "#F3F4F6", padding: 12, borderRadius: 12 },
  metricLabel: { fontSize: 12, color: "#6B7280", marginBottom: 2 },
  metricValue: { fontSize: 20, fontWeight: "700", color: "#615DFA" },
});
