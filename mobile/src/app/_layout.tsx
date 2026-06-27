import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AuthProvider, useAuth } from "@/contexts/auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

// Drives the (auth) ↔ (tabs) redirect: anonymous users go to /login,
// authenticated users go to the home tab. Sits inside the AuthProvider.
function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!session && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [session, loading, segments, router]);

  return <>{children}</>;
}

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider value={scheme === "dark" ? DarkTheme : DefaultTheme}>
            <AuthGate>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="inbox" options={{ headerShown: true, title: "Inbox", headerTintColor: "#615DFA" }} />
                <Stack.Screen name="profile" options={{ headerShown: true, title: "Profile", headerTintColor: "#615DFA" }} />
                <Stack.Screen name="event/new" options={{ headerShown: true, title: "New event", headerTintColor: "#615DFA" }} />
                <Stack.Screen name="transfers" options={{ headerShown: true, title: "Session transfers", headerTintColor: "#615DFA" }} />
                <Stack.Screen name="reschedule" options={{ headerShown: true, title: "Reschedule class", headerTintColor: "#615DFA" }} />
                <Stack.Screen name="payment/[id]" options={{ headerShown: true, title: "Payment", headerTintColor: "#615DFA" }} />
              </Stack>
            </AuthGate>
            <StatusBar style="auto" />
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
