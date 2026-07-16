import { useEffect, useRef, useState } from "react";
import { Alert, Animated, Dimensions, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/auth";
import { useSettings } from "@/contexts/settings";
import { useDrawer } from "@/contexts/drawer";

type Item = { icon: keyof typeof Ionicons.glyphMap; label: string; action: () => void };

// Right-side settings panel (slides in from the right). Driven by the global
// drawer context so it can reopen after Back from a menu screen.
export function SettingsDrawer() {
  const { open, closeDrawer, go } = useDrawer();
  const { signOut } = useAuth();
  const { showTour } = useSettings();
  const insets = useSafeAreaInsets();
  const panelW = Math.min(320, Dimensions.get("window").width * 0.84);
  const tx = useRef(new Animated.Value(panelW)).current;
  // Keep mounted through the close animation so it slides out (left→right) rather
  // than vanishing.
  const [mounted, setMounted] = useState(false);
  const backdropOpacity = tx.interpolate({ inputRange: [0, panelW], outputRange: [1, 0] });

  useEffect(() => {
    if (open) {
      setMounted(true);
      Animated.timing(tx, { toValue: 0, duration: 220, useNativeDriver: true }).start();
    } else {
      Animated.timing(tx, { toValue: panelW, duration: 200, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [open, panelW, tx]);

  const onSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => { closeDrawer(); signOut(); } },
    ]);
  };

  const nav = (route: string) => go(route as Href);
  const items: Item[] = [
    { icon: "person-outline", label: "Profile", action: () => nav("/profile") },
    { icon: "lock-closed-outline", label: "Change password", action: () => nav("/change-password") },
    { icon: "calendar-outline", label: "Calendar settings", action: () => nav("/settings/calendar") },
    { icon: "help-circle-outline", label: "Help & tour", action: () => { closeDrawer(); setTimeout(showTour, 200); } },
    { icon: "document-text-outline", label: "Terms & Conditions", action: () => nav("/legal/terms") },
    { icon: "shield-checkmark-outline", label: "Privacy Policy", action: () => nav("/legal/privacy") },
  ];

  if (!mounted) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={closeDrawer}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
      </Animated.View>
      <Animated.View style={[styles.panel, { width: panelW, paddingTop: insets.top + 12, transform: [{ translateX: tx }] }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Pressable onPress={closeDrawer} hitSlop={8} style={styles.close}><Ionicons name="close" size={20} color="#6B7280" /></Pressable>
        </View>
        <View style={styles.list}>
          {items.map((it) => (
            <Pressable key={it.label} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={it.action}>
              <Ionicons name={it.icon} size={20} color="#615DFA" />
              <Text style={styles.rowLabel}>{it.label}</Text>
              <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
            </Pressable>
          ))}
        </View>
        <Pressable style={({ pressed }) => [styles.signOut, pressed && styles.rowPressed]} onPress={onSignOut}>
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,23,42,0.4)" },
  panel: { position: "absolute", top: 0, right: 0, bottom: 0, backgroundColor: "#FFFFFF", paddingHorizontal: 8, paddingBottom: 24, shadowColor: "#0F172A", shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: -6, height: 0 }, elevation: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#F1F1F6" },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
  close: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  list: { flex: 1, paddingTop: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 10, paddingVertical: 15, borderRadius: 12 },
  rowPressed: { backgroundColor: "#F3F4F6" },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: "600", color: "#111827" },
  signOut: { flexDirection: "row", alignItems: "center", gap: 10, justifyContent: "center", backgroundColor: "#FEE2E2", borderRadius: 12, paddingVertical: 14, marginHorizontal: 8 },
  signOutText: { fontSize: 15, fontWeight: "800", color: "#DC2626" },
});
