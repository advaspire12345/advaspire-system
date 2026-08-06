import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";
import { C } from "@/theme/tech";

type Message = {
  id: string;
  sender: "parent" | "staff";
  body: string;
  createdAt: string;
};

function timeLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-MY", { hour: "numeric", minute: "2-digit" });
}
function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short" });
}

export default function MessagesScreen() {
  const { user } = useAuth();
  const userId = user?.id;
  const router = useRouter();
  const [parentId, setParentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  // Manually track the keyboard height and pad the content by it — RN's
  // KeyboardAvoidingView is unreliable on Android edge-to-edge.
  const [kb, setKb] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const s = Keyboard.addListener(showEvt, (e) => setKb(e.endCoordinates.height));
    const h = Keyboard.addListener(hideEvt, () => setKb(0));
    return () => { s.remove(); h.remove(); };
  }, []);

  const load = useCallback(async () => {
    if (!userId) return;
    setErr(null);
    const { data: parentRow, error: pErr } = await supabase
      .from("parents").select("id").eq("auth_id", userId).is("deleted_at", null).maybeSingle();
    if (pErr) { setErr("Couldn't load your messages."); setLoading(false); return; }
    if (!parentRow) { setErr("No parent record for this account."); setLoading(false); return; }
    const pid = parentRow.id as string;
    setParentId(pid);
    const { data, error } = await supabase
      .from("parent_messages")
      .select("id, sender, body, created_at")
      .eq("parent_id", pid)
      .order("created_at", { ascending: true });
    if (error) { setErr("Couldn't load your messages."); setLoading(false); return; }
    setMessages((data ?? []).map((m) => ({ id: m.id as string, sender: m.sender as Message["sender"], body: m.body as string, createdAt: m.created_at as string })));
    setLoading(false);
    // Mark any unread staff replies as read so the badge clears.
    await supabase.from("parent_messages").update({ read_at: new Date().toISOString() })
      .eq("parent_id", pid).eq("sender", "staff").is("read_at", null);
  }, [userId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Light polling while the screen is open, so staff replies appear.
  useEffect(() => {
    if (!parentId) return;
    const t = setInterval(async () => {
      const { data } = await supabase
        .from("parent_messages").select("id, sender, body, created_at")
        .eq("parent_id", parentId).order("created_at", { ascending: true });
      if (data) setMessages(data.map((m) => ({ id: m.id as string, sender: m.sender as Message["sender"], body: m.body as string, createdAt: m.created_at as string })));
    }, 15000);
    return () => clearInterval(t);
  }, [parentId]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !parentId || sending) return;
    setSending(true);
    setDraft("");
    const { data, error } = await supabase
      .from("parent_messages")
      .insert({ parent_id: parentId, sender: "parent", body })
      .select("id, sender, body, created_at")
      .single();
    setSending(false);
    if (error || !data) {
      setErr("Message didn't send. Please try again.");
      setDraft(body); // restore so nothing is lost
      return;
    }
    setMessages((prev) => [...prev, { id: data.id as string, sender: "parent", body: data.body as string, createdAt: data.created_at as string }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  // Group messages by day for date separators.
  let lastDay = "";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Custom Turn-4 thread header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}><Ionicons name="chevron-back" size={22} color={C.textDim} /></Pressable>
        <View style={styles.headerAv}><Text style={styles.headerAvText}>A</Text></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.headerName}>Advaspire team</Text>
          <Text style={styles.headerSub}>Usually replies within a day</Text>
        </View>
      </View>

      {/* Manual keyboard avoidance: pad the bottom by the keyboard height while it's
          open, otherwise by the safe-area (nav bar) inset. */}
      <View style={[styles.flex, { paddingBottom: kb > 0 ? kb : insets.bottom }]}>
        {loading ? (
          <View style={styles.center}><ActivityIndicator color={C.red} /></View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={styles.list}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {messages.length === 0 ? (
              <Text style={styles.empty}>No messages yet — say hello and the team will reply here.</Text>
            ) : (
              messages.map((m) => {
                const day = dayLabel(m.createdAt);
                const showDay = day !== lastDay;
                lastDay = day;
                const mine = m.sender === "parent";
                return (
                  <View key={m.id}>
                    {showDay ? <Text style={styles.daySep}>{day}</Text> : null}
                    {mine ? (
                      <View style={styles.rowMine}>
                        <View style={styles.bubbleCol}>
                          <View style={styles.bubbleMine}>
                            <Text style={styles.bubbleTextMine}>{m.body}</Text>
                          </View>
                          <Text style={[styles.bubbleTime, styles.timeRight]}>{timeLabel(m.createdAt)}</Text>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.rowTheirs}>
                        <View style={styles.staffAv}><Text style={styles.staffAvText}>A</Text></View>
                        <View style={styles.bubbleCol}>
                          <View style={styles.bubbleTheirs}>
                            <Text style={styles.bubbleText}>{m.body}</Text>
                          </View>
                          <Text style={styles.bubbleTime}>{timeLabel(m.createdAt)}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        {err ? <Text style={styles.err}>{err}</Text> : null}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Message the Advaspire team…"
            placeholderTextColor="#999999"
            multiline
            maxLength={4000}
          />
          <Pressable
            style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnOff]}
            onPress={send}
            disabled={!draft.trim() || sending}
          >
            <Ionicons name="paper-plane" size={18} color="#FFFFFF" style={{ marginLeft: -2 }} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.card },
  flex: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 11, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.borderFaint },
  back: { marginRight: -4 },
  headerAv: { width: 38, height: 38, borderRadius: 13, backgroundColor: C.red, alignItems: "center", justifyContent: "center" },
  headerAvText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  headerName: { fontSize: 16, fontWeight: "600", color: C.ink },
  headerSub: { fontSize: 11, color: C.green, fontWeight: "600", marginTop: 2 },
  list: { padding: 14, paddingBottom: 8, gap: 13 },
  empty: { textAlign: "center", color: C.textMute, fontSize: 14, marginTop: 40, paddingHorizontal: 32, lineHeight: 20 },
  daySep: { textAlign: "center", color: C.textMute, fontSize: 11, marginVertical: 4 },
  rowMine: { flexDirection: "row", justifyContent: "flex-end" },
  rowTheirs: { flexDirection: "row", justifyContent: "flex-start", gap: 9 },
  staffAv: { width: 30, height: 30, borderRadius: 11, backgroundColor: C.red, alignItems: "center", justifyContent: "center", alignSelf: "flex-start" },
  staffAvText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  bubbleCol: { maxWidth: "78%" },
  bubbleMine: { backgroundColor: C.ink, borderRadius: 18, borderBottomRightRadius: 4, paddingHorizontal: 14, paddingVertical: 12 },
  bubbleTheirs: { backgroundColor: C.card, borderRadius: 18, borderTopLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 12, shadowColor: "#000000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  bubbleText: { fontSize: 14, color: C.ink, lineHeight: 21 },
  bubbleTextMine: { color: "#FFFFFF", fontSize: 14, lineHeight: 21 },
  bubbleTime: { fontSize: 10, color: C.textMute, marginTop: 5 },
  timeRight: { textAlign: "right" },
  err: { color: C.red, fontSize: 12, textAlign: "center", paddingVertical: 6 },
  inputBar: { flexDirection: "row", alignItems: "flex-end", gap: 9, paddingHorizontal: 14, paddingTop: 11, paddingBottom: 11, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.borderFaint },
  input: { flex: 1, maxHeight: 120, minHeight: 44, borderRadius: 22, backgroundColor: C.bg, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontSize: 14, color: C.ink },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.red, alignItems: "center", justifyContent: "center" },
  sendBtnOff: { backgroundColor: "#D8CFD2" },
});
