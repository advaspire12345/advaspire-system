import { useCallback, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";
import { useDrawer } from "@/contexts/drawer";
import { TourTarget } from "@/contexts/tour";
import { C } from "@/theme/tech";

type Props = {
  title?: string;
  showLogo?: boolean;
  /** Sentence-case breadcrumb under ADVASPIRE. Falls back to title. */
  crumb?: string;
  center?: React.ReactNode;
};

// Turn-4 clean white app bar: logo + ADVASPIRE + crumb, action buttons, a thin
// bottom hairline. No hazard stripe / circuit texture.
export function TopBar({ title, crumb, center }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const { openDrawer } = useDrawer();

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      try {
        const { data: parentRow } = await supabase
          .from("parents").select("id").eq("auth_id", user.id).is("deleted_at", null).maybeSingle();
        if (cancelled || !parentRow) return;
        const { count } = await supabase
          .from("notifications").select("id", { count: "exact", head: true })
          .eq("parent_id", parentRow.id as string).is("read_at", null);
        if (!cancelled) setUnreadCount(count ?? 0);
        const { count: msgCount } = await supabase
          .from("parent_messages").select("id", { count: "exact", head: true })
          .eq("parent_id", parentRow.id as string).eq("sender", "staff").is("read_at", null);
        if (!cancelled) setUnreadMessages(msgCount ?? 0);
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [user?.id]));

  const crumbText = crumb ?? title ?? "Parent Portal";

  return (
    <View style={styles.bar}>
      <View style={styles.left}>
        <Image source={require("../../assets/images/advaspire-logo.png")} style={styles.logoImg} resizeMode="contain" />
        <View style={{ flexShrink: 1 }}>
          <Text style={styles.brand}>ADVASPIRE</Text>
          <Text style={styles.crumb} numberOfLines={1}>{crumbText}</Text>
        </View>
      </View>

      {center ? <View style={styles.centerSlot}>{center}</View> : null}

      <View style={styles.right}>
        <Pressable style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]} onPress={() => router.push("/messages" as Href)}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={C.ink} />
          {unreadMessages > 0 ? <View style={[styles.badge, { backgroundColor: C.blue }]}><Text style={styles.badgeText}>{unreadMessages > 9 ? "9+" : String(unreadMessages)}</Text></View> : null}
        </Pressable>
        <Pressable style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]} onPress={() => router.push("/inbox")}>
          <Ionicons name="notifications-outline" size={20} color={C.ink} />
          {unreadCount > 0 ? <View style={[styles.badge, { backgroundColor: C.red }]}><Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : String(unreadCount)}</Text></View> : null}
        </Pressable>
        <TourTarget name="settings">
          <Pressable style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]} onPress={openDrawer}>
            <Ionicons name="settings-outline" size={20} color={C.ink} />
          </Pressable>
        </TourTarget>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: C.card, paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  left: { flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 1, minWidth: 0 },
  logoImg: { width: 34, height: 34 },
  brand: { fontSize: 13, fontWeight: "700", color: C.ink, letterSpacing: 1.8 },
  crumb: { fontSize: 11, color: C.textDim, marginTop: 1 },
  centerSlot: { flex: 1, minWidth: 0 },
  right: { flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 0 },
  iconBtn: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", position: "relative" },
  pressed: { opacity: 0.6, backgroundColor: C.greyChip },
  badge: { position: "absolute", top: 6, right: 6, minWidth: 16, height: 16, paddingHorizontal: 3, borderRadius: 8, borderWidth: 2, borderColor: C.card, alignItems: "center", justifyContent: "center" },
  badgeText: { color: "#FFFFFF", fontSize: 8, fontWeight: "800" },
});
