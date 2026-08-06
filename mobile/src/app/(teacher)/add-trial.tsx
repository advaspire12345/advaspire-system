import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useRole } from "@/contexts/role";
import { supabase } from "@/lib/supabase";
import { SwipeBackView } from "@/components/SwipeBackView";

function ymd(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function time12(t: string) { const [h, m] = t.split(":").map((n) => parseInt(n, 10)); return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; }
const TIMES: string[] = (() => { const out: string[] = []; for (let h = 9; h <= 20; h++) { out.push(`${String(h).padStart(2, "0")}:00`); out.push(`${String(h).padStart(2, "0")}:30`); } return out; })();

function DateStrip({ value, onPick }: { value: string | null; onPick: (d: string) => void }) {
  const days = useMemo(() => { const out: Date[] = []; const s = new Date(); s.setHours(0, 0, 0, 0); for (let i = 0; i < 90; i++) { const d = new Date(s); d.setDate(s.getDate() + i); out.push(d); } return out; }, []);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
      {days.map((d) => { const k = ymd(d); const on = k === value; return (
        <Pressable key={k} style={[styles.dayChip, on && styles.dayChipOn]} onPress={() => onPick(k)}>
          <Text style={[styles.dayDow, on && styles.dayTextOn]}>{d.toLocaleDateString("en-MY", { weekday: "short" })}</Text>
          <Text style={[styles.dayNum, on && styles.dayTextOn]}>{d.getDate()}</Text>
          <Text style={[styles.dayMon, on && styles.dayTextOn]}>{d.toLocaleDateString("en-MY", { month: "short" })}</Text>
        </Pressable>
      ); })}
    </ScrollView>
  );
}

const TRIALS = "/(teacher)/trial" as Href;
type Child = { name: string; age: string; courseId: string | null };

