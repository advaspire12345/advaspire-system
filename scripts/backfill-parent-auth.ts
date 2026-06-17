/**
 * One-off backfill: provision Supabase auth + users-table rows for every
 * parent record with auth_id IS NULL. Re-runnable (idempotent — skips
 * parents that already have auth_id).
 *
 * Run with: npx tsx scripts/backfill-parent-auth.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEFAULT_PASSWORD = "Parent@123";
const CONCURRENCY = 4;

type Parent = { id: string; name: string; email: string };

async function loadExistingAuthByEmail(): Promise<Map<string, string>> {
  // Page through all auth users so we can match by email without calling
  // listUsers() once per parent (which would be O(n^2) and rate-limited).
  const map = new Map<string, string>();
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users ?? [];
    for (const u of users) {
      if (u.email) map.set(u.email.toLowerCase(), u.id);
    }
    if (users.length < perPage) break;
    page++;
  }
  return map;
}

async function ensureOne(parent: Parent, existingByEmail: Map<string, string>): Promise<"created" | "linked" | "failed"> {
  const email = parent.email.toLowerCase();

  // 1. If an auth user already exists for this email, just link.
  const preexisting = existingByEmail.get(email);
  if (preexisting) {
    const { error } = await supabase
      .from("parents")
      .update({ auth_id: preexisting })
      .eq("id", parent.id);
    if (error) {
      console.error(`  [link] ${parent.email}: ${error.message}`);
      return "failed";
    }
    return "linked";
  }

  // 2. Create a new auth user.
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: parent.email,
    password: DEFAULT_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: parent.name, role: "parent" },
  });

  if (authError || !authData?.user) {
    // Race: another row beat us to it. Look up + link.
    if (authError?.message?.includes("already been registered")) {
      // Refresh just this email — cheaper than a full listUsers re-page.
      const { data: refreshed } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const found = refreshed?.users?.find((u) => u.email?.toLowerCase() === email);
      if (found) {
        existingByEmail.set(email, found.id);
        const { error } = await supabase
          .from("parents")
          .update({ auth_id: found.id })
          .eq("id", parent.id);
        if (error) {
          console.error(`  [race-link] ${parent.email}: ${error.message}`);
          return "failed";
        }
        return "linked";
      }
    }
    console.error(`  [create] ${parent.email}: ${authError?.message ?? "unknown"}`);
    return "failed";
  }

  const authId = authData.user.id;
  existingByEmail.set(email, authId);

  // 3. Link parents.auth_id and insert the users-table row.
  const { error: updErr } = await supabase
    .from("parents")
    .update({ auth_id: authId })
    .eq("id", parent.id);
  if (updErr) {
    console.error(`  [parent-update] ${parent.email}: ${updErr.message}`);
    return "failed";
  }

  const { error: usrErr } = await supabase.from("users").insert({
    auth_id: authId,
    email: parent.email,
    name: parent.name,
    role: "parent",
    status: "active",
  });
  if (usrErr && !usrErr.message?.includes("duplicate")) {
    console.error(`  [users-insert] ${parent.email}: ${usrErr.message}`);
    // Not fatal — the auth + parent link succeeded, RBAC entry can be retried.
  }

  return "created";
}

async function run() {
  console.log("Loading parents without auth_id …");
  const { data: parents, error } = await supabase
    .from("parents")
    .select("id, name, email")
    .is("deleted_at", null)
    .is("auth_id", null);

  if (error) {
    console.error("Failed to fetch parents:", error.message);
    process.exit(1);
  }
  const todo = (parents ?? []) as Parent[];
  console.log(`  ${todo.length} parents to process\n`);
  if (todo.length === 0) return;

  console.log("Loading existing auth users …");
  const existingByEmail = await loadExistingAuthByEmail();
  console.log(`  ${existingByEmail.size} existing auth users\n`);

  let created = 0;
  let linked = 0;
  let failed = 0;
  let done = 0;

  // Simple parallel worker pool — keeps Supabase happy and gives us progress.
  let cursor = 0;
  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= todo.length) return;
      const p = todo[idx];
      const result = await ensureOne(p, existingByEmail);
      if (result === "created") created++;
      else if (result === "linked") linked++;
      else failed++;
      done++;
      if (done % 25 === 0 || done === todo.length) {
        console.log(`  [${done}/${todo.length}] created=${created} linked=${linked} failed=${failed}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log(`\nDone. created=${created} linked=${linked} failed=${failed}`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
