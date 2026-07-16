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
import { Stack, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";

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
    <SafeAreaView style={styles.safe} edges={[]}>
      <Stack.Screen options={{ title: "Message us", headerShown: true, headerTintColor: "#615DFA" }} />
      {/* Manual keyboard avoidance: pad the bottom by the keyboard height while it's
          open, otherwise by the safe-area (nav bar) inset. */}
      <View style={[styles.flex, { paddingBottom: kb > 0 ? kb : insets.bottom }]}>
        {loading ? (
          <View style={styles.center}><ActivityIndicator color="#615DFA" /></View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={styles.list}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            <View style={styles.intro}>
              <Ionicons name="chatbubbles" size={22} color="#615DFA" />
              <Text style={styles.introText}>
                Message the Advaspire team — ask to update your child&apos;s details, or anything else. We&apos;ll reply here.
              </Text>
            </View>

            {messages.length === 0 ? (
              <Text style={styles.empty}>No messages yet. Say hello 👋</Text>
            ) : (
              messages.map((m) => {
                const day = dayLabel(m.createdAt);
                const showDay = day !== lastDay;
                lastDay = day;
                const mine = m.sender === "parent";
                return (
                  <View key={m.id}>
                    {showDay ? <Text style={styles.daySep}>{day}</Text> : null}
                    <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
                      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                        {!mine ? <Text style={styles.staffLabel}>Advaspire</Text> : null}
                        <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{m.body}</Text>
                        <Text style={[styles.bubbleTime, mine && styles.bubbleTimeMine]}>{timeLabel(m.createdAt)}</Text>
                      </View>
                    </View>
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
            placeholder="Type a message…"
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={4000}
          />
          <Pressable
            style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnOff]}
            onPress={send}
            disabled={!draft.trim() || sending}
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F6FB" },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16, paddingBottom: 8, gap: 2 },
  intro: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#EEF2FF", borderRadius: 14, padding: 12, marginBottom: 12 },
  introText: { flex: 1, fontSize: 12, color: "#4338CA", fontWeight: "600", lineHeight: 17 },
  empty: { textAlign: "center", color: "#9CA3AF", fontSize: 14, marginTop: 30 },
  daySep: { textAlign: "center", color: "#9CA3AF", fontSize: 11, fontWeight: "700", marginVertical: 12 },
  bubbleRow: { flexDirection: "row", marginBottom: 8 },
  rowMine: { justifyContent: "flex-end" },
  rowTheirs: { justifyContent: "flex-start" },
  bubble: { maxWidth: "82%", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: { backgroundColor: "#615DFA", borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: "#FFFFFF", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: "#EEF0F6" },
  staffLabel: { fontSize: 10, fontWeight: "800", color: "#615DFA", marginBottom: 2 },
  bubbleText: { fontSize: 15, color: "#111827", lineHeight: 20 },
  bubbleTextMine: { color: "#FFFFFF" },
  bubbleTime: { fontSize: 10, color: "#9CA3AF", marginTop: 4, alignSelf: "flex-end" },
  bubbleTimeMine: { color: "rgba(255,255,255,0.7)" },
  err: { color: "#B91C1C", fontSize: 12, textAlign: "center", paddingVertical: 6 },
  inputBar: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#F0F0F6" },
  input: { flex: 1, maxHeight: 120, minHeight: 44, borderRadius: 22, backgroundColor: "#F3F4F6", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontSize: 15, color: "#111827" },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#615DFA", alignItems: "center", justifyContent: "center" },
  sendBtnOff: { backgroundColor: "#C7CAD1" },
});
