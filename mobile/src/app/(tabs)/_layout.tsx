import { Tabs } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { ProgressBadgeProvider, useProgressBadge } from "@/contexts/progressBadge";
import { OnboardingTour } from "@/components/OnboardingTour";
import { SettingsDrawer } from "@/components/SettingsDrawer";
import { TourTarget } from "@/contexts/tour";
import { C } from "@/theme/tech";

// ── BUILD MARKER ──────────────────────────────────────────────────────────────
// Rotate on EVERY shipped fix (small dot, top-right of the tab bar) so the user
// can confirm the OTA loaded. History: … → cyan → red → blue → yellow → green.
const BUILD_COLOR = "#DB2777"; // pink (reset code accepts up to 10 digits — matches 8-digit OTP)

type TabDef = { name: string; label: string; icon: keyof typeof Ionicons.glyphMap };

// Turn-4 white tab bar: Home · Progress · Calendar · Payment · Store.
// Active tab lifts into a red rounded square with a white ring.
const TABS: TabDef[] = [
  { name: "progress", label: "Progress", icon: "trending-up" },
  { name: "schedule", label: "Calendar", icon: "calendar" },
  { name: "index", label: "Home", icon: "home" },
  { name: "payment", label: "Payment", icon: "card" },
  { name: "marketplace", label: "Store", icon: "storefront" },
];

function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { hasNew } = useProgressBadge();
  return (
    <TourTarget name="tabs">
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        {TABS.map((t) => {
          const route = state.routes.find((r) => r.name === t.name);
          if (!route) return null;
          const focused = state.index === state.routes.indexOf(route);
          const onPress = () => {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };
          const iconName = (focused ? t.icon : (`${t.icon}-outline` as keyof typeof Ionicons.glyphMap));
          const showBadge = t.name === "progress" && hasNew && !focused;
          return (
            <Pressable key={t.name} onPress={onPress} style={styles.item}>
              <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
                <Ionicons name={iconName} size={focused ? 23 : 21} color={focused ? "#FFFFFF" : "#8D8487"} />
                {showBadge ? <View style={styles.badge} /> : null}
              </View>
              <Text style={[styles.label, focused && styles.labelActive]} numberOfLines={1}>{t.label}</Text>
            </Pressable>
          );
        })}
        <View style={styles.buildDot} />
      </View>
    </TourTarget>
  );
}

export default function TabsLayout() {
  return (
    <ProgressBadgeProvider>
      <StatusBar style="dark" />
      <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="progress" />
        <Tabs.Screen name="schedule" />
        <Tabs.Screen name="payment" />
        <Tabs.Screen name="marketplace" />
        {/* Gallery lives in the settings menu now (Store is the 5th tab). */}
        <Tabs.Screen name="gallery" options={{ href: null }} />
      </Tabs>
      <SettingsDrawer />
      <OnboardingTour />
    </ProgressBadgeProvider>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-around",
    backgroundColor: C.card,
    paddingTop: 10,
    paddingHorizontal: 5,
    borderTopWidth: 1,
    borderTopColor: "#EEEAEC",
  },
  item: { flex: 1, alignItems: "center", gap: 5 },
  iconWrap: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: "transparent" },
  // Active: red rounded square, white ring, lifted out of the bar.
  iconWrapActive: {
    width: 54,
    height: 54,
    borderRadius: 19,
    backgroundColor: C.red,
    borderColor: C.card,
    transform: [{ translateY: -14 }],
    shadowColor: C.red,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  label: { fontSize: 10, fontWeight: "500", color: "#8D8487" },
  labelActive: { color: C.red, fontWeight: "700", transform: [{ translateY: -12 }] },
  badge: { position: "absolute", top: 2, right: 2, width: 9, height: 9, borderRadius: 5, backgroundColor: C.red, borderWidth: 1.5, borderColor: C.card },
  buildDot: { position: "absolute", top: 6, right: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: BUILD_COLOR },
});
