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
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";

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

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [original, setOriginal] = useState<ParentForm | null>(null);
  const [form, setForm] = useState<ParentForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Change-password section state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("parents")
          .select("id, name, email, phone, address, postcode, city, photo, cover_photo")
          .eq("auth_id", user.id)
          .is("deleted_at", null)
          .maybeSingle();
        if (error) throw error;
        if (cancelled) return;
        if (!data) {
          setErrorMessage("Parent record not found.");
          return;
        }
        const next: ParentForm = {
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
        setOriginal(next);
        setForm(next);
      } catch (err) {
        if (!cancelled) setErrorMessage(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

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
      if (!form.name.trim()) {
        throw new Error("Name is required");
      }
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

  const onChangePassword = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    if (newPassword.length < 8) {
      Alert.alert("Password too short", "Please use at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Passwords don't match", "Re-type the new password to confirm.");
      return;
    }
    setPasswordSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
      setSuccessMessage("Password updated");
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const onPhotoStub = () => {
    Alert.alert(
      "Coming soon",
      "Photo upload needs a storage upload policy on the project-photos bucket — coordinating with the backend. Text fields + password change work now.",
    );
  };

  if (loading || !form) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <ActivityIndicator color="#615DFA" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Cover + avatar */}
          <View style={styles.coverWrap}>
            <Pressable onPress={onPhotoStub} style={styles.coverPressable}>
              {form.coverPhoto ? (
                <Image source={{ uri: form.coverPhoto }} style={styles.cover} />
              ) : (
                <View style={[styles.cover, styles.coverPlaceholder]}>
                  <Ionicons name="image-outline" size={32} color="#FFFFFF" />
                  <Text style={styles.coverPlaceholderText}>Add cover photo</Text>
                </View>
              )}
            </Pressable>
            <Pressable onPress={onPhotoStub} style={styles.avatarWrap}>
              {form.photo ? (
                <Image source={{ uri: form.photo }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarInitial}>
                    {form.name.charAt(0).toUpperCase() || "?"}
                  </Text>
                </View>
              )}
              <View style={styles.avatarBadge}>
                <Ionicons name="camera" size={14} color="#FFFFFF" />
              </View>
            </Pressable>
          </View>

          <View style={styles.identityBlock}>
            <Text style={styles.identityName}>{original?.name}</Text>
            <Text style={styles.identityEmail}>{form.email}</Text>
          </View>

          {errorMessage ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}
          {successMessage ? (
            <View style={styles.successCard}>
              <Ionicons name="checkmark-circle" size={16} color="#065F46" />
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Contact</Text>
          <Field label="Name" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
          <Field label="Email" value={form.email} editable={false} />
          <Field
            label="Phone"
            value={form.phone}
            onChangeText={(v) => setForm({ ...form, phone: v })}
            keyboardType="phone-pad"
            placeholder="012-3456789"
          />

          <Text style={styles.sectionTitle}>Address</Text>
          <Field
            label="Street address"
            value={form.address}
            onChangeText={(v) => setForm({ ...form, address: v })}
            multiline
          />
          <Field label="Postcode" value={form.postcode} onChangeText={(v) => setForm({ ...form, postcode: v })} keyboardType="number-pad" />
          <Field label="City" value={form.city} onChangeText={(v) => setForm({ ...form, city: v })} />

          <Pressable
            style={[styles.saveButton, (!dirty || saving) && styles.saveButtonDisabled]}
            disabled={!dirty || saving}
            onPress={onSave}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveText}>{dirty ? "Save changes" : "No changes to save"}</Text>
            )}
          </Pressable>

          {/* Password section */}
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Password</Text>
          {!showPasswordForm ? (
            <Pressable
              style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}
              onPress={() => setShowPasswordForm(true)}
            >
              <Ionicons name="lock-closed-outline" size={18} color="#615DFA" />
              <Text style={styles.outlineButtonText}>Change password</Text>
            </Pressable>
          ) : (
            <View style={styles.passwordForm}>
              <Field
                label="New password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="At least 8 characters"
              />
              <Field
                label="Confirm new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="Re-type the new password"
              />
              <View style={styles.passwordButtons}>
                <Pressable
                  style={[styles.outlineButton, styles.passwordButtonHalf]}
                  onPress={() => {
                    setShowPasswordForm(false);
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  disabled={passwordSubmitting}
                >
                  <Text style={styles.outlineButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.saveButton, styles.passwordButtonHalf]}
                  onPress={onChangePassword}
                  disabled={passwordSubmitting}
                >
                  {passwordSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>Update</Text>}
                </Pressable>
              </View>
            </View>
          )}

          {/* Sign out */}
          <View style={styles.divider} />
          <Pressable
            style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}
            onPress={signOut}
          >
            <Ionicons name="log-out-outline" size={18} color="#DC2626" />
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  ...rest
}: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...rest}
        style={[styles.field, rest.editable === false && styles.fieldReadonly, rest.multiline && styles.fieldMultiline]}
        placeholderTextColor="#9CA3AF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F6FB" },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F6F6FB" },
  scroll: { paddingBottom: 32 },
  coverWrap: { position: "relative", marginBottom: 56 },
  coverPressable: { width: "100%", height: 120, backgroundColor: "#615DFA" },
  cover: { width: "100%", height: "100%" },
  coverPlaceholder: { alignItems: "center", justifyContent: "center", gap: 4 },
  coverPlaceholderText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
  avatarWrap: {
    position: "absolute",
    left: 20,
    bottom: -40,
  },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 4, borderColor: "#F6F6FB", backgroundColor: "#FFFFFF" },
  avatarPlaceholder: { alignItems: "center", justifyContent: "center", backgroundColor: "#615DFA" },
  avatarInitial: { color: "#FFFFFF", fontSize: 36, fontWeight: "800" },
  avatarBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#615DFA",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#F6F6FB",
  },
  identityBlock: { paddingHorizontal: 20, marginBottom: 16 },
  identityName: { fontSize: 22, fontWeight: "800", color: "#111827" },
  identityEmail: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    letterSpacing: 1,
    textTransform: "uppercase",
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  fieldWrap: { paddingHorizontal: 20, marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: "#6B7280", marginBottom: 4 },
  field: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
  },
  fieldReadonly: { backgroundColor: "#F3F4F6", color: "#6B7280" },
  fieldMultiline: { minHeight: 70, textAlignVertical: "top" },
  saveButton: {
    marginHorizontal: 20,
    marginTop: 12,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#615DFA",
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  outlineButton: {
    marginHorizontal: 20,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#615DFA",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    backgroundColor: "#FFFFFF",
  },
  outlineButtonText: { color: "#615DFA", fontSize: 15, fontWeight: "700" },
  passwordForm: { marginTop: 4 },
  passwordButtons: { flexDirection: "row", gap: 12, paddingHorizontal: 20, marginTop: 8 },
  passwordButtonHalf: { flex: 1, marginHorizontal: 0 },
  divider: { height: 8 },
  signOutButton: {
    marginHorizontal: 20,
    marginTop: 16,
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#FEE2E2",
  },
  signOutText: { color: "#DC2626", fontSize: 15, fontWeight: "700" },
  errorCard: { marginHorizontal: 20, marginBottom: 8, backgroundColor: "#FEE2E2", padding: 12, borderRadius: 12 },
  errorText: { color: "#991B1B", fontSize: 13 },
  successCard: {
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: "#D1FAE5",
    padding: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  successText: { color: "#065F46", fontSize: 13, fontWeight: "600" },
  pressed: { opacity: 0.85 },
});
