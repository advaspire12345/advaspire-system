// scripts/set-student-passwords.mjs
// Set password_hash = bcrypt(username) for the imported Kepong students so they
// can log in (student login = username + password, default password = username).
//   Dry run:  node scripts/set-student-passwords.mjs
//   Commit:   node scripts/set-student-passwords.mjs --commit
import "./etl/load-env.mjs";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

const URL = "https://kbzrdsxzzqzbxqgwpsuq.supabase.co";
const KEY = process.env.LMS_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) { console.error("Missing service key in .env.local"); process.exit(1); }
const COMMIT = process.argv.includes("--commit");
const BRANCH_KEPONG = "78d12755-6828-4b14-9437-ec4886b5ac82";
const db = createClient(URL, KEY, { auth: { persistSession: false } });

const { data: students, error } = await db
  .from("students")
  .select("id, username, student_id")
  .eq("branch_id", BRANCH_KEPONG)
  .like("student_id", "ADV002-%")
  .not("username", "is", null)
  .is("deleted_at", null);
if (error) { console.error(error.message); process.exit(1); }

let set = 0, skipped = 0, failed = 0;
for (const s of students ?? []) {
  if (!s.username) { skipped++; continue; }
  if (COMMIT) {
    const hash = bcrypt.hashSync(s.username, 10);
    const { error: upErr } = await db.from("students").update({ password_hash: hash }).eq("id", s.id);
    if (upErr) { failed++; console.error(s.student_id, upErr.message); continue; }
  }
  set++;
}
console.log(`${COMMIT ? "COMMIT" : "DRY RUN"}: ${set} student passwords set to username, ${skipped} skipped, ${failed} failed (of ${students?.length ?? 0})`);
