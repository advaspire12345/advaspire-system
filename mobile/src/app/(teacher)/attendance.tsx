import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRole } from "@/contexts/role";
import { supabase } from "@/lib/supabase";
import { mobileApi } from "@/lib/api";
import { TeacherTopBar } from "@/components/TeacherTopBar";

// Flip to true once /api/mobile/attendance/remove is deployed to production. When
// off, un-marking (clearing a record + refunding the session) is hidden so teachers
// don't hit a failing request; Present↔Absent switching works regardless.
const REMOVE_ENABLED = false;

type Status = "present" | "absent";
type Lesson = { id: string; title: string };
// One taught lesson on an attendance, with its progress ticks + optional video.
type LessonMark = { coordinate: string | null; title: string; learnt: boolean; m1: boolean; m2: boolean; m3: boolean; photos: string[]; videoUrl: string | null; savingPhoto: boolean; savingVideo: boolean };
type Row = {
  rowId: string;
  date: string; // yyyy-mm-dd this row belongs to
  enrollmentId: string;
  studentId: string;
  studentName: string;
  courseId: string;
  courseName: string;
  robotics: boolean;
  slotDay: string;
  slotTime: string | null;
  sessions: number;
  extra: boolean;
  marked: Status | null;
  attendanceId: string | null;
  savedLessonTitles: string[];
  savedActivities: { lesson: string; photos: string[]; video: string | null }[];
  savedNote: string;
  savedPhotos: string[];
  choice: Status | null;
  editing: boolean;
  lessons: LessonMark[];
  note: string;
  photos: string[];
  saving: boolean;
};
type WeekItem = { date: string; label: string; time: string | null; courseName: string; status: string | null };
type WeekGroup = { studentName: string; items: WeekItem[] };

const ROBOTICS_CATALOGS = new Set(["ev3", "microbit", "advasbot"]);
const statusOn = (s: string | null | undefined) => !!s && s !== "not_done";
// A curriculum coordinate is the first token of a stored lesson title (e.g.
// "EV3-L1-03 …"). Typed-in lessons have no coordinate → no progress write.
function coordOf(title: string): string | null {
  const tok = (title ?? "").trim().split(/\s+/)[0] ?? "";
  return /^[A-Za-z0-9]+-[A-Za-z0-9-]+$/.test(tok) ? tok : null;
}
function newLessonMark(title: string, coordinate: string | null): LessonMark {
  return { coordinate, title, learnt: true, m1: false, m2: false, m3: false, photos: [], videoUrl: null, savingPhoto: false, savingVideo: false };
}

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const DOW_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CAP = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
let ROW_SEQ = 0;
const nextRowId = () => `x${++ROW_SEQ}`;

function ymd(d: Date): string { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function hhmm(d: Date): string { return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; }
function time12(t: string | null): string {
  if (!t) return "";
  const [h, m] = t.split(":").map((n) => parseInt(n, 10));
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
// Monday-anchored current week (Mon..Sun) + today's index within it.
function currentWeek(): { dates: Date[]; strs: string[]; todayIndex: number } {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today); monday.setDate(today.getDate() + (dow === 0 ? -6 : 1 - dow)); monday.setHours(0, 0, 0, 0);
  const dates = Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d; });
  return { dates, strs: dates.map(ymd), todayIndex: dow === 0 ? 6 : dow - 1 };
}
function parseSchedule(scheduleRaw: string | null, dayOfWeekRaw: string | null, startTime: string | null): { day: string; time: string | null }[] {
  const out: { day: string; time: string | null }[] = [];
  if (scheduleRaw) {
    try { const parsed = JSON.parse(scheduleRaw); if (Array.isArray(parsed)) for (const p of parsed) { const day = String(p.day || "").toLowerCase(); if (day) out.push({ day, time: p.time ?? startTime ?? null }); } } catch { /* ignore */ }
  }
  if (out.length === 0 && dayOfWeekRaw) {
    const raw = String(dayOfWeekRaw).trim();
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) parsed.forEach((d: string) => out.push({ day: String(d).toLowerCase(), time: startTime }));
      else if (typeof parsed === "string") out.push({ day: parsed.toLowerCase(), time: startTime });
    } catch { raw.toLowerCase().split(/[,\s]+/).filter(Boolean).forEach((d) => out.push({ day: d, time: startTime })); }
  }
  return out;
}
function base64ToBytes(b64: string): Uint8Array {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;
  let bufferLength = b64.length * 0.75;
  if (b64[b64.length - 1] === "=") { bufferLength--; if (b64[b64.length - 2] === "=") bufferLength--; }
  const bytes = new Uint8Array(bufferLength);
  let p = 0;
  for (let i = 0; i < b64.length; i += 4) {
    const e1 = lookup[b64.charCodeAt(i)], e2 = lookup[b64.charCodeAt(i + 1)], e3 = lookup[b64.charCodeAt(i + 2)], e4 = lookup[b64.charCodeAt(i + 3)];
    bytes[p++] = (e1 << 2) | (e2 >> 4);
    if (b64[i + 2] !== "=") bytes[p++] = ((e2 & 15) << 4) | (e3 >> 2);
    if (b64[i + 3] !== "=") bytes[p++] = ((e3 & 3) << 6) | e4;
  }
  return bytes;
}

// Read a local file URI into bytes via XHR→Blob→base64 (reliable in RN without
// expo-file-system; ImagePicker doesn't return base64 for videos). Reuses the same
// Uint8Array upload path that photos use.
function uriToBytes(uri: string): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.responseType = "blob";
    xhr.onerror = () => reject(new Error("Network request failed reading the file."));
    xhr.onload = () => {
      const blob = xhr.response as Blob;
      const fr = new FileReader();
      fr.onerror = () => reject(new Error("Couldn't read the file on this device."));
      fr.onload = () => resolve(base64ToBytes(String(fr.result).split(",")[1] ?? ""));
      fr.readAsDataURL(blob);
    };
    xhr.open("GET", uri, true);
    xhr.send(null);
  });
}

