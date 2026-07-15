import { Tabs } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

// ── BUILD MARKER ──────────────────────────────────────────────────────────────
// Change this colour on EVERY shipped fix so the user can confirm the OTA update
// actually loaded (the centre Home button uses it). Rotate to a clearly different
// colour each time. History: … → sky → lime → rose.
const BUILD_COLOR = "#E11D48"; // rose

type TabDef = { name: string; label: string; icon: keyof typeof Ionicons.glyphMap; center?: boolean };

// Home sits in the centre; Marketplace is last.
const TABS: TabDef[] = [
  { name: "progress", label: "Progress", icon: "trending-up" },
  { name: "schedule", label: "Schedule", icon: "calendar" },
  { name: "index", label: "Home", icon: "home", center: true },
  { name: "payment", label: "Payment", icon: "card" },
  { name: "marketplace", label: "Store", icon: "storefront" },
];

function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TABS.map((t) => {
        const route = state.routes.find((r) => r.name === t.name);
        if (!route) return null;
        const focused = state.index === state.routes.indexOf(route);
        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };
        const iconName = (focused ? t.icon : (`${t.icon}-outline` as keyof typeof Ionicons.glyphMap));

        if (t.center) {
          return (
            <Pressable key={t.name} onPress={onPress} style={styles.centerItem}>
              <View style={[styles.centerBtn, focused && styles.centerBtnActive]}>
                <Ionicons name={iconName} size={28} color="#FFFFFF" />
              </View>
              <Text style={[styles.label, focused && styles.labelActive]}>{t.label}</Text>
            </Pressable>
          );
        }

        return (
          <Pressable key={t.name} onPress={onPress} style={styles.item}>
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Ionicons name={iconName} size={22} color={focused ? "#FFFFFF" : "#9CA3AF"} />
            </View>
            <Text style={[styles.label, focused && styles.labelActive]} numberOfLines={1}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="progress" />
      <Tabs.Screen name="schedule" />
      <Tabs.Screen name="index" />
      <Tabs.Screen name="payment" />
      <Tabs.Screen name="marketplace" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    backgroundColor: "#FFFFFF",
    paddingTop: 10,
    paddingHorizontal: 6,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#0F172A",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 16,
  },
  item: { flex: 1, alignItems: "center", gap: 4, paddingBottom: 2 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  // Active non-centre tab: round, coloured, raised — "pops out" of the bar.
  iconWrapActive: {
    backgroundColor: "#615DFA",
    transform: [{ translateY: -14 }, { scale: 1.06 }],
    shadowColor: "#615DFA",
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  centerItem: { flex: 1, alignItems: "center", gap: 4 },
  centerBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: BUILD_COLOR, // BUILD MARKER (see top of file)
    alignItems: "center",
    justifyContent: "center",
    transform: [{ translateY: -18 }],
    borderWidth: 4,
    borderColor: "#FFFFFF",
    shadowColor: BUILD_COLOR,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  centerBtnActive: {
    backgroundColor: BUILD_COLOR, // BUILD MARKER
    transform: [{ translateY: -22 }, { scale: 1.06 }],
    shadowOpacity: 0.5,
  },
  label: { fontSize: 10, fontWeight: "700", color: "#9CA3AF" },
  labelActive: { color: "#615DFA", fontWeight: "800" },
});
