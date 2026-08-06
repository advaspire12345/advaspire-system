import { useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { TopBar } from "@/components/TopBar";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useNicknames } from "@/contexts/nicknames";
import { useAuth } from "@/contexts/auth";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { supabase } from "@/lib/supabase";
import { C, cardShadow, cardShadowLg } from "@/theme/tech";

type Bill = {
  id: string;
  amount: number;
  status: "pending" | "paid" | "failed" | "refunded" | "cancelled";
  paidAt: string | null;
  createdAt: string;
  courseId: string | null;
  courseName: string;
  children: { id: string; name: string }[];
  isShared: boolean;
};

type Program = { courseId: string; courseName: string; bills: Bill[] };
type ChildSessions = { id: string; name: string; remaining: number; total: number };

const STATUS_STYLES: Record<Bill["status"], { bg: string; fg: string; label: string }> = {
  pending: { bg: C.yellow, fg: C.ink, label: "PENDING" },
  paid: { bg: C.greenChip, fg: C.green, label: "PAID" },
  failed: { bg: C.redChip, fg: C.red, label: "FAILED" },
  refunded: { bg: C.blueChip, fg: C.blue, label: "REFUNDED" },
  cancelled: { bg: C.greyChip, fg: C.textDim, label: "CANCELLED" },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}
