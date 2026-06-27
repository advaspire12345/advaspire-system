import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";

type Props = {
  title?: string;
  showLogo?: boolean;
};

export function TopBar({ title, showLogo = false }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [parentInitial, setParentInitial] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      try {
        const { data: parentRow } = await supabase
          .from("parents")
          .select("id, name, photo")
          .eq("auth_id", user.id)
          .is("deleted_at", null)
          .maybeSingle();
        if (cancelled || !parentRow) return;
        setPhotoUrl((parentRow.photo as string | null) ?? null);
        const name = (parentRow.name as string) ?? "";
        setParentInitial(name.charAt(0).toUpperCase() || "?");

        const { count } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("parent_id", parentRow.id as string)
          .is("read_at", null);
        if (!cancelled) setUnreadCount(count ?? 0);
      } catch {
        // silent — TopBar shouldn't crash on count fetch
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return (
    <View style={styles.bar}>
      <View style={styles.leftSlot}>
        {showLogo ? (
          <View style={styles.logoWrap}>
            <View style={styles.logoMark}>
              <Text style={styles.logoMarkText}>A</Text>
            </View>
            <Text style={styles.logoText}>Advaspire</Text>
          </View>
        ) : title ? (
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
      </View>

      <View style={styles.rightSlot}>
        <Pressable
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          onPress={() => router.push("/inbox")}
        >
          <Ionicons name="notifications-outline" size={20} color="#1F2937" />
          {unreadCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : String(unreadCount)}</Text>
            </View>
          ) : null}
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.avatarButton, pressed && styles.pressed]}
          onPress={() => router.push("/profile")}
        >
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>{parentInitial}</Text>
            </View>
          )}
          <View style={styles.avatarRing} pointerEvents="none" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "transparent",
  },
  leftSlot: { flex: 1, paddingRight: 8 },
  rightSlot: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoMark: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#615DFA",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#615DFA",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  logoMarkText: { fontSize: 16, fontWeight: "900", color: "#FFFFFF" },
  logoText: { fontSize: 18, fontWeight: "800", color: "#0F172A", letterSpacing: -0.4 },
  title: { fontSize: 18, fontWeight: "800", color: "#0F172A", letterSpacing: -0.3 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    position: "relative",
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  pressed: { opacity: 0.7 },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  badgeText: { color: "#FFFFFF", fontSize: 9, fontWeight: "800" },
  avatarButton: { width: 40, height: 40, position: "relative" },
  avatar: { width: 40, height: 40, borderRadius: 14 },
  avatarRing: {
    position: "absolute",
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(97,93,250,0.25)",
  },
  avatarFallback: { backgroundColor: "#615DFA", alignItems: "center", justifyContent: "center" },
  avatarInitial: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
});