export default function TeacherAttendance() {
  const { staff } = useRole();
  const { width } = useWindowDimensions();
  const week = useRef(currentWeek()).current;
  const [dayIndex, setDayIndex] = useState(week.todayIndex);
  const dstr = week.strs[dayIndex];
  const date = week.dates[dayIndex];
  const pagerRef = useRef<ScrollView>(null);

  const [rows, setRows] = useState<Row[]>([]); // holds ALL 7 days; pages filter by date
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [allStudents, setAllStudents] = useState<{ id: string; name: string }[]>([]);

  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [weekGroups, setWeekGroups] = useState<WeekGroup[]>([]);
  const [weekLoading, setWeekLoading] = useState(false);

  const lessonCache = useRef<Map<string, Lesson[]>>(new Map());
  const [picker, setPicker] = useState<{ rowId: string; courseId: string } | null>(null);
  const [pickerList, setPickerList] = useState<Lesson[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");

  const [extraOpen, setExtraOpen] = useState(false);
  const [extraQuery, setExtraQuery] = useState("");
  const [extraStudent, setExtraStudent] = useState<{ id: string; name: string } | null>(null);
  const [extraEnrs, setExtraEnrs] = useState<{ id: string; courseId: string; courseName: string; catalog: string | null; time: string | null; sessions: number }[]>([]);
  const [extraLoading, setExtraLoading] = useState(false);

  const load = useCallback(async () => {
    if (!staff) return;
    setLoading(true); setErr(null);
    if (!staff.branchId) { setErr("Your account has no branch set — ask an admin to assign one."); setRows([]); setLoading(false); return; }

    const { data: studs, error: sErr } = await supabase.from("students").select("id, name").eq("branch_id", staff.branchId).is("deleted_at", null);
    if (sErr) { setErr("Couldn't load students."); setLoading(false); return; }
    const ids = (studs ?? []).map((s) => s.id as string);
    const nameById = new Map<string, string>((studs ?? []).map((s) => [s.id as string, (s.name as string) ?? "Student"]));
    setAllStudents((studs ?? []).map((s) => ({ id: s.id as string, name: (s.name as string) ?? "Student" })));
    if (ids.length === 0) { setRows([]); setLoading(false); return; }

    const { data: enrs } = await supabase
      .from("enrollments").select("id, student_id, day_of_week, start_time, schedule, sessions_remaining, course:courses(id, name, lesson_catalog)")
      .in("student_id", ids).eq("status", "active").is("deleted_at", null);
    const enrList = enrs ?? [];
    const enrIds = enrList.map((e) => e.id as string);
    const enrMeta = new Map<string, { studentId: string; courseId: string; courseName: string; robotics: boolean; startTime: string | null; sessions: number }>();
    enrList.forEach((e) => { const c = e.course as unknown as { id: string; name: string; lesson_catalog: string | null } | null; enrMeta.set(e.id as string, { studentId: e.student_id as string, courseId: c?.id ?? "", courseName: c?.name ?? "Class", robotics: ROBOTICS_CATALOGS.has((c?.lesson_catalog ?? "").toLowerCase()), startTime: (e.start_time as string | null) ?? null, sessions: Number(e.sessions_remaining ?? 0) }); });

    // All attendance for the week.
    const { data: att } = enrIds.length ? await supabase.from("attendance").select("id, enrollment_id, date, status, notes, activities, project_photos, slot_time, actual_start_time").in("enrollment_id", enrIds).gte("date", week.strs[0]).lte("date", week.strs[6]) : { data: [] as any[] };
    const attByKey = new Map<string, any>(); // enrollmentId|date → record (first)
    (att ?? []).forEach((a) => { const k = `${a.enrollment_id}|${a.date}`; if (!attByKey.has(k)) attByKey.set(k, a); });
    const usedAttIds = new Set<string>();

    const built: Row[] = [];
    for (let di = 0; di < 7; di++) {
      const dstrLocal = week.strs[di];
      const weekday = WEEKDAYS[week.dates[di].getDay()];
      for (const e of enrList) {
        const slots = parseSchedule(e.schedule as string | null, e.day_of_week as string | null, e.start_time as string | null);
        const slot = slots.find((s) => s.day === weekday);
        if (!slot) continue;
        const meta = enrMeta.get(e.id as string)!;
        const rec = attByKey.get(`${e.id}|${dstrLocal}`);
        if (rec) usedAttIds.add(rec.id as string);
        const acts = (rec?.activities as { lesson?: string; photos?: string[]; video?: string | null }[] | null) ?? [];
        const savedActs = acts.filter((a) => a.lesson).map((a) => ({ lesson: a.lesson as string, photos: a.photos ?? [], video: a.video ?? null }));
        built.push({
          rowId: `${e.id}:${dstrLocal}`, date: dstrLocal, enrollmentId: e.id as string, studentId: meta.studentId,
          studentName: nameById.get(meta.studentId) ?? "Student", courseId: meta.courseId, courseName: meta.courseName, robotics: meta.robotics,
          slotDay: CAP(weekday), slotTime: slot.time, sessions: Number(e.sessions_remaining ?? 0),
          extra: false, marked: (rec?.status as Status) ?? null, attendanceId: (rec?.id as string) ?? null,
          savedLessonTitles: savedActs.map((a) => a.lesson), savedActivities: savedActs, savedNote: (rec?.notes as string | null) ?? "", savedPhotos: (rec?.project_photos as string[] | null) ?? [],
          choice: null, editing: false, lessons: [], note: "", photos: [], saving: false,
        });
      }
    }
    // Any attendance not tied to a scheduled slot (extra / off-schedule) → extra rows.
    for (const a of att ?? []) {
      if (usedAttIds.has(a.id as string)) continue;
      const meta = enrMeta.get(a.enrollment_id as string);
      if (!meta) continue;
      const acts = (a.activities as { lesson?: string; photos?: string[]; video?: string | null }[] | null) ?? [];
      const savedActs = acts.filter((x) => x.lesson).map((x) => ({ lesson: x.lesson as string, photos: x.photos ?? [], video: x.video ?? null }));
      built.push({
        rowId: nextRowId(), date: a.date as string, enrollmentId: a.enrollment_id as string, studentId: meta.studentId,
        studentName: nameById.get(meta.studentId) ?? "Student", courseId: meta.courseId, courseName: meta.courseName, robotics: meta.robotics,
        slotDay: CAP(WEEKDAYS[new Date((a.date as string) + "T00:00:00").getDay()]), slotTime: (a.slot_time as string) || (a.actual_start_time as string) || meta.startTime,
        sessions: meta.sessions, extra: true, marked: (a.status as Status) ?? null, attendanceId: a.id as string,
        savedLessonTitles: savedActs.map((x) => x.lesson), savedActivities: savedActs, savedNote: (a.notes as string | null) ?? "", savedPhotos: (a.project_photos as string[] | null) ?? [],
        choice: null, editing: false, lessons: [], note: "", photos: [], saving: false,
      });
    }

    built.sort((a, b) => (a.slotTime ?? "").localeCompare(b.slotTime ?? "") || a.studentName.localeCompare(b.studentName));
    setRows(built);
    setLoading(false);
  }, [staff, week]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Poll every 8s and reconcile scheduled rows across the whole week.
  const rowsRef = useRef<Row[]>([]);
  useEffect(() => { rowsRef.current = rows; }, [rows]);
  useEffect(() => {
    const tick = async () => {
      const ids = [...new Set(rowsRef.current.filter((r) => !r.extra).map((r) => r.enrollmentId))];
      if (ids.length === 0) return;
      const { data: att } = await supabase.from("attendance").select("id, enrollment_id, date, status").in("enrollment_id", ids).gte("date", week.strs[0]).lte("date", week.strs[6]);
      const m = new Map<string, { id: string; status: Status }>();
      (att ?? []).forEach((a) => { const k = `${a.enrollment_id}|${a.date}`; if (!m.has(k)) m.set(k, { id: a.id as string, status: a.status as Status }); });
      setRows((prev) => prev.map((r) => {
        if (r.extra || r.editing) return r;
        const rec = m.get(`${r.enrollmentId}|${r.date}`);
        const dbStatus = rec?.status ?? null;
        if (dbStatus === r.marked) return r;
        return { ...r, marked: dbStatus, attendanceId: rec?.id ?? null, choice: dbStatus ? null : r.choice };
      }));
    };
    const t = setInterval(tick, 8000);
    return () => clearInterval(t);
  }, [week]);

  // Search → each matching student's weekly SCHEDULE (day + time + program) + status.
  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (!searchOpen || !q || !staff?.branchId) { setWeekGroups([]); return; }
    let cancelled = false;
    const run = async () => {
      setWeekLoading(true);
      const matches = allStudents.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 15);
      if (matches.length === 0) { if (!cancelled) { setWeekGroups([]); setWeekLoading(false); } return; }
      const dateForWeekday = (wd: number) => week.dates[wd === 0 ? 6 : wd - 1];
      const { data: enrs } = await supabase
        .from("enrollments").select("id, student_id, day_of_week, start_time, schedule, course:courses(name)")
        .in("student_id", matches.map((m) => m.id)).eq("status", "active").is("deleted_at", null);
      const enrIds: string[] = [];
      const perStudent = new Map<string, WeekItem[]>();
      for (const e of enrs ?? []) {
        enrIds.push(e.id as string);
        const c = e.course as unknown as { name: string } | null;
        const slots = parseSchedule(e.schedule as string | null, e.day_of_week as string | null, e.start_time as string | null);
        const arr = perStudent.get(e.student_id as string) ?? [];
        for (const slot of slots) {
          const wd = WEEKDAYS.indexOf(slot.day);
          if (wd < 0) continue;
          const d = dateForWeekday(wd);
          arr.push({ date: ymd(d), label: d.toLocaleDateString("en-MY", { weekday: "short", day: "numeric" }), time: slot.time, courseName: c?.name ?? "Class", status: null });
        }
        perStudent.set(e.student_id as string, arr);
      }
      const { data: att } = enrIds.length ? await supabase.from("attendance").select("enrollment_id, date, status").in("enrollment_id", enrIds).gte("date", week.strs[0]).lte("date", week.strs[6]) : { data: [] as any[] };
      const enrToStudent = new Map<string, string>((enrs ?? []).map((e) => [e.id as string, e.student_id as string]));
      const attByStudentDate = new Map<string, string>();
      for (const a of att ?? []) { const sid = enrToStudent.get(a.enrollment_id as string); if (sid) attByStudentDate.set(`${sid}|${a.date}`, a.status as string); }
      const groups: WeekGroup[] = matches.map((s) => {
        const items = (perStudent.get(s.id) ?? []).map((it) => ({ ...it, status: attByStudentDate.get(`${s.id}|${it.date}`) ?? null }));
        items.sort((x, y) => x.date.localeCompare(y.date) || (x.time ?? "").localeCompare(y.time ?? ""));
        return { studentName: s.name, items };
      });
      if (!cancelled) { setWeekGroups(groups); setWeekLoading(false); }
    };
    run();
    return () => { cancelled = true; };
  }, [search, searchOpen, allStudents, week, staff?.branchId]);

  const patch = (rowId: string, p: Partial<Row>) => setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, ...p } : r)));
  const setChoice = (row: Row, choice: Status) => patch(row.rowId, { choice: row.choice === choice ? null : choice });

  const updateLesson = (rowId: string, idx: number, changes: Partial<LessonMark>) => setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, lessons: r.lessons.map((l, i) => (i === idx ? { ...l, ...changes } : l)) } : r)));
  const removeLesson = (row: Row, idx: number) => patch(row.rowId, { lessons: row.lessons.filter((_, i) => i !== idx) });

  const startEdit = (row: Row) => {
    // Rebuild each lesson (with its own photos + video) from what was saved on the
    // attendance's activities, then fill the learnt/mission ticks from the grid.
    const baseLessons: LessonMark[] = row.savedActivities.map((a) => ({ ...newLessonMark(a.lesson, coordOf(a.lesson)), photos: a.photos, videoUrl: a.video }));
    // Back-compat: marks saved before per-lesson photos kept them on the attendance,
    // not the activity — if there's a single lesson, show them there.
    if (baseLessons.length === 1 && baseLessons[0].photos.length === 0 && row.savedPhotos.length) baseLessons[0].photos = row.savedPhotos;
    setRows((prev) => prev.map((r) => (r.rowId === row.rowId ? { ...r, editing: true, choice: r.marked, lessons: baseLessons, note: r.savedNote, photos: r.savedPhotos } : { ...r, editing: false })));
    const coords = baseLessons.map((l) => l.coordinate).filter(Boolean) as string[];
    if (coords.length === 0) return;
    (async () => {
      const { data: lp } = await supabase.from("lesson_progress").select("lesson_coordinate, learnt_status, mission1_status, mission2_status, mission3_status").eq("student_id", row.studentId).in("lesson_coordinate", coords);
      const lpMap = new Map((lp ?? []).map((r2) => [r2.lesson_coordinate as string, r2]));
      setRows((prev) => prev.map((r) => {
        if (r.rowId !== row.rowId || !r.editing) return r;
        return { ...r, lessons: r.lessons.map((l) => {
          if (!l.coordinate) return l;
          const p = lpMap.get(l.coordinate);
          return { ...l, learnt: p ? statusOn(p.learnt_status as string) : l.learnt, m1: statusOn(p?.mission1_status as string), m2: statusOn(p?.mission2_status as string), m3: statusOn(p?.mission3_status as string) };
        }) };
      }));
    })();
  };
  const cancelEdit = (row: Row) => patch(row.rowId, { editing: false, choice: null, lessons: [], note: "", photos: [] });

  const openPicker = async (row: Row) => {
    if (!row.courseId) { Alert.alert("No curriculum", "This class has no lesson list — type the lesson instead."); return; }
    setPicker({ rowId: row.rowId, courseId: row.courseId }); setPickerQuery("");
    const cached = lessonCache.current.get(row.courseId);
    if (cached) { setPickerList(cached); return; }
    setPickerLoading(true); setPickerList([]);
    try {
      const { data: course } = await supabase.from("courses").select("lesson_catalog").eq("id", row.courseId).maybeSingle();
      const catalog = (course as { lesson_catalog?: string } | null)?.lesson_catalog;
      let lessons: Lesson[] = [];
      if (catalog) {
        const { data: ls } = await supabase.from("lessons").select("coordinate, title").eq("course_code", catalog).order("level", { ascending: true, nullsFirst: false }).order("position", { ascending: true, nullsFirst: false }).order("coordinate", { ascending: true });
        lessons = (ls ?? []).map((l) => { const coord = (l.coordinate as string | null) ?? ""; const title = (l.title as string | null) ?? ""; return { id: coord || title, title: coord ? `${coord} ${title}` : title }; });
      }
      lessonCache.current.set(row.courseId, lessons); setPickerList(lessons);
    } finally { setPickerLoading(false); }
  };
  const chooseLesson = (title: string, coordinate: string | null) => {
    if (picker) setRows((prev) => prev.map((r) => (r.rowId === picker.rowId && !r.lessons.some((l) => l.title === title) ? { ...r, lessons: [...r.lessons, newLessonMark(title, coordinate)] } : r)));
    setPicker(null);
  };

  // Per-lesson photos → project-photos bucket (images ≤5MB).
  const pickLessonPhoto = (row: Row, idx: number) => {
    Alert.alert("Add lesson photo", "Take a new photo or choose one from your gallery.", [
      { text: "Take Photo", onPress: () => addLessonPhoto(row, idx, "camera") },
      { text: "Choose from Gallery", onPress: () => addLessonPhoto(row, idx, "gallery") },
      { text: "Cancel", style: "cancel" },
    ]);
  };
  const addLessonPhoto = async (row: Row, idx: number, source: "camera" | "gallery") => {
    let res: ImagePicker.ImagePickerResult;
    if (source === "camera") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { Alert.alert("Camera permission needed", "Allow camera access, or choose from gallery instead."); return; }
      res = await ImagePicker.launchCameraAsync({ quality: 0.5, base64: true });
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert("Permission needed", "Allow photo access to attach the student's work."); return; }
      res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.5, base64: true, allowsMultipleSelection: true, selectionLimit: 5 });
    }
    if (res.canceled) return;
    updateLesson(row.rowId, idx, { savingPhoto: true });
    const urls = [...(row.lessons[idx]?.photos ?? [])];
    for (let i = 0; i < res.assets.length && urls.length < 5; i++) {
      const asset = res.assets[i];
      if (!asset.base64) continue;
      const ext = (asset.uri.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const contentType = ext === "png" ? "image/png" : "image/jpeg";
      const path = `${row.studentId}/${row.date}-${Date.now()}-${i}.${ext}`;
      const { error } = await supabase.storage.from("project-photos").upload(path, base64ToBytes(asset.base64), { contentType, upsert: false });
      if (!error) { const { data } = supabase.storage.from("project-photos").getPublicUrl(path); urls.push(data.publicUrl); }
    }
    updateLesson(row.rowId, idx, { photos: urls, savingPhoto: false });
  };
  const removeLessonPhoto = (row: Row, idx: number, url: string) => updateLesson(row.rowId, idx, { photos: (row.lessons[idx]?.photos ?? []).filter((u) => u !== url) });

  // Per-lesson video → student-uploads bucket (no size/MIME limit).
  const pickVideoSource = (row: Row, idx: number) => {
    Alert.alert("Lesson video", "Record a video or choose one from your gallery.", [
      { text: "Record Video", onPress: () => addVideo(row, idx, "camera") },
      { text: "Choose from Gallery", onPress: () => addVideo(row, idx, "gallery") },
      { text: "Cancel", style: "cancel" },
    ]);
  };
  const addVideo = async (row: Row, idx: number, source: "camera" | "gallery") => {
    const perm = source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission needed", source === "camera" ? "Allow camera access to record." : "Allow photo access to pick a video."); return; }
    const opts = { mediaTypes: ["videos"] as ImagePicker.MediaType[], videoMaxDuration: 120, quality: 0.5 };
    const res = source === "camera" ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled) return;
    const asset = res.assets[0];
    updateLesson(row.rowId, idx, { savingVideo: true });
    try {
      const bytes = await uriToBytes(asset.uri);
      if (!bytes.length) throw new Error("The video file couldn't be read on this device.");
      const ext = (asset.uri.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
      const path = `${row.studentId}/video-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("student-uploads").upload(path, bytes, { contentType: asset.mimeType || "video/mp4", upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("student-uploads").getPublicUrl(path);
      updateLesson(row.rowId, idx, { videoUrl: data.publicUrl, savingVideo: false });
    } catch (e) {
      updateLesson(row.rowId, idx, { savingVideo: false });
      Alert.alert("Couldn't upload video", e instanceof Error ? e.message : "Please try again.");
    }
  };

  const finishRow = (row: Row, status: Status, lessons: LessonMark[], noteText: string, photos: string[], attId: string | null) => {
    const savedActs = lessons.map((l) => ({ lesson: l.title, photos: l.photos, video: l.videoUrl }));
    patch(row.rowId, { saving: false, marked: status, attendanceId: attId, savedLessonTitles: savedActs.map((a) => a.lesson), savedActivities: savedActs, savedNote: noteText, savedPhotos: photos, editing: false, choice: null, lessons: [], note: "", photos: [] });
  };

  const unmark = async (row: Row): Promise<boolean> => {
    if (!row.attendanceId) return true;
    const res = await mobileApi("/api/mobile/attendance/remove", { attendanceId: row.attendanceId });
    if (!res.ok) { Alert.alert("Couldn't clear", res.error); return false; }
    return true;
  };

  // Write the per-lesson learnt/mission ticks + video into the progress grid.
  const writeLessonProgress = async (row: Row, lessons: LessonMark[]) => {
    const branchId = staff?.branchId;
    if (!branchId) return;
    const st = (on: boolean) => (on ? "approved" : "not_done");
    const withCoord = lessons.filter((l) => l.coordinate);
    if (withCoord.length) {
      await supabase.from("lesson_progress").upsert(
        withCoord.map((l) => ({ student_id: row.studentId, branch_id: branchId, lesson_coordinate: l.coordinate!, learnt_status: st(l.learnt), mission1_status: st(l.m1), mission2_status: st(l.m2), mission3_status: st(l.m3), updated_at: new Date().toISOString() })),
        { onConflict: "student_id,lesson_coordinate" },
      );
    }
    const withMedia = lessons.filter((l) => l.coordinate && (l.videoUrl || l.photos.length));
    if (withMedia.length) {
      await supabase.from("lesson_uploads").upsert(
        withMedia.map((l) => ({
          student_id: row.studentId, branch_id: branchId, lesson_coordinate: l.coordinate!,
          ...(l.videoUrl ? { video_url: l.videoUrl } : {}),
          ...(l.photos[0] ? { image_path: l.photos[0] } : {}),
          updated_by: staff?.id ?? null, updated_at: new Date().toISOString(),
        })),
        { onConflict: "student_id,lesson_coordinate" },
      );
    }
  };

  const commitRow = async (row: Row) => {
    if (row.editing && !row.choice) {
      if (!REMOVE_ENABLED || !row.attendanceId) { patch(row.rowId, { editing: false, choice: null, lessons: [], note: "", photos: [] }); return; }
      patch(row.rowId, { saving: true });
      const ok = await unmark(row);
      if (!ok) { patch(row.rowId, { saving: false }); return; }
      patch(row.rowId, { saving: false, marked: null, attendanceId: null, savedLessonTitles: [], savedNote: "", savedPhotos: [], editing: false, choice: null, lessons: [], note: "", photos: [] });
      return;
    }
    if (!row.choice) return;
    const status = row.choice;
    const prev = row.editing ? row.marked : null;
    const lessons = status === "present" ? row.lessons : [];
    const noteText = row.note.trim();
    const photos = status === "present" ? lessons.flatMap((l) => l.photos) : [];
    // Store each lesson's photos + video ON the activity so editing restores them all.
    const activities = lessons.length ? lessons.map((l) => ({ lesson: l.title, mission: "", photos: l.photos, video: l.videoUrl })) : undefined;
    patch(row.rowId, { saving: true });

    if (prev === status && row.attendanceId) {
      const { error } = await supabase.from("attendance").update({ notes: noteText || null, ...(status === "present" ? { activities: activities ?? null, project_photos: photos.length ? photos : null } : {}) }).eq("id", row.attendanceId);
      if (error) { patch(row.rowId, { saving: false }); Alert.alert("Couldn't save", error.message); return; }
      if (status === "present") await writeLessonProgress(row, lessons);
      finishRow(row, status, lessons, noteText, photos, row.attendanceId);
      return;
    }

    const res = await mobileApi<{ attendance?: { id?: string } }>("/api/mobile/attendance/mark", { enrollmentId: row.enrollmentId, date: row.date, status, slotDay: row.slotDay, slotTime: row.slotTime, activities });
    if (!res.ok) { patch(row.rowId, { saving: false }); Alert.alert("Couldn't save", res.error); return; }
    const attId = res.data?.attendance?.id ?? row.attendanceId ?? null;
    if (attId && (noteText || photos.length || row.savedNote || row.savedPhotos.length)) {
      await supabase.from("attendance").update({ notes: noteText || null, ...(status === "present" ? { project_photos: photos.length ? photos : null } : {}) }).eq("id", attId);
    }
    if (status === "present") await writeLessonProgress(row, lessons);
    finishRow(row, status, lessons, noteText, photos, attId);
  };

  const saveAll = async () => {
    const pending = rows.filter((r) => r.date === dstr && r.choice && !r.editing);
    if (pending.length === 0) { Alert.alert("Nothing to save", "Choose Present / Absent for at least one student."); return; }
    for (const r of pending) await commitRow(r);
  };

  const deleteExtraRow = async (row: Row) => {
    if (row.attendanceId) {
      if (!REMOVE_ENABLED) { Alert.alert("Already recorded", "This attendance is saved. Long-press to switch Present/Absent, or clear it on the website — mobile remove isn't turned on yet."); return; }
      patch(row.rowId, { saving: true });
      const ok = await unmark(row);
      if (!ok) { patch(row.rowId, { saving: false }); return; }
    }
    setRows((prev) => prev.filter((r) => r.rowId !== row.rowId));
  };

  const pickExtraStudent = async (s: { id: string; name: string }) => {
    setExtraStudent(s); setExtraLoading(true); setExtraEnrs([]);
    const { data: enrs } = await supabase.from("enrollments").select("id, start_time, sessions_remaining, course:courses(id, name, lesson_catalog)").eq("student_id", s.id).eq("status", "active").is("deleted_at", null);
    setExtraEnrs((enrs ?? []).map((e) => { const c = e.course as unknown as { id: string; name: string; lesson_catalog: string | null } | null; return { id: e.id as string, courseId: c?.id ?? "", courseName: c?.name ?? "Class", catalog: c?.lesson_catalog ?? null, time: (e.start_time as string | null) ?? null, sessions: Number(e.sessions_remaining ?? 0) }; }));
    setExtraLoading(false);
  };
  const addExtra = (enr: { id: string; courseId: string; courseName: string; catalog: string | null; time: string | null; sessions: number }) => {
    if (!extraStudent) return;
    const newRow: Row = {
      rowId: nextRowId(), date: dstr, enrollmentId: enr.id, studentId: extraStudent.id, studentName: extraStudent.name, courseId: enr.courseId, courseName: enr.courseName, robotics: ROBOTICS_CATALOGS.has((enr.catalog ?? "").toLowerCase()),
      slotDay: CAP(WEEKDAYS[date.getDay()]), slotTime: hhmm(new Date()), sessions: enr.sessions,
      extra: true, marked: null, attendanceId: null, savedLessonTitles: [], savedActivities: [], savedNote: "", savedPhotos: [],
      choice: null, editing: false, lessons: [], note: "", photos: [], saving: false,
    };
    setRows((prev) => [newRow, ...prev]);
    setExtraOpen(false); setExtraStudent(null); setExtraQuery("");
  };

  const goDay = (i: number) => { setDayIndex(i); pagerRef.current?.scrollTo({ x: i * width, animated: true }); };
  const onPagerScrollEnd = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== dayIndex && i >= 0 && i < 7) setDayIndex(i);
  };

  const q = search.trim().toLowerCase();
  const searching = searchOpen && !!q;
  const editRow = rows.find((r) => r.editing) ?? null;
  const dayRows = rows.filter((r) => r.date === dstr);
  const pendingCount = dayRows.filter((r) => r.choice && !r.editing).length;
  const todayStr = ymd(new Date());

  const renderFields = (r: Row) => (
    <>
      <View style={styles.statusRow}>
        {(["present", "absent"] as Status[]).map((s) => {
          const on = r.choice === s;
          return (
            <Pressable key={s} style={[styles.statusChip, on && (s === "present" ? styles.chipPresentOn : styles.chipAbsentOn)]} onPress={() => setChoice(r, s)}>
              <Ionicons name={s === "present" ? "checkmark-circle" : "close-circle"} size={16} color={on ? "#FFFFFF" : s === "present" ? "#16A34A" : "#DC2626"} />
              <Text style={[styles.statusChipText, on && styles.statusChipTextOn]}>{CAP(s)}</Text>
            </Pressable>
          );
        })}
      </View>
      {r.choice === "present" ? (
        <>
          {r.lessons.map((l, idx) => (
            <View key={`${l.title}-${idx}`} style={styles.lessonCard}>
              <View style={styles.lessonCardTop}>
                <Text style={styles.lessonCardTitle} numberOfLines={2}>{l.title}</Text>
                <Pressable hitSlop={8} onPress={() => removeLesson(r, idx)}><Ionicons name="close-circle" size={20} color="#CBD5E1" /></Pressable>
              </View>
              {l.coordinate ? (
                <View style={styles.tickRow}>
                  <Tick label="Learnt" on={l.learnt} onPress={() => updateLesson(r.rowId, idx, { learnt: !l.learnt })} />
                  {r.robotics ? (["m1", "m2", "m3"] as const).map((k, i) => <Tick key={k} label={`M${i + 1}`} on={l[k]} onPress={() => updateLesson(r.rowId, idx, { [k]: !l[k] } as Partial<LessonMark>)} />) : null}
                </View>
              ) : <Text style={styles.typedNote}>Typed lesson — not tracked in the progress grid.</Text>}
              {l.photos.length || l.videoUrl ? (
                <View style={styles.photoRow}>
                  {l.photos.map((u) => (<View key={u} style={styles.thumbWrap}><Image source={{ uri: u }} style={styles.thumb} /><Pressable style={styles.thumbX} onPress={() => removeLessonPhoto(r, idx, u)}><Ionicons name="close" size={12} color="#FFFFFF" /></Pressable></View>))}
                  {l.videoUrl ? (
                    <View style={styles.thumbWrap}>
                      <Pressable style={styles.videoThumb} onPress={() => l.videoUrl && Linking.openURL(l.videoUrl)}><Ionicons name="play-circle" size={24} color="#FFFFFF" /><Text style={styles.videoThumbText}>Video</Text></Pressable>
                      <Pressable style={styles.thumbX} onPress={() => updateLesson(r.rowId, idx, { videoUrl: null })}><Ionicons name="close" size={12} color="#FFFFFF" /></Pressable>
                    </View>
                  ) : null}
                </View>
              ) : null}
              <View style={styles.mediaRow}>
                <Pressable style={styles.mediaBtn} onPress={() => pickVideoSource(r, idx)} disabled={l.savingVideo}>
                  {l.savingVideo ? <ActivityIndicator size="small" color="#0D9488" /> : <Ionicons name={l.videoUrl ? "checkmark-circle" : "videocam-outline"} size={16} color={l.videoUrl ? "#16A34A" : "#0D9488"} />}
                  <Text style={styles.mediaBtnText}>{l.savingVideo ? "Uploading…" : l.videoUrl ? "Video ✓" : "Video"}</Text>
                </Pressable>
                {l.photos.length < 5 ? (
                  <Pressable style={styles.mediaBtn} onPress={() => pickLessonPhoto(r, idx)} disabled={l.savingPhoto}>
                    {l.savingPhoto ? <ActivityIndicator size="small" color="#0D9488" /> : <Ionicons name="camera-outline" size={16} color="#0D9488" />}
                    <Text style={styles.mediaBtnText}>{l.savingPhoto ? "Uploading…" : l.photos.length ? "Add photo" : "Photo"}</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}
          <Pressable style={styles.addLessonBtn} onPress={() => openPicker(r)}>
            <Ionicons name="add" size={18} color="#0D9488" />
            <Text style={styles.addLessonText}>{r.lessons.length ? "Add another lesson" : "Add lesson taught"}</Text>
          </Pressable>
          <TextInput style={styles.note} value={r.note} onChangeText={(t) => patch(r.rowId, { note: t })} placeholder="Comment for the parent (optional)" placeholderTextColor="#9CA3AF" multiline />
        </>
      ) : r.choice === "absent" ? (
        <TextInput style={styles.note} value={r.note} onChangeText={(t) => patch(r.rowId, { note: t })} placeholder="Reason for absence (optional)" placeholderTextColor="#9CA3AF" multiline />
      ) : null}
    </>
  );

  const renderCardBody = (r: Row) => {
    const showInline = !r.marked && r.choice !== null && !r.editing;
    return (
      <>
        <View style={styles.cardTop}>
          <View style={styles.flex}>
            <View style={styles.nameRow}><Text style={styles.name} numberOfLines={1}>{r.studentName}</Text>{r.extra ? <View style={styles.extraTag}><Text style={styles.extraTagText}>Extra</Text></View> : null}</View>
            <Text style={styles.sub} numberOfLines={1}>🤖 {r.courseName} · {time12(r.slotTime)} · {r.sessions} left{r.extra ? " · extra deducts a session" : ""}</Text>
          </View>
          {r.saving ? <ActivityIndicator color="#0D9488" /> : r.marked && !r.editing ? <View style={[styles.markedTag, r.marked === "present" ? styles.tagOk : styles.tagBad]}><Text style={styles.markedText}>{CAP(r.marked)}</Text></View> : null}
        </View>
        {r.marked && !r.editing && (r.savedLessonTitles.length || r.savedNote || r.savedPhotos.length || r.savedActivities.some((a) => a.video)) ? (
          <View style={styles.recorded}>
            {r.savedLessonTitles.map((t, i) => <Text key={i} style={styles.recordedLine} numberOfLines={2}>📘 {t}</Text>)}
            {r.savedNote ? <Text style={styles.recordedLine} numberOfLines={3}>💬 {r.savedNote}</Text> : null}
            {r.savedPhotos.length || r.savedActivities.some((a) => a.video) ? (
              <View style={styles.photoRow}>
                {r.savedPhotos.map((u) => <Image key={u} source={{ uri: u }} style={styles.thumb} />)}
                {r.savedActivities.filter((a) => a.video).map((a, i) => (
                  <Pressable key={`v${i}`} style={styles.videoThumb} onPress={() => a.video && Linking.openURL(a.video)}><Ionicons name="play-circle" size={24} color="#FFFFFF" /><Text style={styles.videoThumbText}>Video</Text></Pressable>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
        {r.marked && !r.editing ? <Text style={styles.editHint}>Hold to {r.extra ? "change or delete" : "change"}</Text> : null}
        {!r.marked && !r.editing && r.extra ? <Text style={styles.editHint}>Hold to delete this extra row</Text> : null}
        {showInline || (!r.marked && !r.editing) ? renderFields(r) : null}
      </>
    );
  };

  // Long-press: marked → open editor; unmarked extra → confirm delete.
  const onRowLongPress = (r: Row) => {
    if (r.marked && !r.editing) { startEdit(r); return; }
    if (r.extra && !r.marked) confirmDeleteExtra(r);
  };
  const confirmDeleteExtra = (row: Row) => {
    Alert.alert("Delete extra row?", `Remove ${row.studentName}'s extra ${row.courseName} entry?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteExtraRow(row) },
    ]);
  };

  const renderRow = (r: Row) => (
    <Pressable key={r.rowId} style={styles.card} onLongPress={() => onRowLongPress(r)} delayLongPress={350}>{renderCardBody(r)}</Pressable>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <TeacherTopBar />
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Mark Attendance</Text>
          <View style={styles.liveTag}><View style={styles.liveDot} /><Text style={styles.liveText}>Live</Text></View>
          <View style={styles.flex} />
          <Pressable hitSlop={8} onPress={() => { setSearchOpen((v) => !v); setSearch(""); }} style={styles.iconBtn}><Ionicons name={searchOpen ? "close" : "search"} size={20} color="#0D9488" /></Pressable>
        </View>
        {searchOpen ? <TextInput style={styles.searchBar} value={search} onChangeText={setSearch} placeholder="Search student — shows their weekly schedule…" placeholderTextColor="#9CA3AF" autoFocus autoCorrect={false} /> : null}
        {!searching ? (
          <>
            <View style={styles.weekHead}>
              <Text style={styles.weekHeadText}>{date.toLocaleDateString("en-MY", { month: "long", year: "numeric" })}</Text>
              <Pressable style={styles.todayBtn} onPress={() => goDay(week.todayIndex)}><Ionicons name="today-outline" size={13} color="#0D9488" /><Text style={styles.todayBtnText}>Today</Text></Pressable>
            </View>
            <View style={styles.weekStrip}>
              {week.dates.map((d, i) => {
                const on = i === dayIndex; const isToday = week.strs[i] === todayStr;
                return (
                  <Pressable key={i} style={[styles.dayChip, on && styles.dayChipOn]} onPress={() => goDay(i)}>
                    <Text style={[styles.dayChipDow, on && styles.dayChipTextOn]}>{DOW_SHORT[i]}</Text>
                    <Text style={[styles.dayChipNum, on && styles.dayChipTextOn]}>{d.getDate()}</Text>
                    {isToday ? <View style={[styles.todayDot, on && styles.todayDotOn]} /> : <View style={styles.todayDotGap} />}
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}
      </View>

      {searching ? (
        weekLoading ? <View style={styles.center}><ActivityIndicator color="#0D9488" /></View> : (
          <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
            {weekGroups.length === 0 ? <Text style={styles.empty}>No student matches your search.</Text> : weekGroups.map((g) => (
              <View key={g.studentName} style={styles.weekCard}>
                <Text style={styles.weekName}>{g.studentName}</Text>
                {g.items.length === 0 ? <Text style={styles.sub}>No classes scheduled this week.</Text> : g.items.map((it, i) => (
                  <Pressable key={i} style={styles.weekItem} onPress={() => { const idx = week.strs.indexOf(it.date); if (idx >= 0) goDay(idx); setSearchOpen(false); setSearch(""); }}>
                    <View style={styles.flex}><Text style={styles.weekItemLabel}>{it.label} · {time12(it.time) || "—"}</Text><Text style={styles.sub} numberOfLines={1}>🤖 {it.courseName}</Text></View>
                    {it.status ? <View style={[styles.markedTag, it.status === "present" ? styles.tagOk : it.status === "absent" ? styles.tagBad : styles.tagWarn]}><Text style={styles.markedText}>{CAP(it.status)}</Text></View>
                      : <View style={styles.markBtn}><Ionicons name="chevron-forward" size={14} color="#0D9488" /><Text style={styles.markBtnText}>Mark</Text></View>}
                  </Pressable>
                ))}
              </View>
            ))}
            <View style={{ height: 40 }} />
          </ScrollView>
        )
      ) : loading ? <View style={styles.center}><ActivityIndicator color="#0D9488" /></View>
        : err ? <View style={styles.center}><Text style={styles.err}>{err}</Text></View>
        : (
          <ScrollView ref={pagerRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onPagerScrollEnd} contentOffset={{ x: dayIndex * width, y: 0 }} onLayout={() => pagerRef.current?.scrollTo({ x: dayIndex * width, animated: false })} style={styles.flex}>
            {week.dates.map((d, i) => {
              const pageRows = rows.filter((r) => r.date === week.strs[i]);
              return (
                <View key={i} style={{ width }}>
                  <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
                    <Pressable style={styles.extraBtn} onPress={() => { setExtraOpen(true); setExtraStudent(null); setExtraQuery(""); }}><Ionicons name="add-circle" size={18} color="#0D9488" /><Text style={styles.extraBtnText}>Extra class attendance</Text></Pressable>
                    {pageRows.length === 0 ? <Text style={styles.empty}>No classes scheduled on {d.toLocaleDateString("en-MY", { weekday: "long" })}.</Text> : pageRows.map(renderRow)}
                    <View style={{ height: 100 }} />
                  </ScrollView>
                </View>
              );
            })}
          </ScrollView>
        )}

      {!loading && !err && !searching && pendingCount > 0 ? (
        <View style={styles.footer}>
          <Pressable style={styles.saveBtn} onPress={saveAll}><Ionicons name="checkmark-done" size={18} color="#FFFFFF" /><Text style={styles.saveText}>Save ({pendingCount})</Text></Pressable>
        </View>
      ) : null}

      {editRow ? (
        <KeyboardAvoidingView style={styles.editOverlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => cancelEdit(editRow)} />
          <View style={styles.editCard}>
            <View style={styles.editHead}>
              <View style={styles.flex}><Text style={styles.name} numberOfLines={1}>{editRow.studentName}</Text><Text style={styles.sub} numberOfLines={1}>🤖 {editRow.courseName} · {time12(editRow.slotTime)}</Text></View>
              <Pressable hitSlop={8} onPress={() => cancelEdit(editRow)}><Ionicons name="close" size={22} color="#6B7280" /></Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" style={styles.editScroll} contentContainerStyle={styles.editScrollBody}>
              {renderFields(editRow)}
              <Text style={styles.editTip}>{REMOVE_ENABLED ? "Tip: tap the selected status again to clear it, then Save to remove the mark." : "Tip: pick the correct status and Save to switch it."}</Text>
            </ScrollView>
            <View style={styles.editActions}>
              <Pressable style={styles.editGhost} onPress={() => cancelEdit(editRow)}><Text style={styles.editGhostText}>Cancel</Text></Pressable>
              {editRow.extra ? <Pressable style={styles.editRemove} onPress={() => deleteExtraRow(editRow)}><Ionicons name="trash-outline" size={15} color="#DC2626" /><Text style={styles.editRemoveText}>Delete</Text></Pressable> : null}
              <Pressable style={[styles.editSave, editRow.saving && styles.saveBtnOff]} disabled={editRow.saving} onPress={() => commitRow(editRow)}>{editRow.saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.editSaveText}>{editRow.choice || !REMOVE_ENABLED ? "Save" : "Remove mark"}</Text>}</Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      ) : null}

      <Modal visible={!!picker} transparent animationType="slide" onRequestClose={() => setPicker(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPicker(null)} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHead}><Text style={styles.modalTitle}>Choose lesson</Text><Pressable hitSlop={8} onPress={() => setPicker(null)}><Ionicons name="close" size={22} color="#6B7280" /></Pressable></View>
          <TextInput style={styles.search} value={pickerQuery} onChangeText={setPickerQuery} placeholder="Search the list, or type your own…" placeholderTextColor="#9CA3AF" autoCorrect={false} />
          {pickerLoading ? <View style={styles.center}><ActivityIndicator color="#0D9488" /></View> : (() => {
            const typed = pickerQuery.trim();
            const filtered = pickerList.filter((l) => l.title.toLowerCase().includes(typed.toLowerCase()));
            const exact = pickerList.some((l) => l.title.toLowerCase() === typed.toLowerCase());
            return (
              <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
                {typed && !exact ? (<Pressable style={styles.useTypedRow} onPress={() => chooseLesson(typed, coordOf(typed))}><Ionicons name="create-outline" size={18} color="#0D9488" /><Text style={styles.useTypedText} numberOfLines={2}>Use “{typed}”</Text></Pressable>) : null}
                {pickerList.length === 0 ? <Text style={styles.empty}>No lesson list for this class — type the lesson above and tap “Use”.</Text>
                  : filtered.length === 0 && !typed ? null
                  : filtered.map((l) => (<Pressable key={l.id} style={styles.lessonRow} onPress={() => chooseLesson(l.title, coordOf(l.title))}><Text style={styles.lessonRowText} numberOfLines={2}>{l.title}</Text></Pressable>))}
                <View style={{ height: 24 }} />
              </ScrollView>
            );
          })()}
        </View>
      </Modal>

      <Modal visible={extraOpen} transparent animationType="slide" onRequestClose={() => setExtraOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setExtraOpen(false)} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHead}><Text style={styles.modalTitle}>{extraStudent ? "Which class?" : `Extra · ${date.toLocaleDateString("en-MY", { weekday: "short", day: "numeric" })}`}</Text><Pressable hitSlop={8} onPress={() => setExtraOpen(false)}><Ionicons name="close" size={22} color="#6B7280" /></Pressable></View>
          {!extraStudent ? (
            <>
              <TextInput style={styles.search} value={extraQuery} onChangeText={setExtraQuery} placeholder="Search student…" placeholderTextColor="#9CA3AF" autoFocus autoCorrect={false} />
              <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
                {allStudents.filter((s) => s.name.toLowerCase().includes(extraQuery.trim().toLowerCase())).slice(0, 40).map((s) => (<Pressable key={s.id} style={styles.lessonRow} onPress={() => pickExtraStudent(s)}><Text style={styles.lessonRowText}>{s.name}</Text></Pressable>))}
                <View style={{ height: 24 }} />
              </ScrollView>
            </>
          ) : extraLoading ? <View style={styles.center}><ActivityIndicator color="#0D9488" /></View> : (
            <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
              <Pressable style={styles.backRow} onPress={() => setExtraStudent(null)}><Ionicons name="chevron-back" size={16} color="#0D9488" /><Text style={styles.browseText}>{extraStudent.name}</Text></Pressable>
              {extraEnrs.length === 0 ? <Text style={styles.empty}>No active classes for this student.</Text> : extraEnrs.map((e) => (<Pressable key={e.id} style={styles.lessonRow} onPress={() => addExtra(e)}><Text style={styles.lessonRowText}>🤖 {e.courseName}</Text><Text style={styles.sub}>{time12(e.time)} · {e.sessions} left</Text></Pressable>))}
              <View style={{ height: 24 }} />
            </ScrollView>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Green when done, grey when not — tap to toggle.
function Tick({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.tick, on ? styles.tickOn : styles.tickOff]} onPress={onPress}>
      <Ionicons name={on ? "checkmark" : "add"} size={13} color={on ? "#FFFFFF" : "#9CA3AF"} />
      <Text style={[styles.tickText, on ? styles.tickTextOn : styles.tickTextOff]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F8FA" },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  err: { color: "#B91C1C", fontSize: 14, textAlign: "center", lineHeight: 20 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, gap: 8 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 24, fontWeight: "800", color: "#0F172A" },
  iconBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#E6FAF9", alignItems: "center", justifyContent: "center" },
  liveTag: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#DCFCE7", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#16A34A" },
  liveText: { fontSize: 11, fontWeight: "800", color: "#166534" },
  searchBar: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: "#111827", backgroundColor: "#FFFFFF" },
  weekHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  weekHeadText: { fontSize: 13, fontWeight: "800", color: "#6B7280" },
  todayBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: "#E6FAF9" },
  todayBtnText: { fontSize: 12, fontWeight: "800", color: "#0D9488" },
  weekStrip: { flexDirection: "row", gap: 5 },
  dayChip: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#EEF0F6", gap: 2 },
  dayChipOn: { backgroundColor: "#0D9488", borderColor: "#0D9488" },
  dayChipDow: { fontSize: 11, fontWeight: "700", color: "#9CA3AF" },
  dayChipNum: { fontSize: 16, fontWeight: "800", color: "#111827" },
  dayChipTextOn: { color: "#FFFFFF" },
  todayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#F59E0B" },
  todayDotOn: { backgroundColor: "#FFFFFF" },
  todayDotGap: { width: 5, height: 5 },
  list: { padding: 12 },
  empty: { textAlign: "center", color: "#9CA3AF", fontSize: 14, marginTop: 30 },
  extraBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: "#0D9488", borderStyle: "dashed", marginBottom: 12, backgroundColor: "#F0FDFA" },
  extraBtnText: { fontSize: 14, fontWeight: "800", color: "#0D9488" },
  card: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, marginBottom: 10, gap: 10, borderWidth: 1, borderColor: "#EEF0F6" },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { fontSize: 15, fontWeight: "800", color: "#111827" },
  extraTag: { backgroundColor: "#E0F2FE", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  extraTagText: { fontSize: 10, fontWeight: "800", color: "#0369A1" },
  sub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  markedTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  tagOk: { backgroundColor: "#D1FAE5" },
  tagBad: { backgroundColor: "#FEE2E2" },
  tagWarn: { backgroundColor: "#FEF3C7" },
  markedText: { fontSize: 12, fontWeight: "800", color: "#111827" },
  recorded: { backgroundColor: "#F9FAFB", borderRadius: 10, padding: 10, gap: 6 },
  recordedLine: { fontSize: 12, color: "#374151", lineHeight: 17 },
  editHint: { fontSize: 11, color: "#9CA3AF", fontStyle: "italic" },
  statusRow: { flexDirection: "row", gap: 8 },
  statusChip: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: "#F3F4F6" },
  chipPresentOn: { backgroundColor: "#16A34A" },
  chipAbsentOn: { backgroundColor: "#DC2626" },
  statusChipText: { fontSize: 13, fontWeight: "800", color: "#374151" },
  statusChipTextOn: { color: "#FFFFFF" },
  lessonBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: "#F9FAFB" },
  lessonBtnText: { flex: 1, fontSize: 14, fontWeight: "600", color: "#111827" },
  lessonPlaceholder: { color: "#9CA3AF", fontWeight: "400" },
  browseText: { fontSize: 13, fontWeight: "800", color: "#0D9488" },
  lessonCard: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 10, backgroundColor: "#FBFDFC", gap: 8 },
  lessonCardTop: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  lessonCardTitle: { flex: 1, fontSize: 13, fontWeight: "700", color: "#111827", lineHeight: 18 },
  typedNote: { fontSize: 11, color: "#9CA3AF", fontStyle: "italic" },
  tickRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tick: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8 },
  tickOn: { backgroundColor: "#16A34A" },
  tickOff: { backgroundColor: "#F3F4F6" },
  tickText: { fontSize: 12, fontWeight: "800" },
  tickTextOn: { color: "#FFFFFF" },
  tickTextOff: { color: "#9CA3AF" },
  mediaRow: { flexDirection: "row", gap: 8 },
  mediaBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: "#E6FAF9" },
  mediaBtnText: { fontSize: 12, fontWeight: "800", color: "#0D9488" },
  addLessonBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 11, borderRadius: 10, borderWidth: 1.5, borderColor: "#0D9488", borderStyle: "dashed", backgroundColor: "#F0FDFA" },
  addLessonText: { fontSize: 13, fontWeight: "800", color: "#0D9488" },
  useTypedRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 13, paddingHorizontal: 10, borderRadius: 10, backgroundColor: "#F0FDFA", marginBottom: 6 },
  useTypedText: { flex: 1, fontSize: 14, fontWeight: "800", color: "#0D9488" },
  markBtn: { flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: "#E6FAF9" },
  markBtnText: { fontSize: 12, fontWeight: "800", color: "#0D9488" },
  note: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: "#111827", backgroundColor: "#F9FAFB", minHeight: 42 },
  photoRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  thumbWrap: { position: "relative" },
  thumb: { width: 54, height: 54, borderRadius: 8, backgroundColor: "#E5E7EB" },
  videoThumb: { width: 54, height: 54, borderRadius: 8, backgroundColor: "#0F172A", alignItems: "center", justifyContent: "center", gap: 1 },
  videoThumbText: { fontSize: 9, fontWeight: "800", color: "#FFFFFF" },
  thumbX: { position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: "#111827", alignItems: "center", justifyContent: "center" },
  addPhoto: { width: 54, height: 54, borderRadius: 8, borderWidth: 1.5, borderColor: "#0D9488", borderStyle: "dashed", alignItems: "center", justifyContent: "center", backgroundColor: "#F0FDFA" },
  addPhotoText: { fontSize: 10, fontWeight: "700", color: "#0D9488" },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#EEF0F6" },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#0D9488", height: 52, borderRadius: 14 },
  saveBtnOff: { opacity: 0.4 },
  saveText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  editRemove: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 12, backgroundColor: "#FEF2F2" },
  editRemoveText: { fontSize: 14, fontWeight: "800", color: "#DC2626" },
  swipeDelete: { backgroundColor: "#DC2626", justifyContent: "center", alignItems: "center", width: 92, marginBottom: 10, borderRadius: 14, gap: 3 },
  swipeDeleteText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  editOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15,23,42,0.55)", justifyContent: "center", paddingHorizontal: 18, paddingVertical: 40 },
  editCard: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 18, gap: 14, maxHeight: "82%" },
  editHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  editScroll: { flexGrow: 0 },
  editScrollBody: { gap: 12, paddingVertical: 4 },
  editTip: { fontSize: 11, color: "#9CA3AF", lineHeight: 16, marginTop: 2 },
  editActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  editGhost: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, backgroundColor: "#F3F4F6" },
  editGhostText: { fontSize: 14, fontWeight: "800", color: "#374151" },
  editSave: { flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: 12, backgroundColor: "#0D9488" },
  editSaveText: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
  weekCard: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, marginBottom: 10, gap: 8, borderWidth: 1, borderColor: "#EEF0F6" },
  weekName: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  weekItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  weekItemLabel: { fontSize: 13, fontWeight: "700", color: "#111827" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.4)" },
  modalSheet: { position: "absolute", left: 0, right: 0, bottom: 0, height: "72%", backgroundColor: "#FFFFFF", borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16 },
  modalHandle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: "#E5E7EB", marginBottom: 12 },
  modalHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  search: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: "#111827", backgroundColor: "#F9FAFB", marginBottom: 10 },
  modalList: { flex: 1 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 8 },
  lessonRow: { paddingVertical: 13, paddingHorizontal: 10, borderRadius: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6", gap: 2 },
  lessonRowText: { fontSize: 14, color: "#111827", fontWeight: "600", lineHeight: 19 },
});
