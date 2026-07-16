import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Placeholder for teacher-portal features that aren't wired up yet.
export function ComingSoon({ icon, title, note }: { icon: keyof typeof Ionicons.glyphMap; title: string; note?: string }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={40} color="#0EA5A4" />
      </View>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.pill}><Text style={styles.pillText}>Coming soon</Text></View>
      <Text style={styles.note}>{note ?? "This feature is being built. It'll appear here in an upcoming update."}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12, backgroundColor: "#F6F8FA" },
  iconWrap: { width: 84, height: 84, borderRadius: 42, backgroundColor: "#E6FAF9", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "800", color: "#0F172A", marginTop: 4 },
  pill: { backgroundColor: "#CCFBF1", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  pillText: { fontSize: 12, fontWeight: "800", color: "#0F766E", letterSpacing: 0.5 },
  note: { fontSize: 14, color: "#6B7280", textAlign: "center", lineHeight: 20, maxWidth: 300 },
});
