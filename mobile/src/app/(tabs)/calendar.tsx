import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CalendarScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.container}>
        <Text style={styles.title}>Calendar</Text>
        <Text style={styles.subtitle}>Coming in Phase 2 — full-month grid with events, classes, and reschedules.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F6FB" },
  container: { flex: 1, padding: 16, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "800", color: "#111827" },
  subtitle: { fontSize: 14, color: "#6B7280", marginTop: 8, textAlign: "center", maxWidth: 280 },
});
