import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. Add them to mobile/.env.",
  );
}

// Store the session in AsyncStorage on native. expo-secure-store's ~2048-byte
// Android limit truncated the session (breaking the refresh token after the first
// refresh); AsyncStorage has no such limit. Guard web (used during static export
// rendering, where `window`/AsyncStorage isn't available) with a no-op store.
const isWeb = Platform.OS === "web";
const SessionStorage = {
  getItem: (key: string) => (isWeb ? Promise.resolve(null) : AsyncStorage.getItem(key)),
  setItem: (key: string, value: string) => (isWeb ? Promise.resolve() : AsyncStorage.setItem(key, value)),
  removeItem: (key: string) => (isWeb ? Promise.resolve() : AsyncStorage.removeItem(key)),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // PKCE so native OAuth (Google) can exchange the redirect `code` for a
    // session via exchangeCodeForSession. Password sign-in works either way.
    flowType: "pkce",
  },
});

// Supabase's recommended RN setup: run token auto-refresh only while foregrounded.
if (!isWeb) {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
