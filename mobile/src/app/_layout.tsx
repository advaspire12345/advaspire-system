import { useEffect } from "react";
import * as Linking from "expo-linking";
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

// Pull key=value pairs from BOTH the ?query and the #fragment of a URL.
// expo-linking's parse only reads the query, but Supabase implicit recovery
// links carry the tokens in the fragment (#access_token=…&refresh_token=…).
function paramsFromUrl(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  const add = (seg?: string) => {
    if (!seg) return;
    for (const pair of seg.split("&")) {
      const i = pair.indexOf("=");
      if (i < 0) continue;
      const k = decodeURIComponent(pair.slice(0, i));
      if (k) out[k] = decodeURIComponent(pair.slice(i + 1));
    }
  };
  const q = url.indexOf("?");
  const h = url.indexOf("#");
  if (q >= 0) add(url.slice(q + 1, h > q ? h : undefined));
  if (h >= 0) add(url.slice(h + 1));
  return out;
}

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

  // Password-recovery deep link tapped from the reset email → open the reset
  // screen, which establishes the recovery session + lets the user set a new
  // password. Runs for cold starts (getInitialURL) + warm (event). Supabase can
  // deliver the recovery token in three shapes — PKCE ?code=…, ?token_hash=&type=,
  // or the implicit #access_token=&refresh_token= FRAGMENT (which Linking.parse
  // drops) — so we read BOTH the query and the fragment off the raw URL.
  useEffect(() => {
    let lastHandled: string | null = null;
    const handle = (url: string | null) => {
      if (!url || url === lastHandled) return; // getInitialURL + url event can double-fire
      if (!url.includes("reset-password")) return;
      lastHandled = url;
      const all = paramsFromUrl(url);
      const params: Record<string, string> = {};
      for (const k of ["code", "token_hash", "type", "access_token", "refresh_token"] as const) {
        if (all[k]) params[k] = all[k];
      }
      router.push({ pathname: "/reset-password", params } as unknown as Href);
    };
    Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener("url", (e) => handle(e.url));
    return () => sub.remove();
  }, [router]);

  useEffect(() => {
    if (loading) return;
    const seg0 = segments[0];
    // Password recovery lives outside both portals — leave the user on it (they may
    // have no/expired session while resetting; the screen handles its own routing).
    if ((seg0 as string) === "reset-password") return;
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
              <Stack screenOptions={{ headerShown: false, headerStyle: { backgroundColor: "#FFFFFF" }, headerTitleStyle: { color: "#2B161B", fontWeight: "600" }, headerShadowVisible: false, headerTintColor: "#EC2127" }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="reset-password" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="(teacher)" />
                <Stack.Screen name="inbox" options={{ headerShown: true, title: "Notifications", headerTintColor: "#EC2127" }} />
                <Stack.Screen name="messages" options={{ headerShown: true, title: "Message us", headerTintColor: "#EC2127" }} />
                <Stack.Screen name="profile" options={{ headerShown: true, title: "Profile", headerTintColor: "#EC2127" }} />
                <Stack.Screen name="change-password" options={{ headerShown: true, title: "Change password", headerTintColor: "#EC2127" }} />
                <Stack.Screen name="settings/calendar" options={{ headerShown: true, title: "Calendar settings", headerTintColor: "#EC2127" }} />
                <Stack.Screen name="legal/[doc]" options={{ headerShown: true, title: "", headerTintColor: "#EC2127" }} />
                {/* Presented as a modal card (dimmed backdrop behind, rounded top,
                    swipe-down to dismiss) so the parent knows it's a focused sub-task. */}
                <Stack.Screen name="event/new" options={{ presentation: "modal", headerShown: true, title: "New event", headerTintColor: "#EC2127" }} />
                <Stack.Screen name="transfers" options={{ headerShown: true, title: "Session transfers", headerTintColor: "#EC2127" }} />
                <Stack.Screen name="reschedule" options={{ headerShown: true, title: "Reschedule class", headerTintColor: "#EC2127" }} />
                <Stack.Screen name="schedule-demo" options={{ headerShown: true, title: "Drag to reschedule", headerTintColor: "#EC2127" }} />
                <Stack.Screen name="payment/[id]" options={{ headerShown: true, title: "Payment", headerTintColor: "#EC2127" }} />
                <Stack.Screen name="lesson/[id]" options={{ headerShown: true, title: "Lesson", headerTintColor: "#EC2127" }} />
                <Stack.Screen name="attendance-summary" options={{ headerShown: true, title: "Attendance", headerTintColor: "#EC2127" }} />
                <Stack.Screen name="program/[id]" options={{ headerShown: true, title: "Program", headerTintColor: "#EC2127" }} />
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
