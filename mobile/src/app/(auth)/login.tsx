import { useState, type ComponentProps } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/auth";
import { submitTrialSignup } from "@/lib/api";
import { C, cardShadow } from "@/theme/tech";

export default function LoginScreen() {
  const { signIn, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pwFocused, setPwFocused] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trialOpen, setTrialOpen] = useState(false);
  const busy = submitting || googleLoading;

  const onSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError("Email and password are required");
      return;
    }
    Keyboard.dismiss();
    setSubmitting(true);
    const { error: signInError } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (signInError) setError(signInError);
  };

  const onGoogle = async () => {
    setError(null);
    Keyboard.dismiss();
    setGoogleLoading(true);
    const { error: gErr } = await signInWithGoogle();
    setGoogleLoading(false);
    if (gErr) setError(gErr);
    // On success the auth listener swaps to the portal automatically.
  };

  const onForgot = () => {
    // Open the in-app code-reset screen, pre-filling the email if they typed one.
    router.push({ pathname: "/reset-password", params: email.trim() ? { email: email.trim() } : {} } as unknown as Href);
  };

  const onTrial = () => setTrialOpen(true);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {/* Maroon hero */}
      <SafeAreaView edges={["top"]}>
        <View style={styles.hero}>
          <View style={styles.logoTile}>
            <Text style={styles.logoText}>A</Text>
          </View>
          <Text style={styles.eyebrow}>PARENT PORTAL</Text>
          <Text style={styles.welcome}>Welcome back</Text>
          <Text style={styles.welcomeSub}>Follow your child&apos;s lessons, sessions and results.</Text>
        </View>
      </SafeAreaView>

      {/* Light sheet */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.sheet}>
            <ScrollView
              contentContainerStyle={styles.sheetScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.fieldLabel}>EMAIL</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="mail-outline" size={17} color={C.textDim} />
                <TextInput
                  style={styles.input}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  placeholder="you@example.com"
                  placeholderTextColor={C.textMute}
                  value={email}
                  onChangeText={setEmail}
                  editable={!busy}
                  returnKeyType="next"
                />
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 18 }]}>PASSWORD</Text>
              <View style={[styles.inputWrap, pwFocused && styles.inputWrapActive]}>
                <Ionicons name="lock-closed-outline" size={17} color={pwFocused ? C.red : C.textDim} />
                <TextInput
                  style={styles.input}
                  autoCapitalize="none"
                  autoComplete="password"
                  secureTextEntry={!showPassword}
                  placeholder="••••••••"
                  placeholderTextColor={C.textMute}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setPwFocused(true)}
                  onBlur={() => setPwFocused(false)}
                  editable={!busy}
                  returnKeyType="go"
                  onSubmitEditing={onSubmit}
                />
                <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={12}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={17} color={C.textDim} />
                </Pressable>
              </View>

              <View style={styles.rowBetween}>
                <Pressable style={styles.checkRow} onPress={() => setKeepSignedIn((v) => !v)}>
                  <View style={[styles.checkbox, keepSignedIn && styles.checkboxOn]}>
                    {keepSignedIn ? <Ionicons name="checkmark" size={12} color="#FFFFFF" /> : null}
                  </View>
                  <Text style={styles.checkText}>Keep me signed in</Text>
                </Pressable>
                <Pressable onPress={onForgot} hitSlop={8}>
                  <Text style={styles.forgot}>Forgot password</Text>
                </Pressable>
              </View>

              {error ? (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle" size={16} color={C.red} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                style={({ pressed }) => [styles.signIn, pressed && styles.pressed, busy && styles.disabled]}
                onPress={onSubmit}
                disabled={busy}
              >
                {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.signInText}>SIGN IN</Text>}
              </Pressable>

              <View style={styles.orRow}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>OR</Text>
                <View style={styles.orLine} />
              </View>

              <Pressable
                style={({ pressed }) => [styles.google, pressed && styles.pressed, busy && styles.disabled]}
                onPress={onGoogle}
                disabled={busy}
              >
                {googleLoading ? (
                  <ActivityIndicator color={C.ink} />
                ) : (
                  <>
                    <Ionicons name="logo-google" size={17} color={C.ink} />
                    <Text style={styles.googleText}>Continue with Google</Text>
                  </>
                )}
              </Pressable>

              <Pressable style={styles.trialWrap} onPress={onTrial}>
                <Text style={styles.trialText}>
                  New to Advaspire?{" "}
                  <Text style={styles.trialLinkWrap}>Book a free trial class</Text>
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {trialOpen ? <TrialModal onClose={() => setTrialOpen(false)} /> : null}
    </View>
  );
}

