import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRole } from "@/contexts/role";
import { supabase } from "@/lib/supabase";
import { TeacherTopBar } from "@/components/TeacherTopBar";
import { SwipeBackView } from "@/components/SwipeBackView";

const ROBOTICS = new Set(["ev3", "microbit", "advasbot"]);
const done = (s: string | null | undefined) => !!s && s !== "not_done";
const CAPWORD = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : s);
// A lesson title's coordinate = its first token when it looks like "EV3-1"; else
// it's a free-typed ("own write") lesson with no catalog coordinate.
const coordOf = (title: string): string | null => { const t = (title || "").trim().split(/\s+/)[0]; return /^\w+-[\w-]+$/.test(t) ? t : null; };
// The single highest thing the student achieved on a lesson (M3>M2>M1>Challenge>
// Homework); null when they only "learnt" it — we don't show a plain "Learnt" badge.
function topBadge(l: { m3: boolean; m2: boolean; m1: boolean; challenge: boolean; homework: boolean }): string | null {
  return l.m3 ? "M3" : l.m2 ? "M2" : l.m1 ? "M1" : l.challenge ? "Challenge" : l.homework ? "Homework" : null;
}

type Student = { id: string; name: string; code: string | null; photo: string | null; level: number | null };
type LessonCell = { coordinate: string; title: string; level: number | null; learnt: boolean; m1: boolean; m2: boolean; m3: boolean; challenge: boolean; homework: boolean; remark: string | null; sessionNotes: string[]; date: string | null };
type ActRow = { date: string | null; notes: string | null; activities: { lesson?: string; learnt?: boolean; m1?: boolean; m2?: boolean; m3?: boolean }[] | null };
type LevelGroup = { level: number | null; lessons: LessonCell[] };
type CourseProgress = { name: string; catalog: string; robotics: boolean; sessions: number; levels: LevelGroup[]; learnt: number; total: number };
type Cert = { id: string; course: string; grade: string | null; code: string | null; date: string | null };
type Exam = { id: string; title: string; status: string; score: number | null; result: string | null; date: string | null };
type Progress = { courses: CourseProgress[]; certs: Cert[]; exams: Exam[]; totalLessons: number; totalLearnt: number };

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" }); } catch { return iso; }
}
// Compact date beside a lesson (attendance YYYY-MM-DD → "5 Jul '26").
function fmtShort(ymd: string | null): string {
  if (!ymd) return "";
  try { const d = new Date(ymd + "T00:00:00"); return `${d.getDate()} ${d.toLocaleDateString("en-MY", { month: "short" })} '${String(d.getFullYear()).slice(-2)}`; } catch { return ymd; }
}

// From attendance rows: attendance comments keyed to the catalog lesson taught that
// session, plus free-typed ("own write") lessons with their ticks + comments.
function buildFromAttendance(attRows: ActRow[], catalogCoords: Set<string>) {
  const notesByCoord = new Map<string, string[]>();
  const dateByCoord = new Map<string, string>(); // latest attendance date the lesson was taught
  const typed = new Map<string, { learnt: boolean; m1: boolean; m2: boolean; m3: boolean; notes: string[]; date: string | null }>();
  const later = (a: string | null, b: string | null) => (!a ? b : !b ? a : a > b ? a : b);
  for (const a of attRows ?? []) {
    const note = (a.notes ?? "").trim();
    const d = a.date ?? null;
    for (const act of a.activities ?? []) {
      const title = act.lesson; if (!title) continue;
      const coord = coordOf(title);
      if (coord && catalogCoords.has(coord)) {
        if (note) { const arr = notesByCoord.get(coord) ?? []; if (!arr.includes(note)) arr.push(note); notesByCoord.set(coord, arr); }
        if (d) { const cur = dateByCoord.get(coord) ?? null; const best = later(cur, d); if (best) dateByCoord.set(coord, best); }
      } else {
        const cur = typed.get(title) ?? { learnt: false, m1: false, m2: false, m3: false, notes: [], date: null };
        cur.learnt = cur.learnt || (act.learnt === undefined ? true : !!act.learnt);
        cur.m1 = cur.m1 || !!act.m1; cur.m2 = cur.m2 || !!act.m2; cur.m3 = cur.m3 || !!act.m3;
        if (note && !cur.notes.includes(note)) cur.notes.push(note);
        cur.date = later(cur.date, d);
        typed.set(title, cur);
      }
    }
  }
  const cells: LessonCell[] = [...typed.entries()].map(([title, t]) => ({
    coordinate: `typed:${title}`, title, level: null, learnt: t.learnt, m1: t.m1, m2: t.m2, m3: t.m3, challenge: false, homework: false, remark: null, sessionNotes: t.notes, date: t.date,
  }));
  const typedCourse: CourseProgress | null = cells.length
    ? { name: "Own-written lessons", catalog: "__typed__", robotics: true, sessions: 0, levels: [{ level: null, lessons: cells }], learnt: cells.filter((c) => c.learnt).length, total: cells.length }
    : null;
  return { notesByCoord, dateByCoord, typedCourse };
}

