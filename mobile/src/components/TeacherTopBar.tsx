import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, usePathname, useFocusEffect, type Href } from "expo-router";
import { useRole } from "@/contexts/role";
import { supabase } from "@/lib/supabase";

// Shared teacher app-bar: brand on the left, Message / Notification / Profile on
// the right. The icon for the page you're on shows in the active (teal) colour,
// and the bell / chat show an unread badge.
export function TeacherTopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { staff } = useRole();
  const go = (path: string) => router.push(path as Href);
  const [unreadNotif, setUnreadNotif] = useState(0);
  const [unreadMsg, setUnreadMsg] = useState(0);

  const loadBadges = useCallback(async () => {
    if (!staff?.id) return;
    const { count: nCount } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", staff.id).is("read_at", null);
    setUnreadNotif(nCount ?? 0);
    // Unread parent→staff messages the teacher can see.
    const { count: mCount } = await supabase.from("parent_messages").select("id", { count: "exact", head: true }).eq("sender", "parent").is("read_at", null);
    setUnreadMsg(mCount ?? 0);
  }, [staff?.id]);

  useFocusEffect(useCallback(() => { loadBadges(); }, [loadBadges]));

  const items: { key: string; icon: keyof typeof Ionicons.glyphMap; iconOn: keyof typeof Ionicons.glyphMap; route: string; badge: number }[] = [
    { key: "messages", icon: "chatbubbles-outline", iconOn: "chatbubbles", route: "/(teacher)/messages", badge: unreadMsg },
    { key: "notifications", icon: "notifications-outline", iconOn: "notifications", route: "/(teacher)/notifications", badge: unreadNotif },
    { key: "profile", icon: "person-circle-outline", iconOn: "person-circle", route: "/(teacher)/profile", badge: 0 },
  ];

  return (
    <View style={styles.bar}>
      <Text style={styles.brand}>Advaspire · Teacher</Text>
      <View style={styles.icons}>
        {items.map((it) => {
          const active = (pathname ?? "").includes(it.key);
          return (
            <Pressable key={it.key} hitSlop={6} style={[styles.iconBtn, active && styles.iconBtnOn]} onPress={() => go(it.route)}>
              <Ionicons name={active ? it.iconOn : it.icon} size={it.key === "profile" ? 22 : 20} color={active ? "#0D9488" : "#0F172A"} />
              {it.badge > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{it.badge > 9 ? "9+" : it.badge}</Text></View> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 6, paddingBottom: 6 },
  brand: { fontSize: 12, fontWeight: "800", color: "#0D9488", textTransform: "uppercase", letterSpacing: 1 },
  icons: { flexDirection: "row", alignItems: "center", gap: 6 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#EEF2F7" },
  iconBtnOn: { backgroundColor: "#CCFBF1" },
  badge: { position: "absolute", top: -2, right: -2, minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 9, backgroundColor: "#DC2626", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#F6F8FA" },
  badgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
});
