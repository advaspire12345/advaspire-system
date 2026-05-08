// One-shot migration runner for 022_role_permissions_resync.
// Wipes global role_permissions for the 4 non-super-admin roles and re-inserts
// the new spec from src/data/permissions.ts.
//
// Run: node scripts/apply-022.mjs

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ROLES = ["group_admin", "company_admin", "assistant_admin", "instructor"];
const ROWS = [
  // group_admin
  ["group_admin", "dashboard",        true,  false, false, false],
  ["group_admin", "companies",        true,  true,  true,  false],
  ["group_admin", "branches",         true,  true,  true,  true],
  ["group_admin", "trials",           true,  true,  true,  true],
  ["group_admin", "students",         true,  true,  true,  true],
  ["group_admin", "examinations",     true,  true,  true,  true],
  ["group_admin", "programs",         true,  true,  true,  true],
  ["group_admin", "slots",            true,  false, false, false],
  ["group_admin", "vouchers",         true,  true,  true,  true],
  ["group_admin", "team",             true,  true,  true,  true],
  ["group_admin", "attendance",       false, false, false, false],
  ["group_admin", "attendance_log",   true,  true,  true,  true],
  ["group_admin", "payment_record",   true,  false, false, false],
  ["group_admin", "pending_payments", true,  true,  true,  true],
  ["group_admin", "leaderboard",      true,  true,  false, false],
  ["group_admin", "transactions",     false, false, false, false],
  ["group_admin", "import",           true,  true,  false, false],

  // company_admin
  ["company_admin", "dashboard",        true,  false, false, false],
  ["company_admin", "companies",        true,  false, false, false],
  ["company_admin", "branches",         true,  false, false, false],
  ["company_admin", "trials",           true,  true,  true,  true],
  ["company_admin", "students",         true,  true,  true,  true],
  ["company_admin", "examinations",     true,  true,  true,  true],
  ["company_admin", "programs",         true,  false, false, false],
  ["company_admin", "slots",            true,  true,  true,  true],
  ["company_admin", "vouchers",         true,  true,  true,  true],
  ["company_admin", "team",             true,  true,  true,  true],
  ["company_admin", "attendance",       true,  true,  true,  true],
  ["company_admin", "attendance_log",   true,  true,  true,  true],
  ["company_admin", "payment_record",   true,  true,  true,  true],
  ["company_admin", "pending_payments", true,  true,  true,  true],
  ["company_admin", "leaderboard",      true,  true,  false, false],
  ["company_admin", "transactions",     true,  true,  false, false],
  ["company_admin", "import",           false, false, false, false],

  // assistant_admin
  ["assistant_admin", "dashboard",        false, false, false, false],
  ["assistant_admin", "companies",        false, false, false, false],
  ["assistant_admin", "branches",         false, false, false, false],
  ["assistant_admin", "trials",           true,  true,  true,  false],
  ["assistant_admin", "students",         true,  true,  true,  false],
  ["assistant_admin", "examinations",     true,  true,  true,  false],
  ["assistant_admin", "programs",         true,  false, false, false],
  ["assistant_admin", "slots",            true,  true,  true,  false],
  ["assistant_admin", "vouchers",         false, false, false, false],
  ["assistant_admin", "team",             false, false, false, false],
  ["assistant_admin", "attendance",       true,  true,  true,  false],
  ["assistant_admin", "attendance_log",   true,  false, true,  false],
  ["assistant_admin", "payment_record",   false, false, false, false],
  ["assistant_admin", "pending_payments", true,  true,  true,  false],
  ["assistant_admin", "leaderboard",      true,  true,  false, false],
  ["assistant_admin", "transactions",     true,  true,  false, false],
  ["assistant_admin", "import",           false, false, false, false],

  // instructor
  ["instructor", "dashboard",        false, false, false, false],
  ["instructor", "companies",        false, false, false, false],
  ["instructor", "branches",         false, false, false, false],
  ["instructor", "trials",           true,  false, true,  false],
  ["instructor", "students",         true,  false, false, false],
  ["instructor", "examinations",     true,  true,  true,  false],
  ["instructor", "programs",         true,  false, false, false],
  ["instructor", "slots",            true,  false, false, false],
  ["instructor", "vouchers",         false, false, false, false],
  ["instructor", "team",             false, false, false, false],
  ["instructor", "attendance",       true,  true,  true,  false],
  ["instructor", "attendance_log",   true,  false, false, false],
  ["instructor", "payment_record",   false, false, false, false],
  ["instructor", "pending_payments", false, false, false, false],
  ["instructor", "leaderboard",      true,  true,  false, false],
  ["instructor", "transactions",     true,  true,  false, false],
  ["instructor", "import",           false, false, false, false],
];

const { error: delErr } = await supabase
  .from("role_permissions")
  .delete()
  .is("company_id", null)
  .in("role", ROLES);
if (delErr) {
  console.error("DELETE failed:", delErr);
  process.exit(1);
}
console.log(`Cleared global role_permissions for: ${ROLES.join(", ")}`);

const rows = ROWS.map(([role, resource, can_view, can_create, can_edit, can_delete]) => ({
  role, company_id: null, resource, can_view, can_create, can_edit, can_delete,
}));
const { error: insErr } = await supabase.from("role_permissions").insert(rows);
if (insErr) {
  console.error("INSERT failed:", insErr);
  process.exit(1);
}
console.log(`Inserted ${rows.length} rows.`);
console.log("Done.");
