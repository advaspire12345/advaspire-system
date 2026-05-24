// Test-user lifecycle for the simulator. Reuses the seed-users.mjs pattern:
// create auth user via Supabase Admin SDK, insert into public.users with role +
// branch + in_charge_program_ids, save an agent-browser auth profile so the
// runner can `agent-browser auth login lms-sim-...` instantly.

import { execSync } from "node:child_process";
import { db } from "./db.mjs";

// All test users get this email pattern: __sim_<runId>_<handle>@sim.local
// All test passwords: "simpass" (only used in dev — never reused for real users)
const TEST_PASSWORD = "simpass";

export function simEmail(runId, handle) {
  return `__sim_${runId}_${handle}@sim.local`;
}

export function simAuthProfileName(runId, handle) {
  return `lms-sim-${runId}-${handle}`;
}

export async function createTestUser({ runId, handle, role, branchId, inChargeCourseIds = [] }) {
  const supabase = db();
  const email = simEmail(runId, handle);

  // 1. Auth user
  const { data: auth, error: aErr } = await supabase.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: `__sim_${runId}_${handle}`, role },
  });
  if (aErr) throw new Error(`createTestUser auth ${email}: ${aErr.message}`);

  // 2. public.users row
  const { data: row, error: uErr } = await supabase
    .from("users")
    .insert({
      auth_id: auth.user.id,
      email,
      name: `__sim_${runId}_${handle}`,
      role,
      branch_id: branchId,
      status: "active",
      employed_date: new Date().toISOString().slice(0, 10),
    })
    .select("id, email, role")
    .single();
  if (uErr) throw new Error(`createTestUser row ${email}: ${uErr.message}`);

  // 3. course_instructors junction (only for instructor / company / assistant)
  if (inChargeCourseIds.length > 0) {
    await supabase
      .from("course_instructors")
      .insert(inChargeCourseIds.map((course_id) => ({ user_id: row.id, course_id })));
  }

  // 4. agent-browser auth profile so the runner can login instantly
  const profile = simAuthProfileName(runId, handle);
  try {
    execSync(
      `npx --yes agent-browser auth save ${profile} --url http://localhost:3000/login --username ${email} --password ${TEST_PASSWORD}`,
      { stdio: "pipe" },
    );
  } catch (e) {
    throw new Error(`agent-browser auth save ${profile}: ${e.message}`);
  }

  return { ...row, profile, password: TEST_PASSWORD };
}

export async function deleteTestUser({ userId, authId, profile }) {
  const supabase = db();
  // course_instructors first (FK)
  await supabase.from("course_instructors").delete().eq("user_id", userId);
  // public.users
  await supabase.from("users").delete().eq("id", userId);
  // auth.users
  if (authId) {
    await supabase.auth.admin.deleteUser(authId);
  }
  // agent-browser profile
  if (profile) {
    try {
      execSync(`npx --yes agent-browser auth delete ${profile}`, { stdio: "pipe" });
    } catch {
      // profile might not exist; ignore
    }
  }
}

export async function deleteAllTestUsersForRun(runId) {
  const supabase = db();
  const { data: rows } = await supabase
    .from("users")
    .select("id, auth_id, email")
    .ilike("email", `__sim_${runId}_%`);
  for (const r of rows ?? []) {
    const handle = r.email.replace(`__sim_${runId}_`, "").replace("@sim.local", "");
    await deleteTestUser({
      userId: r.id,
      authId: r.auth_id,
      profile: simAuthProfileName(runId, handle),
    });
  }
}
