// scripts/create-student-auth.mjs
// Create Supabase Auth users for students (unified auth: everyone uses Supabase).
// Email = <lower(student_id)>@student.advaspire.com, password = username.
// Links students.auth_id. Idempotent: skips students already linked; reuses an
// existing auth user with the same email (and resets its password to username).
//   Dry run:  node scripts/create-student-auth.mjs
//   Commit:   node scripts/create-student-auth.mjs --commit
import "./etl/load-env.mjs";
import { createClient } from "@supabase/supabase-js";

const URL = "https://kbzrdsxzzqzbxqgwpsuq.supabase.co";
const KEY = process.env.LMS_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) { console.error("Missing service key in .env.local"); process.exit(1); }
const COMMIT = process.argv.includes("--commit");
const BRANCH_KEPONG = "78d12755-6828-4b14-9437-ec4886b5ac82";
const DOMAIN = "student.advaspire.com";
const db = createClient(URL, KEY, { auth: { persistSession: false } });

const { data: students, error } = await db
  .from("students")
  .select("id, name, username, student_id, auth_id")
  .eq("branch_id", BRANCH_KEPONG)
  .like("student_id", "ADV002-%")
  .not("username", "is", null)
  .is("deleted_at", null);
if (error) { console.error(error.message); process.exit(1); }

// Build an email -> auth user id map once (for idempotent re-runs).
const emailToId = new Map();
for (let page = 1; ; page++) {
  const { data: list } = await db.auth.admin.listUsers({ page, perPage: 1000 });
  const users = list?.users ?? [];
  for (const u of users) if (u.email) emailToId.set(u.email.toLowerCase(), u.id);
  if (users.length < 1000) break;
}

const rep = { total: students?.length ?? 0, created: 0, reused: 0, linked: 0, skipped: 0, failed: 0, errors: [] };
for (const s of students ?? []) {
  if (s.auth_id) { rep.skipped++; continue; }
  const email = `${s.student_id.toLowerCase()}@${DOMAIN}`;
  const password = s.username;
  if (!COMMIT) { rep.created++; continue; }
  try {
    let authId = emailToId.get(email);
    if (authId) {
      await db.auth.admin.updateUserById(authId, { password });
      rep.reused++;
    } else {
      const { data: cu, error: cErr } = await db.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: s.name, role: "student" },
      });
      if (cErr || !cu?.user) throw new Error(cErr?.message ?? "createUser failed");
      authId = cu.user.id;
      rep.created++;
    }
    const { error: upErr } = await db.from("students").update({ auth_id: authId }).eq("id", s.id);
    if (upErr) throw new Error("link: " + upErr.message);
    rep.linked++;
  } catch (e) {
    rep.failed++;
    rep.errors.push(`${s.student_id}: ${e.message}`);
  }
}
console.log(COMMIT ? "=== COMMIT ===" : "=== DRY RUN ===");
console.log(JSON.stringify(rep, null, 2));