// Branch choices mirror the website's /trial form; the server matches the slug
// to a real branch by name/city.
const TRIAL_BRANCHES: { slug: string; label: string }[] = [
  { slug: "semenyih", label: "Advaspire Semenyih" },
  { slug: "kepong", label: "Advaspire Kepong" },
];

function TrialModal({ onClose }: { onClose: () => void }) {
  const [parentName, setParentName] = useState("");
  const [phone, setPhone] = useState("");
  const [emailAddr, setEmailAddr] = useState("");
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("");
  const [branch, setBranch] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setErr(null);
    const age = parseInt(childAge, 10);
    if (!parentName.trim() || !phone.trim() || !childName.trim() || !childAge.trim() || !branch) {
      setErr("Please fill in name, phone, child's name, age and branch.");
      return;
    }
    if (Number.isNaN(age) || age < 3 || age > 18) {
      setErr("Enter the child's age (3–18).");
      return;
    }
    Keyboard.dismiss();
    setSending(true);
    const res = await submitTrialSignup({
      parent_name: parentName.trim(),
      parent_phone: phone.trim(),
      parent_email: emailAddr.trim() || null,
      child_name: childName.trim(),
      child_age: age,
      branch,
      message: message.trim() || null,
    });
    setSending(false);
    if (!res.ok) { setErr(res.error); return; }
    setDone(true);
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={t.backdrop}>
        <View style={t.sheet}>
          <View style={t.grabber} />
          <View style={t.headRow}>
            <View style={{ flex: 1 }}>
              <Text style={t.eyebrow}>FREE TRIAL</Text>
              <Text style={t.title}>{done ? "You're all set" : "Book a free trial class"}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={t.closeBtn}>
              <Ionicons name="close" size={20} color={C.textDim} />
            </Pressable>
          </View>

          {done ? (
            <View style={t.doneWrap}>
              <View style={t.doneIcon}><Ionicons name="checkmark" size={30} color="#FFFFFF" /></View>
              <Text style={t.doneText}>Got it — our team will contact you within 1 business day to arrange your child&apos;s free session.</Text>
              <Pressable style={t.primaryBtn} onPress={onClose}>
                <Text style={t.primaryBtnText}>DONE</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
              <Text style={t.sub}>One free 90-minute session — no payment needed. Fill this in and we&apos;ll reach out to schedule.</Text>

              <TField label="Parent name" value={parentName} onChangeText={setParentName} placeholder="Your full name" autoCapitalize="words" />
              <TField label="Phone" value={phone} onChangeText={setPhone} placeholder="+60 12-345 6789" keyboardType="phone-pad" />
              <TField label="Email (optional)" value={emailAddr} onChangeText={setEmailAddr} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
              <TField label="Child's name" value={childName} onChangeText={setChildName} placeholder="Your child's name" autoCapitalize="words" />
              <TField label="Child's age" value={childAge} onChangeText={setChildAge} placeholder="e.g. 9" keyboardType="number-pad" />

              <Text style={t.fieldLabel}>PREFERRED BRANCH</Text>
              <View style={t.branchRow}>
                {TRIAL_BRANCHES.map((b) => {
                  const on = branch === b.slug;
                  return (
                    <Pressable key={b.slug} style={[t.branchChip, on && t.branchChipOn]} onPress={() => setBranch(b.slug)}>
                      <Text style={[t.branchChipText, on && t.branchChipTextOn]}>{b.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={t.fieldLabel}>ANYTHING WE SHOULD KNOW? (OPTIONAL)</Text>
              <TextInput
                style={[t.input, t.inputMulti]}
                value={message}
                onChangeText={setMessage}
                placeholder="Interests, scheduling needs, anything helpful…"
                placeholderTextColor={C.textMute}
                multiline
              />

              {err ? (
                <View style={t.errRow}><Ionicons name="alert-circle" size={16} color={C.red} /><Text style={t.errText}>{err}</Text></View>
              ) : null}

              <Pressable style={({ pressed }) => [t.primaryBtn, pressed && { opacity: 0.9 }, sending && { opacity: 0.6 }]} onPress={submit} disabled={sending}>
                {sending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={t.primaryBtnText}>BOOK MY FREE TRIAL</Text>}
              </Pressable>
              <Text style={t.privacy}>We never share your information.</Text>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function TField({ label, ...props }: { label: string } & ComponentProps<typeof TextInput>) {
  return (
    <>
      <Text style={t.fieldLabel}>{label.toUpperCase()}</Text>
      <TextInput style={t.input} placeholderTextColor={C.textMute} {...props} />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.ink },
  flex: { flex: 1 },

  hero: { paddingHorizontal: 24, paddingTop: 30, paddingBottom: 34 },
  logoTile: { width: 62, height: 62, borderRadius: 16, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  logoText: { fontSize: 30, fontWeight: "800", color: C.red },
  eyebrow: { fontSize: 10, fontWeight: "700", letterSpacing: 2.4, color: C.yellow, marginTop: 24 },
  welcome: { fontSize: 30, fontWeight: "600", letterSpacing: -0.9, color: "#FFFFFF", marginTop: 10 },
  welcomeSub: { fontSize: 14, color: "rgba(255,255,255,0.7)", marginTop: 9, lineHeight: 22 },

  sheet: { flex: 1, backgroundColor: C.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26 },
  sheetScroll: { paddingHorizontal: 22, paddingTop: 26, paddingBottom: 40 },

  fieldLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 2, color: C.textDim },
  inputWrap: {
    flexDirection: "row", alignItems: "center", gap: 11, marginTop: 9,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12,
    paddingHorizontal: 15, height: 52,
  },
  inputWrapActive: { borderWidth: 2, borderColor: C.red, paddingHorizontal: 14 },
  input: { flex: 1, fontSize: 15, color: C.ink },

  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  checkbox: { width: 19, height: 19, borderRadius: 4, borderWidth: 1.5, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  checkboxOn: { backgroundColor: C.red, borderColor: C.red },
  checkText: { fontSize: 13, color: C.ink },
  forgot: { fontSize: 13, fontWeight: "500", color: C.red },

  errorRow: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.redChip, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginTop: 16 },
  errorText: { color: C.red, fontSize: 13, flex: 1, lineHeight: 18 },

  signIn: { minHeight: 52, borderRadius: 12, backgroundColor: C.red, alignItems: "center", justifyContent: "center", marginTop: 22, ...cardShadow },
  signInText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700", letterSpacing: 1.8 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.995 }] },
  disabled: { opacity: 0.6 },

  orRow: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 22 },
  orLine: { flex: 1, height: 1, backgroundColor: C.border },
  orText: { fontSize: 9, fontWeight: "700", letterSpacing: 1.6, color: "#8A8085" },

  google: { minHeight: 50, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  googleText: { fontSize: 13, fontWeight: "600", color: C.ink },

  trialWrap: { alignItems: "center", marginTop: 24 },
  trialText: { fontSize: 13, color: C.textDim, textAlign: "center", lineHeight: 22 },
  trialLinkWrap: { fontWeight: "600", color: C.ink },
});

const t = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(43,22,27,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 26, maxHeight: "92%" },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, marginBottom: 14 },
  headRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  eyebrow: { fontSize: 9, fontWeight: "700", letterSpacing: 2.2, color: C.red },
  title: { fontSize: 22, fontWeight: "600", letterSpacing: -0.5, color: C.ink, marginTop: 6 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.card, alignItems: "center", justifyContent: "center", ...cardShadow },
  sub: { fontSize: 13, color: C.textDim, lineHeight: 20, marginBottom: 6 },

  fieldLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 1.6, color: C.textDim, marginTop: 15, marginBottom: 7 },
  input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.ink },
  inputMulti: { minHeight: 74, textAlignVertical: "top", paddingTop: 12 },

  branchRow: { flexDirection: "row", gap: 9 },
  branchChip: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, alignItems: "center" },
  branchChipOn: { borderColor: C.red, borderWidth: 2, backgroundColor: C.redChip },
  branchChipText: { fontSize: 12, fontWeight: "600", color: C.textDim },
  branchChipTextOn: { color: C.red },

  errRow: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.redChip, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginTop: 16 },
  errText: { color: C.red, fontSize: 13, flex: 1, lineHeight: 18 },

  primaryBtn: { minHeight: 52, borderRadius: 12, backgroundColor: C.red, alignItems: "center", justifyContent: "center", marginTop: 20, ...cardShadow },
  primaryBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700", letterSpacing: 1.6 },
  privacy: { fontSize: 10, color: C.textMute, textAlign: "center", letterSpacing: 1, marginTop: 12, textTransform: "uppercase" },

  doneWrap: { alignItems: "center", paddingVertical: 18, paddingHorizontal: 6 },
  doneIcon: { width: 62, height: 62, borderRadius: 31, backgroundColor: C.green, alignItems: "center", justifyContent: "center" },
  doneText: { fontSize: 15, color: C.ink, textAlign: "center", lineHeight: 23, marginTop: 18 },
});
