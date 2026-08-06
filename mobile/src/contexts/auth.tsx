import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import type { Session, User } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { clearCache } from "@/lib/cache";
import { supabase } from "@/lib/supabase";

// Dismiss the in-app browser automatically once the OAuth redirect returns.
WebBrowser.maybeCompleteAuthSession();

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  sendPasswordReset: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

// After OAuth, confirm this account is actually registered with Advaspire — a
// staff `users` row OR a `parents` row for the signed-in auth id. Supabase links
// a Google identity to an existing account with the same confirmed email, so the
// auth id (and RLS) stays consistent. If neither exists, the Gmail isn't ours.
async function isRegistered(authId: string): Promise<boolean> {
  const { data: u } = await supabase
    .from("users").select("role, deleted_at").eq("auth_id", authId).is("deleted_at", null).maybeSingle();
  const role = (u?.role as string | undefined) ?? "";
  if (u && role && role !== "parent") return true; // staff
  const { data: p } = await supabase
    .from("parents").select("id").eq("auth_id", authId).is("deleted_at", null).maybeSingle();
  return !!p;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from secure-store on mount.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // Live-update if the session refreshes or expires.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
      },
      async signInWithGoogle() {
        try {
          const redirectTo = Linking.createURL("auth-callback");
          const { data, error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo, skipBrowserRedirect: true },
          });
          if (error) return { error: error.message };
          if (!data?.url) return { error: "Couldn't start Google sign-in. Try again." };

          const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
          if (res.type === "cancel" || res.type === "dismiss") return { error: null }; // user backed out
          if (res.type !== "success" || !res.url) return { error: "Google sign-in didn't complete." };

          // PKCE: the redirect carries a ?code we exchange for a session.
          const code = Linking.parse(res.url).queryParams?.code;
          if (typeof code !== "string" || !code) return { error: "Google sign-in didn't complete." };
          const { data: sess, error: exErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exErr) return { error: exErr.message };

          const authId = sess.session?.user?.id;
          if (!authId) return { error: "Google sign-in didn't complete." };

          // Gate: reject Gmails that aren't registered with Advaspire.
          if (!(await isRegistered(authId))) {
            await supabase.auth.signOut();
            await clearCache();
            return { error: "This Google account isn't registered with Advaspire. Use the email your branch set up, or book a free trial." };
          }
          return { error: null };
        } catch (e) {
          return { error: e instanceof Error ? e.message : "Google sign-in failed." };
        }
      },
      async sendPasswordReset(email) {
        // Emails a recovery link that deep-links back to the app's reset-password
        // screen (advaspire://reset-password?code=…) where the user sets a new one.
        const redirectTo = Linking.createURL("reset-password");
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
        return { error: error?.message ?? null };
      },
      async signOut() {
        await supabase.auth.signOut();
        await clearCache();
      },
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
