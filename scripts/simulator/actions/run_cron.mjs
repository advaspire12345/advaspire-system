// Action: run_cron
//
// Hits the existing /api/cron/notifications endpoint with the configured
// CRON_SECRET so cron-driven sweeps (inactivity reminders, exam reminders,
// unmarked attendance, purge) fire in test time. The skill calls this
// after every "month boundary" stamp.

import { exec } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const execAsync = promisify(exec);

// Read CRON_SECRET from .env first (same loading pattern as helpers/db.mjs),
// fall back to process.env. Lets the orchestrator-spawned runner pick up
// the secret without inheriting it from the parent shell.
function loadCronSecret() {
  const envPath = resolve(process.cwd(), ".env");
  if (existsSync(envPath)) {
    const text = readFileSync(envPath, "utf8");
    const m = text.match(/^CRON_SECRET\s*=\s*(.+)$/m);
    if (m) return m[1].replace(/^["']|["']$/g, "").trim();
  }
  return process.env.CRON_SECRET;
}

export default {
  id: "run_cron",
  description: "Fire the daily cron sweep (inactivity + exam + unmarked-attendance reminders).",
  fields: {},
  ui: async (_browser, _args, _ctx = {}) => {
    const secret = loadCronSecret();
    if (!secret) {
      throw new Error("run_cron: CRON_SECRET not in .env or process.env — cron endpoint refuses unauthorized requests");
    }
    const base = process.env.SIM_APP_URL || "http://localhost:3000";
    const { stdout, stderr } = await execAsync(
      `curl -sS -H "Authorization: Bearer ${secret}" "${base}/api/cron/notifications"`,
    );
    if (stderr && !stdout) throw new Error(`run_cron: ${stderr}`);
    const parsed = (() => {
      try { return JSON.parse(stdout); } catch { return null; }
    })();
    if (!parsed || parsed.ok !== true) {
      throw new Error(`run_cron: unexpected response: ${stdout.slice(0, 200)}`);
    }
  },
};
