import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRole } from "@/contexts/role";
import { supabase } from "@/lib/supabase";
import { mobileApi } from "@/lib/api";
import { TeacherTopBar } from "@/components/TeacherTopBar";

type Student = { id: string; name: string; code: string | null; photo: string | null; balance: number };
type Ranked = Student & { rank: number };
const QUICK = [5, 10, 20, 50];

export default function TeacherAdcoin() {
  const { staff } = useRole();
  const [balance, setBalance] = useState<number | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Student | null>(null);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    if (!staff?.branchId || !staff?.id) return;
    setLoading(true);
    const [{ data: me }, { data: studs }] = await Promise.all([
      supabase.from("users").select("adcoin_balance").eq("id", staff.id).maybeSingle(),
      supabase.from("students").select("id, name, student_id, photo, adcoin_balance").eq("branch_id", staff.branchId).is("deleted_at", null).order("adcoin_balance", { ascending: false, nullsFirst: false }),
    ]);
    setBalance(Number((me as { adcoin_balance?: number } | null)?.adcoin_balance ?? 0));
    setStudents((studs ?? []).map((s) => ({ id: s.id as string, name: (s.name as string) ?? "Student", code: (s.student_id as string | null) ?? null, photo: (s.photo as string | null) ?? null, balance: Number(s.adcoin_balance ?? 0) })));
    setLoading(false);
  }, [staff?.branchId, staff?.id]);

  useEffect(() => { load(); }, [load]);

  const q = query.trim().toLowerCase();
  // Rank everyone by adcoin (highest first); keep each student's overall rank when filtering.
  const ranked = useMemo<Ranked[]>(() => [...students].sort((a, b) => b.balance - a.balance).map((s, i) => ({ ...s, rank: i + 1 })), [students]);
  const filtered = useMemo(() => (q ? ranked.filter((s) => s.name.toLowerCase().includes(q) || (s.code ?? "").toLowerCase().includes(q)) : ranked), [ranked, q]);
  const amt = Math.floor(Number(amount) || 0);
  const canSend = !!selected && amt > 0 && balance != null && amt <= balance && password.length > 0 && !sending;

  const send = async () => {
    if (!selected) return;
    if (amt <= 0) { Alert.alert("Enter an amount", "Type how many adcoin to give."); return; }
    if (balance != null && amt > balance) { Alert.alert("Not enough adcoin", `You have ${balance}. Lower the amount.`); return; }
    if (!password) { Alert.alert("Password required", "Enter your password to confirm."); return; }
    setSending(true);
    const res = await mobileApi<{ senderBalance?: number; receiverBalance?: number }>("/api/mobile/adcoin/transfer", {
      receiverId: selected.id, amount: amt, message: message.trim() || undefined, password,
    });
    setSending(false);
    if (!res.ok) { Alert.alert("Couldn't transfer", res.error); return; }
    const newBal = res.data?.senderBalance;
    if (typeof newBal === "number") setBalance(newBal);
    if (typeof res.data?.receiverBalance === "number") {
      setStudents((prev) => prev.map((s) => (s.id === selected.id ? { ...s, balance: res.data!.receiverBalance as number } : s)));
    }
    Alert.alert("Sent 🎉", `${amt} adcoin sent to ${selected.name}.`);
    setSelected(null); setAmount(""); setMessage(""); setPassword(""); setQuery("");
  };

  if (loading) return <SafeAreaView style={styles.safe} edges={["top"]}><View style={styles.center}><ActivityIndicator color="#0D9488" /></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <TeacherTopBar />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            {selected ? <Pressable hitSlop={8} onPress={() => setSelected(null)} style={styles.backBtn}><Ionicons name="chevron-back" size={22} color="#CA8A04" /></Pressable> : null}
            <Text style={styles.title}>Adcoin Transfer</Text>
          </View>
          <View style={styles.balanceCard}>
            <Ionicons name="logo-bitcoin" size={22} color="#FFFFFF" />
            <View style={styles.flex}><Text style={styles.balanceLabel}>Your balance</Text><Text style={styles.balanceNum}>{balance ?? 0} adcoin</Text></View>
          </View>
        </View>

        {!selected ? (
          <>
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={18} color="#9CA3AF" />
              <TextInput style={styles.searchInput} value={query} onChangeText={setQuery} placeholder="Search student to reward…" placeholderTextColor="#9CA3AF" autoCorrect={false} />
            </View>
            <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
              {filtered.length === 0 ? <Text style={styles.empty}>No students found.</Text> : filtered.map((s) => (
                <Pressable key={s.id} style={styles.pickRow} onPress={() => setSelected(s)}>
                  <RankBadge rank={s.rank} />
                  <Avatar name={s.name} photo={s.photo} />
                  <View style={styles.flex}><Text style={styles.pickName} numberOfLines={1}>{s.name}</Text><Text style={styles.pickSub}>{s.code ? `#${s.code} · ` : ""}{s.balance} adcoin</Text></View>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </Pressable>
              ))}
              <View style={{ height: 30 }} />
            </ScrollView>
          </>
        ) : (
          <ScrollView ref={scrollRef} contentContainerStyle={[styles.list, { paddingBottom: 260 }]} keyboardShouldPersistTaps="handled">
            <View style={styles.studentCard}>
              <Avatar name={selected.name} photo={selected.photo} />
              <View style={styles.flex}><Text style={styles.pickName} numberOfLines={1}>{selected.name}</Text><Text style={styles.pickSub}>{selected.code ? `#${selected.code} · ` : ""}has {selected.balance} adcoin</Text></View>
            </View>

            <Text style={styles.fieldLabel}>Amount to give</Text>
            <TextInput style={styles.amountInput} value={amount} onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ""))} placeholder="0" placeholderTextColor="#CBD5E1" keyboardType="number-pad" />
            <View style={styles.quickRow}>
              {QUICK.map((n) => <Pressable key={n} style={styles.quickChip} onPress={() => setAmount(String(amt + n))}><Text style={styles.quickText}>+{n}</Text></Pressable>)}
              {amount ? <Pressable style={styles.quickClear} onPress={() => setAmount("")}><Text style={styles.quickClearText}>Clear</Text></Pressable> : null}
            </View>

            <Text style={styles.fieldLabel}>Message (optional)</Text>
            <TextInput style={styles.input} value={message} onChangeText={setMessage} placeholder="e.g. Great work in class today!" placeholderTextColor="#9CA3AF" multiline />

            <Text style={styles.fieldLabel}>Your password</Text>
            <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Confirm it's you" placeholderTextColor="#9CA3AF" secureTextEntry autoCapitalize="none" onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120)} />

            <Pressable style={[styles.sendBtn, !canSend && styles.sendBtnOff]} disabled={!canSend} onPress={send}>
              {sending ? <ActivityIndicator color="#FFFFFF" /> : <><Ionicons name="logo-bitcoin" size={18} color="#FFFFFF" /><Text style={styles.sendText}>Give {amt > 0 ? amt : ""} adcoin</Text></>}
            </Pressable>
            {balance != null && amt > balance ? <Text style={styles.warn}>That's more than your balance ({balance}).</Text> : null}
            <View style={{ height: 30 }} />
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Avatar({ name, photo }: { name: string; photo: string | null }) {
  if (photo) return <Image source={{ uri: photo }} style={styles.avatar} />;
  return <View style={[styles.avatar, styles.avatarFallback]}><Text style={styles.avatarInitial}>{(name?.[0] ?? "?").toUpperCase()}</Text></View>;
}

const RANK_STYLE: Record<number, { bg: string; fg: string }> = {
  1: { bg: "#FEF3C7", fg: "#B45309" }, // gold
  2: { bg: "#E5E7EB", fg: "#4B5563" }, // silver
  3: { bg: "#FDE7D3", fg: "#9A3412" }, // bronze
};
function RankBadge({ rank }: { rank: number }) {
  const s = RANK_STYLE[rank];
  return (
    <View style={[styles.rankBadge, s ? { backgroundColor: s.bg } : styles.rankBadgePlain]}>
      <Text style={[styles.rankText, s ? { color: s.fg } : styles.rankTextPlain]}>{rank}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F8FA" },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, gap: 10 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#FEF9C3", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "800", color: "#0F172A" },
  balanceCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#CA8A04", borderRadius: 16, padding: 16 },
  balanceLabel: { fontSize: 12, color: "#FEF9C3", fontWeight: "700" },
  balanceNum: { fontSize: 24, fontWeight: "800", color: "#FFFFFF", marginTop: 2 },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 12, backgroundColor: "#FFFFFF", marginHorizontal: 16 },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 14, color: "#111827" },
  list: { padding: 12 },
  empty: { textAlign: "center", color: "#9CA3AF", fontSize: 14, marginTop: 30 },
  pickRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFFFFF", borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#EEF0F6" },
  pickName: { fontSize: 15, fontWeight: "800", color: "#111827" },
  pickSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  rankBadge: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  rankBadgePlain: { backgroundColor: "#F3F4F6" },
  rankText: { fontSize: 12, fontWeight: "800" },
  rankTextPlain: { color: "#9CA3AF" },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#E5E7EB" },
  avatarFallback: { alignItems: "center", justifyContent: "center", backgroundColor: "#FEF3C7" },
  avatarInitial: { fontSize: 18, fontWeight: "800", color: "#CA8A04" },
  studentCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "#EEF0F6" },
  fieldLabel: { fontSize: 12, fontWeight: "800", color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 14, marginBottom: 6, marginLeft: 2 },
  amountInput: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 28, fontWeight: "800", color: "#111827", backgroundColor: "#FFFFFF", textAlign: "center" },
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  quickChip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, backgroundColor: "#FEF9C3" },
  quickText: { fontSize: 14, fontWeight: "800", color: "#CA8A04" },
  quickClear: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, backgroundColor: "#F3F4F6" },
  quickClearText: { fontSize: 14, fontWeight: "800", color: "#6B7280" },
  input: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#111827", backgroundColor: "#FFFFFF", minHeight: 46 },
  sendBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#CA8A04", height: 54, borderRadius: 14, marginTop: 20 },
  sendBtnOff: { opacity: 0.4 },
  sendText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  warn: { color: "#B45309", fontSize: 12, textAlign: "center", marginTop: 8, fontWeight: "600" },
});
