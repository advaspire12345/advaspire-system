import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useDrawerReturn } from "@/contexts/drawer";

export default function ChangePassword() {
  useDrawerReturn();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const onSave = async () => {
    setMsg(null);
    if (pw.length < 6) { setMsg({ ok: false, text: "Password must be at least 6 characters." }); return; }
    if (pw !== confirm) { setMsg({ ok: false, text: "Passwords don't match." }); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSaving(false);
    if (error) { setMsg({ ok: false, text: error.message }); return; }
    setPw(""); setConfirm("");
    setMsg({ ok: true, text: "Password updated." });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Change password", headerTintColor: "#EC2127" }} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>New password</Text>
          <View style={styles.inputWrap}>
            <TextInput style={styles.input} value={pw} onChangeText={setPw} secureTextEntry={!show} placeholder="At least 6 characters" placeholderTextColor="#999999" autoCapitalize="none" />
            <Pressable onPress={() => setShow((s) => !s)} hitSlop={10}><Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={20} color="#999999" /></Pressable>
          </View>

          <Text style={styles.label}>Confirm new password</Text>
          <View style={styles.inputWrap}>
            <TextInput style={styles.input} value={confirm} onChangeText={setConfirm} secureTextEntry={!show} placeholder="Re-enter password" placeholderTextColor="#999999" autoCapitalize="none" />
          </View>

          {msg ? (
            <View style={[styles.msg, msg.ok ? styles.msgOk : styles.msgErr]}>
              <Ionicons name={msg.ok ? "checkmark-circle" : "alert-circle"} size={16} color={msg.ok ? "#065F46" : "#B91C1C"} />
              <Text style={[styles.msgText, { color: msg.ok ? "#065F46" : "#B91C1C" }]}>{msg.text}</Text>
            </View>
          ) : null}

          <Pressable style={[styles.button, (saving || !pw || !confirm) && styles.buttonOff]} onPress={onSave} disabled={saving || !pw || !confirm}>
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Update password</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F3F5" },
  flex: { flex: 1 },
  scroll: { padding: 16 },
  label: { fontSize: 12, fontWeight: "800", color: "#666666", textTransform: "uppercase", letterSpacing: 0.6, marginTop: 14, marginBottom: 6 },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", paddingHorizontal: 14, height: 52 },
  input: { flex: 1, fontSize: 16, color: "#2B161B" },
  msg: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, padding: 12, marginTop: 16 },
  msgOk: { backgroundColor: "#D1FAE5" },
  msgErr: { backgroundColor: "#FEE2E2" },
  msgText: { fontSize: 13, fontWeight: "600", flex: 1 },
  button: { marginTop: 24, height: 52, borderRadius: 14, backgroundColor: "#EC2127", alignItems: "center", justifyContent: "center" },
  buttonOff: { opacity: 0.5 },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
});
