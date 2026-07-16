import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/auth";
import { useRole } from "@/contexts/role";
import { TeacherTopBar } from "@/components/TeacherTopBar";

function titleCase(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function TeacherProfile() {
  const { user, signOut } = useAuth();
  const { staff } = useRole();
  const initial = (staff?.name ?? "?").charAt(0).toUpperCase();

  const onLogout = () => {
    Alert.alert("Log out", "Log out of the teacher portal? You can log back in as a parent or teacher.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => { signOut(); } },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <TeacherTopBar />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          {staff?.photo ? (
            <Image source={{ uri: staff.photo }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}><Text style={styles.avatarInitial}>{initial}</Text></View>
          )}
          <Text style={styles.name}>{staff?.name ?? "Teacher"}</Text>
          {staff?.role ? <View style={styles.rolePill}><Text style={styles.rolePillText}>{titleCase(staff.role)}</Text></View> : null}
          {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
        </View>

        <View style={styles.card}>
          <Row icon="business-outline" label="Branch" value={staff?.branchId ? "Assigned" : "—"} />
          <Row icon="phone-portrait-outline" label="Portal" value="Teacher" />
        </View>

        <Pressable style={({ pressed }) => [styles.logout, pressed && { opacity: 0.85 }]} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
        <Text style={styles.hint}>Logging out returns you to the login screen — sign in with a parent account for the parent portal.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color="#0D9488" />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F8FA" },
  scroll: { padding: 16, gap: 14 },
  hero: { alignItems: "center", gap: 8, paddingVertical: 16 },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: "#E6FAF9" },
  avatarFallback: { alignItems: "center", justifyContent: "center", backgroundColor: "#0D9488" },
  avatarInitial: { color: "#FFFFFF", fontSize: 34, fontWeight: "800" },
  name: { fontSize: 22, fontWeight: "800", color: "#0F172A", marginTop: 4 },
  rolePill: { backgroundColor: "#CCFBF1", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  rolePillText: { fontSize: 12, fontWeight: "800", color: "#0F766E" },
  email: { fontSize: 13, color: "#6B7280" },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, paddingHorizontal: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  rowLabel: { fontSize: 15, color: "#111827", fontWeight: "600" },
  rowValue: { flex: 1, textAlign: "right", fontSize: 14, color: "#6B7280", fontWeight: "600" },
  logout: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#FEE2E2", height: 52, borderRadius: 14, marginTop: 8 },
  logoutText: { color: "#DC2626", fontSize: 16, fontWeight: "800" },
  hint: { fontSize: 12, color: "#9CA3AF", textAlign: "center", lineHeight: 17 },
});
