import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useAuth } from "@/contexts/auth";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { useDrawerReturn } from "@/contexts/drawer";
import { supabase } from "@/lib/supabase";
import { C, cardShadow } from "@/theme/tech";

type ParentForm = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  postcode: string;
  city: string;
  photo: string | null;
  coverPhoto: string | null;
};
type Stats = { children: number; sessions: number; attended: number };

export default function ProfileScreen() {
  useDrawerReturn();
  const { user, signOut } = useAuth();
  const userId = user?.id;
  const router = useRouter();
  const [original, setOriginal] = useState<ParentForm | null>(null);
  const [form, setForm] = useState<ParentForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchProfile = async (): Promise<ParentForm> => {
    const { data, error } = await supabase
      .from("parents")
      .select("id, name, email, phone, address, postcode, city, photo, cover_photo")
      .eq("auth_id", userId!)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Parent record not found.");
    return {
      id: data.id as string,
      name: (data.name as string) ?? "",
      email: (data.email as string) ?? "",
      phone: (data.phone as string | null) ?? "",
      address: (data.address as string | null) ?? "",
      postcode: (data.postcode as string | null) ?? "",
      city: (data.city as string | null) ?? "",
      photo: (data.photo as string | null) ?? null,
      coverPhoto: (data.cover_photo as string | null) ?? null,
    };
  };

  const { data, loading, error, isStale, updatedAt } = useCachedQuery<ParentForm>(
    `profile:${userId ?? "anon"}`,
    fetchProfile,
    { enabled: !!userId },
  );

  const fetchStats = async (): Promise<Stats> => {
    const { data: parentRow } = await supabase
      .from("parents").select("id").eq("auth_id", userId!).is("deleted_at", null).maybeSingle();
    if (!parentRow) return { children: 0, sessions: 0, attended: 0 };
    const { data: links } = await supabase
      .from("parent_students")
      .select("student:students!inner(id, deleted_at, enrollments(sessions_remaining, status, deleted_at))")
      .eq("parent_id", parentRow.id);
    const ids: string[] = [];
    let sessions = 0;
    for (const l of links ?? []) {
      const s = l.student as unknown as { id: string; deleted_at: string | null; enrollments: Array<{ sessions_remaining: number; status: string; deleted_at: string | null }> } | null;
      if (!s || s.deleted_at) continue;
      ids.push(s.id);
      for (const e of s.enrollments ?? []) {
        if (!e.deleted_at && e.status === "active") sessions += Number(e.sessions_remaining ?? 0);
      }
    }
    let attended = 0;
    if (ids.length) {
      const { count } = await supabase
        .from("attendance")
        .select("id, enrollment:enrollments!inner(student_id)", { count: "exact", head: true })
        .in("enrollment.student_id", ids)
        .eq("status", "present");
      attended = count ?? 0;
    }
    return { children: ids.length, sessions, attended };
  };
  const statsQuery = useCachedQuery<Stats>(`profile:stats:${userId ?? "anon"}`, fetchStats, { enabled: !!userId });
  const stats = statsQuery.data ?? { children: 0, sessions: 0, attended: 0 };

  useEffect(() => {
    if (data) {
      setOriginal(data);
      setForm((prev) => prev ?? data);
    }
  }, [data]);

  const loadErrorMessage = error && !data ? error : null;

  const dirty =
    form && original && (
      form.name !== original.name ||
      form.phone !== original.phone ||
      form.address !== original.address ||
      form.postcode !== original.postcode ||
      form.city !== original.city
    );

  const onSave = async () => {
    if (!form || !dirty) return;
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      if (!form.name.trim()) throw new Error("Name is required");
      const { error } = await supabase
        .from("parents")
        .update({
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          postcode: form.postcode.trim() || null,
          city: form.city.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", form.id);
      if (error) throw error;
      setOriginal(form);
      setSuccessMessage("Profile updated");
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const onPhotoStub = () => {
    Alert.alert("Coming soon", "Photo upload is being wired up with the backend. Your details and password already work.");
  };
  const onSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => signOut() },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <ActivityIndicator color={C.red} />
      </SafeAreaView>
    );
  }
  if (!form) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <Ionicons name="cloud-offline-outline" size={32} color={C.textMute} />
        <Text style={styles.errorText}>{loadErrorMessage ?? "Couldn't load your profile. Connect to the internet and try again."}</Text>
      </SafeAreaView>
    );
  }

  const initial = (original?.name ?? form.name).charAt(0).toUpperCase() || "?";
  const role = `PARENT${form.city ? ` · ${form.city.toUpperCase()}` : ""}`;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Maroon hero */}
          <View style={styles.hero}>
            <Pressable onPress={onPhotoStub} style={styles.heroAvatar}>
              {form.photo ? (
                <Image source={{ uri: form.photo }} style={styles.heroAvatarImg} />
              ) : (
                <Text style={styles.heroAvatarText}>{initial}</Text>
              )}
              <View style={styles.avatarBadge}><Ionicons name="camera" size={11} color="#FFFFFF" /></View>
            </Pressable>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.heroName} numberOfLines={1}>{original?.name || form.name}</Text>
              <Text style={styles.heroEmail} numberOfLines={1}>{form.email}</Text>
              <Text style={styles.heroRole}>{role}</Text>
            </View>
          </View>

          {/* Stat cards */}
          <View style={styles.statRow}>
            <View style={styles.statCard}><Text style={styles.statNum}>{stats.children}</Text><Text style={styles.statLabel}>CHILDREN</Text></View>
            <View style={styles.statCard}><Text style={[styles.statNum, { color: C.red }]}>{stats.sessions}</Text><Text style={styles.statLabel}>SESSIONS</Text></View>
            <View style={styles.statCard}><Text style={[styles.statNum, { color: C.blue }]}>{stats.attended}</Text><Text style={styles.statLabel}>ATTENDED</Text></View>
          </View>

          {isStale ? <View style={styles.pad}><OfflineBanner updatedAt={updatedAt} /></View> : null}
          {errorMessage ? <View style={[styles.pad, styles.errorCard]}><Text style={styles.errorText}>{errorMessage}</Text></View> : null}
          {successMessage ? <View style={[styles.pad, styles.successCard]}><Ionicons name="checkmark-circle" size={16} color={C.green} /><Text style={styles.successText}>{successMessage}</Text></View> : null}

          {/* Contact */}
          <Text style={styles.sectionLabel}>CONTACT</Text>
          <View style={styles.card}>
            <FieldRow label="Name" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
            <FieldRow label="Email" value={form.email} editable={false} last={false} />
            <FieldRow label="Phone" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} keyboardType="phone-pad" placeholder="012-3456789" last />
          </View>

          {/* Address */}
          <Text style={styles.sectionLabel}>ADDRESS</Text>
          <View style={styles.card}>
            <FieldRow label="Street address" value={form.address} onChangeText={(v) => setForm({ ...form, address: v })} multiline />
            <FieldRow label="Postcode" value={form.postcode} onChangeText={(v) => setForm({ ...form, postcode: v })} keyboardType="number-pad" />
            <FieldRow label="City" value={form.city} onChangeText={(v) => setForm({ ...form, city: v })} last />
          </View>

          {dirty ? (
            <Pressable style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]} disabled={saving} onPress={onSave}>
              {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>Save changes</Text>}
            </Pressable>
          ) : null}

          {/* Account */}
          <Text style={styles.sectionLabel}>ACCOUNT</Text>
          <View style={styles.card}>
            <AccountRow label="Session transfers" onPress={() => router.push("/transfers" as Href)} />
            <AccountRow label="Change password" onPress={() => router.push("/change-password" as Href)} />
            <AccountRow label="Help & contact branch" onPress={() => router.push("/messages" as Href)} last />
          </View>

          <Pressable style={({ pressed }) => [styles.signOut, pressed && styles.pressed]} onPress={onSignOut}>
            <Ionicons name="log-out-outline" size={18} color={C.red} />
            <Text style={styles.signOutText}>SIGN OUT</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FieldRow({ label, last, ...rest }: { label: string; last?: boolean } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={[styles.fieldRow, !last && styles.fieldRowBorder]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...rest}
        style={[styles.fieldInput, rest.editable === false && styles.fieldReadonly, rest.multiline && styles.fieldMultiline]}
        placeholderTextColor="#999999"
      />
    </View>
  );
}

