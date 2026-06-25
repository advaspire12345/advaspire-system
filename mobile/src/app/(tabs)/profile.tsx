import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/auth";

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.container}>
        <Text style={styles.title}>Profile</Text>
        {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
        <Text style={styles.subtitle}>
          Full profile editing comes in Phase 2 — name, phone, address, photos, password change.
        </Text>

        <Pressable
          style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}
          onPress={signOut}
        >
          <Text style={styles.logoutText}>Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F6FB" },
  container: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center", gap: 12 },
  title: { fontSize: 24, fontWeight: "800", color: "#111827" },
  email: { fontSize: 14, color: "#615DFA", fontWeight: "600" },
  subtitle: { fontSize: 14, color: "#6B7280", textAlign: "center", maxWidth: 280, marginBottom: 16 },
  logoutButton: {
    marginTop: 24,
    height: 52,
    paddingHorizontal: 32,
    borderRadius: 12,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.7 },
  logoutText: { color: "#DC2626", fontSize: 16, fontWeight: "700" },
});
