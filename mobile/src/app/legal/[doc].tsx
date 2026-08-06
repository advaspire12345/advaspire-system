import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams } from "expo-router";
import { useDrawerReturn } from "@/contexts/drawer";

const CONTENT: Record<string, { title: string; body: string }> = {
  terms: {
    title: "Terms & Conditions",
    body:
      "These Terms govern your use of the Advaspire parent app.\n\n" +
      "1. Use of the app. The app gives you access to your child's class schedule, attendance, progress, payments and messaging with your centre. Please keep your login details private.\n\n" +
      "2. Bookings & rescheduling. Class rescheduling is subject to availability and your centre's policies (including the 24-hour advance rule). Confirmations are finalised by your centre.\n\n" +
      "3. Payments. Fees, packages and session balances are set by your centre. Payments made through the app are processed by our payment partner.\n\n" +
      "4. Conduct. Please use messaging respectfully. We may suspend access for misuse.\n\n" +
      "5. Changes. We may update these Terms; continued use means you accept the changes.\n\n" +
      "For the full, current terms, please contact your branch.",
  },
  privacy: {
    title: "Privacy Policy",
    body:
      "Advaspire respects your privacy.\n\n" +
      "1. What we collect. Your account details, your children's enrolment, attendance and progress data, payment records, and messages you send us.\n\n" +
      "2. How we use it. To show you your child's classes and progress, process payments, and let you communicate with your centre.\n\n" +
      "3. Sharing. Your data is visible to authorised staff at your child's centre. We do not sell your data.\n\n" +
      "4. On-device data. Some preferences (nicknames, colours, calendar defaults) are stored only on your device.\n\n" +
      "5. Your rights. You can request to view, correct or delete your data by contacting your branch.\n\n" +
      "For the full, current policy, please contact your branch.",
  },
};

export default function LegalDoc() {
  useDrawerReturn();
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const c = CONTENT[doc ?? "terms"] ?? CONTENT.terms;
  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <Stack.Screen options={{ title: c.title }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{c.title}</Text>
        <Text style={styles.body}>{c.body}</Text>
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  scroll: { padding: 20 },
  title: { fontSize: 22, fontWeight: "800", color: "#2B161B", marginBottom: 12 },
  body: { fontSize: 14, color: "#374151", lineHeight: 22 },
});
