import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { C, cardShadow } from "@/theme/tech";

const WD3 = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MO3 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function shortDate(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return `${WD3[d.getDay()]}, ${d.getDate()} ${MO3[d.getMonth()]}`;
}

type Row = { id: string; date: string; status: string; lesson: string };
type Summary = {
  present: number;
  missed: number;
  rate: number;
  cells: { status: string }[];  // chronological (oldest → newest)
  history: Row[];               // newest → oldest
  makeupCredits: number;
};

function statusColor(status: string): string {
  if (status === "present" || status === "late") return C.blue;
  if (status === "absent") return C.red;
  return C.sunken; // excused / upcoming
}

export default function AttendanceSummaryScreen() {
  const { child, name } = useLocalSearchParams<{ child?: string; name?: string }>();
  const router = useRouter();

  const fetch = async (): Promise<Summary> => {
    const [{ data: att, error }, { data: resched }] = await Promise.all([
      supabase
        .from("attendance")
        .select("id, date, status, last_activity, activities, enrollment:enrollments!inner(student_id)")
        .eq("enrollment.student_id", child!)
        .order("date", { ascending: false })
        .limit(120),
      supabase
        .from("session_reschedules")
        .select("id, new_date")
        .eq("student_id", child!),
    ]);
    if (error) throw error;

    const rows: Row[] = (att ?? []).map((a) => {
      const acts = (a.activities as { lesson?: string }[] | null) ?? [];
      return {
        id: a.id as string,
        date: a.date as string,
        status: (a.status as string) ?? "absent",
        lesson: acts[0]?.lesson ?? (a.last_activity as string | null) ?? "Class",
      };
    });
    const present = rows.filter((r) => r.status === "present" || r.status === "late").length;
    const missed = rows.filter((r) => r.status === "absent").length;
    const rate = present + missed > 0 ? Math.round((present / (present + missed)) * 100) : 0;
    // Heat-map: last 24 sessions oldest→newest so the grid reads left-to-right.
    const cells = rows.slice(0, 24).reverse().map((r) => ({ status: r.status }));
    return { present, missed, rate, cells, history: rows.slice(0, 12), makeupCredits: (resched ?? []).length };
  };

  const q = useCachedQuery<Summary>(`att-summary:${child ?? "none"}`, fetch, { enabled: !!child });
  const d = q.data ?? null;

  if (q.loading && !d) {
    return <SafeAreaView style={s.safe} edges={["bottom"]}><View style={s.center}><ActivityIndicator color={C.red} /></View></SafeAreaView>;
  }

  const present = d?.present ?? 0;
  const missed = d?.missed ?? 0;
  const rate = d?.rate ?? 0;
  const cells = d?.cells ?? [];
  const history = d?.history ?? [];
  const credits = d?.makeupCredits ?? 0;

  return (
    <SafeAreaView style={s.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>Attendance</Text>
        <Text style={s.subtitle}>{name ? `${name} · ` : ""}{present + missed} sessions recorded</Text>

        {/* Stats + heat-map */}
        <View style={s.card}>
          <View style={s.statRow}>
            <View><Text style={[s.statNum, { color: C.blue }]}>{present}</Text><Text style={s.statLabel}>ATTENDED</Text></View>
            <View><Text style={[s.statNum, { color: C.red }]}>{missed}</Text><Text style={s.statLabel}>MISSED</Text></View>
            <View><Text style={[s.statNum, { color: C.ink }]}>{rate}%</Text><Text style={s.statLabel}>RATE</Text></View>
          </View>
          {cells.length > 0 ? (
            <View style={s.grid}>
              {cells.map((c, i) => <View key={i} style={[s.cell, { backgroundColor: statusColor(c.status) }]} />)}
            </View>
          ) : (
            <Text style={s.gridEmpty}>Attendance shows here after the first class.</Text>
          )}
          <View style={s.legend}>
            <Legend color={C.blue} label="Present" />
            <Legend color={C.red} label="Absent" />
            <Legend color={C.sunken} label="Excused" />
          </View>
        </View>

        {/* Makeup credit */}
        <View style={s.makeup}>
          <Text style={s.makeupEyebrow}>MAKEUP CREDIT</Text>
          <Text style={s.makeupTitle}>{credits > 0 ? `${credits} makeup ${credits === 1 ? "credit" : "credits"} kept` : missed > 0 ? "Makeup credit available" : "No makeup credits"}</Text>
          <Text style={s.makeupNote}>
            {credits > 0
              ? "Rebook on any slot for the same course — no extra session is deducted."
              : missed > 0
                ? "A missed session keeps its credit. Book a makeup on any open slot."
                : "Miss a class and its session is kept — book a makeup any time."}
          </Text>
          <Pressable style={s.makeupBtn} onPress={() => router.push("/reschedule" as Href)}>
            <Text style={s.makeupBtnText}>BOOK A MAKEUP CLASS</Text>
          </Pressable>
        </View>

        {/* History */}
        <View style={s.sectionHead}>
          <Text style={s.sectionHeadText}>HISTORY</Text>
          <View style={s.sectionHeadLine} />
        </View>
        {history.length === 0 ? (
          <View style={s.card}><Text style={s.gridEmpty}>No sessions yet.</Text></View>
        ) : (
          <View style={s.histCard}>
            {history.map((r, i) => {
              const absent = r.status === "absent";
              return (
                <Pressable
                  key={r.id}
                  style={[s.histRow, i === history.length - 1 && { borderBottomWidth: 0 }]}
                  onPress={absent ? undefined : () => router.push({ pathname: "/lesson/[id]", params: { id: r.id } } as unknown as Href)}
                >
                  <View style={{ minWidth: 0, flex: 1 }}>
                    <Text style={s.histLesson} numberOfLines={1}>{r.lesson}</Text>
                    <Text style={s.histSub}>{name ? `${name} · ` : ""}{shortDate(r.date)}</Text>
                  </View>
                  <Text style={[s.histTag, { color: absent ? C.red : C.blue }]}>{absent ? "ABSENT" : "PRESENT"}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={s.legendItem}>
      <View style={[s.legendDot, { backgroundColor: color }]} />
      <Text style={s.legendText}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  scroll: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: "600", letterSpacing: -0.7, color: C.ink, marginTop: 4 },
  subtitle: { fontSize: 13, color: C.textDim, marginTop: 5 },

  card: { backgroundColor: C.card, borderRadius: 20, padding: 18, marginTop: 16, ...cardShadow },
  statRow: { flexDirection: "row", gap: 24 },
  statNum: { fontFamily: "Montserrat", fontWeight: "800", fontSize: 28, letterSpacing: -1, lineHeight: 30 },
  statLabel: { fontFamily: "Montserrat", fontWeight: "700", fontSize: 8, letterSpacing: 1.4, color: C.textDim, marginTop: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 18 },
  cell: { width: "14.2%", aspectRatio: 1, borderRadius: 5, maxWidth: 44 },
  gridEmpty: { fontSize: 13, color: C.textDim, marginTop: 14, lineHeight: 20 },
  legend: { flexDirection: "row", gap: 14, marginTop: 13, flexWrap: "wrap" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 2 },
  legendText: { fontSize: 11, color: C.textDim },

  makeup: { backgroundColor: C.yellow, borderRadius: 20, padding: 18, marginTop: 12 },
  makeupEyebrow: { fontFamily: "Montserrat", fontWeight: "700", fontSize: 9, letterSpacing: 2, color: C.ink },
  makeupTitle: { fontSize: 18, fontWeight: "600", letterSpacing: -0.3, color: C.ink, marginTop: 9 },
  makeupNote: { fontSize: 13, color: "#5B4200", marginTop: 6, lineHeight: 20 },
  makeupBtn: { minHeight: 44, borderRadius: 12, backgroundColor: C.ink, alignItems: "center", justifyContent: "center", marginTop: 14 },
  makeupBtnText: { fontFamily: "Montserrat", fontWeight: "700", fontSize: 11, letterSpacing: 1.4, color: "#FFFFFF" },

  sectionHead: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 22 },
  sectionHeadText: { fontFamily: "Montserrat", fontWeight: "700", fontSize: 10, letterSpacing: 2.4, color: C.ink },
  sectionHeadLine: { flex: 1, height: 1, backgroundColor: C.border },

  histCard: { backgroundColor: C.card, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 4, marginTop: 12, ...cardShadow },
  histRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.borderFaint },
  histLesson: { fontSize: 13, color: C.ink },
  histSub: { fontSize: 11, color: C.textDim, marginTop: 3 },
  histTag: { fontFamily: "Montserrat", fontWeight: "700", fontSize: 9, letterSpacing: 1.2 },
});
