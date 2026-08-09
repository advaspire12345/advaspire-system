import { useEffect, useRef, useState } from "react";
import { Alert, Animated, Dimensions, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/auth";
import { useSettings } from "@/contexts/settings";
import { useDrawer } from "@/contexts/drawer";
import { C } from "@/theme/tech";

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
    // Points at Progress' GALLERY sub-tab, not the standalone /gallery screen, so
    // there is only one gallery implementation to keep in step.
    { icon: "images-outline", label: "Gallery", action: () => nav("/(tabs)/progress?section=gallery") },
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
          <Pressable onPress={closeDrawer} hitSlop={8} style={styles.close}><Ionicons name="close" size={20} color={C.textDim} /></Pressable>
        </View>
        <View style={styles.list}>
          {items.map((it) => (
            <Pressable key={it.label} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={it.action}>
              <View style={styles.rowIcon}><Ionicons name={it.icon} size={19} color={C.red} /></View>
              <Text style={styles.rowLabel}>{it.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={C.textMute} />
            </Pressable>
          ))}
        </View>
        <Pressable style={({ pressed }) => [styles.signOut, pressed && styles.rowPressed]} onPress={onSignOut}>
          <Ionicons name="log-out-outline" size={20} color={C.red} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(43,22,27,0.4)" },
  panel: { position: "absolute", top: 0, right: 0, bottom: 0, backgroundColor: C.card, paddingHorizontal: 8, paddingBottom: 24, shadowColor: "#000000", shadowOpacity: 0.18, shadowRadius: 20, shadowOffset: { width: -6, height: 0 }, elevation: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.borderFaint },
  headerTitle: { fontSize: 20, fontWeight: "600", color: C.ink, letterSpacing: -0.3 },
  close: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.greyChip, alignItems: "center", justifyContent: "center" },
  list: { flex: 1, paddingTop: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 10, paddingVertical: 14, borderRadius: 14 },
  rowIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: C.redChip, alignItems: "center", justifyContent: "center" },
  rowPressed: { backgroundColor: C.bg },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: "600", color: C.ink },
  signOut: { flexDirection: "row", alignItems: "center", gap: 10, justifyContent: "center", backgroundColor: C.redChip, borderRadius: 14, paddingVertical: 14, marginHorizontal: 8 },
  signOutText: { fontSize: 15, fontWeight: "700", color: C.red },
});
