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

type ParentRow = {
  id: string;
  name: string;
};

type ProgramInfo = {
  name: string;
  remaining: number;
  nextClass: string | null; // yyyy-mm-dd
  startTime: string | null; // HH:mm
  duration: number | null; // minutes (for dismissal time)
};

// Fixed cheerful colour per child (by order) — matches the Schedule tab.
const CHILD_PALETTE = ["#2563EB", "#F97316", "#7C3AED", "#0D9488", "#DB2777", "#CA8A04"];
const childColorAt = (i: number) => CHILD_PALETTE[i % CHILD_PALETTE.length];

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  return h * 60 + (m || 0);
}
function fmtTime12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  const period = h < 12 ? "AM" : "PM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${period}`;
}
function minToLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return fmtTime12(`${h}:${String(m).padStart(2, "0")}`);
}

type ChildSummary = {
  studentId: string;
  studentName: string;
  photo: string | null;
  level: number;
  programs: ProgramInfo[];
};

const WEEKDAYS_FULL = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

// Parse an enrollment's weekday schedule (schedule JSON or day_of_week JSON).
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
    } catch {
      /* ignore */
    }
  }
  if (days.length === 0 && dayOfWeekRaw) {
    try {
      const parsed = JSON.parse(dayOfWeekRaw);
      if (Array.isArray(parsed)) days = parsed.map((d: string) => String(d).toLowerCase());
    } catch {
      /* ignore */
    }
  }
  return { days, time };
}

