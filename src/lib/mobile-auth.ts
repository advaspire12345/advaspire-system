import { supabaseAdmin } from "@/db";
import { getUserByAuthId } from "@/data/users";
import type { User } from "@/db/schema";

// Authenticates a request coming from the mobile app. The app sends its Supabase
// access token as `Authorization: Bearer <token>`; we verify it against the same
// Supabase project and resolve the staff `users` row (if any).
export type MobileAuth =
  | { ok: true; authId: string; email: string | null; user: User | null }
  | { ok: false; status: number; error: string };

export async function authenticateMobile(request: Request): Promise<MobileAuth> {
  const header = request.headers.get("authorization") || request.headers.get("Authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { ok: false, status: 401, error: "Missing bearer token" };

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return { ok: false, status: 401, error: "Invalid or expired session" };

  const user = await getUserByAuthId(data.user.id);
  return { ok: true, authId: data.user.id, email: data.user.email ?? null, user };
}