function AccountRow({ label, onPress, last }: { label: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable style={({ pressed }) => [styles.accountRow, !last && styles.fieldRowBorder, pressed && { backgroundColor: C.bg }]} onPress={onPress}>
      <Text style={styles.accountLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={C.textMute} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.card },
  flex: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg, gap: 12, paddingHorizontal: 24 },
  scroll: { padding: 14, paddingBottom: 36 },
  pad: { marginBottom: 10 },

  hero: { flexDirection: "row", alignItems: "center", gap: 15, backgroundColor: C.ink, borderRadius: 22, padding: 20 },
  heroAvatar: { width: 64, height: 64, borderRadius: 20, backgroundColor: C.yellow, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  heroAvatarImg: { width: "100%", height: "100%" },
  heroAvatarText: { fontSize: 22, fontWeight: "700", color: C.ink },
  avatarBadge: { position: "absolute", bottom: 3, right: 3, width: 20, height: 20, borderRadius: 10, backgroundColor: C.red, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: C.ink },
  heroName: { fontSize: 21, fontWeight: "600", color: "#FFFFFF", letterSpacing: -0.4 },
  heroEmail: { fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 4 },
  heroRole: { fontSize: 11, fontWeight: "700", letterSpacing: 1.2, color: C.yellow, marginTop: 7 },

  statRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  statCard: { flex: 1, backgroundColor: C.card, borderRadius: 18, paddingVertical: 15, alignItems: "center", ...cardShadow },
  statNum: { fontSize: 22, fontWeight: "800", color: C.ink, lineHeight: 24 },
  statLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1.2, color: C.textDim, marginTop: 6 },

  sectionLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 2, color: C.textDim, marginTop: 22, marginBottom: 11, marginLeft: 4 },
  card: { backgroundColor: C.card, borderRadius: 20, paddingHorizontal: 17, ...cardShadow },
  fieldRow: { paddingVertical: 12 },
  fieldRowBorder: { borderBottomWidth: 1, borderBottomColor: C.borderFaint },
  fieldLabel: { fontSize: 11, color: C.textDim },
  fieldInput: { fontSize: 15, color: C.ink, marginTop: 3, padding: 0 },
  fieldReadonly: { color: C.textMute },
  fieldMultiline: { minHeight: 44, textAlignVertical: "top" },

  accountRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 16, marginHorizontal: -17, paddingHorizontal: 17, borderRadius: 12 },
  accountLabel: { fontSize: 14, color: C.ink },

  saveButton: { marginTop: 14, height: 50, borderRadius: 14, backgroundColor: C.red, alignItems: "center", justifyContent: "center" },
  saveText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700", letterSpacing: 0.5 },
  signOut: { marginTop: 16, minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: C.red, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  signOutText: { color: C.red, fontSize: 11, fontWeight: "700", letterSpacing: 1.6 },
  pressed: { opacity: 0.9 },

  errorCard: { backgroundColor: C.redChip, padding: 12, borderRadius: 12 },
  errorText: { color: C.red, fontSize: 13 },
  successCard: { backgroundColor: C.greenChip, padding: 12, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 6 },
  successText: { color: C.green, fontSize: 13, fontWeight: "600" },
});
