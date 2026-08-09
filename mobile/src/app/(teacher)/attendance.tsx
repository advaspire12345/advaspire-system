import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, Keyboard, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRole } from "@/contexts/role";
import { supabase } from "@/lib/supabase";
import { polishComment } from "@/lib/api";
import { mobileApi } from "@/lib/api";
import { streamUploadToStorage } from "@/lib/uploadFile";
import { MediaGallery, type MediaItem } from "@/components/MediaGallery";
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
  savedActivities: { lesson: string; photos: string[]; video: string | null; learnt?: boolean; m1?: boolean; m2?: boolean; m3?: boolean }[];
  savedNote: string;
  savedPhotos: string[];
  choice: Status | null;
  editing: boolean;
  lessons: LessonMark[];
  note: string;
  photos: string[];
  saving: boolean;
  // Per-lesson skill ratings (0–5, 0 = not rated) → lesson_ratings. Powers the
  // parent Skills bars + lesson-feedback dots.
  effort: number;
  knowledge: number;
  behaviour: number;
  // Set when a parent moved this session: movedFrom marks a makeup landing on this
  // date, movedTo marks the original date the class left (kept visible, not markable).
  movedFrom?: string | null;
  movedTo?: string | null;
};
type WeekItem = { date: string; label: string; time: string | null; courseName: string; status: string | null };
type WeekGroup = { studentId: string; studentName: string; items: WeekItem[] };

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

// Group already-time-sorted rows into consecutive same-time-slot buckets.
function groupByTime<T extends { slotTime: string | null }>(rs: T[]): { time: string | null; rows: T[] }[] {
  const out: { time: string | null; rows: T[] }[] = [];
  for (const r of rs) {
    const last = out[out.length - 1];
    if (last && last.time === r.slotTime) last.rows.push(r);
    else out.push({ time: r.slotTime, rows: [r] });
  }
  return out;
}

