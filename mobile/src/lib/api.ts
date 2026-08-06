import { supabase } from "@/lib/supabase";

// Base URL of the Advaspire web app (which hosts the /api/mobile/* endpoints that
// reuse the web's business logic for writes the app can't do directly under RLS).
const API_BASE = process.env.EXPO_PUBLIC_API_URL || "https://app.advaspire.io";

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function post(path: string, body: unknown, token: string): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

// Public marketing trial signup (no auth) — mirrors the website's /trial form.
// The row lands in the `trials` table admins + the teacher portal see. The web
// endpoint resolves branch_id server-side (service role), so RLS isn't a blocker
// even though the parent isn't signed in.
export type TrialSignup = {
  parent_name: string;
  parent_phone: string;
  parent_email?: string | null;
  child_name: string;
  child_age: number;
  branch: string; // "semenyih" | "kepong" (matched by name/city on the server)
  message?: string | null;
};
export async function submitTrialSignup(body: TrialSignup): Promise<ApiResult<{ trial_id: string }>> {
  try {
    const res = await fetch(`${API_BASE}/api/marketing/trial-signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({} as Record<string, unknown>));
    if (!res.ok) return { ok: false, error: (json as { error?: string })?.error || `Request failed (${res.status})` };
    return { ok: true, data: json as { trial_id: string } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error — check your connection." };
  }
}

// POST to a web /api/mobile/* endpoint, authenticated with the user's Supabase
// access token. On a 401 (stale/expired token) we force a refresh and retry once.
export async function mobileApi<T = unknown>(path: string, body: unknown): Promise<ApiResult<T>> {
  let token = (await supabase.auth.getSession()).data.session?.access_token;
  if (!token) return { ok: false, error: "You're signed out. Please log in again." };
  try {
    let res = await post(path, body, token);
    if (res.status === 401) {
      const refreshed = await supabase.auth.refreshSession();
      token = refreshed.data.session?.access_token ?? token;
      res = await post(path, body, token);
    }
    const json = await res.json().catch(() => ({} as Record<string, unknown>));
    if (!res.ok) return { ok: false, error: (json as { error?: string })?.error || `Request failed (${res.status})` };
    return { ok: true, data: json as T };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error — check your connection." };
  }
}
