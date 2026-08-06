import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useSettings, type CalView } from "@/contexts/settings";
import { useDrawerReturn } from "@/contexts/drawer";

const VIEWS: { key: CalView; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "month", label: "Month", icon: "grid-outline" },
  { key: "week", label: "Week", icon: "calendar-outline" },
  { key: "day", label: "Day", icon: "today-outline" },
];

export default function CalendarSettings() {
  useDrawerReturn();
  const { defaultView, setDefaultView, showFilter, setShowFilter } = useSettings();
  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionLabel}>Default view</Text>
        <Text style={styles.hint}>Which view the Schedule tab opens on.</Text>
        <View style={styles.card}>
          {VIEWS.map((v, i) => {
            const on = defaultView === v.key;
            return (
              <Pressable key={v.key} style={[styles.row, i > 0 && styles.rowDivider]} onPress={() => setDefaultView(v.key)}>
                <Ionicons name={v.icon} size={20} color="#EC2127" />
                <Text style={styles.rowLabel}>{v.label}</Text>
                <Ionicons name={on ? "radio-button-on" : "radio-button-off"} size={20} color={on ? "#EC2127" : "#D1D5DB"} />
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Child filter</Text>
        <Text style={styles.hint}>Show the row of child chips to filter the calendar by child.</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="people-outline" size={20} color="#EC2127" />
            <Text style={styles.rowLabel}>Show child filter</Text>
            <Switch value={showFilter} onValueChange={setShowFilter} trackColor={{ true: "#EC2127" }} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F3F5" },
  scroll: { padding: 16 },
  sectionLabel: { fontSize: 12, fontWeight: "800", color: "#666666", textTransform: "uppercase", letterSpacing: 0.8, marginTop: 12, marginBottom: 4 },
  hint: { fontSize: 13, color: "#999999", marginBottom: 10, lineHeight: 18 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 14, paddingHorizontal: 14, marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 15 },
  rowDivider: { borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: "600", color: "#2B161B" },
});