function formatRM(amount: number): string {
  return `RM${amount.toFixed(2)}`;
}
function joinNames(names: string[] = []): string {
  if (names.length <= 1) return names[0] ?? "—";
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

export default function PaymentsScreen() {
  const { user } = useAuth();
  const userId = user?.id;
  const router = useRouter();
  const nick = useNicknames();
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
      let childList: { id: string; name: string }[] = [];
      if (shared && p.shared_with) {
        try {
          const ids = JSON.parse(p.shared_with as string) as string[];
          childList = ids.map((cid) => ({ id: cid, name: nameById.get(cid) ?? "" })).filter((x) => x.name);
        } catch {
          /* ignore */
        }
      }
      if (childList.length === 0) {
        childList = [{ id: p.student_id as string, name: nameById.get(p.student_id as string) ?? "Child" }];
      }
      return {
        id: p.id as string,
        amount: Number(p.amount ?? 0),
        status: (p.status as Bill["status"]) ?? "pending",
        paidAt: (p.paid_at as string | null) ?? null,
        createdAt: p.created_at as string,
        courseId: (p.course_id as string | null) ?? null,
        courseName: c?.name ?? "Program",
        children: childList,
        isShared: shared,
      };
    });
  };

  const { data, loading, refreshing, error, isStale, updatedAt, refetch } = useCachedQuery<Bill[]>(
    `payments:v2:${userId ?? "anon"}`, // v2 — Bill shape changed (children carry ids for nicknames)
    fetchBills,
    { enabled: !!userId },
  );

  const fetchSessions = async (): Promise<ChildSessions[]> => {
    const { data: parentRow } = await supabase
      .from("parents").select("id").eq("auth_id", userId!).is("deleted_at", null).maybeSingle();
    if (!parentRow) return [];
    const { data: links } = await supabase
      .from("parent_students")
      .select("student:students!inner(id, name, deleted_at, enrollments(sessions_remaining, status, deleted_at, package:course_pricing(limit_sess, duration)))")
      .eq("parent_id", parentRow.id);
    const out: ChildSessions[] = [];
    for (const l of links ?? []) {
      const s = l.student as unknown as { id: string; name: string; deleted_at: string | null; enrollments: Array<{ sessions_remaining: number; status: string; deleted_at: string | null; package: { limit_sess: number | null; duration: number | null } | null }> } | null;
      if (!s || s.deleted_at) continue;
      let remaining = 0, total = 0;
      for (const e of s.enrollments ?? []) {
        if (e.deleted_at || e.status !== "active") continue;
        remaining += Number(e.sessions_remaining ?? 0);
        total += Number(e.package?.limit_sess ?? e.package?.duration ?? 0);
      }
      if (total > 0 || remaining !== 0) out.push({ id: s.id, name: s.name, remaining, total });
    }
    return out;
  };
  const sessionsQuery = useCachedQuery<ChildSessions[]>(`payment:sessions:${userId ?? "anon"}`, fetchSessions, { enabled: !!userId });
  const childSessions = sessionsQuery.data ?? [];

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
  const shownBills = programId ? (byCourse[programId]?.bills ?? []) : bills;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <TopBar crumb="Payments" />
        <View style={styles.center}><ActivityIndicator color={C.red} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <TopBar crumb="Payments" />
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor={C.red} />}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.title}>Payments</Text>
          <Text style={styles.subtitle}>Sessions are bought as packages and deducted one per class attended.</Text>
        </View>

        {childSessions.length > 0 ? (
          <View style={styles.sessRow}>
            {childSessions.map((cs) => {
              const low = cs.remaining <= 0;
              const frac = cs.total > 0 ? Math.max(0.05, Math.min(1, cs.remaining / cs.total)) : 0.05;
              return (
                <View key={cs.id} style={styles.sessCard}>
                  <Text style={styles.sessName} numberOfLines={1}>{nick.raw(cs.id) ?? cs.name.split(" ")[0]}</Text>
                  <Text style={styles.sessNum}>
                    <Text style={[styles.sessNumBig, low && { color: C.red }]}>{cs.remaining}</Text>
                    <Text style={styles.sessNumSmall}>/{cs.total || "—"}</Text>
                  </Text>
                  <View style={styles.sessTrack}>
                    <View style={[styles.sessFill, { width: `${Math.round(frac * 100)}%` }]} />
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {errorMessage ? (
          <View style={styles.errorCard}><Text style={styles.errorText}>{errorMessage}</Text></View>
        ) : null}
        {isStale ? <OfflineBanner updatedAt={updatedAt} /> : null}

        {/* Program filter pills */}
        {programs.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow} style={styles.pillScroll}>
            <Pressable style={[styles.pill, !programId && styles.pillActive]} onPress={() => setProgramId(null)}>
              <Text style={[styles.pillText, !programId && styles.pillTextActive]}>All</Text>
            </Pressable>
            {programs.map((p) => {
              const active = programId === p.courseId;
              return (
                <Pressable key={p.courseId} style={[styles.pill, active && styles.pillActive]} onPress={() => setProgramId(p.courseId)}>
                  <Text style={[styles.pillText, active && styles.pillTextActive]} numberOfLines={1}>{p.courseName}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {shownBills.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="card-outline" size={40} color={C.textMute} />
            <Text style={styles.emptyTitle}>No payments yet</Text>
            <Text style={styles.emptyText}>When a payment is created for your child, it&apos;ll appear here.</Text>
          </View>
        ) : (
          shownBills.map((b) => {
            const st = STATUS_STYLES[b.status];
            const pending = b.status === "pending";
            return (
              <Pressable
                key={b.id}
                style={({ pressed }) => [styles.card, pending && styles.cardPending, pressed && styles.cardPressed]}
                onPress={() => router.push({ pathname: "/payment/[id]", params: { id: b.id } })}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.amount}>{formatRM(b.amount)}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                    <Text style={[styles.statusText, { color: st.fg }]}>{st.label}</Text>
                  </View>
                </View>
                <View style={styles.childRow}>
                  <Text style={styles.childNames} numberOfLines={1}>{joinNames((b.children ?? []).map((c) => nick.raw(c.id) ?? c.name))}</Text>
                  {b.isShared ? <View style={styles.sharedBadge}><Text style={styles.sharedText}>SHARED</Text></View> : null}
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
  safe: { flex: 1, backgroundColor: C.card },
  body: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg },
  list: { padding: 14, paddingBottom: 32, gap: 11 },
  headerBlock: { marginBottom: 2 },
  sessRow: { flexDirection: "row", gap: 12 },
  sessCard: { flex: 1, backgroundColor: C.card, borderRadius: 20, padding: 16, ...cardShadow },
  sessName: { fontSize: 11, fontWeight: "600", color: C.textDim },
  sessNum: { marginTop: 6 },
  sessNumBig: { fontSize: 24, fontWeight: "800", color: C.ink, letterSpacing: -0.8 },
  sessNumSmall: { fontSize: 13, fontWeight: "600", color: C.textDim },
  sessTrack: { height: 8, borderRadius: 4, backgroundColor: C.greyChip, marginTop: 11, overflow: "hidden" },
  sessFill: { height: "100%", borderRadius: 4, backgroundColor: C.red },
  title: { fontSize: 26, fontWeight: "600", color: C.ink, letterSpacing: -0.7 },
  subtitle: { fontSize: 13, color: C.textDim, marginTop: 6, lineHeight: 20 },
  errorCard: { backgroundColor: C.redChip, padding: 14, borderRadius: 14 },
  errorText: { color: C.red, fontSize: 13 },
  pillScroll: { flexGrow: 0, marginHorizontal: -14 },
  pillRow: { paddingHorizontal: 14, gap: 8, paddingVertical: 2 },
  pill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: C.card, ...cardShadow },
  pillActive: { backgroundColor: C.ink },
  pillText: { fontSize: 13, fontWeight: "600", color: C.ink },
  pillTextActive: { color: "#FFFFFF" },
  empty: { paddingVertical: 48, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: C.ink },
  emptyText: { fontSize: 13, color: C.textDim, textAlign: "center", maxWidth: 280, lineHeight: 19 },
  card: { backgroundColor: C.card, padding: 17, borderRadius: 20, ...cardShadow },
  cardPending: { ...cardShadowLg },
  cardPressed: { opacity: 0.92 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  amount: { fontSize: 22, fontWeight: "800", color: C.ink, letterSpacing: -0.8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.6 },
  childRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  childNames: { fontSize: 14, fontWeight: "600", color: C.ink, flexShrink: 1 },
  sharedBadge: { backgroundColor: C.blueChip, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  sharedText: { fontSize: 9, fontWeight: "700", color: C.blue, letterSpacing: 0.6 },
  courseName: { fontSize: 12, color: C.textDim, marginTop: 5 },
  dateText: { fontSize: 11, color: C.textMute, marginTop: 9 },
});
