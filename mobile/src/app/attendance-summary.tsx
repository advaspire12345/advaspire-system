import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { C, cardShadow } from "@/theme/tech";

const WD3 = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MO3 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function shortDate(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return `${WD3[d.getDay()]}, ${d.getDate()} ${MO3[d.getMonth()]}`;
}
function time12(t: string | null): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Child = { id: string; name: string };
type Row = { id: string; date: string; status: string; lesson: string };
type Remark = { id: string; date: string; note: string; instructor: string | null };
type Upcoming = { date: string; time: string | null; course: string };
type Month = { label: string; rate: number; total: number };
type Summary = {
  present: number; missed: number; rate: number;
  cells: { status: string }[];   // chronological (oldest → newest)
  history: Row[];                // newest → oldest
  makeupCredits: number;
  months: Month[];               // oldest → newest
  remarks: Remark[];
  upcoming: Upcoming[];
};

function statusColor(status: string): string {
  if (status === "present" || status === "late") return C.blue;
  if (status === "absent") return C.red;
  return C.sunken; // excused / upcoming
}

export default function AttendanceSummaryScreen() {
  const { child, name } = useLocalSearchParams<{ child?: string; name?: string }>();
  const router = useRouter();
  const { user } = useAuth();

  // The screen is opened per child, but parents with siblings want to compare
  // without backing out, so it carries its own filter.
  const [children, setChildren] = useState<Child[]>([]);
  const [activeId, setActiveId] = useState<string | undefined>(child);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: parentRow } = await supabase
        .from("parents").select("id").eq("auth_id", user?.id ?? "").is("deleted_at", null).maybeSingle();
      if (!parentRow) return;
      const { data: links } = await supabase
        .from("parent_students").select("student:students!inner(id, name, deleted_at)").eq("parent_id", parentRow.id);
      const list = (links ?? [])
        .map((l) => l.student as unknown as Child & { deleted_at: string | null })
        .filter((s) => s && !s.deleted_at)
        .map((s) => ({ id: s.id, name: s.name }));
      if (cancelled) return;
      setChildren(list);
      if (!activeId && list.length) setActiveId(list[0].id);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const activeName = children.find((c) => c.id === activeId)?.name ?? name ?? "";

  const fetch = async (): Promise<Summary> => {
    const [{ data: att, error }, { data: resched }, { data: enrs }] = await Promise.all([
      supabase
        .from("attendance")
        .select("id, date, status, last_activity, activities, notes, instructor_name, enrollment:enrollments!inner(student_id)")
        .eq("enrollment.student_id", activeId!)
        .order("date", { ascending: false })
        .limit(120),
      supabase.from("session_reschedules").select("id, new_date").eq("student_id", activeId!),
      supabase
        .from("enrollments")
        .select("day_of_week, start_time, schedule, status, deleted_at, course:courses(name)")
        .eq("student_id", activeId!),
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
    const cells = rows.slice(0, 24).reverse().map((r) => ({ status: r.status }));

    // Rate per calendar month, last 6 months that actually have sessions.
    const buckets = new Map<string, { hit: number; total: number }>();
    for (const r of rows) {
      if (r.status !== "present" && r.status !== "late" && r.status !== "absent") continue;
      const key = r.date.slice(0, 7);
      const b = buckets.get(key) ?? { hit: 0, total: 0 };
      b.total += 1;
      if (r.status !== "absent") b.hit += 1;
      buckets.set(key, b);
    }
    const months: Month[] = [...buckets.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([k, b]) => ({ label: MO3[Number(k.slice(5, 7)) - 1], rate: Math.round((b.hit / b.total) * 100), total: b.total }));

    const remarks: Remark[] = (att ?? [])
      .filter((a) => (a.notes as string | null)?.trim())
      .slice(0, 5)
      .map((a) => ({ id: a.id as string, date: a.date as string, note: (a.notes as string).trim(), instructor: (a.instructor_name as string | null) ?? null }));

    // Next 3 occurrences across the child's active enrolments.
    const upcoming: Upcoming[] = [];
    for (const e of enrs ?? []) {
      if (e.deleted_at || e.status !== "active") continue;
      let days: string[] = [];
      let t: string | null = (e.start_time as string | null) ?? null;
      try {
        const parsed = JSON.parse((e.schedule as string | null) ?? "[]");
        if (Array.isArray(parsed)) {
          days = parsed.map((p: { day?: string }) => String(p?.day ?? "").toLowerCase()).filter(Boolean);
          if (!t && parsed[0]?.time) t = String(parsed[0].time);
        }
      } catch { /* malformed schedule */ }
      if (!days.length && e.day_of_week) days = [String(e.day_of_week).toLowerCase()];
      // PostgREST types this embed as an array even though it resolves to one row.
      const rel = e.course as unknown as { name: string } | { name: string }[] | null;
      const courseName = (Array.isArray(rel) ? rel[0]?.name : rel?.name) ?? "Class";
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      for (let i = 0; i < 21 && upcoming.length < 12; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        if (days.includes(WEEKDAYS[d.getDay()])) { upcoming.push({ date: ymd(d), time: t, course: courseName }); break; }
      }
    }
    upcoming.sort((a, b) => (a.date === b.date ? (a.time ?? "").localeCompare(b.time ?? "") : a.date.localeCompare(b.date)));

    return { present, missed, rate, cells, history: rows.slice(0, 12), makeupCredits: (resched ?? []).length, months, remarks, upcoming: upcoming.slice(0, 3) };
  };

  const q = useCachedQuery<Summary>(`att-summary:${activeId ?? "none"}`, fetch, { enabled: !!activeId });
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
  const months = d?.months ?? [];
  const remarks = d?.remarks ?? [];
  const upcoming = d?.upcoming ?? [];

  return (
    <SafeAreaView style={s.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>Attendance</Text>
        <Text style={s.subtitle}>{activeName ? `${activeName} · ` : ""}{present + missed} sessions recorded</Text>

        {/* One child gets no filter row, so add the equivalent breathing room —
            otherwise the stats card sits right under the top bar. */}
        {children.length <= 1 ? <View style={s.filterSpacer} /> : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={s.filterInner}>
            {children.map((c) => {
              const on = c.id === activeId;
              return (
                <Pressable key={c.id} style={[s.filterChip, on && s.filterChipOn]} onPress={() => setActiveId(c.id)}>
                  <Text style={[s.filterText, on && s.filterTextOn]} numberOfLines={1}>{c.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

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
          {/* Month-by-month lives inside the same card as attended/missed/rate —
              it's the trend behind those three numbers, not a separate topic. */}
          {months.length > 1 ? (
            <View style={s.trendBlock}>
              <Text style={s.trendHead}>MONTH BY MONTH</Text>
              <View style={s.trendRow}>
                {months.map((m) => (
                  <View key={m.label} style={s.trendCol}>
                    <Text style={s.trendPct}>{m.rate}%</Text>
                    <View style={s.trendTrack}>
                      <View style={[s.trendFill, { height: `${Math.max(4, m.rate)}%`, backgroundColor: m.rate >= 80 ? C.green : m.rate >= 50 ? C.yellow : C.red }]} />
                    </View>
                    <Text style={s.trendLabel}>{m.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>

        {/* Next classes */}
        {upcoming.length > 0 ? (
          <>
            <View style={s.sectionHead}><Text style={s.sectionHeadText}>COMING UP</Text><View style={s.sectionHeadLine} /></View>
            <View style={s.histCard}>
              {upcoming.map((u, i) => (
                <View key={`${u.date}-${u.course}`} style={[s.histRow, i === upcoming.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={{ minWidth: 0, flex: 1 }}>
                    <Text style={s.histLesson} numberOfLines={1}>{u.course}</Text>
                    <Text style={s.histSub}>{shortDate(u.date)}{u.time ? ` · ${time12(u.time)}` : ""}</Text>
                  </View>
                  <Text style={[s.histTag, { color: C.textDim }]}>SCHEDULED</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {/* Trainer remarks */}
        {remarks.length > 0 ? (
          <>
            <View style={s.sectionHead}><Text style={s.sectionHeadText}>TRAINER REMARKS</Text><View style={s.sectionHeadLine} /></View>
            <View style={s.card2}>
              {remarks.map((r, i) => (
                <View key={r.id} style={[s.remarkRow, i < remarks.length - 1 && s.remarkDivider]}>
                  <Text style={s.remarkMeta}>{shortDate(r.date)}{r.instructor ? ` · ${r.instructor}` : ""}</Text>
                  <Text style={s.remarkText}>{r.note}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

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
                    <Text style={s.histSub}>{activeName ? `${activeName} · ` : ""}{shortDate(r.date)}</Text>
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

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  scroll: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: "600", letterSpacing: -0.7, color: C.ink, marginTop: 4 },
  subtitle: { fontSize: 13, color: C.textDim, marginTop: 5 },

  filterRow: { marginTop: 14, marginHorizontal: -16 },
  filterSpacer: { height: 22 }, // matches the filter row's visual height
  filterInner: { paddingHorizontal: 16, gap: 8 },
  filterChip: { backgroundColor: C.card, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, ...cardShadow },
  filterChipOn: { backgroundColor: C.ink },
  filterText: { fontSize: 12, fontWeight: "600", color: C.textDim },
  filterTextOn: { color: "#FFFFFF" },

  card: { backgroundColor: C.card, borderRadius: 20, padding: 18, marginTop: 16, ...cardShadow },
  card2: { backgroundColor: C.card, borderRadius: 18, padding: 16, marginTop: 12, ...cardShadow },
  statRow: { flexDirection: "row", gap: 24 },
  statNum: { fontFamily: "Montserrat", fontWeight: "800", fontSize: 28, letterSpacing: -1, lineHeight: 30 },
  statLabel: { fontFamily: "Montserrat", fontWeight: "700", fontSize: 8, letterSpacing: 1.4, color: C.textDim, marginTop: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 14 },
  cell: { width: 28, height: 28, borderRadius: 5 },
  gridEmpty: { fontSize: 13, color: C.textDim, marginTop: 14, lineHeight: 20 },

  trendBlock: { marginTop: 10, borderTopWidth: 1, borderTopColor: C.borderFaint, paddingTop: 12 },
  trendHead: { fontFamily: "Montserrat", fontWeight: "700", fontSize: 8, letterSpacing: 1.4, color: C.textDim, marginBottom: 12 },
  trendRow: { flexDirection: "row", alignItems: "stretch", justifyContent: "space-between", gap: 8, height: 104 },
  trendCol: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  trendPct: { fontSize: 9, fontWeight: "700", color: C.textDim, marginBottom: 4 },
  trendTrack: { width: "100%", maxWidth: 34, flex: 1, backgroundColor: C.sunken, borderRadius: 6, justifyContent: "flex-end", overflow: "hidden" },
  trendFill: { width: "100%", borderRadius: 6 },
  trendLabel: { fontSize: 10, fontWeight: "600", color: C.textDim, marginTop: 7 },
  trendNote: { fontSize: 11, color: C.textMute, marginTop: 12 },

  remarkRow: { paddingVertical: 11 },
  remarkDivider: { borderBottomWidth: 1, borderBottomColor: C.borderFaint },
  remarkMeta: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8, color: C.textMute },
  remarkText: { fontSize: 13, color: C.ink, marginTop: 5, lineHeight: 19 },

  makeup: { backgroundColor: C.yellow, borderRadius: 20, padding: 18, marginTop: 16 },
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
