// Helper for migration 023_notifications.
// The Supabase JS client cannot run arbitrary DDL, so this script just prints
// the SQL and a copy-paste-ready dashboard URL. Run the SQL in the Supabase
// SQL editor manually.

import { readFile } from "node:fs/promises";

const sql = await readFile("src/db/migrations/023_notifications.sql", "utf8");

console.log("=== Apply migration 023 in the Supabase dashboard SQL editor ===\n");
console.log(sql);
console.log("\n=== End migration 023 ===");
console.log("After applying, also set CRON_SECRET in Vercel env vars so the");
console.log("/api/cron/notifications endpoint accepts the weekly Vercel cron.");
