// Supabase service-role client + small SQL helpers used everywhere by the simulator.
// Reads .env from the repo root, same pattern as the seed-users.mjs we wrote earlier.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

let cachedClient = null;

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env");
  return readFileSync(envPath, "utf8")
    .split("\n")
    .filter(Boolean)
    .reduce((acc, line) => {
      const m = line.match(/^([A-Z_]+)\s*=\s*(.+)$/);
      if (m) acc[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
      return acc;
    }, {});
}

export function db() {
  if (cachedClient) return cachedClient;
  const env = loadEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  }
  cachedClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cachedClient;
}

// Run an arbitrary SQL via the postgres-meta endpoint isn't available with anon
// service-role, so we expose `runQuery` as a thin wrapper around .from(table) for
// asserts. For ad-hoc SQL we use Supabase MCP from Claude's side, not from here.

export async function selectOne(table, filters, columns = "*") {
  const supabase = db();
  let q = supabase.from(table).select(columns);
  for (const [col, val] of Object.entries(filters)) {
    q = q.eq(col, val);
  }
  const { data, error } = await q.maybeSingle();
  if (error) throw new Error(`selectOne(${table}): ${error.message}`);
  return data;
}

export async function selectRows(table, filters = {}, columns = "*") {
  const supabase = db();
  let q = supabase.from(table).select(columns);
  for (const [col, val] of Object.entries(filters)) {
    if (Array.isArray(val)) q = q.in(col, val);
    else q = q.eq(col, val);
  }
  const { data, error } = await q;
  if (error) throw new Error(`selectRows(${table}): ${error.message}`);
  return data ?? [];
}

export async function deleteWhere(table, filters) {
  const supabase = db();
  let q = supabase.from(table).delete();
  for (const [col, val] of Object.entries(filters)) {
    if (Array.isArray(val)) q = q.in(col, val);
    else q = q.eq(col, val);
  }
  const { error } = await q;
  if (error) throw new Error(`deleteWhere(${table}): ${error.message}`);
}

// Captures a DB snapshot of relevant tables filtered by a runId prefix on names —
// used to record "before" and "after" state for the report.
export async function snapshotForRun(runId) {
  const out = {};
  const supabase = db();
  const namePrefix = `__sim_${runId}_%`;
  for (const table of ["students", "users", "branches", "courses", "enrollments", "payments"]) {
    const { data } = await supabase.from(table).select("*").ilike("name", namePrefix);
    out[table] = data ?? [];
  }
  return out;
}
