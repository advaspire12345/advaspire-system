import { useMemo } from "react";
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import { TopBar } from "@/components/TopBar";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useAuth } from "@/contexts/auth";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { useNicknames } from "@/contexts/nicknames";
import { TourTarget } from "@/contexts/tour";
import { supabase } from "@/lib/supabase";
import { C, cardShadow, cardShadowLg } from "@/theme/tech";

type ParentRow = { id: string; name: string };
type ProgramInfo = { name: string; remaining: number; nextClass: string | null; startTime: string | null };
type ChildSummary = { studentId: string; studentName: string; photo: string | null; level: number; programs: ProgramInfo[] };
type AcademyNotice = { id: string; title: string; description: string | null; date: string; type: string };
type HomeData = {
  parent: ParentRow | null;
  children: ChildSummary[];
  totalSessions: number;
  unpaidCount: number;
  unpaidAmount: number;
  latestUnpaidId: string | null;
  notices: AcademyNotice[];
  galleryCount: number;
};

const WD_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WD_FULL = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const MO_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MO_FULL = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
const WEEKDAYS_FULL = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function todayLong(): string {
  const d = new Date();
  return `${WD_FULL[d.getDay()]}, ${d.getDate()} ${MO_FULL[d.getMonth()]}`;
}
function time12(hhmm: string | null): string {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
function classLong(ymd: string, time: string | null): string {
  const d = new Date(ymd + "T00:00:00");
  let s = `${WD_SHORT[d.getDay()]}, ${d.getDate()} ${MO_SHORT[d.getMonth()]}`;
  if (time) s += ` · ${time12(time)}`;
  return s;
}
function formatRM(amount: number): string {
  return `RM${amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2)}`;
}
function noticeDate(ymd: string): string {
  const d = new Date(ymd + "T00:00:00");
  return `${d.getDate()} ${MO_SHORT[d.getMonth()].toUpperCase()}`;
}

function parseScheduleDays(scheduleRaw: string | null, dayOfWeekRaw: string | null): { days: string[]; time: string | null } {
  let days: string[] = [];
  let time: string | null = null;
  if (scheduleRaw) {
    try {
      const parsed = JSON.parse(scheduleRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        days = parsed.map((p: { day: string }) => String(p.day || "").toLowerCase()).filter(Boolean);
        if (parsed[0].time) time = parsed[0].time;
      }
    } catch { /* ignore */ }
  }
  if (days.length === 0 && dayOfWeekRaw) {
    try {
      const parsed = JSON.parse(dayOfWeekRaw);
      if (Array.isArray(parsed)) days = parsed.map((d: string) => String(d).toLowerCase());
    } catch { /* ignore */ }
  }
  return { days, time };
}
function nextClassDate(days: string[]): string | null {
  if (!days.length) return null;
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  for (let i = 0; i <= 7; i++) {
    const d = new Date(t);
    d.setDate(d.getDate() + i);
    if (days.includes(WEEKDAYS_FULL[d.getDay()])) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
  }
  return null;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const userId = user?.id;
  const router = useRouter();
  const nick = useNicknames();

  const fetchHome = async (): Promise<HomeData> => {
    const { data: parentRow, error: parentErr } = await supabase
      .from("parents").select("id, name").eq("auth_id", userId!).is("deleted_at", null).maybeSingle();
    if (parentErr) throw parentErr;
    if (!parentRow) return { parent: null, children: [], totalSessions: 0, unpaidCount: 0, unpaidAmount: 0, latestUnpaidId: null, notices: [], galleryCount: 0 };

    const { data: links, error: linksErr } = await supabase
      .from("parent_students")
      .select(`student:students!inner(id, name, photo, level, deleted_at, enrollments(status, sessions_remaining, day_of_week, start_time, schedule, created_at, deleted_at, course:courses(name)))`)
      .eq("parent_id", parentRow.id);
    if (linksErr) throw linksErr;

    const rows: ChildSummary[] = (links ?? [])
      .map((l) => l.student as unknown as {
        id: string; name: string; photo: string | null; level: number; deleted_at: string | null;
        enrollments: Array<{ status: string; sessions_remaining: number; day_of_week: string | null; start_time: string | null; schedule: string | null; created_at: string; deleted_at: string | null; course: { name: string } | null }>;
      })
      .filter((s) => s && !s.deleted_at)
      .map((s) => {
        const actives = (s.enrollments ?? []).filter((e) => !e.deleted_at && e.status === "active").sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
        const seen = new Set<string>();
        const programs: ProgramInfo[] = [];
        for (const e of actives) {
          const name = e.course?.name ?? "Program";
          if (seen.has(name)) continue;
          seen.add(name);
          const { days, time } = parseScheduleDays(e.schedule, e.day_of_week);
          programs.push({ name, remaining: Number(e.sessions_remaining ?? 0), nextClass: nextClassDate(days), startTime: e.start_time ?? time });
        }
        return { studentId: s.id, studentName: s.name, photo: s.photo, level: s.level, programs };
      });

    const totalSessions = rows.reduce((sum, c) => sum + c.programs.reduce((s, p) => s + p.remaining, 0), 0);

    const studentIds = rows.map((r) => r.studentId);
    let unpaidCount = 0, unpaidAmount = 0;
    let latestUnpaidId: string | null = null;
    let galleryCount = 0;
    if (studentIds.length) {
      const { data: pays } = await supabase
        .from("payments").select("id, amount, status, student_id, created_at")
        .in("student_id", studentIds).eq("status", "pending").order("created_at", { ascending: false });
      const seen = new Set<string>();
      for (const p of pays ?? []) {
        const id = p.id as string;
        if (seen.has(id)) continue;
        seen.add(id);
        if (!latestUnpaidId) latestUnpaidId = id;
        unpaidCount += 1;
        unpaidAmount += Number(p.amount ?? 0);
      }
    }

    // Academy notices = most recent staff-created events (holidays, showcases).
    // Not filtered to future-only — these read as "recent announcements". Best-effort.
    const { data: evs } = await supabase
      .from("events")
      .select("id, title, description, event_type, date, status, created_by_parent_id, deleted_at")
      .is("created_by_parent_id", null)
      .is("deleted_at", null)
      .neq("status", "rejected")
      .order("date", { ascending: false })
      .limit(3);
    const notices: AcademyNotice[] = (evs ?? []).map((e) => ({
      id: e.id as string,
      title: (e.title as string) ?? "Announcement",
      description: (e.description as string | null) ?? null,
      date: e.date as string,
      type: (e.event_type as string) ?? "activity",
    }));

    // Gallery count = photos+videos across the children's recent sessions. Best-effort.
    if (studentIds.length) {
      const { data: media } = await supabase
        .from("attendance")
        .select("activities, project_photos, enrollment:enrollments!inner(student_id)")
        .eq("status", "present")
        .in("enrollment.student_id", studentIds)
        .order("date", { ascending: false })
        .limit(60);
      const urls = new Set<string>();
      for (const a of media ?? []) {
        for (const act of ((a.activities as { photos?: string[]; video?: string | null }[] | null) ?? [])) {
          for (const p of act?.photos ?? []) if (p) urls.add(p);
          if (act?.video) urls.add(act.video);
        }
        for (const p of ((a.project_photos as string[] | null) ?? [])) if (p) urls.add(p);
      }
      galleryCount = urls.size;
    }

    return { parent: parentRow as ParentRow, children: rows, totalSessions, unpaidCount, unpaidAmount, latestUnpaidId, notices, galleryCount };
  };

  const { data, loading, refreshing, error, isStale, updatedAt, refetch } = useCachedQuery<HomeData>(
    `home:${userId ?? "anon"}`, fetchHome, { enabled: !!userId },
  );

  const parent = data?.parent ?? null;
  const children = data?.children ?? [];
  const totalSessions = data?.totalSessions ?? 0;
  const unpaidCount = data?.unpaidCount ?? 0;
  const unpaidAmount = data?.unpaidAmount ?? 0;
  const latestUnpaidId = data?.latestUnpaidId ?? null;
  const notices = data?.notices ?? [];
  const galleryCount = data?.galleryCount ?? 0;
  const firstName = parent?.name?.split(" ")[0] ?? "";
  const errorMessage = error && !data ? "Couldn't load your dashboard. Pull down to refresh." : null;

  // Soonest upcoming class across every child/program → the NEXT CLASS panel.
  const nextClass = useMemo(() => {
    let best: { when: string; what: string; date: string } | null = null;
    for (const c of children) {
      const nm = nick.raw(c.studentId) ?? c.studentName;
      for (const pr of c.programs) {
        if (!pr.nextClass) continue;
        if (!best || pr.nextClass < best.date || (pr.nextClass === best.date && (pr.startTime ?? "") < (best.when))) {
          best = { when: classLong(pr.nextClass, pr.startTime), what: `${nm} · ${pr.name}`, date: pr.nextClass };
        }
      }
    }
    return best;
  }, [children, nick]);

  const strap = useMemo(() => {
    if (children.length === 0) return "Welcome to Advaspire.";
    if (unpaidCount > 0) return `${unpaidCount} ${unpaidCount === 1 ? "bill" : "bills"} to settle this week.`;
    if (nextClass) return `Next class ${nextClass.when.replace(" · ", ", ")}.`;
    return `${children.length === 1 ? "One child" : `${children.length} children`} in class this week.`;
  }, [children.length, unpaidCount, nextClass]);

  const goPay = () => router.push(unpaidCount > 0 && latestUnpaidId ? (`/payment/${latestUnpaidId}` as Href) : "/(tabs)/payment");
  const goProgressSkills = () => {
    const first = children[0];
    router.push({ pathname: "/(tabs)/progress", params: first ? { studentId: first.studentId, section: "skills" } : { section: "skills" } });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <TopBar crumb="Parent Portal" />
        <View style={styles.center}><ActivityIndicator color={C.red} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <TopBar crumb="Parent Portal" />
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor={C.red} />}
      >
        {/* Header */}
        <View>
          <Text style={styles.date}>{todayLong()}</Text>
          <Text style={styles.hello}>Hello{firstName ? `, ${firstName}` : ""}</Text>
          <View style={styles.strapWrap}>
            <View style={styles.strapBar} />
            <Text style={styles.strapText}>{strap}</Text>
          </View>
        </View>

        {isStale ? <OfflineBanner updatedAt={updatedAt} /> : null}
        {errorMessage ? (
          <View style={styles.errorCard}><Ionicons name="alert-circle" size={16} color={C.red} /><Text style={styles.errorText}>{errorMessage}</Text></View>
        ) : null}

        {parent && children.length > 0 ? (
          <View style={styles.statRow}>
            <TourTarget name="sessions" style={styles.flex}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>SESSIONS LEFT</Text>
                <Text style={styles.statNum}>{totalSessions}</Text>
                <Text style={styles.statSub}>across {children.length} {children.length === 1 ? "child" : "children"}</Text>
              </View>
            </TourTarget>
            <Pressable style={styles.flex} onPress={goPay}>
              {unpaidCount > 0 ? (
                <View style={styles.statYellow}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.statLabelDark}>UNPAID</Text>
                    <Ionicons name="chevron-forward" size={13} color={C.ink} />
                  </View>
                  <Text style={[styles.statNum, styles.statNumDark]}>{formatRM(unpaidAmount)}</Text>
                  <Text style={styles.statSubYellow}>Tap to pay now</Text>
                </View>
              ) : (
                <View style={styles.statCard}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.statLabel}>PAYMENTS</Text>
                    <Ionicons name="checkmark-circle" size={14} color={C.green} />
                  </View>
                  <Text style={[styles.statNum, { color: C.green }]}>Paid</Text>
                  <Text style={styles.statSub}>You&apos;re up to date</Text>
                </View>
              )}
            </Pressable>
          </View>
        ) : null}

        {/* NEXT CLASS maroon panel */}
        {nextClass ? (
          <View style={styles.nextPanel}>
            <View style={styles.payHead}>
              <View style={styles.payDot} />
              <Text style={styles.payHeadText}>NEXT CLASS</Text>
            </View>
            <Text style={styles.nextWhen}>{nextClass.when}</Text>
            <Text style={styles.nextWhat}>{nextClass.what}</Text>
            <View style={styles.nextBtns}>
              <Pressable style={({ pressed }) => [styles.nextGhost, pressed && styles.pressed]} onPress={() => router.push("/reschedule" as Href)}>
                <Text style={styles.nextGhostText}>CAN&apos;T MAKE IT</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.nextYellow, pressed && styles.pressed]} onPress={() => router.push("/(tabs)/schedule")}>
                <Text style={styles.nextYellowText}>VIEW SCHEDULE</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {!parent && !errorMessage ? (
          <View style={styles.emptyCard}>
            <Ionicons name="person-outline" size={26} color={C.red} />
            <Text style={styles.emptyTitle}>No parent record</Text>
            <Text style={styles.emptyText}>This account isn&apos;t linked to a parent yet. Contact your branch admin.</Text>
          </View>
        ) : null}

        {children.length > 0 ? (
          <View style={styles.hlWrap}>
            <View style={styles.hlBar} />
            <Text style={styles.hlText}>MY CHILDREN</Text>
          </View>
        ) : null}

        {children.map((c, idx) => {
          const blue = idx % 2 === 1;
          const displayName = nick.raw(c.studentId) ?? c.studentName;
          const initial = displayName.charAt(0).toUpperCase();
          return (
            <Pressable
              key={c.studentId}
              style={({ pressed }) => [styles.childCard, pressed && styles.pressed]}
              onPress={() => router.push({ pathname: "/(tabs)/progress", params: { studentId: c.studentId } })}
            >
              <View style={styles.childHead}>
                <View style={[styles.avatar, { backgroundColor: blue ? C.blue : C.red }]}>
                  {c.photo ? <Image source={{ uri: c.photo }} style={styles.avatarImg} /> : <Text style={styles.avatarInitial}>{initial}</Text>}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.childName} numberOfLines={1}>{displayName}</Text>
                  <View style={styles.tagRow}>
                    <View style={styles.tagBlue}><Text style={styles.tagBlueText}>LEVEL {c.level}</Text></View>
                    <View style={styles.tagGrey}><Text style={styles.tagGreyText}>{c.programs.length} {c.programs.length === 1 ? "PROGRAM" : "PROGRAMS"}</Text></View>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.red} />
              </View>

              {c.programs.length === 0 ? (
                <View style={styles.progBlock}><Text style={styles.noProgram}>No active program</Text></View>
              ) : (
                c.programs.map((pr, i) => {
                  const ok = pr.remaining > 0;
                  return (
                    <View key={pr.name} style={[styles.progBlock, i > 0 && { marginTop: 9 }]}>
                      <View style={styles.progRow}>
                        <View style={[styles.progDot, { backgroundColor: i % 2 === 1 ? C.blue : C.red }]} />
                        <Text style={styles.progName} numberOfLines={1}>{pr.name}</Text>
                        <View style={[styles.leftPill, ok ? styles.leftPillOk : styles.leftPillLow]}>
                          <Text style={[styles.leftPillText, { color: ok ? C.green : C.red }]}>{pr.remaining} left</Text>
                        </View>
                      </View>
                      <Text style={styles.progNext}>{pr.nextClass ? `Next class ${classLong(pr.nextClass, pr.startTime)}` : "No upcoming class"}</Text>
                    </View>
                  );
                })
              )}
            </Pressable>
          );
        })}

        {/* Payment-required maroon panel */}
        {unpaidCount > 0 ? (
          <View style={styles.payPanel}>
            <View style={styles.payHead}>
              <View style={styles.payDot} />
              <Text style={styles.payHeadText}>PAYMENT REQUIRED</Text>
            </View>
            <Text style={styles.payBody}>
              {totalSessions < 0
                ? "A child has attended beyond their paid sessions. Top up to keep the class slot."
                : `You have ${unpaidCount} unpaid ${unpaidCount === 1 ? "bill" : "bills"}. Settle to stay enrolled.`}
            </Text>
            <Pressable style={({ pressed }) => [styles.payBtn, pressed && styles.pressed]} onPress={goPay}>
              <Text style={styles.payBtnText}>PAY {formatRM(unpaidAmount)}</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Gallery + Skills quick tiles */}
        {children.length > 0 ? (
          <View style={styles.tileRow}>
            <Pressable style={({ pressed }) => [styles.tile, pressed && styles.pressed]} onPress={() => router.push("/gallery" as Href)}>
              <Ionicons name="images-outline" size={20} color={C.blue} />
              <Text style={styles.tileTitle}>Gallery</Text>
              <Text style={styles.tileSub}>{galleryCount > 0 ? `${galleryCount} photos & builds` : "Photos & builds"}</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.tile, pressed && styles.pressed]} onPress={goProgressSkills}>
              <Ionicons name="ribbon-outline" size={20} color={C.red} />
              <Text style={styles.tileTitle}>Skills</Text>
              <Text style={styles.tileSub}>Levels & badges</Text>
            </Pressable>
          </View>
        ) : null}

        {/* FROM THE ACADEMY */}
        {notices.length > 0 ? (
          <View style={styles.academyWrap}>
            <View style={styles.hlWrapSm}>
              <View style={styles.hlBarSm} />
              <Text style={styles.hlTextSm}>FROM THE ACADEMY</Text>
            </View>
            <View style={styles.academyCard}>
              {notices.map((n, i) => (
                <View key={n.id} style={[styles.noticeRow, i < notices.length - 1 && styles.noticeDivider]}>
                  <Text style={styles.noticeTitle}>{n.title}</Text>
                  {n.description ? <Text style={styles.noticeBody} numberOfLines={3}>{n.description}</Text> : null}
                  <Text style={styles.noticeDate}>{noticeDate(n.date)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.card },
  body: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg },
  flex: { flex: 1 },
  scroll: { padding: 14, paddingBottom: 32, gap: 12 },

  date: { fontSize: 10, fontWeight: "700", color: C.red, letterSpacing: 2.2 },
  hello: { fontSize: 28, fontWeight: "600", color: C.ink, letterSpacing: -0.8, marginTop: 7 },
  // Strap line with a yellow highlighter behind it.
  strapWrap: { alignSelf: "flex-start", position: "relative", marginTop: 8, paddingHorizontal: 2 },
  strapBar: { position: "absolute", left: -2, right: -2, bottom: 1, height: 8, backgroundColor: C.yellow },
  strapText: { position: "relative", fontSize: 14, fontWeight: "500", color: C.ink },

  errorCard: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.redChip, padding: 12, borderRadius: 14 },
  errorText: { color: C.red, fontSize: 13, flex: 1 },

  // Stat cards
  statRow: { flexDirection: "row", gap: 12 },
  statCard: { flex: 1, backgroundColor: C.card, borderRadius: 20, padding: 16, ...cardShadow },
  statYellow: { flex: 1, backgroundColor: C.yellow, borderRadius: 20, padding: 16, ...cardShadow },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statLabel: { fontSize: 9, fontWeight: "700", color: C.textDim, letterSpacing: 1.8 },
  statLabelDark: { fontSize: 9, fontWeight: "700", color: C.ink, letterSpacing: 1.8 },
  statNum: { fontSize: 30, fontWeight: "800", color: C.ink, letterSpacing: -1, marginTop: 8 },
  statNumDark: { fontSize: 24, color: C.ink },
  statSub: { fontSize: 11, color: C.textDim, marginTop: 5 },
  statSubYellow: { fontSize: 11, color: C.yellowText, marginTop: 5 },

  emptyCard: { backgroundColor: C.card, borderRadius: 20, padding: 20, alignItems: "center", gap: 8, ...cardShadow },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: C.ink },
  emptyText: { fontSize: 13, color: C.textDim, textAlign: "center", lineHeight: 19 },

  // "MY CHILDREN" highlighter label
  hlWrap: { alignSelf: "flex-start", position: "relative", marginTop: 8, paddingHorizontal: 3 },
  hlBar: { position: "absolute", left: -3, right: -3, bottom: 1, height: 8, backgroundColor: C.yellow },
  hlText: { fontSize: 11, fontWeight: "700", color: C.ink, letterSpacing: 2 },

  // Child card
  childCard: { backgroundColor: C.card, borderRadius: 22, padding: 18, ...cardShadowLg },
  pressed: { opacity: 0.92 },
  childHead: { flexDirection: "row", alignItems: "center", gap: 13 },
  avatar: { width: 52, height: 52, borderRadius: 17, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImg: { width: "100%", height: "100%" },
  avatarInitial: { fontSize: 21, fontWeight: "700", color: "#FFFFFF" },
  childName: { fontSize: 18, fontWeight: "600", color: C.ink, letterSpacing: -0.3 },
  tagRow: { flexDirection: "row", gap: 6, marginTop: 6 },
  tagBlue: { backgroundColor: C.blue, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  tagBlueText: { color: "#FFFFFF", fontSize: 9, fontWeight: "700", letterSpacing: 1.2 },
  tagGrey: { backgroundColor: C.greyChip, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  tagGreyText: { color: C.textDim, fontSize: 9, fontWeight: "700", letterSpacing: 1.2 },
  progBlock: { backgroundColor: C.cardAlt, borderRadius: 14, padding: 13, marginTop: 14 },
  progRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  progDot: { width: 8, height: 8, borderRadius: 4 },
  progName: { flex: 1, fontSize: 14, fontWeight: "500", color: C.ink },
  leftPill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  leftPillOk: { backgroundColor: C.greenChip },
  leftPillLow: { backgroundColor: C.redChip },
  leftPillText: { fontSize: 11, fontWeight: "700" },
  progNext: { fontSize: 12, color: C.textDim, marginTop: 6, paddingLeft: 16 },
  noProgram: { fontSize: 13, color: C.textMute, fontStyle: "italic" },

  // Payment-required maroon panel
  payPanel: { backgroundColor: C.ink, borderRadius: 22, padding: 18, marginTop: 2 },
  payHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  payDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.yellow },
  payHeadText: { fontSize: 10, fontWeight: "700", color: C.yellow, letterSpacing: 2.2 },
  payBody: { fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 9, lineHeight: 21 },
  payBtn: { backgroundColor: C.red, borderRadius: 12, minHeight: 46, alignItems: "center", justifyContent: "center", marginTop: 14 },
  payBtnText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700", letterSpacing: 1.6 },

  // NEXT CLASS maroon panel
  nextPanel: { backgroundColor: C.ink, borderRadius: 20, padding: 18 },
  nextWhen: { fontSize: 19, fontWeight: "600", color: "#FFFFFF", letterSpacing: -0.3, marginTop: 10 },
  nextWhat: { fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 5 },
  nextBtns: { flexDirection: "row", gap: 9, marginTop: 15 },
  nextGhost: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: "rgba(255,255,255,0.35)", borderRadius: 12, alignItems: "center", justifyContent: "center" },
  nextGhostText: { color: "#FFFFFF", fontSize: 10, fontWeight: "700", letterSpacing: 1.4 },
  nextYellow: { flex: 1, minHeight: 44, backgroundColor: C.yellow, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  nextYellowText: { color: C.ink, fontSize: 10, fontWeight: "700", letterSpacing: 1.4 },

  // Gallery + Skills tiles
  tileRow: { flexDirection: "row", gap: 11 },
  tile: { flex: 1, backgroundColor: C.card, borderRadius: 18, padding: 15, ...cardShadow },
  tileTitle: { fontSize: 14, fontWeight: "600", color: C.ink, marginTop: 10 },
  tileSub: { fontSize: 11, color: C.textDim, marginTop: 3 },

  // FROM THE ACADEMY
  academyWrap: { gap: 11, marginTop: 6 },
  hlWrapSm: { alignSelf: "flex-start", position: "relative", paddingHorizontal: 3 },
  hlBarSm: { position: "absolute", left: 0, right: 0, bottom: 1, height: 7, backgroundColor: C.yellow },
  hlTextSm: { position: "relative", fontSize: 10, fontWeight: "700", color: C.ink, letterSpacing: 2.4 },
  academyCard: { backgroundColor: C.card, borderRadius: 18, overflow: "hidden", ...cardShadow },
  noticeRow: { padding: 15 },
  noticeDivider: { borderBottomWidth: 1, borderBottomColor: C.borderFaint } as object,
  noticeTitle: { fontSize: 14, fontWeight: "600", color: C.ink },
  noticeBody: { fontSize: 12, color: C.textDim, marginTop: 6, lineHeight: 19 },
  noticeDate: { fontSize: 10, color: "#8A8085", marginTop: 9, letterSpacing: 1 },
});