// Next date (today or later) that matches one of the scheduled weekdays.
function nextClassDate(days: string[]): string | null {
  if (!days.length) return null;
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  for (let i = 0; i <= 7; i++) {
    const d = new Date(t);
    d.setDate(d.getDate() + i);
    if (days.includes(WEEKDAYS_FULL[d.getDay()])) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${dd}`;
    }
  }
  return null;
}

function fmtClassDate(ymd: string, time: string | null): string {
  const d = new Date(ymd + "T00:00:00");
  const dateStr = d.toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short" });
  if (!time) return dateStr;
  const [h, m] = time.split(":").map((n) => parseInt(n, 10));
  const period = h < 12 ? "AM" : "PM";
  return `${dateStr} · ${h % 12 || 12}:${String(m).padStart(2, "0")} ${period}`;
}

type HomeData = {
  parent: ParentRow | null;
  children: ChildSummary[];
  totalSessions: number; // family-wide sessions_remaining (can be negative)
  unpaidCount: number; // number of pending payment bills
  unpaidAmount: number; // total RM outstanding
  latestUnpaidId: string | null; // newest pending bill → tap-to-pay deep link
};

function formatRM(amount: number): string {
  return `RM${amount.toFixed(2)}`;
}

type SmartClass = { childName: string; studentId: string; program: string; startMin: number; endMin: number; color: string };
type Smart =
  | { mode: "during"; focus: SmartClass; count: number }
  | { mode: "rush" | "prep"; focus: SmartClass; count: number; minsToStart: number; more: number };

// Time-sensitive banner. Prep (warm, > ~1h away), Rush (urgent, < 60m), During
// (reassuring, class in progress). Colour accent = the focus child.
function SmartBanner({ smart, onOpenSchedule }: { smart: Smart; onOpenSchedule: () => void }) {
  const nick = useNicknames();
  const { focus } = smart;
  const first = nick.label(focus.studentId, focus.childName);

  if (smart.mode === "during") {
    return (
      <View style={[styles.smart, styles.smartDuring]}>
        <View style={styles.smartRow}>
          <Text style={styles.smartEmoji}>🧩</Text>
          <View style={styles.flex}>
            <Text style={styles.smartDuringTitle}>{first} is happily building…</Text>
            <Text style={styles.smartDuringSub}>{focus.program} · expected dismissal at {minToLabel(focus.endMin)}</Text>
          </View>
        </View>
        <Pressable style={({ pressed }) => [styles.smartGhostBtn, pressed && styles.cardPressed]} onPress={onOpenSchedule}>
          <Ionicons name="time-outline" size={16} color="#065F46" />
          <Text style={styles.smartGhostText}>Pickup reminder</Text>
        </Pressable>
      </View>
    );
  }

  if (smart.mode === "rush") {
    return (
      <View style={[styles.smart, styles.smartRush, { borderLeftColor: focus.color }]}>
        <View style={styles.smartRow}>
          <View style={[styles.smartDot, { backgroundColor: focus.color }]} />
          <Text style={styles.smartRushName}>🤖 {focus.childName}</Text>
          <View style={styles.smartRushPill}>
            <Text style={styles.smartRushPillText}>in {smart.minsToStart} min</Text>
          </View>
        </View>
        <Text style={styles.smartRushBig}>{focus.program}</Text>
        <Text style={styles.smartRushTime}>🕒 {minToLabel(focus.startMin)} – {minToLabel(focus.endMin)}</Text>
        <Pressable style={({ pressed }) => [styles.smartRushBtn, pressed && styles.cardPressed]} onPress={onOpenSchedule}>
          <Ionicons name="navigate" size={16} color="#FFFFFF" />
          <Text style={styles.smartRushBtnText}>View schedule</Text>
        </Pressable>
      </View>
    );
  }

  // prep
  return (
    <View style={[styles.smart, styles.smartPrep]}>
      <View style={styles.smartRow}>
        <Text style={styles.smartEmoji}>🤖</Text>
        <View style={styles.flex}>
          <Text style={styles.smartPrepTitle}>
            {smart.count} robotics {smart.count === 1 ? "class" : "classes"} scheduled today
          </Text>
          <Text style={styles.smartPrepSub}>
            Next up: <Text style={{ color: focus.color, fontWeight: "800" }}>{first}</Text> · starts at {minToLabel(focus.startMin)}
            {smart.more > 0 ? ` · +${smart.more} more` : ""}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { user } = useAuth();
  const userId = user?.id;
  const router = useRouter();
  const nick = useNicknames();

  const fetchHome = async (): Promise<HomeData> => {
    const { data: parentRow, error: parentErr } = await supabase
      .from("parents")
      .select("id, name")
      .eq("auth_id", userId!)
      .is("deleted_at", null)
      .maybeSingle();
    if (parentErr) throw parentErr;

    if (!parentRow) {
      return { parent: null, children: [], totalSessions: 0, unpaidCount: 0, unpaidAmount: 0, latestUnpaidId: null };
    }

    const { data: links, error: linksErr } = await supabase
      .from("parent_students")
      .select(`
        student:students!inner(
          id,
          name,
          photo,
          level,
          adcoin_balance,
          deleted_at,
          enrollments(
            status,
            sessions_remaining,
            day_of_week,
            start_time,
            schedule,
            package_id,
            created_at,
            deleted_at,
            course:courses(name),
            package:course_pricing(duration)
          )
        )
      `)
      .eq("parent_id", parentRow.id);
    if (linksErr) throw linksErr;

    const rows: ChildSummary[] = (links ?? [])
      .map((l) => l.student as unknown as {
        id: string;
        name: string;
        photo: string | null;
        level: number;
        deleted_at: string | null;
        enrollments: Array<{
          status: string;
          sessions_remaining: number;
          day_of_week: string | null;
          start_time: string | null;
          schedule: string | null;
          package_id: string | null;
          created_at: string;
          deleted_at: string | null;
          course: { name: string } | null;
          package: { duration: number } | null;
        }>;
      })
      .filter((s) => s && !s.deleted_at)
      .map((s) => {
        // All active enrollments, newest first, one entry per program (course).
        const actives = (s.enrollments ?? [])
          .filter((e) => !e.deleted_at && e.status === "active")
          .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
        const seen = new Set<string>();
        const programs: ProgramInfo[] = [];
        for (const e of actives) {
          const name = e.course?.name ?? "Program";
          if (seen.has(name)) continue;
          seen.add(name);
          const { days, time } = parseScheduleDays(e.schedule, e.day_of_week);
          programs.push({
            name,
            remaining: Number(e.sessions_remaining ?? 0),
            nextClass: nextClassDate(days),
            startTime: e.start_time ?? time,
            duration: e.package?.duration != null ? Number(e.package.duration) : null,
          });
        }
        return {
          studentId: s.id,
          studentName: s.name,
          photo: s.photo,
          level: s.level,
          programs,
        };
      });

    // Family session balance = sum of every child's per-program remaining
    // (already deduped per course above). Negative = over-used / owing.
    const totalSessions = rows.reduce(
      (sum, c) => sum + c.programs.reduce((s, p) => s + p.remaining, 0),
      0,
    );

    // Outstanding bills → the "pay now" action. One row per bill already
    // (pooled sibling bills carry one owning student_id), so no double-count.
    const studentIds = rows.map((r) => r.studentId);
    let unpaidCount = 0;
    let unpaidAmount = 0;
    let latestUnpaidId: string | null = null;
    if (studentIds.length) {
      const { data: pays } = await supabase
        .from("payments")
        .select("id, amount, status, student_id, created_at")
        .in("student_id", studentIds)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      const seen = new Set<string>();
      for (const p of pays ?? []) {
        const id = p.id as string;
        if (seen.has(id)) continue;
        seen.add(id);
        if (!latestUnpaidId) latestUnpaidId = id; // first = newest (ordered desc)
        unpaidCount += 1;
        unpaidAmount += Number(p.amount ?? 0);
      }
    }

    return { parent: parentRow as ParentRow, children: rows, totalSessions, unpaidCount, unpaidAmount, latestUnpaidId };
  };

  const { data, loading, refreshing, error, isStale, updatedAt, refetch } = useCachedQuery<HomeData>(
    `home:${userId ?? "anon"}`,
    fetchHome,
    { enabled: !!userId },
  );

  const parent = data?.parent ?? null;
  const children = data?.children ?? [];
  // Null-safe: pre-existing cached HomeData won't carry these fields yet.
  const totalSessions = data?.totalSessions ?? 0;
  const unpaidCount = data?.unpaidCount ?? 0;
  const unpaidAmount = data?.unpaidAmount ?? 0;
  const latestUnpaidId = data?.latestUnpaidId ?? null;
  // Only a hard failure with nothing cached to fall back on.
  const errorMessage =
    error && !data ? "Couldn't load your dashboard. Check your connection and pull down to refresh." : null;
  const firstName = parent?.name?.split(" ")[0] ?? "";

  // ── Smart dashboard: what does the parent need RIGHT NOW? ──
  // Collect today's classes (per child/program) with start/end minutes, then pick
  // the most time-sensitive state: During > Rush (<60m) > Prep (later today).
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const todaysClasses = children.flatMap((c, ci) =>
    c.programs
      .filter((p) => p.nextClass === todayKey && p.startTime)
      .map((p) => {
        const startMin = toMin(p.startTime!);
        return { childName: c.studentName, studentId: c.studentId, program: p.name, startMin, endMin: startMin + (p.duration && p.duration > 0 ? p.duration : 90), color: nick.color(c.studentId) ?? childColorAt(ci) };
      }),
  );
  const during = todaysClasses.find((c) => nowMin >= c.startMin && nowMin < c.endMin) ?? null;
  const upcoming = todaysClasses.filter((c) => c.startMin > nowMin).sort((a, b) => a.startMin - b.startMin);
  const smart = during
    ? { mode: "during" as const, focus: during, count: todaysClasses.length }
    : upcoming[0]
      ? { mode: upcoming[0].startMin - nowMin <= 60 ? ("rush" as const) : ("prep" as const), focus: upcoming[0], count: todaysClasses.length, minsToStart: upcoming[0].startMin - nowMin, more: upcoming.length - 1 }
      : null;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <TopBar showLogo />
        <View style={styles.center}>
          <ActivityIndicator color="#615DFA" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.heroBg}>
        <View style={styles.heroOrb} />
        <View style={styles.heroOrb2} />
      </View>
      <TopBar showLogo />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor="#615DFA" />
        }
      >
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>
            {new Date().toLocaleDateString("en-MY", { weekday: "long", day: "numeric", month: "long" })}
          </Text>
          <Text style={styles.heroTitle}>Hello{firstName ? `, ${firstName}` : ""}</Text>
          <Text style={styles.heroSub}>
            {children.length === 0
              ? "No children enrolled yet"
              : `Tracking ${children.length} ${children.length === 1 ? "child" : "children"} today`}
          </Text>
        </View>

        {smart ? (
          <SmartBanner smart={smart} onOpenSchedule={() => router.push("/(tabs)/schedule")} />
        ) : null}

        {parent && children.length > 0 ? (
          <View style={styles.summaryRow}>
            {/* Sessions balance — info only. Red when used up / owing. */}
            <TourTarget name="sessions" style={styles.flex}>
              <View style={styles.sumTile}>
                <Text style={styles.sumLabel}>Sessions left</Text>
                <Text style={[styles.sumValue, totalSessions <= 0 && styles.sumValueNeg]}>{totalSessions}</Text>
                <Text style={styles.sumSub}>
                  {totalSessions < 0
                    ? "Owing sessions"
                    : totalSessions === 0
                      ? "None left"
                      : `across ${children.length} ${children.length === 1 ? "child" : "children"}`}
                </Text>
              </View>
            </TourTarget>

            {/* Unpaid — the action. Tap to jump to Payments. */}
            <Pressable
              style={({ pressed }) => [
                styles.sumTile,
                unpaidCount > 0 ? styles.sumTileAlert : styles.sumTilePaid,
                pressed && styles.cardPressed,
              ]}
              onPress={() => router.push(unpaidCount > 0 && latestUnpaidId ? (`/payment/${latestUnpaidId}` as Href) : "/(tabs)/payment")}
            >
              <View style={styles.sumTileHead}>
                <Text style={[styles.sumLabel, unpaidCount > 0 ? styles.sumLabelAlert : styles.sumLabelPaid]}>
                  {unpaidCount > 0 ? "Unpaid" : "Payments"}
                </Text>
                <Ionicons
                  name={unpaidCount > 0 ? "chevron-forward" : "checkmark-circle"}
                  size={14}
                  color={unpaidCount > 0 ? "#92400E" : "#065F46"}
                />
              </View>
              <Text style={[styles.sumValue, unpaidCount > 0 ? styles.sumValueAlert : styles.sumValuePaid]}>
                {unpaidCount > 0 ? formatRM(unpaidAmount) : "All paid"}
              </Text>
              <Text style={[styles.sumSub, unpaidCount > 0 ? styles.sumSubAlert : styles.sumSubPaid]}>
                {unpaidCount > 0 ? `${unpaidCount} to pay · Tap to pay` : "You're up to date"}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {isStale ? <OfflineBanner updatedAt={updatedAt} /> : null}

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={16} color="#B91C1C" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {!parent && !errorMessage ? (
          <View style={styles.emptyCard}>
            <Ionicons name="person-outline" size={28} color="#615DFA" />
            <Text style={styles.emptyTitle}>No parent record</Text>
            <Text style={styles.emptyText}>
              This account isn&apos;t linked to a parent record yet. Contact your branch admin to complete setup.
            </Text>
          </View>
        ) : null}

        {children.length > 0 ? (
          <Text style={styles.sectionLabel}>My children</Text>
        ) : null}

        {children.map((c) => (
          <Pressable
            key={c.studentId}
            style={({ pressed }) => [styles.childCard, pressed && styles.cardPressed]}
            onPress={() => router.push({ pathname: "/(tabs)/progress", params: { studentId: c.studentId } })}
          >
            <View style={styles.childTop}>
              <View style={styles.avatarStack}>
                {c.photo ? (
                  <Image source={{ uri: c.photo }} style={styles.childAvatar} />
                ) : (
                  <View style={[styles.childAvatar, styles.childAvatarFallback]}>
                    <Text style={styles.childAvatarInitial}>{c.studentName.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={styles.levelBadge}>
                  <Text style={styles.levelBadgeText}>Lv {c.level}</Text>
                </View>
              </View>
              <View style={styles.childInfo}>
                <Text style={styles.childName} numberOfLines={1}>{nick.raw(c.studentId) ?? c.studentName}</Text>
                {nick.raw(c.studentId) ? <Text style={styles.childRealName} numberOfLines={1}>{c.studentName}</Text> : null}
                <View style={styles.programChip}>
                  <View style={styles.programDot} />
                  <Text style={styles.childProgram} numberOfLines={1}>
                    {c.programs.length === 0
                      ? "No active program"
                      : `${c.programs.length} program${c.programs.length === 1 ? "" : "s"}`}
                  </Text>
                </View>
              </View>
              <View style={styles.chevronWrap}>
                <Ionicons name="chevron-forward" size={18} color="#615DFA" />
              </View>
            </View>

            {c.programs.length === 0 ? (
              <Text style={styles.noProgram}>No active program</Text>
            ) : (
              <View style={styles.programsList}>
                {c.programs.map((pr) => {
                  const ok = pr.remaining > 0;
                  return (
                    <View key={pr.name} style={styles.progBlock}>
                      <View style={styles.progTopRow}>
                        <View style={styles.progDot} />
                        <Text style={styles.progName} numberOfLines={1}>{pr.name}</Text>
                        <View style={[styles.usedPill, ok ? styles.sessOk : styles.sessLow]}>
                          <Ionicons name={ok ? "checkmark-circle" : "alert-circle"} size={12} color={ok ? "#065F46" : "#991B1B"} />
                          <Text style={[styles.usedText, { color: ok ? "#065F46" : "#991B1B" }]}>{pr.remaining} left</Text>
                        </View>
                      </View>
                      <View style={styles.nextClassRow}>
                        <Ionicons name="calendar-outline" size={13} color="#615DFA" />
                        <Text style={styles.nextClassText}>
                          {pr.nextClass ? `Next class ${fmtClassDate(pr.nextClass, pr.startTime)}` : "No upcoming class"}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </Pressable>
        ))}

        {children.length > 0 ? (
          <View style={styles.tipCard}>
            <View style={styles.tipIcon}>
              <Ionicons name="sparkles" size={16} color="#615DFA" />
            </View>
            <Text style={styles.tipText}>Tap any child to see attendance, projects and certifications.</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F6FB" },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  // Smart dashboard banner
  smart: { borderRadius: 18, padding: 16, gap: 10 },
  smartRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  smartEmoji: { fontSize: 24 },
  smartDot: { width: 10, height: 10, borderRadius: 5 },
  smartPrep: { backgroundColor: "#EEF2FF", borderWidth: 1, borderColor: "#C7D2FE" },
  smartPrepTitle: { fontSize: 15, fontWeight: "800", color: "#3730A3" },
  smartPrepSub: { fontSize: 13, color: "#4338CA", marginTop: 2 },
  smartRush: { backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FDBA74", borderLeftWidth: 5 },
  smartRushName: { flex: 1, fontSize: 15, fontWeight: "800", color: "#7C2D12" },
  smartRushPill: { backgroundColor: "#EA580C", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  smartRushPillText: { fontSize: 12, fontWeight: "800", color: "#FFFFFF" },
  smartRushBig: { fontSize: 20, fontWeight: "800", color: "#0F172A", letterSpacing: -0.4 },
  smartRushTime: { fontSize: 14, fontWeight: "600", color: "#9A3412" },
  smartRushBtn: { marginTop: 2, height: 46, borderRadius: 12, backgroundColor: "#EA580C", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  smartRushBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  smartDuring: { backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#BBF7D0" },
  smartDuringTitle: { fontSize: 15, fontWeight: "800", color: "#065F46" },
  smartDuringSub: { fontSize: 13, color: "#047857", marginTop: 2 },
  smartGhostBtn: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#DCFCE7", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  smartGhostText: { color: "#065F46", fontSize: 13, fontWeight: "800" },
  heroBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 320,
    overflow: "hidden",
  },
  heroOrb: {
    position: "absolute",
    top: -80,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "#615DFA",
    opacity: 0.12,
  },
  heroOrb2: {
    position: "absolute",
    top: 40,
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#23D2E2",
    opacity: 0.1,
  },
  scroll: { padding: 16, gap: 12, paddingBottom: 32 },
  hero: { paddingHorizontal: 4, paddingTop: 4, paddingBottom: 8 },
  heroEyebrow: { fontSize: 11, fontWeight: "700", color: "#615DFA", textTransform: "uppercase", letterSpacing: 1 },
  heroTitle: { fontSize: 28, fontWeight: "800", color: "#0F172A", marginTop: 6, letterSpacing: -0.6 },
  heroSub: { fontSize: 14, color: "#6B7280", marginTop: 4 },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: "#6B7280", textTransform: "uppercase", letterSpacing: 1, marginTop: 4, paddingHorizontal: 4 },
  summaryRow: { flexDirection: "row", gap: 12 },
  sumTile: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    gap: 3,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sumTileAlert: { backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A" },
  sumTilePaid: { backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#BBF7D0" },
  sumTileHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sumLabel: { fontSize: 10, fontWeight: "800", color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.8 },
  sumLabelAlert: { color: "#92400E" },
  sumLabelPaid: { color: "#065F46" },
  sumValue: { fontSize: 26, fontWeight: "800", color: "#0F172A", letterSpacing: -0.6, marginTop: 2 },
  sumValueNeg: { color: "#DC2626" },
  sumValueAlert: { color: "#B45309", fontSize: 22 },
  sumValuePaid: { color: "#047857", fontSize: 22 },
  sumSub: { fontSize: 11, color: "#9CA3AF", fontWeight: "600" },
  sumSubAlert: { color: "#B45309" },
  sumSubPaid: { color: "#059669" },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    padding: 14,
    borderRadius: 12,
  },
  errorText: { color: "#991B1B", fontSize: 13, flex: 1 },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  emptyText: { fontSize: 13, color: "#6B7280", textAlign: "center", lineHeight: 19 },
  childCard: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 20,
    gap: 14,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardPressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  noProgram: { fontSize: 13, color: "#9CA3AF", fontStyle: "italic" },
  programsList: { gap: 10, marginTop: 2 },
  progBlock: { backgroundColor: "#F9FAFB", borderRadius: 12, padding: 12, gap: 6, borderWidth: 1, borderColor: "#F3F4F6" },
  progTopRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  progDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#615DFA" },
  progName: { flex: 1, fontSize: 14, fontWeight: "700", color: "#111827" },
  usedPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  usedText: { fontSize: 12, fontWeight: "800" },
  sessOk: { backgroundColor: "#D1FAE5" },
  sessLow: { backgroundColor: "#FEE2E2" },
  nextClassRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 16 },
  nextClassText: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
  childTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatarStack: { position: "relative", width: 56, height: 56 },
  childAvatar: { width: 56, height: 56, borderRadius: 18, backgroundColor: "#F3F4F6" },
  childAvatarFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#615DFA",
  },
  childAvatarInitial: { color: "#FFFFFF", fontSize: 22, fontWeight: "800" },
  levelBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: "#0F172A",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  levelBadgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  childInfo: { flex: 1, gap: 6 },
  childName: { fontSize: 18, fontWeight: "800", color: "#0F172A", letterSpacing: -0.3 },
  childRealName: { fontSize: 12, color: "#9CA3AF", fontWeight: "600", marginTop: 1 },
  programChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  programDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#615DFA" },
  childProgram: { fontSize: 12, color: "#4338CA", fontWeight: "700", maxWidth: 160 },
  chevronWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  metricsRow: { flexDirection: "row", gap: 8 },
  metric: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  metricAccent: {
    backgroundColor: "#615DFA",
    borderColor: "#615DFA",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metricIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  metricLabel: { fontSize: 9, color: "#6B7280", textTransform: "uppercase", fontWeight: "800", letterSpacing: 0.6 },
  metricValue: { fontSize: 18, fontWeight: "800", color: "#0F172A", marginTop: 2 },
  metricValueLight: { fontSize: 16, fontWeight: "800", color: "#FFFFFF", marginTop: 1 },
  progressBlock: { gap: 8 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressBarBg: { height: 8, backgroundColor: "#F3F4F6", borderRadius: 4, overflow: "hidden" },
  progressBarFill: { height: "100%", backgroundColor: "#615DFA", borderRadius: 4 },
  progressLabel: { fontSize: 11, color: "#6B7280", fontWeight: "600" },
  progressRemaining: { fontSize: 11, color: "#615DFA", fontWeight: "800" },
  tipCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  tipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  tipText: { flex: 1, fontSize: 12, color: "#6B7280", fontWeight: "500", lineHeight: 16 },
});