export default function TeacherProgress() {
  const { staff } = useRole();
  const [students, setStudents] = useState<Student[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Student | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [lessonQuery, setLessonQuery] = useState("");
  const [tab, setTab] = useState<"all" | "done">("all");
  const backToList = () => { setSelected(null); setProgress(null); };

  useEffect(() => {
    if (!staff?.branchId) return;
    (async () => {
      const { data } = await supabase.from("students").select("id, name, student_id, photo, level").eq("branch_id", staff.branchId).is("deleted_at", null).order("name");
      setStudents((data ?? []).map((s) => ({ id: s.id as string, name: (s.name as string) ?? "Student", code: (s.student_id as string | null) ?? null, photo: (s.photo as string | null) ?? null, level: (s.level as number | null) ?? null })));
    })();
  }, [staff?.branchId]);

  const openStudent = useCallback(async (s: Student) => {
    setSelected(s); setProgress(null); setErr(null); setLoading(true); setLessonQuery("");
    try {
      const { data: enrs } = await supabase
        .from("enrollments").select("id, student_id, sessions_remaining, pool_id, pool:shared_session_pools(sessions_remaining), course:courses(name, lesson_catalog)")
        .eq("student_id", s.id).is("deleted_at", null);
      const enrollmentIds = (enrs ?? []).map((e) => (e as { id: string }).id);
      // Pooled enrollments show the student's equal-split share, like the web.
      const poolIds = [...new Set((enrs ?? []).map((e) => (e as { pool_id?: string | null }).pool_id).filter(Boolean) as string[])];
      const order = new Map<string, string[]>();
      if (poolIds.length) {
        const { data: members } = await supabase.from("pool_students").select("pool_id, student_id, joined_at").in("pool_id", poolIds).order("joined_at", { ascending: true });
        for (const m of members ?? []) { const pid = m.pool_id as string; const arr = order.get(pid) ?? []; arr.push(m.student_id as string); order.set(pid, arr); }
      }
      const share = (e: { sessions_remaining?: number | null; pool_id?: string | null; pool?: { sessions_remaining?: number } | null }): number => {
        if (!e.pool_id || !e.pool) return Number(e.sessions_remaining ?? 0);
        const o = order.get(e.pool_id) ?? []; const cnt = o.length || 2; const rem = Number(e.pool.sessions_remaining ?? 0);
        const pos = o.indexOf(s.id); const r = rem >= 0 ? rem % cnt : 0;
        return Math.floor(rem / cnt) + (pos >= 0 && pos < r ? 1 : 0);
      };
      const catInfo = new Map<string, { name: string; sessions: number }>();
      for (const e of enrs ?? []) {
        const c = e.course as unknown as { name: string; lesson_catalog: string | null } | null;
        const cat = c?.lesson_catalog;
        if (!cat) continue;
        const cur = catInfo.get(cat) ?? { name: c?.name ?? cat, sessions: 0 };
        cur.sessions += share(e as unknown as { sessions_remaining?: number; pool_id?: string | null; pool?: { sessions_remaining?: number } | null });
        catInfo.set(cat, cur);
      }
      // Attendance log (present/absent notes + free-typed lessons) — independent of catalog.
      const { data: attRows } = enrollmentIds.length
        ? await supabase.from("attendance").select("date, status, notes, activities").in("enrollment_id", enrollmentIds).order("date", { ascending: false }).limit(120)
        : { data: [] as { date: string | null; status: string; notes: string | null; activities: { lesson?: string }[] | null }[] };

      const catalogs = [...catInfo.keys()];
      if (catalogs.length === 0) {
        // No curriculum, but still surface any typed ("own write") lessons + comments.
        const { typedCourse } = buildFromAttendance((attRows ?? []) as ActRow[], new Set());
        setProgress({ courses: typedCourse ? [typedCourse] : [], certs: [], exams: [], totalLessons: 0, totalLearnt: 0 });
        setLoading(false); return;
      }

      const [{ data: lessons }, { data: lp }, { data: remarks }, { data: certs }, { data: attempts }] = await Promise.all([
        supabase.from("lessons").select("course_code, coordinate, title, level, position").in("course_code", catalogs).order("level", { ascending: true, nullsFirst: false }).order("position", { ascending: true, nullsFirst: false }),
        supabase.from("lesson_progress").select("lesson_coordinate, learnt_status, mission1_status, mission2_status, mission3_status, challenge_status, homework_status").eq("student_id", s.id),
        supabase.from("lesson_remarks").select("lesson_coordinate, note").eq("student_id", s.id),
        supabase.from("certificates").select("id, course_name, grade, code, date_issued").eq("student_id", s.id).order("date_issued", { ascending: false }),
        supabase.from("assessment_attempts").select("id, status, final_score, submitted_at, marked_at, assessment:assessments(title, course, level, total_marks, pass_pct, distinction_pct)").eq("student_id", s.id),
      ]);

      const lpMap = new Map((lp ?? []).map((r) => [r.lesson_coordinate as string, r]));
      const rmMap = new Map((remarks ?? []).map((r) => [r.lesson_coordinate as string, (r.note as string | null) ?? null]));
      const catalogCoords = new Set((lessons ?? []).map((l) => l.coordinate as string));
      const { notesByCoord, dateByCoord, typedCourse } = buildFromAttendance((attRows ?? []) as ActRow[], catalogCoords);

      const byCatalog = new Map<string, LessonCell[]>();
      for (const l of lessons ?? []) {
        const p = lpMap.get(l.coordinate as string);
        const cell: LessonCell = {
          coordinate: l.coordinate as string,
          title: l.coordinate ? `${l.coordinate} ${l.title ?? ""}`.trim() : ((l.title as string) ?? ""),
          level: (l.level as number | null) ?? null,
          learnt: done(p?.learnt_status as string | null), m1: done(p?.mission1_status as string | null), m2: done(p?.mission2_status as string | null), m3: done(p?.mission3_status as string | null),
          challenge: done(p?.challenge_status as string | null), homework: done(p?.homework_status as string | null),
          remark: rmMap.get(l.coordinate as string) ?? null,
          sessionNotes: notesByCoord.get(l.coordinate as string) ?? [],
          date: dateByCoord.get(l.coordinate as string) ?? null,
        };
        const arr = byCatalog.get(l.course_code as string) ?? [];
        arr.push(cell);
        byCatalog.set(l.course_code as string, arr);
      }

      let totalLessons = 0, totalLearnt = 0;
      const courses: CourseProgress[] = catalogs.map((cat) => {
        const cells = byCatalog.get(cat) ?? [];
        const levels: LevelGroup[] = [];
        for (const c of cells) {
          let g = levels.find((x) => x.level === c.level);
          if (!g) { g = { level: c.level, lessons: [] }; levels.push(g); }
          g.lessons.push(c);
        }
        levels.sort((a, b) => (a.level ?? 999) - (b.level ?? 999));
        const learnt = cells.filter((c) => c.learnt).length;
        totalLessons += cells.length; totalLearnt += learnt;
        const info = catInfo.get(cat)!;
        return { name: info.name, catalog: cat, robotics: ROBOTICS.has(cat.toLowerCase()), sessions: info.sessions, levels, learnt, total: cells.length };
      });

      const exams: Exam[] = (attempts ?? []).map((a) => {
        const asmt = a.assessment as unknown as { title: string | null; course: string | null; level: number | null; total_marks: number | null; pass_pct: number | null; distinction_pct: number | null } | null;
        const score = (a.final_score as number | null) ?? null;
        const date = (a.submitted_at as string | null) ?? (a.marked_at as string | null) ?? null;
        let result: string | null = null;
        if ((a.status as string) === "marked" && score != null) {
          const pct = asmt?.total_marks && score <= asmt.total_marks ? (score / asmt.total_marks) * 100 : score;
          result = asmt?.distinction_pct != null && pct >= asmt.distinction_pct ? "Distinction" : asmt?.pass_pct != null && pct >= asmt.pass_pct ? "Pass" : "Fail";
        }
        const title = asmt?.title || (asmt?.course ? `${asmt.course}${asmt.level != null ? ` · Level ${asmt.level}` : ""}` : "Exam");
        return { id: a.id as string, title, status: (a.status as string) ?? "", score, result, date };
      }).sort((x, y) => (y.date ?? "").localeCompare(x.date ?? ""));

      // Own-written lessons (with their ticks + attendance comments) show as their own course.
      const allCourses = typedCourse ? [...courses, typedCourse] : courses;

      setProgress({
        courses: allCourses,
        certs: (certs ?? []).map((c) => ({ id: c.id as string, course: (c.course_name as string) ?? "Certificate", grade: (c.grade as string | null) ?? null, code: (c.code as string | null) ?? null, date: (c.date_issued as string | null) ?? null })),
        exams,
        totalLessons, totalLearnt,
      });
    } catch {
      setErr("Couldn't load this student's progress.");
    }
    setLoading(false);
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => (q ? students.filter((s) => s.name.toLowerCase().includes(q) || (s.code ?? "").toLowerCase().includes(q)) : students), [students, q]);

  if (!selected) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <TeacherTopBar />
        <View style={styles.header}>
          <Text style={styles.title}>Student Progress</Text>
          <Text style={styles.subtitle}>Pick a student to see how they're progressing.</Text>
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color="#9CA3AF" />
            <TextInput style={styles.searchInput} value={query} onChangeText={setQuery} placeholder="Search name or ID…" placeholderTextColor="#9CA3AF" autoCorrect={false} />
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
          {filtered.length === 0 ? <Text style={styles.empty}>No students found.</Text> : filtered.map((s) => (
            <Pressable key={s.id} style={styles.pickRow} onPress={() => openStudent(s)}>
              <Avatar name={s.name} photo={s.photo} />
              <View style={styles.flex}>
                <Text style={styles.pickName} numberOfLines={1}>{s.name}</Text>
                <Text style={styles.pickSub}>{s.code ? `#${s.code}` : ""}{s.level != null ? `${s.code ? " · " : ""}Level ${s.level}` : ""}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </Pressable>
          ))}
          <View style={{ height: 30 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const pct = progress && progress.totalLessons > 0 ? Math.round((progress.totalLearnt / progress.totalLessons) * 100) : 0;
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <SwipeBackView onBack={backToList} style={styles.safe}>
      <TeacherTopBar />
      <View style={styles.detailHead}>
        <Pressable hitSlop={8} onPress={backToList} style={styles.backBtn}><Ionicons name="chevron-back" size={22} color="#0D9488" /></Pressable>
        <Avatar name={selected.name} photo={selected.photo} />
        <View style={styles.flex}>
          <Text style={styles.detailName} numberOfLines={1}>{selected.name}</Text>
          <Text style={styles.pickSub}>{selected.code ? `#${selected.code}` : ""}{selected.level != null ? `${selected.code ? " · " : ""}Level ${selected.level}` : ""}</Text>
        </View>
      </View>

      {loading ? <View style={styles.center}><ActivityIndicator color="#0D9488" /></View>
        : err ? <View style={styles.center}><Text style={styles.err}>{err}</Text></View>
        : !progress ? null : (
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {progress.courses.length ? (
              <View style={styles.lessonSearch}>
                <Ionicons name="search" size={16} color="#9CA3AF" />
                <TextInput style={styles.lessonSearchInput} value={lessonQuery} onChangeText={setLessonQuery} placeholder="Find a lesson — is it done?" placeholderTextColor="#9CA3AF" autoCorrect={false} />
                {lessonQuery ? <Pressable hitSlop={8} onPress={() => setLessonQuery("")}><Ionicons name="close-circle" size={18} color="#CBD5E1" /></Pressable> : null}
              </View>
            ) : null}
            {progress.courses.length ? (
              <View style={styles.tabRow}>
                <Pressable style={[styles.tabBtn, tab === "all" && styles.tabBtnOn]} onPress={() => setTab("all")}><Text style={[styles.tabText, tab === "all" && styles.tabTextOn]}>Full list</Text></Pressable>
                <Pressable style={[styles.tabBtn, tab === "done" && styles.tabBtnOn]} onPress={() => setTab("done")}><Text style={[styles.tabText, tab === "done" && styles.tabTextOn]}>Done ({progress.totalLearnt})</Text></Pressable>
              </View>
            ) : null}

            <View style={styles.summaryCard}>
              <View style={styles.summaryTop}>
                <View style={styles.flex}>
                  <Text style={styles.summaryBig}>{progress.totalLearnt}<Text style={styles.summarySmall}> / {progress.totalLessons}</Text></Text>
                  <Text style={styles.summaryLabel}>lessons learnt</Text>
                </View>
                <View style={styles.summaryStat}><Text style={styles.summaryStatNum}>{progress.certs.length}</Text><Text style={styles.summaryStatLabel}>certificates</Text></View>
              </View>
              <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${pct}%` }]} /></View>
              <Text style={styles.pctText}>{pct}% complete</Text>
            </View>

            {tab === "done" ? (() => {
              // Flat list of learnt lessons across all courses, latest → oldest, each
              // showing only its highest badge. No course / level titles.
              const lq = lessonQuery.trim().toLowerCase();
              const items = progress.courses
                .flatMap((c) => c.levels.flatMap((lv) => lv.lessons))
                .filter((l) => l.learnt && (!lq || l.title.toLowerCase().includes(lq)))
                .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
              if (progress.courses.length === 0) return <Text style={styles.empty}>No curriculum linked to this student's classes.</Text>;
              if (items.length === 0) return <Text style={styles.empty}>{lq ? `No lesson matches “${lessonQuery.trim()}”.` : "No lessons done yet."}</Text>;
              return (
                <View style={styles.courseCard}>
                  {items.map((l) => {
                    const badge = topBadge(l);
                    return (
                      <View key={l.coordinate} style={styles.lessonRow}>
                        <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                        <View style={styles.flex}>
                          <View style={styles.lessonTitleRow}>
                            <Text style={[styles.lessonTitle, styles.flex]} numberOfLines={2}>{l.title}</Text>
                            {l.date ? <Text style={styles.lessonDate}>{fmtShort(l.date)}</Text> : null}
                          </View>
                          {badge ? <View style={styles.pillRow}><Pill label={badge} on /></View> : null}
                          {l.remark ? <Text style={styles.remark} numberOfLines={2}>📝 {l.remark}</Text> : null}
                          {l.sessionNotes.map((n, ni) => <Text key={ni} style={styles.logNote} numberOfLines={4}>💬 {n}</Text>)}
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })() : (() => {
              const lq = lessonQuery.trim().toLowerCase();
              const keep = (l: LessonCell) => (!lq || l.title.toLowerCase().includes(lq));
              const courses = progress.courses
                .map((c) => ({ ...c, levels: c.levels.map((lv) => ({ ...lv, lessons: lv.lessons.filter(keep) })).filter((lv) => lv.lessons.length) }))
                .filter((c) => c.levels.length);
              if (progress.courses.length === 0) return <Text style={styles.empty}>No curriculum linked to this student's classes.</Text>;
              if (courses.length === 0) return <Text style={styles.empty}>{lq ? `No lesson matches “${lessonQuery.trim()}”.` : "No lessons done yet."}</Text>;
              return courses.map((c) => (
              <View key={c.catalog} style={styles.courseCard}>
                <View style={styles.courseHead}>
                  <Text style={styles.courseName} numberOfLines={1}>{c.catalog === "__typed__" ? "✏️ " : c.robotics ? "🤖 " : ""}{c.name}</Text>
                  <Text style={styles.courseMeta}>{c.learnt}/{c.total} · {c.sessions} left</Text>
                </View>
                {c.levels.map((lv) => (
                  <View key={`${c.catalog}-${lv.level}`} style={styles.levelBlock}>
                    <Text style={styles.levelLabel}>{lv.level != null ? `Level ${lv.level}` : "Lessons"} · {lv.lessons.filter((x) => x.learnt).length}/{lv.lessons.length}</Text>
                    {lv.lessons.map((l) => (
                      <View key={l.coordinate} style={styles.lessonRow}>
                        <Ionicons name={l.learnt ? "checkmark-circle" : "ellipse-outline"} size={18} color={l.learnt ? "#16A34A" : "#D1D5DB"} />
                        <View style={styles.flex}>
                          <View style={styles.lessonTitleRow}>
                            <Text style={[styles.lessonTitle, styles.flex, !l.learnt && styles.lessonTitleMuted]} numberOfLines={2}>{l.title}</Text>
                            {l.date ? <Text style={styles.lessonDate}>{fmtShort(l.date)}</Text> : null}
                          </View>
                          <View style={styles.pillRow}>
                            {c.robotics ? (["M1", "M2", "M3"] as const).map((m, i) => <Pill key={m} label={m} on={[l.m1, l.m2, l.m3][i]} />) : null}
                            <Pill label="Challenge" on={l.challenge} />
                            <Pill label="Homework" on={l.homework} />
                          </View>
                          {l.remark ? <Text style={styles.remark} numberOfLines={2}>📝 {l.remark}</Text> : null}
                          {l.sessionNotes.map((n, ni) => <Text key={ni} style={styles.logNote} numberOfLines={4}>💬 {n}</Text>)}
                        </View>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            )); })()}

            {progress.exams.length ? (
              <View style={styles.courseCard}>
                <Text style={styles.courseName}>📝 Exams taken</Text>
                {progress.exams.map((ex) => (
                  <View key={ex.id} style={styles.certRow}>
                    <View style={styles.flex}>
                      <Text style={styles.certCourse} numberOfLines={1}>{ex.title}</Text>
                      <Text style={styles.pickSub}>{fmtDate(ex.date)}{ex.score != null ? ` · Score ${ex.score}` : ""}{ex.status && ex.status !== "marked" ? ` · ${CAPWORD(ex.status)}` : ""}</Text>
                    </View>
                    {ex.result ? <View style={[styles.gradeTag, ex.result === "Fail" ? styles.failTag : ex.result === "Distinction" ? styles.distinctionTag : styles.passTag]}><Text style={[styles.gradeText, ex.result === "Fail" ? styles.failText : ex.result === "Distinction" ? styles.distinctionText : styles.passText]}>{ex.result}</Text></View>
                      : ex.status ? <View style={styles.statusTag}><Text style={styles.statusText}>{CAPWORD(ex.status)}</Text></View> : null}
                  </View>
                ))}
              </View>
            ) : null}

            {tab === "done" && progress.certs.length ? (
              <View style={styles.courseCard}>
                <Text style={styles.courseName}>🏆 Certificates</Text>
                {progress.certs.map((ct) => (
                  <View key={ct.id} style={styles.certRow}>
                    <View style={styles.flex}>
                      <Text style={styles.certCourse} numberOfLines={1}>{ct.course}</Text>
                      <Text style={styles.pickSub}>{ct.code ? `${ct.code} · ` : ""}{fmtDate(ct.date)}</Text>
                    </View>
                    {ct.grade ? <View style={styles.gradeTag}><Text style={styles.gradeText}>{ct.grade}</Text></View> : null}
                  </View>
                ))}
              </View>
            ) : null}
            <View style={{ height: 30 }} />
          </ScrollView>
        )}
      </SwipeBackView>
    </SafeAreaView>
  );
}

function Avatar({ name, photo }: { name: string; photo: string | null }) {
  if (photo) return <Image source={{ uri: photo }} style={styles.avatar} />;
  return <View style={[styles.avatar, styles.avatarFallback]}><Text style={styles.avatarInitial}>{(name?.[0] ?? "?").toUpperCase()}</Text></View>;
}
function Pill({ label, on }: { label: string; on: boolean }) {
  return <View style={[styles.pill, on ? styles.pillOn : styles.pillOff]}><Text style={[styles.pillText, on ? styles.pillTextOn : styles.pillTextOff]}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F8FA" },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  err: { color: "#B91C1C", fontSize: 14, textAlign: "center" },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, gap: 6 },
  title: { fontSize: 24, fontWeight: "800", color: "#0F172A" },
  subtitle: { fontSize: 13, color: "#6B7280" },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 12, backgroundColor: "#FFFFFF", marginTop: 4 },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 14, color: "#111827" },
  list: { padding: 12 },
  empty: { textAlign: "center", color: "#9CA3AF", fontSize: 14, marginTop: 30 },
  pickRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFFFFF", borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#EEF0F6" },
  pickName: { fontSize: 15, fontWeight: "800", color: "#111827" },
  pickSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#E5E7EB" },
  avatarFallback: { alignItems: "center", justifyContent: "center", backgroundColor: "#CCFBF1" },
  avatarInitial: { fontSize: 18, fontWeight: "800", color: "#0D9488" },
  detailHead: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingTop: 6, paddingBottom: 10 },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#E6FAF9", alignItems: "center", justifyContent: "center" },
  detailName: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  summaryCard: { backgroundColor: "#0D9488", borderRadius: 16, padding: 16, marginBottom: 12, gap: 10 },
  summaryTop: { flexDirection: "row", alignItems: "center" },
  summaryBig: { fontSize: 32, fontWeight: "800", color: "#FFFFFF" },
  summarySmall: { fontSize: 18, fontWeight: "700", color: "#CCFBF1" },
  summaryLabel: { fontSize: 13, color: "#CCFBF1", fontWeight: "600" },
  summaryStat: { alignItems: "center" },
  summaryStatNum: { fontSize: 24, fontWeight: "800", color: "#FFFFFF" },
  summaryStatLabel: { fontSize: 11, color: "#CCFBF1", fontWeight: "600" },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.25)", overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: "#FFFFFF" },
  pctText: { fontSize: 12, color: "#CCFBF1", fontWeight: "700" },
  lessonSearch: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 12, backgroundColor: "#FFFFFF", marginBottom: 10 },
  lessonSearchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: "#111827" },
  tabRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 10, backgroundColor: "#EEF2F7" },
  tabBtnOn: { backgroundColor: "#0D9488" },
  tabText: { fontSize: 13, fontWeight: "800", color: "#6B7280" },
  tabTextOn: { color: "#FFFFFF" },
  statusTag: { backgroundColor: "#E5E7EB", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: "800", color: "#4B5563" },
  passTag: { backgroundColor: "#D1FAE5" }, passText: { color: "#047857" },
  distinctionTag: { backgroundColor: "#DBEAFE" }, distinctionText: { color: "#1D4ED8" },
  failTag: { backgroundColor: "#FEE2E2" }, failText: { color: "#B91C1C" },
  courseCard: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#EEF0F6", gap: 10 },
  courseHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  courseName: { fontSize: 16, fontWeight: "800", color: "#0F172A", flexShrink: 1 },
  courseMeta: { fontSize: 12, fontWeight: "700", color: "#0D9488" },
  levelBlock: { gap: 8 },
  levelLabel: { fontSize: 12, fontWeight: "800", color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.5 },
  lessonRow: { flexDirection: "row", gap: 10, paddingVertical: 4 },
  lessonTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  lessonTitle: { fontSize: 13, fontWeight: "700", color: "#111827", lineHeight: 18 },
  lessonTitleMuted: { color: "#6B7280", fontWeight: "600" },
  lessonDate: { fontSize: 11, fontWeight: "700", color: "#0D9488", marginTop: 1 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 5 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  pillOn: { backgroundColor: "#D1FAE5" },
  pillOff: { backgroundColor: "#F3F4F6" },
  pillText: { fontSize: 10, fontWeight: "800" },
  pillTextOn: { color: "#047857" },
  pillTextOff: { color: "#9CA3AF" },
  remark: { fontSize: 12, color: "#6B7280", marginTop: 4, fontStyle: "italic" },
  certRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  certCourse: { fontSize: 14, fontWeight: "700", color: "#111827" },
  logHint: { fontSize: 12, color: "#9CA3AF", marginTop: -4 },
  logDot: { width: 8, height: 8, borderRadius: 4, alignSelf: "flex-start", marginTop: 6 },
  tagOkDot: { backgroundColor: "#16A34A" },
  tagBadDot: { backgroundColor: "#DC2626" },
  logLesson: { fontSize: 13, fontWeight: "700", color: "#111827", marginTop: 3 },
  logNote: { fontSize: 13, color: "#374151", marginTop: 3, fontStyle: "italic" },
  gradeTag: { backgroundColor: "#FEF3C7", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  gradeText: { fontSize: 12, fontWeight: "800", color: "#92400E" },
});
