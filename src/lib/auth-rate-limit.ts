import { supabaseAdmin } from "@/db";
import type { NextRequest } from "next/server";

// ============================================
// Auth rate limiting / brute-force protection
// Backed by the public.auth_attempts table.
// ============================================

export const LOGIN_MAX_ATTEMPTS = 5; // failed logins before lockout
export const LOGIN_WINDOW_MINUTES = 30; // lockout window

export const RESET_MAX_SENDS = 2; // password-reset emails allowed
export const RESET_WINDOW_MINUTES = 30; // per this window

type AttemptType = "login_failed" | "password_reset";

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function getClientIp(request: NextRequest | Request): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}

function windowStart(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

/** Count attempts of a type for an identifier within the trailing window. */
async function countAttempts(
  identifier: string,
  type: AttemptType,
  windowMinutes: number
): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("auth_attempts")
    .select("id", { count: "exact", head: true })
    .eq("identifier", identifier)
    .eq("type", type)
    .gte("created_at", windowStart(windowMinutes));

  if (error) {
    // Fail open on infra errors so a logging hiccup never locks everyone out.
    console.error("auth_attempts count failed:", error);
    return 0;
  }
  return count ?? 0;
}

async function recordAttempt(
  identifier: string,
  type: AttemptType,
  ip: string | null
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("auth_attempts")
    .insert({ identifier, type, ip });
  if (error) console.error("auth_attempts insert failed:", error);
}

/** Remove all attempts of a type for an identifier (e.g. after a successful login). */
async function clearAttempts(
  identifier: string,
  type: AttemptType
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("auth_attempts")
    .delete()
    .eq("identifier", identifier)
    .eq("type", type);
  if (error) console.error("auth_attempts clear failed:", error);
}

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

// ---------- Login brute-force ----------

/** True when the account has hit the failed-login limit and is locked. */
export async function isLoginLocked(email: string): Promise<boolean> {
  const count = await countAttempts(
    normalize(email),
    "login_failed",
    LOGIN_WINDOW_MINUTES
  );
  return count >= LOGIN_MAX_ATTEMPTS;
}

export async function recordLoginFailure(
  email: string,
  ip: string | null
): Promise<void> {
  await recordAttempt(normalize(email), "login_failed", ip);
}

export async function clearLoginFailures(email: string): Promise<void> {
  await clearAttempts(normalize(email), "login_failed");
}

// ---------- Password-reset spam ----------

/** True when the email has already hit the reset-send limit for the window. */
export async function isResetLimited(email: string): Promise<boolean> {
  const count = await countAttempts(
    normalize(email),
    "password_reset",
    RESET_WINDOW_MINUTES
  );
  return count >= RESET_MAX_SENDS;
}

export async function recordResetSend(
  email: string,
  ip: string | null
): Promise<void> {
  await recordAttempt(normalize(email), "password_reset", ip);
}