function ymd(d: Date): string { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function hhmm(d: Date): string { return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; }
function time12(t: string | null): string {
  if (!t) return "";
  const [h, m] = t.split(":").map((n) => parseInt(n, 10));
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
// Monday-anchored current week (Mon..Sun) + today's index within it.
// How many weeks (negative = past) a date is from the current week's Monday.
function weekOffsetForDate(dateStr: string): number {
  const mondayOf = (d: Date) => { const x = new Date(d); const dow = x.getDay(); x.setDate(x.getDate() + (dow === 0 ? -6 : 1 - dow)); x.setHours(0, 0, 0, 0); return x; };
  const diff = (mondayOf(new Date(dateStr + "T00:00:00")).getTime() - mondayOf(new Date()).getTime()) / 86400000;
  return Math.round(diff / 7);
}
function currentWeek(offset = 0): { dates: Date[]; strs: string[]; todayIndex: number } {
  const today = new Date();
  today.setDate(today.getDate() + offset * 7); // offset weeks (negative = past)
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

// Read a local file URI into bytes. `fetch(uri).arrayBuffer()` is far leaner than the
// old XHR→Blob→base64 path (which made ~3 in-memory copies and failed on bigger clips);
// this makes one copy and handles much larger videos. Falls back to XHR→Blob→base64 if
// arrayBuffer isn't available. Pure JS — no native module, OTA-safe.
async function uriToBytes(uri: string): Promise<Uint8Array> {
  try {
    const res = await fetch(uri);
    if (typeof res.arrayBuffer === "function") {
      const buf = await res.arrayBuffer();
      if (buf && (buf as ArrayBuffer).byteLength) return new Uint8Array(buf);
    }
  } catch { /* fall through to the legacy reader */ }
  return new Promise<Uint8Array>((resolve, reject) => {
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

const MAX_VIDEO_MB = 50; // Supabase free-tier per-file cap; the fallback read guards on it.
async function readBytesFromUri(uri: string): Promise<Uint8Array> {
  const bytes = await uriToBytes(uri);
  if (!bytes.length) throw new Error("The video file couldn't be read on this device.");
  if (bytes.length > MAX_VIDEO_MB * 1024 * 1024) throw new Error(`This video is over ${MAX_VIDEO_MB}MB even after compression. Please record a shorter clip.`);
  return bytes;
}

// Streaming (expo-file-system) + compression (react-native-compressor) are NATIVE and
// crash HARD on a build that lacks them (new RN arch — NOT JS-catchable). Gated behind
// STREAM_VIDEO: FALSE for the current OTA build; flip to true ONLY in a fresh build that
// bundles those modules. While false, nothing here touches a native module.
const STREAM_VIDEO = true;

async function maybeCompress(uri: string): Promise<string> {
  if (!STREAM_VIDEO) return uri;
  try {
    const { Video } = require("react-native-compressor");
    if (typeof Video?.compress !== "function") return uri;
    const out = await Video.compress(uri, { compressionMethod: "auto" });
    return out || uri;
  } catch { return uri; }
}

// Upload a lesson video. Current build: pure in-memory (≤50MB). Fresh build
// (STREAM_VIDEO=true): compress → stream from disk (large-file safe).
async function uploadVideoFile(studentId: string, asset: ImagePicker.ImagePickerAsset): Promise<string> {
  const uri = await maybeCompress(asset.uri);
  const compressed = uri !== asset.uri;
  const ext = compressed ? "mp4" : ((asset.uri.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4");
  const path = `${studentId}/video-${Date.now()}.${ext}`;
  const contentType = compressed ? "video/mp4" : (asset.mimeType || "video/mp4");
  if (STREAM_VIDEO) {
    try {
      return await streamUploadToStorage("student-uploads", path, uri, contentType);
    } catch (e) {
      if ((e as { fatal?: boolean })?.fatal) throw e; // real server/auth error → surface it
      // else fall through to in-memory
    }
  }
  const bytes = await readBytesFromUri(uri);
  const { error } = await supabase.storage.from("student-uploads").upload(path, bytes, { contentType, upsert: false });
  if (error) throw error;
  return supabase.storage.from("student-uploads").getPublicUrl(path).data.publicUrl;
}

export default function TeacherAttendance() {
  const { staff } = useRole();
  const { width, height: winH } = useWindowDimensions();
  // Week is navigable: 0 = this week, -1 = last week … back to MAX_WEEKS_BACK, so a
  // mistake from a previous week can be corrected on mobile (was current-week-only).
  const MAX_WEEKS_BACK = -12;
  const [weekOffset, setWeekOffset] = useState(0);
  const week = useMemo(() => currentWeek(weekOffset), [weekOffset]);
  const [dayIndex, setDayIndex] = useState(week.todayIndex);
  const weekLabel = weekOffset === 0 ? "This week" : weekOffset === -1 ? "Last week"
    : `${week.dates[0].getDate()} ${week.dates[0].toLocaleDateString("en-MY", { month: "short" })} – ${week.dates[6].getDate()} ${week.dates[6].toLocaleDateString("en-MY", { month: "short" })}`;
  // Only this week + last week can be edited on mobile; older weeks are view-only.
  const canEdit = weekOffset >= -1;
  // Refs so delayed scroll callbacks read the CURRENT week/day (not a stale closure).
  const weekRef = useRef(week); useEffect(() => { weekRef.current = week; }, [week]);
  const dayIndexRef = useRef(dayIndex); useEffect(() => { dayIndexRef.current = dayIndex; }, [dayIndex]);
  const landDay = useRef<string | null>(null); // date to land on after a week change (search)
  const landDayIdx = useRef<number | null>(null); // day index to land on after a swipe across weeks
  const dstr = week.strs[dayIndex];
  const date = week.dates[dayIndex];
  const pagerRef = useRef<ScrollView>(null);
  const dayScrollRefs = useRef<Record<number, ScrollView | null>>({});
  const dayScrollY = useRef<Record<number, number>>({});
  const noteRefs = useRef<Record<string, TextInput | null>>({});
  // Scroll-to + flash a student's row after tapping their slot in search results.
  const rowRefs = useRef<Record<string, View | null>>({});
  const pagerAreaRef = useRef<View>(null); // wraps the day pager → its window Y = content viewport top
  const pendingScroll = useRef<{ studentId: string; date: string; time: string | null } | null>(null);
  const [flashRowId, setFlashRowId] = useState<string | null>(null);
  const scrollToPending = () => {
    const t = pendingScroll.current;
    if (!t) return;
    const wk = weekRef.current; // read via ref — the target week may have just loaded
    const idx = wk.strs.indexOf(t.date);
    if (idx < 0) return; // target week not loaded yet → a later retry will catch it
    // Make sure the pager is showing that day first.
    if (idx !== dayIndexRef.current) { setDayIndex(idx); pagerRef.current?.scrollTo({ x: (idx + 1) * width, animated: false }); }
    const rows2 = rowsRef.current;
    const row = rows2.find((r) => r.studentId === t.studentId && r.date === t.date && (t.time == null || r.slotTime === t.time))
      ?? rows2.find((r) => r.studentId === t.studentId && r.date === t.date);
    const sv = dayScrollRefs.current[idx];
    const el = row ? rowRefs.current[row.rowId] : null;
    const area = pagerAreaRef.current;
    if (!row || !sv || !el || !area) return;
    // Window-coordinate delta: row's screen-Y minus the day list's top edge, plus the
    // current scroll offset, gives the row's true content Y. Robust on old + new arch
    // and while the horizontal pager is still animating (vertical Y is stable).
    area.measure((_ax, _ay, _aw, _ah, _apx, viewportTop) => {
      el.measure((_x, _y, _w, _h, _px, rowWindowY) => {
        if (!pendingScroll.current || rowWindowY === 0) return; // 0 = not laid out yet → let a later retry fire
        const cur = dayScrollY.current[idx] ?? 0;
        sv.scrollTo({ y: Math.max(0, rowWindowY - viewportTop + cur - 90), animated: true });
        pendingScroll.current = null;
        setFlashRowId(row.rowId);
        setTimeout(() => setFlashRowId((c) => (c === row.rowId ? null : c)), 2400);
      });
    });
  };
  const kbHeight = useRef(0);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", (e) => { kbHeight.current = e.endCoordinates?.height ?? 0; });
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => { kbHeight.current = 0; });
    return () => { show.remove(); hide.remove(); };
  }, []);
  // Position the FOCUSED comment/reason field just above the keyboard, for any row.
  // Uses window coords + keyboard height (works with both pan & resize), scrolling by
  // the delta from the current offset. Runs a couple of times to beat keyboard animation.
  const scrollNoteIntoView = (rowId: string) => {
    const run = () => {
      const input = noteRefs.current[rowId];
      const sv = dayScrollRefs.current[dayIndex];
      if (!input || !sv || !kbHeight.current) return;
      input.measure((_x, _y, _w, h, _px, py) => {
        const kbTop = winH - kbHeight.current;
        const cur = dayScrollY.current[dayIndex] ?? 0;
        const delta = (py + h) - (kbTop - 28); // input bottom → 28px above keyboard
        sv.scrollTo({ y: Math.max(0, cur + delta), animated: true });
      });
    };
    setTimeout(run, 220);
    setTimeout(run, 480);
  };

  const [rows, setRows] = useState<Row[]>([]); // holds ALL 7 days; pages filter by date
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [allStudents, setAllStudents] = useState<{ id: string; name: string }[]>([]);

  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [weekGroups, setWeekGroups] = useState<WeekGroup[]>([]);
  const [weekLoading, setWeekLoading] = useState(false);

  const lessonCache = useRef<Map<string, Lesson[]>>(new Map());
  const [preview, setPreview] = useState<string | null>(null); // full-screen photo preview (edit card)
  const [gallery, setGallery] = useState<{ items: MediaItem[]; index: number } | null>(null); // saved-card media gallery
  // All of a saved row's media (per-lesson photos + video), in display order.
  const rowMedia = (r: Row): MediaItem[] => {
    const out: MediaItem[] = [];
    for (const a of r.savedActivities) {
      for (const p of a.photos) out.push({ type: "photo", url: p });
      if (a.video) out.push({ type: "video", url: a.video });
    }
    for (const p of r.savedPhotos) if (!out.some((m) => m.url === p)) out.push({ type: "photo", url: p });
    return out;
  };
  const openGallery = (r: Row, url: string) => { const items = rowMedia(r); const idx = Math.max(0, items.findIndex((m) => m.url === url)); setGallery({ items, index: idx }); };

  // Drop a mis-uploaded photo/video off an ALREADY SAVED attendance. Rewrites the
  // activities JSON in place — the storage object is left alone (harmless, and other
  // rows may reference the same URL).
  const removeSavedMedia = (r: Row, actIdx: number, url: string, kind: "photo" | "video") => {
    if (!r.attendanceId) return;
    Alert.alert(
      kind === "video" ? "Remove video" : "Remove photo",
      kind === "video" ? "Remove this video from the lesson? The parent will no longer see it." : "Remove this photo from the lesson?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: async () => {
          const next = r.savedActivities.map((a, i) =>
            i !== actIdx ? a : kind === "video" ? { ...a, video: null } : { ...a, photos: a.photos.filter((p) => p !== url) });
          const { error } = await supabase.from("attendance")
            .update({ activities: next.map((a) => ({ lesson: a.lesson, mission: "", photos: a.photos, video: a.video, learnt: a.learnt, m1: a.m1, m2: a.m2, m3: a.m3 })), updated_at: new Date().toISOString() })
            .eq("id", r.attendanceId as string);
          if (error) { Alert.alert("Couldn't remove", error.message); return; }
          setRows((prev) => prev.map((x) => (x.rowId === r.rowId ? { ...x, savedActivities: next } : x)));
        } },
      ],
    );
  };
  const [picker, setPicker] = useState<{ rowId: string; courseId: string } | null>(null);
  const [pickerList, setPickerList] = useState<Lesson[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  // Coordinates the picked student has ALREADY learnt (to tag them in the picker).
  const [learntCoords, setLearntCoords] = useState<Set<string>>(new Set());
  // `${rowId}:${lessonIdx}:photo|video` while uploading media to a SAVED attendance.
  const [savedMediaBusy, setSavedMediaBusy] = useState<string | null>(null);

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
      .from("enrollments").select("id, student_id, day_of_week, start_time, schedule, sessions_remaining, pool_id, pool:shared_session_pools(sessions_remaining), course:courses(id, name, lesson_catalog)")
      .in("student_id", ids).eq("status", "active").is("deleted_at", null);
    const enrList = enrs ?? [];

    // Pooled students share a pool — show each one their equal-split of the pool's
    // sessions (exactly like the web), not the raw enrollment number.
    const poolIds = [...new Set(enrList.map((e) => (e as { pool_id?: string | null }).pool_id).filter(Boolean) as string[])];
    const poolOrder = new Map<string, string[]>(); // poolId → studentIds by joined_at
    if (poolIds.length) {
      const { data: members } = await supabase.from("pool_students").select("pool_id, student_id, joined_at").in("pool_id", poolIds).order("joined_at", { ascending: true });
      for (const m of members ?? []) { const pid = m.pool_id as string; const arr = poolOrder.get(pid) ?? []; arr.push(m.student_id as string); poolOrder.set(pid, arr); }
    }
    const sessionsFor = (e: { sessions_remaining?: number | null; student_id?: string; pool_id?: string | null; pool?: { sessions_remaining?: number } | null }): number => {
      const poolId = e.pool_id ?? null;
      const pool = e.pool ?? null;
      if (!poolId || !pool) return Number(e.sessions_remaining ?? 0);
      const order = poolOrder.get(poolId) ?? [];
      const cnt = order.length || 2;
      const poolRemaining = Number(pool.sessions_remaining ?? 0);
      const per = Math.floor(poolRemaining / cnt);
      const pos = order.indexOf(e.student_id as string);
      const remainder = poolRemaining >= 0 ? poolRemaining % cnt : 0;
      return per + (pos >= 0 && pos < remainder ? 1 : 0);
    };

    const enrMeta = new Map<string, { studentId: string; courseId: string; courseName: string; robotics: boolean; startTime: string | null; sessions: number }>();
    enrList.forEach((e) => { const c = e.course as unknown as { id: string; name: string; lesson_catalog: string | null } | null; enrMeta.set(e.id as string, { studentId: e.student_id as string, courseId: c?.id ?? "", courseName: c?.name ?? "Class", robotics: ROBOTICS_CATALOGS.has((c?.lesson_catalog ?? "").toLowerCase()), startTime: (e.start_time as string | null) ?? null, sessions: sessionsFor(e as unknown as { sessions_remaining?: number; student_id?: string; pool_id?: string | null; pool?: { sessions_remaining?: number } | null }) }); });

    // All attendance for the week — keyed by STUDENT (not just active enrollments),
    // so a record already marked on an enrollment that has since EXPIRED/completed
    // still shows here instead of silently vanishing. The embedded enrollment gives
    // us metadata for those non-active enrollments (which aren't in enrMeta).
    const { data: att } = ids.length ? await supabase.from("attendance")
      .select("id, enrollment_id, date, status, notes, activities, project_photos, slot_time, actual_start_time, enrollment:enrollments!inner(student_id, start_time, sessions_remaining, course:courses(id, name, lesson_catalog))")
      .in("enrollment.student_id", ids).gte("date", week.strs[0]).lte("date", week.strs[6]) : { data: [] as any[] };
    const attByKey = new Map<string, any>(); // enrollmentId|date → record (first)
    (att ?? []).forEach((a) => { const k = `${a.enrollment_id}|${a.date}`; if (!attByKey.has(k)) attByKey.set(k, a); });
    const usedAttIds = new Set<string>();

    // Parent-initiated moves touching this week. The class leaves its original date and
    // lands on the new one, so the grid must follow it or the teacher marks the wrong day.
    const { data: resch } = ids.length ? await supabase.from("session_reschedules")
      .select("enrollment_id, original_date, original_slot_time, new_date, new_slot_time")
      .in("enrollment_id", enrList.map((e) => e.id as string))
      .or(`and(original_date.gte.${week.strs[0]},original_date.lte.${week.strs[6]}),and(new_date.gte.${week.strs[0]},new_date.lte.${week.strs[6]})`)
      : { data: [] as any[] };
    const movedOut = new Map<string, string>();                       // enrollmentId|originalDate → newDate
    const movedIn = new Map<string, { time: string; from: string }>(); // enrollmentId|newDate → new time + origin
    for (const r of resch ?? []) {
      movedOut.set(`${r.enrollment_id}|${r.original_date}`, r.new_date as string);
      movedIn.set(`${r.enrollment_id}|${r.new_date}`, { time: String(r.new_slot_time ?? "").slice(0, 5), from: r.original_date as string });
    }

    const built: Row[] = [];
    for (let di = 0; di < 7; di++) {
      const dstrLocal = week.strs[di];
      const weekday = WEEKDAYS[week.dates[di].getDay()];
      for (const e of enrList) {
        const slots = parseSchedule(e.schedule as string | null, e.day_of_week as string | null, e.start_time as string | null);
        const slot = slots.find((s) => s.day === weekday);
        const landing = movedIn.get(`${e.id}|${dstrLocal}`);
        // A makeup lands on a day this enrolment normally has no slot — synthesise one.
        if (!slot && landing) {
          const meta = enrMeta.get(e.id as string)!;
          const rec = attByKey.get(`${e.id}|${dstrLocal}`);
          if (rec) usedAttIds.add(rec.id as string);
          built.push({
            rowId: `${e.id}:${dstrLocal}`, date: dstrLocal, enrollmentId: e.id as string, studentId: meta.studentId,
            studentName: nameById.get(meta.studentId) ?? "Student", courseId: meta.courseId, courseName: meta.courseName, robotics: meta.robotics,
            slotDay: CAP(weekday), slotTime: landing.time || null, sessions: meta.sessions,
            extra: false, marked: (rec?.status as Status) ?? null, attendanceId: (rec?.id as string) ?? null,
            savedLessonTitles: [], savedActivities: [], savedNote: (rec?.notes as string | null) ?? "", savedPhotos: (rec?.project_photos as string[] | null) ?? [],
            choice: null, editing: false, lessons: [], note: "", photos: [], saving: false, effort: 0, knowledge: 0, behaviour: 0,
            movedFrom: landing.from,
          });
          continue;
        }
        if (!slot) continue;
        // Moved away from this day — only the makeup row below is rendered.
        if (movedOut.has(`${e.id}|${dstrLocal}`)) continue;
        const meta = enrMeta.get(e.id as string)!;
        const rec = attByKey.get(`${e.id}|${dstrLocal}`);
        if (rec) usedAttIds.add(rec.id as string);
        const acts = (rec?.activities as { lesson?: string; photos?: string[]; video?: string | null; learnt?: boolean; m1?: boolean; m2?: boolean; m3?: boolean }[] | null) ?? [];
        const savedActs = acts.filter((a) => a.lesson).map((a) => ({ lesson: a.lesson as string, photos: a.photos ?? [], video: a.video ?? null, learnt: a.learnt, m1: a.m1, m2: a.m2, m3: a.m3 }));
        built.push({
          rowId: `${e.id}:${dstrLocal}`, date: dstrLocal, enrollmentId: e.id as string, studentId: meta.studentId,
          studentName: nameById.get(meta.studentId) ?? "Student", courseId: meta.courseId, courseName: meta.courseName, robotics: meta.robotics,
          slotDay: CAP(weekday), slotTime: slot.time, sessions: meta.sessions,
          extra: false, marked: (rec?.status as Status) ?? null, attendanceId: (rec?.id as string) ?? null,
          savedLessonTitles: savedActs.map((a) => a.lesson), savedActivities: savedActs, savedNote: (rec?.notes as string | null) ?? "", savedPhotos: (rec?.project_photos as string[] | null) ?? [],
          choice: null, editing: false, lessons: [], note: "", photos: [], saving: false, effort: 0, knowledge: 0, behaviour: 0,
          // Origin day of a moved session stays listed so the teacher knows why the
          // student is absent, but it carries a badge instead of reading as a no-show.
          movedTo: movedOut.get(`${e.id}|${dstrLocal}`) ?? null,
          movedFrom: landing?.from ?? null,
        });
      }
    }
    // Any attendance not tied to a scheduled slot (extra / off-schedule, or on an
    // enrollment that's no longer active) → extra rows. For non-active enrollments
    // there's no enrMeta entry, so fall back to the record's embedded enrollment.
    for (const a of att ?? []) {
      if (usedAttIds.has(a.id as string)) continue;
      let meta = enrMeta.get(a.enrollment_id as string);
      if (!meta) {
        const emb = a.enrollment as unknown as { student_id: string; start_time: string | null; sessions_remaining: number | null; course: { id: string; name: string; lesson_catalog: string | null } | null } | null;
        if (!emb) continue;
        meta = {
          studentId: emb.student_id,
          courseId: emb.course?.id ?? "",
          courseName: emb.course?.name ?? "Class",
          robotics: ROBOTICS_CATALOGS.has((emb.course?.lesson_catalog ?? "").toLowerCase()),
          startTime: emb.start_time ?? null,
          sessions: Number(emb.sessions_remaining ?? 0),
        };
      }
      const acts = (a.activities as { lesson?: string; photos?: string[]; video?: string | null; learnt?: boolean; m1?: boolean; m2?: boolean; m3?: boolean }[] | null) ?? [];
      const savedActs = acts.filter((x) => x.lesson).map((x) => ({ lesson: x.lesson as string, photos: x.photos ?? [], video: x.video ?? null, learnt: x.learnt, m1: x.m1, m2: x.m2, m3: x.m3 }));
      built.push({
        rowId: nextRowId(), date: a.date as string, enrollmentId: a.enrollment_id as string, studentId: meta.studentId,
        studentName: nameById.get(meta.studentId) ?? "Student", courseId: meta.courseId, courseName: meta.courseName, robotics: meta.robotics,
        slotDay: CAP(WEEKDAYS[new Date((a.date as string) + "T00:00:00").getDay()]), slotTime: (a.slot_time as string) || (a.actual_start_time as string) || meta.startTime,
        sessions: meta.sessions, extra: true, marked: (a.status as Status) ?? null, attendanceId: a.id as string,
        savedLessonTitles: savedActs.map((x) => x.lesson), savedActivities: savedActs, savedNote: (a.notes as string | null) ?? "", savedPhotos: (a.project_photos as string[] | null) ?? [],
        choice: null, editing: false, lessons: [], note: "", photos: [], saving: false, effort: 0, knowledge: 0, behaviour: 0,
      });
    }

    built.sort((a, b) => (a.slotTime ?? "").localeCompare(b.slotTime ?? "") || a.studentName.localeCompare(b.studentName));
    setRows(built);
    setLoading(false);
  }, [staff, week]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const changeWeek = (delta: number) => setWeekOffset((o) => Math.min(0, Math.max(MAX_WEEKS_BACK, o + delta)));
  // The week strip is a finger-following 3-page pager (prev / current / next week).
  const stripRef = useRef<ScrollView>(null);
  const [stripW, setStripW] = useState(0);
  const onStripEnd = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    if (!stripW) return;
    const page = Math.round(e.nativeEvent.contentOffset.x / stripW);
    if (page === 1) return;
    const target = Math.min(0, Math.max(MAX_WEEKS_BACK, weekOffset + (page === 0 ? -1 : 1)));
    if (target !== weekOffset) { landDayIdx.current = dayIndexRef.current; setWeekOffset(target); }
    // Recenter to the middle page (bounces back if we hit a bound / the future).
    requestAnimationFrame(() => stripRef.current?.scrollTo({ x: stripW, animated: target === weekOffset }));
  };
  // Keep the strip centred on the current week whenever it (or its width) changes.
  useEffect(() => { if (stripW) requestAnimationFrame(() => stripRef.current?.scrollTo({ x: stripW, animated: false })); }, [weekOffset, stripW]);
  // On week change: reload that week and land on the right day (searched date, a
  // swipe-across landing day, else the same weekday). Pager has a leading sentinel
  // page, so the day at index i sits at x=(i+1)*width.
  useEffect(() => {
    load();
    let idx = week.todayIndex;
    if (landDay.current) { const i = week.strs.indexOf(landDay.current); if (i >= 0) idx = i; landDay.current = null; }
    else if (landDayIdx.current != null) { idx = landDayIdx.current; landDayIdx.current = null; }
    setDayIndex(idx);
    requestAnimationFrame(() => pagerRef.current?.scrollTo({ x: (idx + 1) * width, animated: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

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

  // Search → this week's schedule slots (marked or NOT — so unmarked slots are easy to
  // find & mark) PLUS the student's attendance over the last 12 weeks, latest → oldest.
  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (!searchOpen || !q || !staff?.branchId) { setWeekGroups([]); return; }
    let cancelled = false;
    const run = async () => {
      setWeekLoading(true);
      const matches = allStudents.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 15);
      if (matches.length === 0) { if (!cancelled) { setWeekGroups([]); setWeekLoading(false); } return; }
      const { data: enrs } = await supabase
        .from("enrollments").select("id, student_id, day_of_week, start_time, schedule, course:courses(name)")
        .in("student_id", matches.map((m) => m.id)).eq("status", "active").is("deleted_at", null);
      const enrInfo = new Map<string, { studentId: string; courseName: string }>();
      const enrIds: string[] = [];
      const weekSlots = new Map<string, { date: string; time: string | null; courseName: string; enrollmentId: string }[]>(); // studentId → this-week slots
      for (const e of enrs ?? []) {
        enrIds.push(e.id as string);
        const c = e.course as unknown as { name: string } | null; const name = c?.name ?? "Class";
        enrInfo.set(e.id as string, { studentId: e.student_id as string, courseName: name });
        const arr = weekSlots.get(e.student_id as string) ?? [];
        for (const slot of parseSchedule(e.schedule as string | null, e.day_of_week as string | null, e.start_time as string | null)) {
          const wd = WEEKDAYS.indexOf(slot.day); if (wd < 0) continue;
          const d = week.dates[wd === 0 ? 6 : wd - 1];
          arr.push({ date: ymd(d), time: slot.time, courseName: name, enrollmentId: e.id as string });
        }
        weekSlots.set(e.student_id as string, arr);
      }
      // Attendance: 12 weeks back → split into this-week (for slot status) + past records.
      const start = new Date(week.dates[0]); start.setDate(start.getDate() - 12 * 7);
      const { data: att } = enrIds.length
        ? await supabase.from("attendance").select("enrollment_id, date, status, slot_time").in("enrollment_id", enrIds).gte("date", ymd(start)).order("date", { ascending: false })
        : { data: [] as { enrollment_id: string; date: string; status: string; slot_time: string | null }[] };
      const wkStart = week.strs[0], wkEnd = week.strs[6];
      const thisWeekStatus = new Map<string, string>(); // `${enr}|${date}` → status
      const past: { enrollment_id: string; date: string; status: string; slot_time: string | null }[] = [];
      for (const a of att ?? []) {
        if (a.date >= wkStart && a.date <= wkEnd) { const k = `${a.enrollment_id}|${a.date}`; if (!thisWeekStatus.has(k)) thisWeekStatus.set(k, a.status as string); }
        else past.push(a as { enrollment_id: string; date: string; status: string; slot_time: string | null });
      }
      const fmt = (ds: string) => new Date(ds + "T00:00:00").toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short" });
      const groups: WeekGroup[] = matches.map((s) => {
        const items: WeekItem[] = [];
        for (const sl of weekSlots.get(s.id) ?? []) {
          items.push({ date: sl.date, label: fmt(sl.date), time: sl.time, courseName: sl.courseName, status: thisWeekStatus.get(`${sl.enrollmentId}|${sl.date}`) ?? null });
        }
        for (const a of past) { const info = enrInfo.get(a.enrollment_id); if (info?.studentId !== s.id) continue; items.push({ date: a.date, label: fmt(a.date), time: a.slot_time, courseName: info.courseName, status: a.status }); }
        items.sort((x, y) => y.date.localeCompare(x.date) || (y.time ?? "").localeCompare(x.time ?? ""));
        return { studentId: s.id, studentName: s.name, items };
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
    const baseLessons: LessonMark[] = row.savedActivities.map((a) => ({ ...newLessonMark(a.lesson, coordOf(a.lesson)), photos: a.photos, videoUrl: a.video, learnt: a.learnt ?? false, m1: a.m1 ?? false, m2: a.m2 ?? false, m3: a.m3 ?? false }));
    // Back-compat: marks saved before per-lesson photos kept them on the attendance,
    // not the activity — if there's a single lesson, show them there.
    if (baseLessons.length === 1 && baseLessons[0].photos.length === 0 && row.savedPhotos.length) baseLessons[0].photos = row.savedPhotos;
    setRows((prev) => prev.map((r) => (r.rowId === row.rowId ? { ...r, editing: true, choice: r.marked, lessons: baseLessons, note: r.savedNote, photos: r.savedPhotos, effort: 0, knowledge: 0, behaviour: 0 } : { ...r, editing: false })));
    const coords = baseLessons.map((l) => l.coordinate).filter(Boolean) as string[];
    if (coords.length === 0) return;
    (async () => {
      const [{ data: lp }, { data: lr }] = await Promise.all([
        supabase.from("lesson_progress").select("lesson_coordinate, learnt_status, mission1_status, mission2_status, mission3_status").eq("student_id", row.studentId).in("lesson_coordinate", coords),
        supabase.from("lesson_ratings").select("effort, knowledge, behaviour").eq("student_id", row.studentId).in("lesson_coordinate", coords).limit(1),
      ]);
      const lpMap = new Map((lp ?? []).map((r2) => [r2.lesson_coordinate as string, r2]));
      const rating = (lr ?? [])[0] as { effort: number | null; knowledge: number | null; behaviour: number | null } | undefined;
      setRows((prev) => prev.map((r) => {
        if (r.rowId !== row.rowId || !r.editing) return r;
        return { ...r,
          effort: Number(rating?.effort ?? 0), knowledge: Number(rating?.knowledge ?? 0), behaviour: Number(rating?.behaviour ?? 0),
          lessons: r.lessons.map((l) => {
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
    setLearntCoords(new Set());
    supabase.from("lesson_progress").select("lesson_coordinate, learnt_status").eq("student_id", row.studentId).then(({ data }) => {
      setLearntCoords(new Set((data ?? []).filter((r) => { const s = r.learnt_status as string | null; return !!s && s !== "not_done"; }).map((r) => r.lesson_coordinate as string)));
    });
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
    const opts = { mediaTypes: ["videos"] as ImagePicker.MediaType[], videoMaxDuration: 60, quality: 0.3, videoQuality: 1 as const };
    const res = source === "camera" ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled) return;
    const asset = res.assets[0];
    updateLesson(row.rowId, idx, { savingVideo: true });
    try {
      const publicUrl = await uploadVideoFile(row.studentId, asset);
      updateLesson(row.rowId, idx, { videoUrl: publicUrl, savingVideo: false });
    } catch (e) {
      updateLesson(row.rowId, idx, { savingVideo: false });
      Alert.alert("Couldn't upload video", e instanceof Error ? e.message : "Please try again.");
    }
  };

  // ── Direct media upload straight onto an ALREADY-SAVED present attendance ──
  const uploadImage = async (studentId: string, date: string, asset: ImagePicker.ImagePickerAsset, i: number): Promise<string | null> => {
    if (!asset.base64) return null;
    const ext = (asset.uri.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const contentType = ext === "png" ? "image/png" : "image/jpeg";
    const path = `${studentId}/${date}-${Date.now()}-${i}.${ext}`;
    const { error } = await supabase.storage.from("project-photos").upload(path, base64ToBytes(asset.base64), { contentType, upsert: false });
    if (error) return null;
    return supabase.storage.from("project-photos").getPublicUrl(path).data.publicUrl;
  };
  const uploadVideoAsset = (studentId: string, asset: ImagePicker.ImagePickerAsset): Promise<string> => uploadVideoFile(studentId, asset);
  const persistSaved = async (row: Row, newActs: Row["savedActivities"]) => {
    const photos = newActs.flatMap((a) => a.photos);
    await supabase.from("attendance").update({ activities: newActs, project_photos: photos.length ? photos : null }).eq("id", row.attendanceId);
    const branchId = staff?.branchId;
    if (branchId) {
      const withCoord = newActs.map((a) => ({ a, c: coordOf(a.lesson) })).filter((x) => x.c && (x.a.video || x.a.photos.length));
      if (withCoord.length) {
        await supabase.from("lesson_uploads").upsert(withCoord.map(({ a, c }) => ({ student_id: row.studentId, branch_id: branchId, lesson_coordinate: c!, ...(a.video ? { video_url: a.video } : {}), ...(a.photos[0] ? { image_path: a.photos[0] } : {}), updated_by: staff?.id ?? null, updated_at: new Date().toISOString() })), { onConflict: "student_id,lesson_coordinate" });
      }
    }
    patch(row.rowId, { savedActivities: newActs, savedPhotos: photos, savedLessonTitles: newActs.map((a) => a.lesson) });
  };
  const savedAddPhoto = (row: Row, idx: number) => {
    Alert.alert("Add lesson photo", "Take a new photo or choose one from your gallery.", [
      { text: "Take Photo", onPress: () => doSavedPhoto(row, idx, "camera") },
      { text: "Choose from Gallery", onPress: () => doSavedPhoto(row, idx, "gallery") },
      { text: "Cancel", style: "cancel" },
    ]);
  };
  const doSavedPhoto = async (row: Row, idx: number, source: "camera" | "gallery") => {
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
    setSavedMediaBusy(`${row.rowId}:${idx}:photo`);
    try {
      const urls = [...(row.savedActivities[idx]?.photos ?? [])];
      for (let i = 0; i < res.assets.length && urls.length < 5; i++) { const u = await uploadImage(row.studentId, row.date, res.assets[i], i); if (u) urls.push(u); }
      await persistSaved(row, row.savedActivities.map((a, i) => (i === idx ? { ...a, photos: urls } : a)));
    } catch (e) { Alert.alert("Couldn't upload", e instanceof Error ? e.message : "Please try again."); }
    setSavedMediaBusy(null);
  };
  const savedAddVideo = (row: Row, idx: number) => {
    Alert.alert("Lesson video", "Record a video or choose one from your gallery.", [
      { text: "Record Video", onPress: () => doSavedVideo(row, idx, "camera") },
      { text: "Choose from Gallery", onPress: () => doSavedVideo(row, idx, "gallery") },
      { text: "Cancel", style: "cancel" },
    ]);
  };
  const doSavedVideo = async (row: Row, idx: number, source: "camera" | "gallery") => {
    const perm = source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission needed", source === "camera" ? "Allow camera access to record." : "Allow photo access to pick a video."); return; }
    const opts = { mediaTypes: ["videos"] as ImagePicker.MediaType[], videoMaxDuration: 60, quality: 0.3, videoQuality: 1 as const };
    const res = source === "camera" ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled) return;
    setSavedMediaBusy(`${row.rowId}:${idx}:video`);
    try {
      const url = await uploadVideoAsset(row.studentId, res.assets[0]);
      await persistSaved(row, row.savedActivities.map((a, i) => (i === idx ? { ...a, video: url } : a)));
    } catch (e) { Alert.alert("Couldn't upload video", e instanceof Error ? e.message : "Please try again."); }
    setSavedMediaBusy(null);
  };

  const finishRow = (row: Row, status: Status, lessons: LessonMark[], noteText: string, photos: string[], attId: string | null) => {
    const savedActs = lessons.map((l) => ({ lesson: l.title, photos: l.photos, video: l.videoUrl, learnt: l.learnt, m1: l.m1, m2: l.m2, m3: l.m3 }));
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

  // Skill ratings (0–5) → lesson_ratings, keyed to the first coordinate lesson.
  // Only writes when the trainer actually set a rating (any dimension > 0).
  const writeLessonRatings = async (row: Row, lessons: LessonMark[]) => {
    const branchId = staff?.branchId;
    if (!branchId) return;
    if (row.effort <= 0 && row.knowledge <= 0 && row.behaviour <= 0) return;
    const coord = lessons.find((l) => l.coordinate)?.coordinate;
    if (!coord) return; // no curriculum lesson to key the rating to
    await supabase.from("lesson_ratings").upsert(
      { student_id: row.studentId, branch_id: branchId, lesson_coordinate: coord, effort: row.effort || null, knowledge: row.knowledge || null, behaviour: row.behaviour || null, updated_by: staff?.id ?? null, updated_at: new Date().toISOString() },
      { onConflict: "student_id,lesson_coordinate" },
    );
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
    // Live session change so the count updates the instant you tap (no reload):
    //  →present (new or absent→present) = −1, present→absent = +1, else 0.
    const wasP = prev === "present";
    const isP = status === "present";
    const sessDelta = isP && !wasP ? -1 : wasP && !isP ? 1 : 0;
    const lessons = status === "present" ? row.lessons : [];
    const noteText = row.note.trim();
    const photos = status === "present" ? lessons.flatMap((l) => l.photos) : [];
    // Store each lesson's photos + video ON the activity so editing restores them all.
    const activities = lessons.length ? lessons.map((l) => ({ lesson: l.title, mission: "", photos: l.photos, video: l.videoUrl, learnt: l.learnt, m1: l.m1, m2: l.m2, m3: l.m3 })) : undefined;
    patch(row.rowId, { saving: true });

    if (prev === status && row.attendanceId) {
      const { error } = await supabase.from("attendance").update({ notes: noteText || null, ...(status === "present" ? { activities: activities ?? null, project_photos: photos.length ? photos : null } : {}) }).eq("id", row.attendanceId);
      if (error) { patch(row.rowId, { saving: false }); Alert.alert("Couldn't save", error.message); return; }
      if (status === "present") { await writeLessonProgress(row, lessons); await writeLessonRatings(row, lessons); }
      finishRow(row, status, lessons, noteText, photos, row.attendanceId);
      return;
    }

    const res = await mobileApi<{ attendance?: { id?: string } }>("/api/mobile/attendance/mark", { enrollmentId: row.enrollmentId, date: row.date, status, slotDay: row.slotDay, slotTime: row.slotTime, activities, attendanceId: row.attendanceId ?? undefined });
    if (!res.ok) { patch(row.rowId, { saving: false }); Alert.alert("Couldn't save", res.error); return; }
    const attId = res.data?.attendance?.id ?? row.attendanceId ?? null;
    if (attId && (noteText || photos.length || row.savedNote || row.savedPhotos.length)) {
      await supabase.from("attendance").update({ notes: noteText || null, ...(status === "present" ? { project_photos: photos.length ? photos : null } : {}) }).eq("id", attId);
    }
    if (status === "present") { await writeLessonProgress(row, lessons); await writeLessonRatings(row, lessons); }
    finishRow(row, status, lessons, noteText, photos, attId);
    if (sessDelta !== 0) setRows((prev2) => prev2.map((r) => (r.enrollmentId === row.enrollmentId ? { ...r, sessions: r.sessions + sessDelta } : r)));
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
    const { data: enrs } = await supabase.from("enrollments").select("id, student_id, start_time, sessions_remaining, pool_id, pool:shared_session_pools(sessions_remaining), course:courses(id, name, lesson_catalog)").eq("student_id", s.id).eq("status", "active").is("deleted_at", null);
    const poolIds = [...new Set((enrs ?? []).map((e) => (e as { pool_id?: string | null }).pool_id).filter(Boolean) as string[])];
    const order = new Map<string, string[]>();
    if (poolIds.length) {
      const { data: members } = await supabase.from("pool_students").select("pool_id, student_id, joined_at").in("pool_id", poolIds).order("joined_at", { ascending: true });
      for (const m of members ?? []) { const pid = m.pool_id as string; const arr = order.get(pid) ?? []; arr.push(m.student_id as string); order.set(pid, arr); }
    }
    const share = (e: { sessions_remaining?: number | null; student_id?: string; pool_id?: string | null; pool?: { sessions_remaining?: number } | null }): number => {
      if (!e.pool_id || !e.pool) return Number(e.sessions_remaining ?? 0);
      const o = order.get(e.pool_id) ?? []; const cnt = o.length || 2; const rem = Number(e.pool.sessions_remaining ?? 0);
      const pos = o.indexOf(e.student_id as string); const r = rem >= 0 ? rem % cnt : 0;
      return Math.floor(rem / cnt) + (pos >= 0 && pos < r ? 1 : 0);
    };
    setExtraEnrs((enrs ?? []).map((e) => { const c = e.course as unknown as { id: string; name: string; lesson_catalog: string | null } | null; return { id: e.id as string, courseId: c?.id ?? "", courseName: c?.name ?? "Class", catalog: c?.lesson_catalog ?? null, time: (e.start_time as string | null) ?? null, sessions: share(e as unknown as { sessions_remaining?: number; student_id?: string; pool_id?: string | null; pool?: { sessions_remaining?: number } | null }) }; }));
    setExtraLoading(false);
  };
  const addExtra = (enr: { id: string; courseId: string; courseName: string; catalog: string | null; time: string | null; sessions: number }) => {
    if (!extraStudent) return;
    const newRow: Row = {
      rowId: nextRowId(), date: dstr, enrollmentId: enr.id, studentId: extraStudent.id, studentName: extraStudent.name, courseId: enr.courseId, courseName: enr.courseName, robotics: ROBOTICS_CATALOGS.has((enr.catalog ?? "").toLowerCase()),
      slotDay: CAP(WEEKDAYS[date.getDay()]), slotTime: hhmm(new Date()), sessions: enr.sessions,
      extra: true, marked: null, attendanceId: null, savedLessonTitles: [], savedActivities: [], savedNote: "", savedPhotos: [],
      choice: null, editing: false, lessons: [], note: "", photos: [], saving: false, effort: 0, knowledge: 0, behaviour: 0,
    };
    setRows((prev) => [newRow, ...prev]);
    setExtraOpen(false); setExtraStudent(null); setExtraQuery("");
  };

  // Pages: [prev-week sentinel] [Mon..Sun = pages 1..7] [next-week sentinel]. Day i → x=(i+1)*width.
  // iOS (and only iOS) applies ScrollView's `contentOffset` PROP on every update, so a
  // dayIndex-derived contentOffset used to snap the pager mid-flight while the animated
  // scrollTo below was still running. onMomentumScrollEnd then sampled a half-way offset,
  // rounded it to a neighbouring page and "corrected" dayIndex to the wrong day — or to a
  // sentinel page, which silently flipped the week. Position is now driven imperatively
  // only (see the pager's onLayout), and momentum-end is ignored while we drive it.
  const progScroll = useRef(false);
  const goDay = (i: number) => {
    setDayIndex(i);
    progScroll.current = true;
    pagerRef.current?.scrollTo({ x: (i + 1) * width, animated: true });
    // iOS doesn't reliably emit onMomentumScrollEnd for a programmatic scroll, and a stuck
    // flag would swallow the user's next real swipe — so always release it on a timer.
    setTimeout(() => { progScroll.current = false; }, 500);
  };
  const onPagerScrollEnd = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    if (progScroll.current) { progScroll.current = false; return; } // our own scroll, not the user's
    const page = Math.round(e.nativeEvent.contentOffset.x / width);
    if (page === 0) {
      // Swiped before Monday → previous week, land on its Sunday.
      if (weekOffset > MAX_WEEKS_BACK) { landDayIdx.current = 6; dayScrollY.current = {}; setWeekOffset((o) => o - 1); }
      else pagerRef.current?.scrollTo({ x: 1 * width, animated: true }); // at limit → bounce back
    } else if (page === 8) {
      // Swiped past Sunday → next week, land on its Monday (never into the future).
      if (weekOffset < 0) { landDayIdx.current = 0; dayScrollY.current = {}; setWeekOffset((o) => o + 1); }
      else pagerRef.current?.scrollTo({ x: 7 * width, animated: true }); // this week → bounce back
    } else {
      const d = page - 1;
      if (d !== dayIndex) setDayIndex(d);
    }
  };

  const q = search.trim().toLowerCase();
  const searching = searchOpen && !!q;
  const editRow = rows.find((r) => r.editing) ?? null;
  const [blanksOnly, setBlanksOnly] = useState(false);
  // AI comment rewrite. The suggestion is always reviewed before it replaces the
  // teacher's words — a parent reads this, so nothing is swapped silently.
  const [polishing, setPolishing] = useState<string | null>(null);
  const [polishFor, setPolishFor] = useState<{ rowId: string; original: string; polished: string } | null>(null);

  const runPolish = async (r: Row) => {
    const original = r.note.trim();
    if (!original) { Alert.alert("Nothing to rewrite", "Type your comment first, then tap the sparkle."); return; }
    setPolishing(r.rowId);
    const res = await polishComment(original, r.studentName);
    setPolishing(null);
    if (!res.ok) { Alert.alert("Couldn't rewrite", res.error); return; }
    const polished = res.data.polished.trim();
    if (!polished || polished === original) { Alert.alert("No change needed", "That comment already reads well."); return; }
    setPolishFor({ rowId: r.rowId, original, polished });
  };
  const dayRows = rows.filter((r) => r.date === dstr);
  const pendingCount = dayRows.filter((r) => r.choice && !r.editing).length;
  const todayStr = ymd(new Date());

  // Compact ✓/✗ toggle shown on the right of an unmarked row (keeps rows slim).
  const renderStatusSign = (r: Row) => (
    <View style={styles.signRow}>
      <Pressable style={[styles.signBtn, r.choice === "present" && styles.signPresentOn]} onPress={() => setChoice(r, "present")} hitSlop={4}>
        <Ionicons name="checkmark" size={18} color={r.choice === "present" ? "#FFFFFF" : "#16A34A"} />
      </Pressable>
      <Pressable style={[styles.signBtn, r.choice === "absent" && styles.signAbsentOn]} onPress={() => setChoice(r, "absent")} hitSlop={4}>
        <Ionicons name="close" size={18} color={r.choice === "absent" ? "#FFFFFF" : "#DC2626"} />
      </Pressable>
    </View>
  );

  const renderFields = (r: Row, showStatus = true) => (
    <>
      {showStatus ? (
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
      ) : null}
      {r.choice === "present" ? (
        <>
          {r.lessons.map((l, idx) => (
            <View key={`${l.title}-${idx}`} style={styles.lessonCard}>
              <View style={styles.lessonCardTop}>
                <Text style={styles.lessonCardTitle} numberOfLines={2}>{l.title}</Text>
                <Pressable hitSlop={8} onPress={() => removeLesson(r, idx)}><Ionicons name="close-circle" size={20} color="#CBD5E1" /></Pressable>
              </View>
              <View style={styles.tickRow}>
                <Tick label="Learnt" on={l.learnt} onPress={() => updateLesson(r.rowId, idx, { learnt: !l.learnt })} />
                {r.robotics ? (["m1", "m2", "m3"] as const).map((k, i) => <Tick key={k} label={`M${i + 1}`} on={l[k]} onPress={() => updateLesson(r.rowId, idx, { [k]: !l[k] } as Partial<LessonMark>)} />) : null}
              </View>
              {!l.coordinate ? <Text style={styles.typedNote}>Own lesson — shows in the student's progress.</Text> : null}
              {l.photos.length || l.videoUrl ? (
                <View style={styles.photoRow}>
                  {l.photos.map((u) => (<View key={u} style={styles.thumbWrap}><Image source={{ uri: u }} style={styles.thumb} /><Pressable style={styles.thumbX} onPress={() => removeLessonPhoto(r, idx, u)}><Ionicons name="close" size={12} color="#FFFFFF" /></Pressable></View>))}
                  {l.videoUrl ? (
                    <View style={styles.thumbWrap}>
                      <Pressable style={styles.videoThumb} onPress={() => l.videoUrl && setGallery({ items: [{ type: "video", url: l.videoUrl }], index: 0 })}><Ionicons name="play-circle" size={24} color="#FFFFFF" /><Text style={styles.videoThumbText}>Video</Text></Pressable>
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
          <View style={styles.rateBlock}>
            <Text style={styles.rateTitle}>RATE THIS LESSON <Text style={styles.rateHint}>(shows in the parent&apos;s Skills)</Text></Text>
            <RatingRow label="Effort" value={r.effort} onChange={(v) => patch(r.rowId, { effort: v })} />
            <RatingRow label="Knowledge" value={r.knowledge} onChange={(v) => patch(r.rowId, { knowledge: v })} />
            <RatingRow label="Behaviour" value={r.behaviour} onChange={(v) => patch(r.rowId, { behaviour: v })} />
          </View>
          <View>
            <TextInput ref={(el) => { if (!r.editing) noteRefs.current[r.rowId] = el; }} style={[styles.note, styles.noteWithAi]} value={r.note} onChangeText={(t) => patch(r.rowId, { note: t })} onFocus={() => { if (!r.editing) scrollNoteIntoView(r.rowId); }} placeholder="Comment for the parent (optional)" placeholderTextColor="#9CA3AF" multiline />
            {/* Sparkle sits inside the field, right-hand side. */}
            <Pressable style={styles.aiBtn} onPress={() => runPolish(r)} disabled={polishing === r.rowId} hitSlop={6}>
              {polishing === r.rowId ? <ActivityIndicator size="small" color="#7C3AED" /> : <Ionicons name="sparkles" size={16} color="#7C3AED" />}
            </Pressable>
          </View>
        </>
      ) : r.choice === "absent" ? (
        <TextInput ref={(el) => { if (!r.editing) noteRefs.current[r.rowId] = el; }} style={styles.note} value={r.note} onChangeText={(t) => patch(r.rowId, { note: t })} onFocus={() => { if (!r.editing) scrollNoteIntoView(r.rowId); }} placeholder="Reason for absence (optional)" placeholderTextColor="#9CA3AF" multiline />
      ) : null}
    </>
  );

  const renderCardBody = (r: Row) => {
    const showInline = !r.marked && r.choice !== null && !r.editing;
    return (
      <>
        <View style={styles.cardTop}>
          <View style={styles.flex}>
            <View style={styles.nameRow}><Text style={styles.name} numberOfLines={1}>{r.studentName}</Text>{r.extra ? <View style={styles.extraTag}><Text style={styles.extraTagText}>Extra</Text></View> : null}
                            {r.movedFrom ? <View style={styles.makeupTag}><Text style={styles.makeupTagText}>MAKEUP FROM {r.movedFrom.slice(8)}/{r.movedFrom.slice(5, 7)}</Text></View> : null}</View>
            <Text style={styles.sub} numberOfLines={1}>🤖 {r.courseName} · {time12(r.slotTime)} · {r.sessions} left{r.extra ? " · extra deducts a session" : ""}</Text>
          </View>
          {r.saving ? <ActivityIndicator color="#0D9488" />
            : r.marked && !r.editing ? <View style={[styles.markedTag, r.marked === "present" ? styles.tagOk : styles.tagBad]}><Text style={styles.markedText}>{CAP(r.marked)}</Text></View>
            : !r.marked && !r.editing && canEdit ? renderStatusSign(r)
            : null}
        </View>
        {r.marked === "present" && !r.editing && r.savedActivities.length ? (
          <View style={styles.recorded}>
            {r.savedActivities.map((a, i) => {
              const busyP = savedMediaBusy === `${r.rowId}:${i}:photo`; const busyV = savedMediaBusy === `${r.rowId}:${i}:video`;
              return (
                <View key={i} style={styles.savedLessonCard}>
                  <Text style={styles.recordedLine} numberOfLines={2}>📘 {a.lesson}</Text>
                  {a.photos.length || a.video ? (
                    <View style={styles.photoRow}>
                      {a.photos.map((u) => (
                        <View key={u}>
                          <Pressable onPress={() => openGallery(r, u)}><Image source={{ uri: u }} style={styles.thumb} /></Pressable>
                          {canEdit ? <Pressable style={styles.thumbX} onPress={() => removeSavedMedia(r, i, u, "photo")}><Ionicons name="close" size={12} color="#FFFFFF" /></Pressable> : null}
                        </View>
                      ))}
                      {a.video ? (
                        <View>
                          <Pressable style={styles.videoThumb} onPress={() => a.video && openGallery(r, a.video)}><Ionicons name="play-circle" size={24} color="#FFFFFF" /><Text style={styles.videoThumbText}>Video</Text></Pressable>
                          {/* Wrong clip uploaded → remove it without re-opening the editor. */}
                          {canEdit ? <Pressable style={styles.thumbX} onPress={() => a.video && removeSavedMedia(r, i, a.video, "video")}><Ionicons name="close" size={12} color="#FFFFFF" /></Pressable> : null}
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                  {canEdit ? (
                  <View style={styles.mediaRow}>
                    <Pressable style={styles.mediaBtn} disabled={busyV} onPress={() => savedAddVideo(r, i)}>
                      {busyV ? <ActivityIndicator size="small" color="#0D9488" /> : <Ionicons name={a.video ? "checkmark-circle" : "videocam-outline"} size={16} color={a.video ? "#16A34A" : "#0D9488"} />}
                      <Text style={styles.mediaBtnText}>{busyV ? "Uploading…" : a.video ? "Video ✓" : "Video"}</Text>
                    </Pressable>
                    <Pressable style={styles.mediaBtn} disabled={busyP || a.photos.length >= 5} onPress={() => savedAddPhoto(r, i)}>
                      {busyP ? <ActivityIndicator size="small" color="#0D9488" /> : <Ionicons name="camera-outline" size={16} color="#0D9488" />}
                      <Text style={styles.mediaBtnText}>{busyP ? "Uploading…" : a.photos.length ? "Add photo" : "Photo"}</Text>
                    </Pressable>
                  </View>
                  ) : null}
                </View>
              );
            })}
            {r.savedNote ? <Text style={styles.recordedLine} numberOfLines={3}>💬 {r.savedNote}</Text> : null}
          </View>
        ) : r.marked === "absent" && !r.editing && r.savedNote ? (
          <View style={styles.recorded}><Text style={styles.recordedLine} numberOfLines={3}>💬 {r.savedNote}</Text></View>
        ) : null}
        {r.marked && !r.editing ? <Text style={styles.editHint}>Hold to change {r.extra ? "or delete" : ""}</Text> : null}
        {!r.marked && !r.editing && r.extra ? <Text style={styles.editHint}>Hold to delete this extra row</Text> : null}
        {canEdit && (showInline || (!r.marked && !r.editing)) ? renderFields(r, false) : null}
        {!canEdit && !r.marked && !r.editing ? <Text style={styles.viewOnly}>View only — older than last week</Text> : null}
      </>
    );
  };

  // Long-press: marked → open editor; unmarked extra → confirm delete.
  const onRowLongPress = (r: Row) => {
    if (!canEdit) { Alert.alert("View only", "Attendance older than last week can only be changed on the website."); return; }
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
    <Pressable ref={(el) => { rowRefs.current[r.rowId] = el; }} key={r.rowId} style={[styles.card, flashRowId === r.rowId && styles.cardFlash]} onLongPress={() => onRowLongPress(r)} delayLongPress={350}>{renderCardBody(r)}</Pressable>
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
        {searchOpen ? <TextInput style={styles.searchBar} value={search} onChangeText={setSearch} placeholder="Search student — this week's slots + past attendance…" placeholderTextColor="#9CA3AF" autoFocus autoCorrect={false} /> : null}
        {!searching ? (
          <>
            <View style={styles.weekHead}>
              <Pressable hitSlop={6} disabled={weekOffset <= MAX_WEEKS_BACK} onPress={() => changeWeek(-1)} style={[styles.wkNav, weekOffset <= MAX_WEEKS_BACK && styles.wkNavOff]}><Ionicons name="chevron-back" size={18} color="#0D9488" /></Pressable>
              <Text style={styles.weekHeadText}>{weekLabel}</Text>
              {/* Sits with the week label; hides students already marked. */}
              <Pressable style={[styles.blankChip, blanksOnly && styles.blankChipOn]} onPress={() => setBlanksOnly((v) => !v)}>
                <Text style={[styles.blankChipText, blanksOnly && styles.blankChipTextOn]}>Show blank</Text>
              </Pressable>
              <Pressable hitSlop={6} disabled={weekOffset >= 0} onPress={() => changeWeek(1)} style={[styles.wkNav, weekOffset >= 0 && styles.wkNavOff]}><Ionicons name="chevron-forward" size={18} color="#0D9488" /></Pressable>
              <View style={styles.flex} />
              <Pressable style={styles.todayBtn} onPress={() => { if (weekOffset !== 0) setWeekOffset(0); else goDay(week.todayIndex); }}><Ionicons name="today-outline" size={13} color="#0D9488" /><Text style={styles.todayBtnText}>Today</Text></Pressable>
            </View>
            <View style={styles.weekMetaRow}>
              <Text style={styles.weekTotal}>Day <Text style={{ color: "#16A34A" }}>{dayRows.filter((r) => r.marked === "present").length}</Text> · Week <Text style={{ color: "#16A34A" }}>{rows.filter((r) => r.marked === "present").length}</Text> present</Text>
              {weekOffset === -1 ? <Text style={styles.pastHint}>Last week — still editable</Text> : weekOffset <= -2 ? <Text style={styles.viewOnlyHint}>View only — too old to edit here</Text> : null}
            </View>
            <View onLayout={(e) => { const w = e.nativeEvent.layout.width; if (w && w !== stripW) setStripW(w); }}>
              {stripW > 0 ? (
                <ScrollView ref={stripRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} disableIntervalMomentum directionalLockEnabled contentOffset={{ x: stripW, y: 0 }} onMomentumScrollEnd={onStripEnd} scrollEventThrottle={16}>
                  {[-1, 0, 1].map((o) => {
                    const wk = currentWeek(weekOffset + o);
                    return (
                      <View key={o} style={[styles.weekStrip, { width: stripW }]}>
                        {wk.dates.map((d, i) => {
                          const on = o === 0 && i === dayIndex; const isToday = wk.strs[i] === todayStr;
                          return (
                            <Pressable key={i} style={[styles.dayChip, on && styles.dayChipOn]} onPress={() => { if (o === 0) goDay(i); else { const t = Math.min(0, Math.max(MAX_WEEKS_BACK, weekOffset + o)); if (t !== weekOffset) { landDayIdx.current = i; setWeekOffset(t); } } }}>
                              <Text style={[styles.dayChipDow, on && styles.dayChipTextOn]}>{DOW_SHORT[i]}</Text>
                              <Text style={[styles.dayChipNum, on && styles.dayChipTextOn]}>{d.getDate()}</Text>
                              {isToday ? <View style={[styles.todayDot, on && styles.todayDotOn]} /> : <View style={styles.todayDotGap} />}
                            </Pressable>
                          );
                        })}
                      </View>
                    );
                  })}
                </ScrollView>
              ) : (
                <View style={styles.weekStrip}>
                  {week.dates.map((d, i) => { const on = i === dayIndex; const isToday = week.strs[i] === todayStr; return (
                    <Pressable key={i} style={[styles.dayChip, on && styles.dayChipOn]} onPress={() => goDay(i)}>
                      <Text style={[styles.dayChipDow, on && styles.dayChipTextOn]}>{DOW_SHORT[i]}</Text>
                      <Text style={[styles.dayChipNum, on && styles.dayChipTextOn]}>{d.getDate()}</Text>
                      {isToday ? <View style={[styles.todayDot, on && styles.todayDotOn]} /> : <View style={styles.todayDotGap} />}
                    </Pressable>
                  ); })}
                </View>
              )}
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
                {g.items.length === 0 ? <Text style={styles.sub}>No slots this week or attendance in the last 12 weeks.</Text> : g.items.map((it, i) => {
                  const off = weekOffsetForDate(it.date);
                  const editable = off >= -1;
                  return (
                  <Pressable key={i} style={styles.weekItem} onPress={() => {
                    pendingScroll.current = { studentId: g.studentId, date: it.date, time: it.time };
                    dayScrollY.current = {};
                    setSearchOpen(false); setSearch("");
                    if (off === weekOffset) { const idx = week.strs.indexOf(it.date); if (idx >= 0) goDay(idx); }
                    else { landDay.current = it.date; setWeekOffset(Math.min(0, Math.max(MAX_WEEKS_BACK, off))); }
                    [400, 700, 1000, 1400].forEach((ms) => setTimeout(scrollToPending, ms));
                  }}>
                    <View style={styles.flex}><Text style={styles.weekItemLabel}>{it.label}{it.time ? ` · ${time12(it.time)}` : ""}</Text><Text style={styles.sub} numberOfLines={1}>🤖 {it.courseName}{!editable ? " · view only" : ""}</Text></View>
                    {it.status ? <View style={[styles.markedTag, it.status === "present" ? styles.tagOk : it.status === "absent" ? styles.tagBad : styles.tagWarn]}><Text style={styles.markedText}>{CAP(it.status)}</Text></View>
                      : editable ? <View style={styles.markBtn}><Ionicons name="create-outline" size={13} color="#0D9488" /><Text style={styles.markBtnText}>Mark</Text></View> : null}
                    <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
                  </Pressable>
                ); })}
              </View>
            ))}
            <View style={{ height: 40 }} />
          </ScrollView>
        )
      ) : loading ? <View style={styles.center}><ActivityIndicator color="#0D9488" /></View>
        : err ? <View style={styles.center}><Text style={styles.err}>{err}</Text></View>
        : (
          <View ref={pagerAreaRef} collapsable={false} style={styles.flex}>
          <ScrollView ref={pagerRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onPagerScrollEnd} onLayout={() => pagerRef.current?.scrollTo({ x: (dayIndex + 1) * width, animated: false })} style={styles.flex}>
            {/* Leading sentinel — swipe onto it to cross into the previous week. */}
            <View style={[styles.sentinel, { width }]}>
              {weekOffset > MAX_WEEKS_BACK ? <><Ionicons name="arrow-back-circle-outline" size={30} color="#CBD5E1" /><Text style={styles.sentinelText}>Previous week</Text></> : <Text style={styles.sentinelText}>Earliest week</Text>}
            </View>
            {week.dates.map((d, i) => {
              const allDayRows = rows.filter((r) => r.date === week.strs[i]);
              // Marked rows drop out under the filter; a day with nothing left is done.
              const pageRows = blanksOnly ? allDayRows.filter((r) => !r.marked) : allDayRows;
              const allMarked = allDayRows.length > 0 && pageRows.length === 0;
              return (
                <View key={i} style={{ width }}>
                  <ScrollView ref={(r) => { dayScrollRefs.current[i] = r; }} onScroll={(e) => { dayScrollY.current[i] = e.nativeEvent.contentOffset.y; }} scrollEventThrottle={16} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
                    {canEdit ? <Pressable style={styles.extraBtn} onPress={() => { setExtraOpen(true); setExtraStudent(null); setExtraQuery(""); }}><Ionicons name="add-circle" size={18} color="#0D9488" /><Text style={styles.extraBtnText}>Extra class attendance</Text></Pressable> : null}
                    {allMarked ? <Text style={styles.empty}>All {allDayRows.length} student{allDayRows.length === 1 ? "" : "s"} marked on {d.toLocaleDateString("en-MY", { weekday: "long" })}. Nothing left to do.</Text>
                     : pageRows.length === 0 ? <Text style={styles.empty}>No classes scheduled on {d.toLocaleDateString("en-MY", { weekday: "long" })}.</Text> : (
                      <>
                        {groupByTime(pageRows).map((g, gi) => (
                          <View key={gi}>
                            <View style={styles.slotHeader}>
                              <Ionicons name="time-outline" size={14} color="#0D9488" />
                              <Text style={styles.slotHeaderText}>{time12(g.time) || "No time"}</Text>
                              <Text style={styles.slotCount}>{g.rows.length} student{g.rows.length === 1 ? "" : "s"}</Text>
                            </View>
                            {g.rows.map(renderRow)}
                          </View>
                        ))}
                      </>
                    )}
                    <View style={{ height: 340 }} />
                  </ScrollView>
                </View>
              );
            })}
            {/* Trailing sentinel — swipe onto it to cross into the next week (never future). */}
            <View style={[styles.sentinel, { width }]}>
              {weekOffset < 0 ? <><Ionicons name="arrow-forward-circle-outline" size={30} color="#CBD5E1" /><Text style={styles.sentinelText}>Next week</Text></> : <Text style={styles.sentinelText}>This is the latest week</Text>}
            </View>
          </ScrollView>
          </View>
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
                  : filtered.map((l) => { const c = coordOf(l.title); const learnt = !!c && learntCoords.has(c); return (
                    <Pressable key={l.id} style={[styles.lessonRow, learnt && styles.lessonRowLearnt]} onPress={() => chooseLesson(l.title, coordOf(l.title))}>
                      <Text style={[styles.lessonRowText, learnt && styles.lessonRowTextLearnt]} numberOfLines={2}>{l.title}</Text>
                      {learnt ? <View style={styles.learntTag}><Ionicons name="checkmark-circle" size={12} color="#047857" /><Text style={styles.learntTagText}>Learnt</Text></View> : null}
                    </Pressable>
                  ); })}
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

      {/* Full-screen photo preview — tap anywhere to close */}
      <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <Pressable style={styles.previewBackdrop} onPress={() => setPreview(null)}>
          {preview ? <Image source={{ uri: preview }} style={styles.previewImg} resizeMode="contain" /> : null}
          <View style={styles.previewClose}><Ionicons name="close" size={26} color="#FFFFFF" /></View>
        </Pressable>
      </Modal>

      <MediaGallery key={gallery ? `${gallery.index}:${gallery.items[gallery.index]?.url ?? ""}` : "closed"} items={gallery?.items ?? null} index={gallery?.index ?? 0} onClose={() => setGallery(null)} />

      {/* Review before saving — the teacher decides, never the model. */}
      <Modal visible={!!polishFor} transparent animationType="fade" onRequestClose={() => setPolishFor(null)}>
        <Pressable style={styles.aiBackdrop} onPress={() => setPolishFor(null)} />
        <View style={styles.aiSheet}>
          {polishFor ? (
            <ScrollView contentContainerStyle={styles.aiScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.aiHead}>
                <Ionicons name="sparkles" size={16} color="#7C3AED" />
                <Text style={styles.aiTitle}>Suggested rewrite</Text>
              </View>
              <Text style={styles.aiLabel}>YOUR WORDS</Text>
              <Text style={styles.aiOriginal}>{polishFor.original}</Text>
              <Text style={styles.aiLabel}>SUGGESTED</Text>
              <Text style={styles.aiPolished}>{polishFor.polished}</Text>
              <Text style={styles.aiNote}>Same facts, gentler wording. Nothing is saved until you tap Save on the card.</Text>
              <View style={styles.aiBtns}>
                <Pressable style={[styles.aiAction, styles.aiGhost]} onPress={() => setPolishFor(null)}>
                  <Text style={styles.aiGhostText}>Keep mine</Text>
                </Pressable>
                <Pressable
                  style={[styles.aiAction, styles.aiPrimary]}
                  onPress={() => { patch(polishFor.rowId, { note: polishFor.polished }); setPolishFor(null); }}
                >
                  <Text style={styles.aiPrimaryText}>Use this</Text>
                </Pressable>
              </View>
            </ScrollView>
          ) : null}
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

// 0–5 rating dots. Tap a dot to set that many; tap the current top dot to clear.
function RatingRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.ratingRow}>
      <Text style={styles.ratingLabel}>{label}</Text>
      <View style={styles.ratingDots}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} hitSlop={4} onPress={() => onChange(value === n ? n - 1 : n)}>
            <View style={[styles.ratingDot, n <= value && styles.ratingDotOn]} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F8FA" },
  flex: { flex: 1 },
  rateBlock: { backgroundColor: "#F6F8FA", borderRadius: 12, padding: 12, marginTop: 10, gap: 8 },
  rateTitle: { fontSize: 10, fontWeight: "800", letterSpacing: 1, color: "#6B7280" },
  rateHint: { fontSize: 10, fontWeight: "500", letterSpacing: 0, color: "#9CA3AF" },
  ratingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  ratingLabel: { fontSize: 13, fontWeight: "600", color: "#111827" },
  ratingDots: { flexDirection: "row", gap: 8 },
  ratingDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#E5E7EB" },
  ratingDotOn: { backgroundColor: "#EC2127" },
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
  weekHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  weekHeadText: { fontSize: 13, fontWeight: "800", color: "#0F172A", minWidth: 96, textAlign: "center" },
  wkNav: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#E6FAF9", alignItems: "center", justifyContent: "center" },
  wkNavOff: { opacity: 0.35 },
  weekMetaRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  weekTotal: { fontSize: 12, fontWeight: "700", color: "#6B7280" },
  pastHint: { fontSize: 11, fontWeight: "700", color: "#B45309", backgroundColor: "#FEF3C7", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: "hidden" },
  viewOnlyHint: { fontSize: 11, fontWeight: "700", color: "#6B7280", backgroundColor: "#F3F4F6", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: "hidden" },
  viewOnly: { fontSize: 12, fontWeight: "700", color: "#9CA3AF", fontStyle: "italic", marginTop: 4 },
  sentinel: { alignItems: "center", justifyContent: "center", gap: 8 },
  sentinelText: { fontSize: 13, fontWeight: "700", color: "#9CA3AF" },
  totalsBar: { flexDirection: "row", gap: 8, marginBottom: 12 },
  totChip: { flex: 1, alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 12, paddingVertical: 8, borderWidth: 1, borderColor: "#EEF0F6" },
  totNum: { fontSize: 20, fontWeight: "800" },
  totLabel: { fontSize: 10, fontWeight: "700", color: "#6B7280", marginTop: 1 },
  slotHeader: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 2, marginTop: 2 },
  slotHeaderText: { fontSize: 13, fontWeight: "800", color: "#0F172A" },
  slotCount: { fontSize: 11, fontWeight: "700", color: "#9CA3AF" },
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
  cardFlash: { borderColor: "#0D9488", borderWidth: 2, backgroundColor: "#F0FDFA" },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { fontSize: 15, fontWeight: "800", color: "#111827" },
  extraTag: { backgroundColor: "#E0F2FE", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  extraTagText: { fontSize: 10, fontWeight: "800", color: "#0369A1" },
  blankChip: { marginLeft: 10, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: "#0D9488", backgroundColor: "#FFFFFF" },
  blankChipOn: { backgroundColor: "#0D9488" },
  blankChipText: { fontSize: 12, fontWeight: "700", color: "#0D9488" },
  blankChipTextOn: { color: "#FFFFFF" },
  noteWithAi: { paddingRight: 38 },
  aiBtn: { position: "absolute", right: 8, top: 8, width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#F3E8FF" },
  aiBackdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)" },
  aiSheet: { position: "absolute", left: 16, right: 16, top: "14%", maxHeight: "72%", backgroundColor: "#FFFFFF", borderRadius: 20 },
  aiScroll: { padding: 20 },
  aiHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  aiTitle: { fontSize: 17, fontWeight: "800", color: "#0F172A" },
  aiLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 1.4, color: "#9CA3AF", marginTop: 6, marginBottom: 6 },
  aiOriginal: { fontSize: 14, color: "#6B7280", lineHeight: 21 },
  aiPolished: { fontSize: 15, color: "#0F172A", lineHeight: 23, backgroundColor: "#F5F3FF", borderRadius: 12, padding: 13 },
  aiNote: { fontSize: 11, color: "#9CA3AF", marginTop: 14, lineHeight: 16 },
  aiBtns: { flexDirection: "row", gap: 10, marginTop: 18 },
  aiAction: { flex: 1, minHeight: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  aiGhost: { borderWidth: 1, borderColor: "#E5E7EB" },
  aiGhostText: { fontSize: 15, fontWeight: "700", color: "#374151" },
  aiPrimary: { backgroundColor: "#7C3AED" },
  aiPrimaryText: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
  movedTag: { backgroundColor: "#FEF3C7", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  movedTagText: { fontSize: 9, fontWeight: "800", color: "#92400E", letterSpacing: 0.5 },
  makeupTag: { backgroundColor: "#E1F2FB", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  makeupTagText: { fontSize: 9, fontWeight: "800", color: "#0187C0", letterSpacing: 0.5 },
  sub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  markedTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  tagOk: { backgroundColor: "#D1FAE5" },
  tagBad: { backgroundColor: "#FEE2E2" },
  tagWarn: { backgroundColor: "#FEF3C7" },
  markedText: { fontSize: 12, fontWeight: "800", color: "#111827" },
  recorded: { backgroundColor: "#F9FAFB", borderRadius: 10, padding: 10, gap: 6 },
  savedLessonCard: { backgroundColor: "#FFFFFF", borderRadius: 10, borderWidth: 1, borderColor: "#EEF0F6", padding: 8, gap: 6 },
  recordedLine: { fontSize: 12, color: "#374151", lineHeight: 17 },
  editHint: { fontSize: 11, color: "#9CA3AF", fontStyle: "italic" },
  statusRow: { flexDirection: "row", gap: 8 },
  statusChip: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: "#F3F4F6" },
  chipPresentOn: { backgroundColor: "#16A34A" },
  chipAbsentOn: { backgroundColor: "#DC2626" },
  signRow: { flexDirection: "row", gap: 6, alignItems: "center" },
  signBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#E5E7EB" },
  signPresentOn: { backgroundColor: "#16A34A", borderColor: "#16A34A" },
  signAbsentOn: { backgroundColor: "#DC2626", borderColor: "#DC2626" },
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
  note: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, fontSize: 14, color: "#111827", backgroundColor: "#F9FAFB", minHeight: 34, maxHeight: 90, marginTop: 8 },
  photoRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  thumbWrap: { position: "relative" },
  thumb: { width: 54, height: 54, borderRadius: 8, backgroundColor: "#E5E7EB" },
  videoThumb: { width: 54, height: 54, borderRadius: 8, backgroundColor: "#0F172A", alignItems: "center", justifyContent: "center", gap: 1 },
  videoThumbText: { fontSize: 9, fontWeight: "800", color: "#FFFFFF" },
  thumbX: { position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: "#111827", alignItems: "center", justifyContent: "center" },
  addPhoto: { width: 54, height: 54, borderRadius: 8, borderWidth: 1.5, borderColor: "#0D9488", borderStyle: "dashed", alignItems: "center", justifyContent: "center", backgroundColor: "#F0FDFA" },
  addMedia: { width: 54, height: 54, borderRadius: 8, borderWidth: 1.5, borderColor: "#0D9488", borderStyle: "dashed", alignItems: "center", justifyContent: "center", backgroundColor: "#F0FDFA" },
  addMediaText: { fontSize: 10, fontWeight: "800", color: "#0D9488" },
  previewBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center" },
  previewImg: { width: "100%", height: "80%" },
  previewClose: { position: "absolute", top: 50, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
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
  lessonRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 13, paddingHorizontal: 10, borderRadius: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  lessonRowLearnt: { backgroundColor: "#F0FDF4" },
  lessonRowText: { flex: 1, fontSize: 14, color: "#111827", fontWeight: "600", lineHeight: 19 },
  lessonRowTextLearnt: { color: "#047857" },
  learntTag: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#D1FAE5", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  learntTagText: { fontSize: 11, fontWeight: "800", color: "#047857" },
});
