import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useRole } from "@/contexts/role";
import { supabase } from "@/lib/supabase";
import { TeacherTopBar } from "@/components/TeacherTopBar";

type TrialStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show" | "converted";
type Trial = {
  id: string; childName: string; childAge: number | null; parentName: string; parentPhone: string | null;
  courseName: string; date: string | null; time: string | null; status: TrialStatus; message: string | null;
};

const STATUS_META: Record<TrialStatus, { label: string; bg: string; fg: string }> = {
  pending: { label: "Pending", bg: "#FEF3C7", fg: "#92400E" },
  confirmed: { label: "Confirmed", bg: "#DBEAFE", fg: "#1D4ED8" },
  completed: { label: "Completed", bg: "#D1FAE5", fg: "#047857" },
  no_show: { label: "No-show", bg: "#FEE2E2", fg: "#B91C1C" },
  cancelled: { label: "Cancelled", bg: "#F3F4F6", fg: "#6B7280" },
  converted: { label: "Converted", bg: "#EDE9FE", fg: "#6D28D9" },
};
const OPEN: TrialStatus[] = ["pending", "confirmed"];

function fmtDate(d: string | null): string {
  if (!d) return "No date";
  try { return new Date(d + "T00:00:00").toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short" }); } catch { return d; }
}
function time12(t: string | null): string {
  if (!t) return "";
  const [h, m] = t.split(":").map((n) => parseInt(n, 10));
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export default function TeacherTrial() {
  const { staff } = useRole();
  const [trials, setTrials] = useState<Trial[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!staff?.branchId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("trials")
      .select("id, child_name, child_age, parent_name, parent_phone, scheduled_date, scheduled_time, status, message, course:courses(name)")
      .eq("branch_id", staff.branchId).is("deleted_at", null)
      .order("scheduled_date", { ascending: true });
    setTrials((data ?? []).map((t) => {
      const c = t.course as unknown as { name: string } | null;
      return {
        id: t.id as string, childName: (t.child_name as string) ?? "Child", childAge: (t.child_age as number | null) ?? null,
        parentName: (t.parent_name as string) ?? "Parent", parentPhone: (t.parent_phone as string | null) ?? null,
        courseName: c?.name ?? "Trial class", date: (t.scheduled_date as string | null) ?? null, time: (t.scheduled_time as string | null) ?? null,
        status: (t.status as TrialStatus) ?? "pending", message: (t.message as string | null) ?? null,
      };
    }));
    setLoading(false);
  }, [staff?.branchId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const setStatus = async (t: Trial, status: TrialStatus, verb: string) => {
    Alert.alert(`Mark as ${verb}?`, `${t.childName}'s trial for ${t.courseName}.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: verb, onPress: async () => {
          setBusy(t.id);
          const { error } = await supabase.from("trials").update({ status, updated_at: new Date().toISOString() }).eq("id", t.id);
          setBusy(null);
          if (error) { Alert.alert("Couldn't update", error.message); return; }
          setTrials((prev) => prev.map((x) => (x.id === t.id ? { ...x, status } : x)));
        },
      },
    ]);
  };

  const open = trials.filter((t) => OPEN.includes(t.status));
  const done = trials.filter((t) => !OPEN.includes(t.status));

  const card = (t: Trial) => {
    const meta = STATUS_META[t.status];
    return (
      <View key={t.id} style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.flex}>
            <Text style={styles.name} numberOfLines={1}>{t.childName}{t.childAge != null ? ` · ${t.childAge}y` : ""}</Text>
            <Text style={styles.sub} numberOfLines={1}>🤖 {t.courseName}</Text>
          </View>
          <View style={[styles.statusTag, { backgroundColor: meta.bg }]}><Text style={[styles.statusText, { color: meta.fg }]}>{meta.label}</Text></View>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={14} color="#6B7280" />
          <Text style={styles.metaText}>{fmtDate(t.date)}{t.time ? ` · ${time12(t.time)}` : ""}</Text>
        </View>
        <Pressable style={styles.metaRow} onPress={() => t.parentPhone && Linking.openURL(`tel:${t.parentPhone}`)}>
          <Ionicons name="call-outline" size={14} color="#0D9488" />
          <Text style={[styles.metaText, t.parentPhone && styles.link]}>{t.parentName}{t.parentPhone ? ` · ${t.parentPhone}` : ""}</Text>
        </Pressable>
        {t.message ? <Text style={styles.message} numberOfLines={3}>💬 {t.message}</Text> : null}

        {OPEN.includes(t.status) ? (
          busy === t.id ? <ActivityIndicator color="#0D9488" style={{ marginTop: 8 }} /> : (
            <View style={styles.actions}>
              <Pressable style={[styles.actionBtn, styles.actionOk]} onPress={() => setStatus(t, "completed", "Completed")}><Ionicons name="checkmark" size={15} color="#047857" /><Text style={styles.actionOkText}>Completed</Text></Pressable>
              <Pressable style={[styles.actionBtn, styles.actionBad]} onPress={() => setStatus(t, "no_show", "No-show")}><Ionicons name="close" size={15} color="#B91C1C" /><Text style={styles.actionBadText}>No-show</Text></Pressable>
              <Pressable style={[styles.actionBtn, styles.actionMuted]} onPress={() => setStatus(t, "cancelled", "Cancelled")}><Text style={styles.actionMutedText}>Cancel</Text></Pressable>
            </View>
          )
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <TeacherTopBar />
      <View style={styles.header}><Text style={styles.title}>Trials</Text><Text style={styles.subtitle}>Trial classes at your branch — record how each went.</Text></View>
      {loading ? <View style={styles.center}><ActivityIndicator color="#0D9488" /></View> : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {trials.length === 0 ? <Text style={styles.empty}>No trials booked at your branch.</Text> : (
            <>
              <Text style={styles.groupLabel}>Upcoming ({open.length})</Text>
              {open.length === 0 ? <Text style={styles.groupEmpty}>Nothing upcoming.</Text> : open.map(card)}
              {done.length ? <><Text style={[styles.groupLabel, { marginTop: 18 }]}>Past</Text>{done.map(card)}</> : null}
            </>
          )}
          <View style={{ height: 30 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F8FA" },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  header: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8, gap: 4 },
  title: { fontSize: 24, fontWeight: "800", color: "#0F172A" },
  subtitle: { fontSize: 13, color: "#6B7280" },
  list: { padding: 12 },
  empty: { textAlign: "center", color: "#9CA3AF", fontSize: 14, marginTop: 30 },
  groupLabel: { fontSize: 12, fontWeight: "800", color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, marginLeft: 2 },
  groupEmpty: { color: "#9CA3AF", fontSize: 13, marginLeft: 2, marginBottom: 8 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#EEF0F6", gap: 8 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  name: { fontSize: 15, fontWeight: "800", color: "#111827" },
  sub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  statusTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusText: { fontSize: 12, fontWeight: "800" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 13, color: "#374151", fontWeight: "600" },
  link: { color: "#0D9488" },
  message: { fontSize: 12, color: "#6B7280", fontStyle: "italic", marginTop: 2 },
  actions: { flexDirection: "row", gap: 8, marginTop: 6 },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 9, borderRadius: 10, flex: 1 },
  actionOk: { backgroundColor: "#D1FAE5" }, actionOkText: { fontSize: 13, fontWeight: "800", color: "#047857" },
  actionBad: { backgroundColor: "#FEE2E2" }, actionBadText: { fontSize: 13, fontWeight: "800", color: "#B91C1C" },
  actionMuted: { backgroundColor: "#F3F4F6", flex: 0, paddingHorizontal: 14 }, actionMutedText: { fontSize: 13, fontWeight: "800", color: "#6B7280" },
});
