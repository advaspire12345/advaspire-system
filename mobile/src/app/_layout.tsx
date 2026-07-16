import { useEffect } from "react";
import { Stack, useRouter, useSegments, type Href } from "expo-router";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AuthProvider, useAuth } from "@/contexts/auth";
import { NicknameProvider } from "@/contexts/nicknames";
import { RoleProvider, useRole } from "@/contexts/role";
import { SettingsProvider } from "@/contexts/settings";
import { DrawerProvider } from "@/contexts/drawer";
import { TourProvider } from "@/contexts/tour";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

// Routes by auth + portal: anon → /login; staff → /(teacher); parent → /(tabs).
// Only redirects from the (auth) group or the WRONG portal's tab group — shared
// sub-routes (/messages, /event, /payment…) are left alone.
function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const { portal, loadingRole } = useRole();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const seg0 = segments[0];
    const inAuth = seg0 === "(auth)";
    if (!session) {
      if (!inAuth) router.replace("/(auth)/login");
      return;
    }
    if (loadingRole) return; // wait until we know which portal
    if (inAuth) {
      router.replace((portal === "teacher" ? "/(teacher)" : "/(tabs)") as Href);
      return;
    }
    // Kick a user out of the opposite portal's tab group.
    if (portal === "teacher" && seg0 === "(tabs)") router.replace("/(teacher)" as Href);
    else if (portal === "parent" && (seg0 as string) === "(teacher)") router.replace("/(tabs)");
  }, [session, loading, loadingRole, portal, segments, router]);

  return <>{children}</>;
}

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RoleProvider>
          <SettingsProvider>
          <DrawerProvider>
          <TourProvider>
          <NicknameProvider>
          <ThemeProvider value={scheme === "dark" ? DarkTheme : DefaultTheme}>
            <AuthGate>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="(teacher)" />
                <Stack.Screen name="inbox" options={{ headerShown: true, title: "Inbox", headerTintColor: "#615DFA" }} />
                <Stack.Screen name="messages" options={{ headerShown: true, title: "Message us", headerTintColor: "#615DFA" }} />
                <Stack.Screen name="profile" options={{ headerShown: true, title: "Profile", headerTintColor: "#615DFA" }} />
                <Stack.Screen name="change-password" options={{ headerShown: true, title: "Change password", headerTintColor: "#615DFA" }} />
                <Stack.Screen name="settings/calendar" options={{ headerShown: true, title: "Calendar settings", headerTintColor: "#615DFA" }} />
                <Stack.Screen name="legal/[doc]" options={{ headerShown: true, title: "", headerTintColor: "#615DFA" }} />
                {/* Presented as a modal card (dimmed backdrop behind, rounded top,
                    swipe-down to dismiss) so the parent knows it's a focused sub-task. */}
                <Stack.Screen name="event/new" options={{ presentation: "modal", headerShown: true, title: "New event", headerTintColor: "#615DFA" }} />
                <Stack.Screen name="transfers" options={{ headerShown: true, title: "Session transfers", headerTintColor: "#615DFA" }} />
                <Stack.Screen name="reschedule" options={{ headerShown: true, title: "Reschedule class", headerTintColor: "#615DFA" }} />
                <Stack.Screen name="schedule-demo" options={{ headerShown: true, title: "Drag to reschedule", headerTintColor: "#615DFA" }} />
                <Stack.Screen name="payment/[id]" options={{ headerShown: true, title: "Payment", headerTintColor: "#615DFA" }} />
                <Stack.Screen name="program/[id]" options={{ headerShown: true, title: "Program", headerTintColor: "#615DFA" }} />
                <Stack.Screen name="teacher-message/[parentId]" options={{ headerShown: true, title: "Message", headerTintColor: "#0D9488" }} />
              </Stack>
            </AuthGate>
            <StatusBar style="auto" />
          </ThemeProvider>
          </NicknameProvider>
          </TourProvider>
          </DrawerProvider>
          </SettingsProvider>
          </RoleProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
