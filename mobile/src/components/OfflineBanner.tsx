import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  // Epoch ms of when the shown data was last synced from the network.
  updatedAt: number | null;
};

// "just now" / "5 min ago" / "3 hr ago" / "on 12 Jun" — a friendly, parent
// facing stamp of when the data on screen was last pulled from the internet.
function formatLastSynced(updatedAt: number): string {
  const diffMs = Date.now() - updatedAt;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const date = new Date(updatedAt);
  return `on ${date.toLocaleDateString("en-MY", { day: "numeric", month: "short" })}`;
}

/**
 * Thin amber bar shown when the screen is displaying cached data because the
 * device is offline / the last refresh failed. Tells the parent exactly how
 * fresh the info is.
 */
export function OfflineBanner({ updatedAt }: Props) {
  return (
    <View style={styles.bar}>
      <Ionicons name="cloud-offline-outline" size={14} color="#92400E" />
      <Text style={styles.text}>
        Offline · showing saved data
        {updatedAt ? ` from ${formatLastSynced(updatedAt)}` : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  text: { color: "#92400E", fontSize: 12, fontWeight: "700", flex: 1 },
});
