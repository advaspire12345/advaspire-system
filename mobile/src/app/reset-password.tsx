import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";
import { C, cardShadow } from "@/theme/tech";

// In-app password reset with a 6-digit code (no links, no device juggling):
//   email → "Send code" → read the code from the email (any device) → type it
//   + a new password → done. If the user instead TAPS the email link and it
//   deep-links here with a token, we redeem it and skip straight to the password.
type Phase = "email" | "reset" | "done";

export default function ResetPasswordScreen() {
  const p = useLocalSearchParams<{ email?: string; code?: string; token_hash?: string; type?: string; access_token?: string; refresh_token?: string }>();
  const router = useRouter();
  const { signOut } = useAuth();

  const [phase, setPhase] = useState<Phase>("email");
  const [email, setEmail] = useState(typeof p.email === "string" ? p.email : "");
  const [otp, setOtp] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  // True once a tapped link established a session → no code needed, just a new password.
  const [linkSession, setLinkSession] = useState(false);
  const recovered = useRef<{ access_token: string; refresh_token: string } | null>(null);

  // If the user tapped the email link (deep link with a token), redeem it and jump
  // straight to setting the password. Otherwise stay on the code-entry flow.
  useEffect(() => {
    let active = true;
    const at = typeof p.access_token === "string" ? p.access_token : "";
    const rt = typeof p.refresh_token === "string" ? p.refresh_token : "";
    const hasToken = at || (typeof p.code === "string" && p.code) || (typeof p.token_hash === "string" && p.token_hash);
    if (!hasToken) return;
    (async () => {
      let session = null as null | { access_token: string; refresh_token: string };
      try {
        if (at && rt) {
          const { data } = await supabase.auth.setSession({ access_token: at, refresh_token: rt });
          if (data.session) session = { access_token: data.session.access_token, refresh_token: data.session.refresh_token };
        } else if (typeof p.code === "string" && p.code) {
          const { data } = await supabase.auth.exchangeCodeForSession(p.code);
          if (data.session) session = { access_token: data.session.access_token, refresh_token: data.session.refresh_token };
        } else if (typeof p.token_hash === "string" && p.token_hash) {
          const { data } = await supabase.auth.verifyOtp({ token_hash: p.token_hash, type: (p.type as "recovery") || "recovery" });
          if (data.session) session = { access_token: data.session.access_token, refresh_token: data.session.refresh_token };
        }
      } catch { /* fall back to code entry */ }
      if (!active) return;
      if (session) { recovered.current = session; setLinkSession(true); setPhase("reset"); }
    })();
    return () => { active = false; };
  }, [p.access_token, p.refresh_token, p.code, p.token_hash, p.type]);

  const sendCode = async () => {
    setErr(null); setInfo(null);
    if (!email.trim()) { setErr("Enter your account email."); return; }
    Keyboard.dismiss();
    setSending(true);
    // Same recovery email — with a template that shows {{ .Token }} it carries the
    // 6-digit code we verify below (and still includes the link as a fallback).
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setSending(false);
    if (error) { setErr(error.message); return; }
    setInfo(`We emailed a code to ${email.trim()}. Enter it below with your new password.`);
    setPhase("reset");
  };

  const submit = async () => {
    setErr(null);
    if (!linkSession && otp.trim().length < 4) { setErr("Enter the code from your email."); return; }
    if (pw.length < 6) { setErr("Use at least 6 characters for the password."); return; }
    if (pw !== pw2) { setErr("The two passwords don't match."); return; }
    Keyboard.dismiss();
    setSaving(true);

    // Code path: verify the OTP to get a recovery session. Link path: reuse the
    // session the deep link already established.
    if (!linkSession) {
      const { data, error } = await supabase.auth.verifyOtp({ email: email.trim(), token: otp.trim(), type: "recovery" });
      if (error || !data.session) {
        setSaving(false);
        setErr(error?.message?.includes("expired") ? "That code has expired — send a new one." : "That code is incorrect or expired. Check the email and try again.");
        return;
      }
      recovered.current = { access_token: data.session.access_token, refresh_token: data.session.refresh_token };
    } else if (recovered.current) {
      await supabase.auth.setSession(recovered.current);
    }

    const { error } = await supabase.auth.updateUser({ password: pw });
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setPhase("done");
    await signOut(); // sign out so they log in fresh with the new password
  };

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {phase === "done" ? (
            <View style={s.center}>
              <View style={[s.iconCircle, { backgroundColor: C.green }]}><Ionicons name="checkmark" size={32} color="#FFFFFF" /></View>
              <Text style={s.title}>Password updated</Text>
              <Text style={s.dim}>You can now sign in with your new password.</Text>
              <Pressable style={s.primary} onPress={() => router.replace("/(auth)/login" as Href)}><Text style={s.primaryText}>SIGN IN</Text></Pressable>
            </View>
          ) : (
            <View>
              <Text style={s.eyebrow}>RESET PASSWORD</Text>
              <Text style={s.title}>{phase === "email" ? "Forgot your password?" : linkSession ? "Set a new password" : "Enter code & new password"}</Text>
              <Text style={s.dim}>
                {phase === "email"
                  ? "Enter your account email and we'll send you a verification code."
                  : linkSession
                    ? "Choose a new password for your account."
                    : "Check your email for the 6-digit code, then set a new password below."}
              </Text>

              {phase === "email" ? (
                <>
                  <Text style={s.label}>EMAIL</Text>
                  <View style={s.inputWrap}>
                    <Ionicons name="mail-outline" size={17} color={C.textDim} />
                    <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={C.textMute} autoCapitalize="none" keyboardType="email-address" autoFocus onSubmitEditing={sendCode} returnKeyType="send" />
                  </View>
                  {err ? <View style={s.errRow}><Ionicons name="alert-circle" size={16} color={C.red} /><Text style={s.errText}>{err}</Text></View> : null}
                  <Pressable style={({ pressed }) => [s.primary, pressed && { opacity: 0.9 }, sending && { opacity: 0.6 }]} onPress={sendCode} disabled={sending}>
                    {sending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.primaryText}>SEND CODE</Text>}
                  </Pressable>
                </>
              ) : (
                <>
                  {info ? <View style={s.infoRow}><Ionicons name="mail-open-outline" size={16} color={C.blue} /><Text style={s.infoText}>{info}</Text></View> : null}

                  {!linkSession ? (
                    <>
                      <Text style={s.label}>VERIFICATION CODE</Text>
                      <View style={s.inputWrap}>
                        <Ionicons name="key-outline" size={17} color={C.textDim} />
                        <TextInput style={[s.input, s.codeInput]} value={otp} onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, "").slice(0, 10))} placeholder="Code from email" placeholderTextColor={C.textMute} keyboardType="number-pad" maxLength={10} />
                      </View>
                    </>
                  ) : null}

                  <Text style={s.label}>NEW PASSWORD</Text>
                  <View style={s.inputWrap}>
                    <Ionicons name="lock-closed-outline" size={17} color={C.textDim} />
                    <TextInput style={s.input} secureTextEntry={!show} value={pw} onChangeText={setPw} placeholder="••••••••" placeholderTextColor={C.textMute} autoCapitalize="none" />
                    <Pressable onPress={() => setShow((v) => !v)} hitSlop={12}><Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={17} color={C.textDim} /></Pressable>
                  </View>

                  <Text style={s.label}>CONFIRM PASSWORD</Text>
                  <View style={s.inputWrap}>
                    <Ionicons name="lock-closed-outline" size={17} color={C.textDim} />
                    <TextInput style={s.input} secureTextEntry={!show} value={pw2} onChangeText={setPw2} placeholder="••••••••" placeholderTextColor={C.textMute} autoCapitalize="none" onSubmitEditing={submit} returnKeyType="go" />
                  </View>

                  {err ? <View style={s.errRow}><Ionicons name="alert-circle" size={16} color={C.red} /><Text style={s.errText}>{err}</Text></View> : null}

                  <Pressable style={({ pressed }) => [s.primary, pressed && { opacity: 0.9 }, saving && { opacity: 0.6 }]} onPress={submit} disabled={saving}>
                    {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.primaryText}>RESET PASSWORD</Text>}
                  </Pressable>

                  {!linkSession ? (
                    <Pressable style={s.resend} onPress={sendCode} disabled={sending}>
                      <Text style={s.resendText}>{sending ? "Sending…" : "Didn't get it? Resend code"}</Text>
                    </Pressable>
                  ) : null}
                </>
              )}

              <Pressable style={s.cancel} onPress={() => router.replace("/(auth)/login" as Href)}>
                <Text style={s.cancelText}>Back to login</Text>
              </Pressable>
            </View>
          )}
          <Text style={s.buildTag}>reset r4 · code</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, padding: 22, justifyContent: "center" },
  center: { alignItems: "center", paddingHorizontal: 12 },
  iconCircle: { width: 62, height: 62, borderRadius: 31, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  eyebrow: { fontSize: 10, fontWeight: "700", letterSpacing: 2.4, color: C.red },
  title: { fontSize: 24, fontWeight: "600", letterSpacing: -0.5, color: C.ink, marginTop: 8 },
  dim: { fontSize: 14, color: C.textDim, marginTop: 10, lineHeight: 21 },
  label: { fontSize: 9, fontWeight: "700", letterSpacing: 2, color: C.textDim, marginTop: 18, marginBottom: 8 },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 15, height: 52 },
  input: { flex: 1, fontSize: 15, color: C.ink },
  codeInput: { fontSize: 20, fontWeight: "700", letterSpacing: 4, color: C.ink },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: C.blueChip, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginTop: 16 },
  infoText: { color: C.ink, fontSize: 13, flex: 1, lineHeight: 19 },
  errRow: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.redChip, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginTop: 16 },
  errText: { color: C.red, fontSize: 13, flex: 1, lineHeight: 18 },
  primary: { minHeight: 52, borderRadius: 12, backgroundColor: C.red, alignItems: "center", justifyContent: "center", marginTop: 22, ...cardShadow },
  primaryText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700", letterSpacing: 1.6 },
  resend: { alignItems: "center", marginTop: 16 },
  resendText: { fontSize: 13, color: C.red, fontWeight: "500" },
  cancel: { alignItems: "center", marginTop: 18 },
  cancelText: { fontSize: 13, color: C.textDim, fontWeight: "500" },
  buildTag: { alignSelf: "center", fontSize: 10, color: C.textMute, letterSpacing: 1, marginTop: 28 },
});
