import { useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { MediaGallery, type MediaItem } from "@/components/MediaGallery";
import { C, cardShadow } from "@/theme/tech";

const WD3 = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MO3 = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
function eyebrowDate(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return `${WD3[d.getDay()]} ${d.getDate()} ${MO3[d.getMonth()]}`;
}
function initials(name: string | null): string {
  if (!name) return "AN";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "AN";
}

type Rating = { label: string; value: number; color: string };
type LessonData = {
  date: string;
  lesson: string;
  mission: string;
  studentName: string | null;
  courseName: string | null;
  instructorName: string | null;
  notes: string | null;
  media: MediaItem[];
  ratings: Rating[] | null;
};

// The trainer's per-lesson ratings live in lesson_ratings keyed by
// (student, lesson_coordinate) — there is no FK to the attendance row, so we
// match the rating whose updated_at falls closest to the session date.
function daysApart(aIso: string, bIso: string): number {
  const a = new Date(aIso + (aIso.length === 10 ? "T00:00:00" : "")).getTime();
  const b = new Date(bIso).getTime();
  return Math.abs(a - b) / 86_400_000;
}

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [gallery, setGallery] = useState<{ items: MediaItem[]; index: number } | null>(null);

  const fetch = async (): Promise<LessonData | null> => {
    const { data: a, error } = await supabase
      .from("attendance")
      .select(`
        date, last_activity, activities, instructor_name, notes, project_photos,
        enrollment:enrollments!inner(student_id, student:students(name), course:courses(name))
      `)
      .eq("id", id!)
      .maybeSingle();
    if (error) throw error;
    if (!a) return null;

    const enr = a.enrollment as unknown as { student_id: string; student: { name: string } | null; course: { name: string } | null } | null;
    const rawActs = (a.activities as { lesson?: string; mission?: string; photos?: string[]; video?: string | null }[] | null) ?? [];
    const media: MediaItem[] = [];
    for (const act of rawActs) {
      for (const p of act?.photos ?? []) if (p && !media.some((m) => m.url === p)) media.push({ type: "photo", url: p });
      if (act?.video && !media.some((m) => m.url === act.video)) media.push({ type: "video", url: act.video });
    }
    for (const p of (a.project_photos as string[] | null) ?? []) if (p && !media.some((m) => m.url === p)) media.push({ type: "photo", url: p });

    const lesson = rawActs[0]?.lesson ?? (a.last_activity as string | null) ?? "Lesson";
    const mission = rawActs[0]?.mission ?? "";

    // Nearest rating to this session's date (within a week), best-effort.
    let ratings: Rating[] | null = null;
    if (enr?.student_id) {
      const { data: rr } = await supabase
        .from("lesson_ratings")
        .select("effort, knowledge, behaviour, updated_at")
        .eq("student_id", enr.student_id);
      const rows = (rr ?? []) as { effort: number | null; knowledge: number | null; behaviour: number | null; updated_at: string }[];
      let best: (typeof rows)[number] | null = null;
      let bestGap = 7.5;
      for (const r of rows) {
        const gap = daysApart(a.date as string, r.updated_at);
        if (gap < bestGap) { bestGap = gap; best = r; }
      }
      if (best) {
        ratings = [
          { label: "Problem solving", value: Number(best.effort ?? 0), color: C.red },
          { label: "Logical thinking", value: Number(best.knowledge ?? 0), color: C.red },
          { label: "Teamwork", value: Number(best.behaviour ?? 0), color: C.red },
        ];
      }
    }

    return {
      date: a.date as string,
      lesson,
      mission,
      studentName: enr?.student?.name ?? null,
      courseName: enr?.course?.name ?? null,
      instructorName: (a.instructor_name as string | null) ?? null,
      notes: (a.notes as string | null) ?? null,
      media,
      ratings,
    };
  };

  const q = useCachedQuery<LessonData | null>(`lesson:${id ?? "none"}`, fetch, { enabled: !!id });
  const d = q.data ?? null;
  const firstName = useMemo(() => (d?.instructorName ?? "").trim().split(/\s+/)[0] || "trainer", [d?.instructorName]);

  if (q.loading && !d) {
    return <SafeAreaView style={s.safe} edges={["bottom"]}><View style={s.center}><ActivityIndicator color={C.red} /></View></SafeAreaView>;
  }
  if (!d) {
    return <SafeAreaView style={s.safe} edges={["bottom"]}><View style={s.center}><Text style={s.emptyText}>This lesson could not be loaded.</Text></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={s.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.eyebrow}>{eyebrowDate(d.date)}{d.lesson && d.lesson !== "Lesson" ? " · LESSON" : ""}</Text>
        <Text style={s.title}>{d.lesson}</Text>

        {/* Trainer + quote */}
        <View style={s.card}>
          <View style={s.trainerRow}>
            <View style={s.avatar}><Text style={s.avatarText}>{initials(d.instructorName)}</Text></View>
            <View style={{ minWidth: 0, flex: 1 }}>
              <Text style={s.trainerName}>{d.instructorName ?? "Trainer"}</Text>
              <Text style={s.trainerSub}>Trainer{d.courseName ? ` · ${d.courseName}` : ""}</Text>
            </View>
          </View>
          {d.notes ? (
            <>
              <Text style={s.quoteMark}>“</Text>
              <Text style={s.quote}>{d.notes}</Text>
            </>
          ) : (
            <Text style={[s.quote, { marginTop: 14 }]}>The trainer hasn't left a note for this lesson yet.</Text>
          )}
        </View>

        {/* Ratings */}
        {d.ratings ? (
          <>
            <SectionHead label="RATED THIS LESSON" />
            <View style={s.ratingCard}>
              {d.ratings.map((r, i) => (
                <View key={r.label} style={[s.ratingRow, i === d.ratings!.length - 1 && { borderBottomWidth: 0 }]}>
                  <Text style={s.ratingLabel}>{r.label}</Text>
                  <View style={s.dots}>
                    {[0, 1, 2, 3, 4].map((n) => (
                      <View key={n} style={[s.dot, { backgroundColor: n < Math.round(r.value) ? r.color : "#EFE7EA" }]} />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {/* Class photos */}
        {d.media.length > 0 ? (
          <>
            <SectionHead label="FROM THE CLASS" />
            <View style={s.photoGrid}>
              {d.media.map((m, i) => (
                <Pressable key={i} style={s.photo} onPress={() => setGallery({ items: d.media, index: i })}>
                  {m.type === "photo" ? (
                    <Image source={{ uri: m.url }} style={s.photoImg} />
                  ) : (
                    <View style={[s.photoImg, s.photoVideo]}><Ionicons name="play-circle" size={34} color="#FFFFFF" /></View>
                  )}
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {/* Reply CTA */}
        <Pressable style={s.replyBtn} onPress={() => router.push("/messages" as Href)}>
          <Ionicons name="chatbubble-outline" size={16} color={C.ink} />
          <Text style={s.replyText}>REPLY TO {firstName.toUpperCase()}</Text>
        </Pressable>
      </ScrollView>

      <MediaGallery
        key={gallery ? `${gallery.items[0]?.url ?? ""}:${gallery.index}` : "none"}
        items={gallery?.items ?? null}
        index={gallery?.index ?? 0}
        onClose={() => setGallery(null)}
      />
    </SafeAreaView>
  );
}

function SectionHead({ label }: { label: string }) {
  return (
    <View style={s.sectionHead}>
      <Text style={s.sectionHeadText}>{label}</Text>
      <View style={s.sectionHeadLine} />
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyText: { fontSize: 14, color: C.textDim, textAlign: "center" },
  scroll: { padding: 16, paddingBottom: 40 },
  eyebrow: { fontFamily: "Montserrat", fontWeight: "700", fontSize: 10, letterSpacing: 2.2, color: C.red, marginTop: 4 },
  title: { fontSize: 24, fontWeight: "600", letterSpacing: -0.6, color: C.ink, marginTop: 7, lineHeight: 30 },

  card: { backgroundColor: C.card, borderRadius: 20, padding: 18, marginTop: 16, ...cardShadow },
  trainerRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  avatar: { width: 38, height: 38, borderRadius: 11, backgroundColor: C.greyChip, alignItems: "center", justifyContent: "center" },
  avatarText: { fontWeight: "700", fontSize: 13, color: C.ink },
  trainerName: { fontSize: 14, fontWeight: "600", color: C.ink },
  trainerSub: { fontSize: 11, color: C.textDim, marginTop: 2 },
  quoteMark: { fontWeight: "800", fontSize: 38, color: C.red, lineHeight: 30, marginTop: 12 },
  quote: { fontSize: 14, lineHeight: 24, color: "#453E3E", marginTop: 6 },

  sectionHead: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 22 },
  sectionHeadText: { fontFamily: "Montserrat", fontWeight: "700", fontSize: 10, letterSpacing: 2.4, color: C.ink },
  sectionHeadLine: { flex: 1, height: 1, backgroundColor: C.border },

  ratingCard: { backgroundColor: C.card, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 6, marginTop: 12, ...cardShadow },
  ratingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.borderFaint },
  ratingLabel: { fontSize: 13, color: C.ink },
  dots: { flexDirection: "row", gap: 5 },
  dot: { width: 9, height: 9, borderRadius: 5 },

  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  photo: { width: "47.8%", aspectRatio: 4 / 3, borderRadius: 14, overflow: "hidden", backgroundColor: "#E9E2E4" },
  photoImg: { width: "100%", height: "100%" },
  photoVideo: { alignItems: "center", justifyContent: "center", backgroundColor: C.ink },

  replyBtn: { minHeight: 48, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16 },
  replyText: { fontFamily: "Montserrat", fontWeight: "700", fontSize: 11, letterSpacing: 1.4, color: C.ink },
});
