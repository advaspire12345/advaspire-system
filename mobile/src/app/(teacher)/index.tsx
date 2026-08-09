import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useRole } from "@/contexts/role";

// BUILD MARKER (teacher) — rotate on every shipped teacher-app fix so staff can
// confirm the OTA loaded. History: … → sky → lime → magenta.
const TEACHER_BUILD_COLOR = "#DB2777"; // magenta (AI comment rewrite with review-before-save)

type Feature = { key: string; label: string; icon: keyof typeof Ionicons.glyphMap; route: string; tint: string };
const FEATURES: Feature[] = [
  { key: "attendance", label: "Mark Attendance", icon: "checkbox", route: "/(teacher)/attendance", tint: "#0D9488" },
  { key: "trial", label: "Trials", icon: "sparkles", route: "/(teacher)/trial", tint: "#F59E0B" },
  { key: "progress", label: "Student Progress", icon: "trending-up", route: "/(teacher)/progress", tint: "#2563EB" },
  { key: "adcoin", label: "Adcoin Transfer", icon: "logo-bitcoin", route: "/(teacher)/adcoin", tint: "#CA8A04" },
  { key: "calendar", label: "Calendar & Events", icon: "calendar", route: "/(teacher)/calendar", tint: "#7C3AED" },
  { key: "messages", label: "Messages", icon: "chatbubbles", route: "/(teacher)/messages", tint: "#DB2777" },
  { key: "notifications", label: "Notifications", icon: "notifications", route: "/(teacher)/notifications", tint: "#DC2626" },
  { key: "profile", label: "Profile", icon: "person", route: "/(teacher)/profile", tint: "#0891B2" },
];

function titleCase(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function TeacherHome() {
  const router = useRouter();
  const { staff } = useRole();
  const first = staff?.name?.split(" ")[0] ?? "";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.flex}>
            <View style={styles.brandRow}>
              <Text style={styles.brand}>Advaspire · Teacher</Text>
              <View style={[styles.buildDot, { backgroundColor: TEACHER_BUILD_COLOR }]} />
            </View>
            <Text style={styles.hello}>Hello{first ? `, ${first}` : ""}</Text>
            {staff?.role ? <Text style={styles.role}>{titleCase(staff.role)}</Text> : null}
          </View>
        </View>

        <Text style={styles.sectionLabel}>What would you like to do?</Text>
        <View style={styles.grid}>
          {FEATURES.map((f) => (
            <Pressable key={f.key} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={() => router.push(f.route as Href)}>
              <View style={[styles.cardIcon, { backgroundColor: f.tint + "1A" }]}>
                <Ionicons name={f.icon} size={24} color={f.tint} />
              </View>
              <Text style={styles.cardLabel}>{f.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F8FA" },
  flex: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  brand: { fontSize: 12, fontWeight: "800", color: "#0D9488", textTransform: "uppercase", letterSpacing: 1 },
  buildDot: { width: 10, height: 10, borderRadius: 5 },
  hello: { fontSize: 28, fontWeight: "800", color: "#0F172A", marginTop: 6, letterSpacing: -0.6 },
  role: { fontSize: 14, color: "#6B7280", marginTop: 2, fontWeight: "600" },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: "#6B7280", textTransform: "uppercase", letterSpacing: 1, marginTop: 18, marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: {
    width: "47.5%", backgroundColor: "#FFFFFF", borderRadius: 18, padding: 16, gap: 12, minHeight: 108, justifyContent: "space-between",
    shadowColor: "#0F172A", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  cardPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  cardIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cardLabel: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
});