export default function AddTrial() {
  const { staff } = useRole();
  const router = useRouter();
  const backToTrials = () => router.navigate(TRIALS);
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [children, setChildren] = useState<Child[]>([{ name: "", age: "", courseId: null }]);
  const [date, setDate] = useState<string | null>(ymd(new Date()));
  const [time, setTime] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("courses").select("id, name").is("deleted_at", null).order("name");
      setCourses((data ?? []).map((c) => ({ id: c.id as string, name: (c.name as string) ?? "Course" })));
    })();
  }, []);

  const setChild = (i: number, patch: Partial<Child>) => setChildren((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const addChild = () => setChildren((cs) => [...cs, { name: "", age: "", courseId: null }]);
  const removeChild = (i: number) => setChildren((cs) => (cs.length <= 1 ? cs : cs.filter((_, j) => j !== i)));

  const save = async () => {
    if (!parentName.trim()) { Alert.alert("Parent name needed", "Enter the parent's name."); return; }
    const kids = children.filter((c) => c.name.trim());
    if (kids.length === 0) { Alert.alert("Child name needed", "Enter at least one child's name."); return; }
    if (!date || !time) { Alert.alert("Pick date & time", "Choose when the trial is."); return; }
    setSaving(true);
    // One trial row per child — same parent/date/time, but each child's own program.
    const rows = kids.map((c) => ({
      parent_name: parentName.trim(), parent_phone: parentPhone.trim() || null, parent_email: parentEmail.trim() || null,
      child_name: c.name.trim(), child_age: c.age ? parseInt(c.age, 10) : null,
      branch_id: staff?.branchId ?? null, course_id: c.courseId,
      scheduled_date: date, scheduled_time: `${time}:00`,
      source: "walk_in", status: "confirmed", created_by: staff?.id ?? null,
    }));
    const { error } = await supabase.from("trials").insert(rows);
    setSaving(false);
    if (error) { Alert.alert("Couldn't add trial", error.message); return; }
    const who = kids.length === 1 ? `${kids[0].name.trim()}'s trial is scheduled.` : `${kids.length} children booked for a trial.`;
    Alert.alert("Trial booked ✨", who, [{ text: "Done", onPress: backToTrials }]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <SwipeBackView onBack={backToTrials} style={styles.safe}>
      <View style={styles.header}>
        <Pressable hitSlop={8} onPress={backToTrials} style={styles.back}><Ionicons name="chevron-back" size={22} color="#F59E0B" /></Pressable>
        <Text style={styles.title}>Add Trial</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Parent name *</Text>
        <TextInput style={styles.input} value={parentName} onChangeText={setParentName} placeholder="Parent's full name" placeholderTextColor="#9CA3AF" />
        <View style={styles.two}>
          <View style={styles.flex}><Text style={styles.label}>Phone</Text><TextInput style={styles.input} value={parentPhone} onChangeText={setParentPhone} placeholder="01x-xxxxxxx" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" /></View>
          <View style={styles.flex}><Text style={styles.label}>Email</Text><TextInput style={styles.input} value={parentEmail} onChangeText={setParentEmail} placeholder="optional" placeholderTextColor="#9CA3AF" keyboardType="email-address" autoCapitalize="none" /></View>
        </View>

        <Text style={styles.label}>Children *</Text>
        {children.map((c, i) => (
          <View key={i} style={styles.childCard}>
            <View style={styles.childRow}>
              <TextInput style={[styles.input, styles.flex]} value={c.name} onChangeText={(t) => setChild(i, { name: t })} placeholder={`Child ${i + 1} name`} placeholderTextColor="#9CA3AF" />
              <TextInput style={[styles.input, { width: 74 }]} value={c.age} onChangeText={(t) => setChild(i, { age: t.replace(/[^0-9]/g, "") })} placeholder="Age" placeholderTextColor="#9CA3AF" keyboardType="number-pad" />
              {children.length > 1 ? (
                <Pressable hitSlop={6} style={styles.childDel} onPress={() => removeChild(i)}><Ionicons name="close" size={18} color="#DC2626" /></Pressable>
              ) : null}
            </View>
            <Text style={styles.childProgLabel}>Program (optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
              {courses.map((co) => { const on = co.id === c.courseId; return (
                <Pressable key={co.id} style={[styles.courseChip, on && styles.courseChipOn]} onPress={() => setChild(i, { courseId: on ? null : co.id })}>
                  <Text style={[styles.courseChipText, on && styles.dayTextOn]}>🤖 {co.name}</Text>
                </Pressable>
              ); })}
            </ScrollView>
          </View>
        ))}
        <Pressable style={styles.addChild} onPress={addChild}><Ionicons name="add" size={18} color="#B45309" /><Text style={styles.addChildText}>Add another child</Text></Pressable>

        <Text style={styles.label}>Date *</Text>
        <DateStrip value={date} onPick={setDate} />

        <Text style={styles.label}>Time *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
          {TIMES.map((t) => { const on = t === time; return (
            <Pressable key={t} style={[styles.timeChip, on && styles.timeChipOn]} onPress={() => setTime(t)}><Text style={[styles.timeChipText, on && styles.dayTextOn]}>{time12(t)}</Text></Pressable>
          ); })}
        </ScrollView>

        <Pressable style={[styles.saveBtn, saving && styles.saveOff]} disabled={saving} onPress={save}>
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>Book trial</Text>}
        </Pressable>
        <View style={{ height: 30 }} />
      </ScrollView>
      </SwipeBackView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F8FA" },
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingTop: 6, paddingBottom: 10 },
  back: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#FEF3C7", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "800", color: "#0F172A" },
  body: { padding: 16 },
  two: { flexDirection: "row", gap: 10 },
  label: { fontSize: 12, fontWeight: "800", color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 14, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#111827", backgroundColor: "#FFFFFF" },
  childCard: { backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1, borderColor: "#EEF0F6", padding: 10, marginBottom: 8 },
  childRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  childProgLabel: { fontSize: 11, fontWeight: "700", color: "#9CA3AF", marginTop: 8, marginBottom: 4, marginLeft: 2 },
  childDel: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center" },
  addChild: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: "#FCD34D" },
  addChildText: { fontSize: 13, fontWeight: "800", color: "#B45309" },
  strip: { gap: 8, paddingVertical: 2, paddingRight: 8 },
  dayChip: { width: 54, alignItems: "center", paddingVertical: 8, borderRadius: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#EEF0F6" },
  dayChipOn: { backgroundColor: "#F59E0B", borderColor: "#F59E0B" },
  dayDow: { fontSize: 11, fontWeight: "700", color: "#9CA3AF" },
  dayNum: { fontSize: 17, fontWeight: "800", color: "#111827" },
  dayMon: { fontSize: 10, fontWeight: "600", color: "#9CA3AF" },
  dayTextOn: { color: "#FFFFFF" },
  courseChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#EEF0F6" },
  courseChipOn: { backgroundColor: "#F59E0B", borderColor: "#F59E0B" },
  courseChipText: { fontSize: 13, fontWeight: "700", color: "#374151" },
  timeChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#EEF0F6" },
  timeChipOn: { backgroundColor: "#F59E0B", borderColor: "#F59E0B" },
  timeChipText: { fontSize: 13, fontWeight: "700", color: "#374151" },
  saveBtn: { backgroundColor: "#F59E0B", height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 24 },
  saveOff: { opacity: 0.5 },
  saveText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
});
