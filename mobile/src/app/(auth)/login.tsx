import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/auth";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError("Email and password are required");
      return;
    }
    setSubmitting(true);
    const { error: signInError } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (signInError) setError(signInError);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.brand}>Advaspire</Text>
            <Text style={styles.subtitle}>Parent portal</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              editable={!submitting}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              autoComplete="password"
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              editable={!submitting}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
                submitting && styles.buttonDisabled,
              ]}
              onPress={onSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Sign in</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24, justifyContent: "center" },
  header: { marginBottom: 48, alignItems: "center" },
  brand: { fontSize: 36, fontWeight: "800", color: "#615DFA", letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: "#6B7280", marginTop: 4 },
  form: { gap: 12 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginTop: 8 },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: "#F9FAFB",
    color: "#111827",
  },
  errorText: { color: "#DC2626", fontSize: 14, marginTop: 4 },
  button: {
    marginTop: 16,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#615DFA",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: { opacity: 0.85 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
