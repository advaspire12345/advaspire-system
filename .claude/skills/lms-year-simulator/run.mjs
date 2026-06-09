#!/usr/bin/env node
// LMS year-simulator orchestrator.
// Runs one named scenario, a comma list, or every scenario in `ORDER`.
// Aggregates each sub-report into a single skill-report.md.

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCENARIOS_DIR = resolve(__dirname, "scenarios");
const RUNNER = resolve(__dirname, "../../../scripts/simulator/runner.mjs");
const OUTPUT_BASE = resolve(__dirname, "../../../simulator-output");

// Execution order. Focused scenarios first (fast feedback), mega last.
const ORDER = [
  "exam-pass-then-next-level",
  "exam-fail-then-8week-reattempt",
  "voucher-application-on-renewal",
  "good-payer-voucher-within-window",
  "good-payer-voucher-missed-window",
  "voucher-earn-on-completion",
  "settle-deficit-toggle",
  "pool-dissolve-to-individual-renewal",
  "pool-fast-burn-three-siblings",
  "pool-slow-burn-uneven",
  "individual-multi-slot",
  "course-switch-midway",
  "inactivity-reminders",
  "trial-converted-and-billed",
  "adcoin-instructor-award",
  "adcoin-admin-adjustment",
  "adcoin-student-transfer",
  "holiday-broadcast",
  "activity-broadcast",
  "parent-self-register",
  "import-students-with-history",
  "mixed-year",
];

function listAvailable() {
  if (!existsSync(SCENARIOS_DIR)) return [];
  return readdirSync(SCENARIOS_DIR)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => f.replace(/\.yaml$/, ""))
    .sort();
}

// Snapshot the simulator-output directory before a run so we can
// identify the new dir the scenario produces (regardless of how many
// other runs landed in between).
function snapshotOutputDirs() {
  if (!existsSync(OUTPUT_BASE)) return new Set();
  return new Set(readdirSync(OUTPUT_BASE));
}

// Kill any leftover agent-browser + Chrome-for-Testing processes and
// sleep so the daemon can shut down cleanly before the next scenario
// starts.  Mitigates "Resource temporarily unavailable (os error 35)"
// failures hit when running many scenarios serially.
//
// 4s was originally chosen but caused scenarios 5-8 in the all-run to
// crash at login while the previous daemon's sockets were still draining.
// 7s gives macOS a more reliable wait before the next agent-browser spin-up.
function resetBrowserDaemon() {
  try {
    spawnSync("pkill", ["-9", "-f", "agent-browser"], { stdio: "ignore" });
    spawnSync("pkill", ["-9", "-f", "Chrome for Testing"], { stdio: "ignore" });
  } catch {
    // ignore — pkill exits non-zero when no processes match
  }
  // Atomics.wait is synchronous in the orchestrator thread.
  const sab = new SharedArrayBuffer(4);
  Atomics.wait(new Int32Array(sab), 0, 0, 7000);
}

function runScenario(name, { skipReset = false } = {}) {
  console.log(`\n══════ Scenario: ${name} ══════`);
  const yamlPath = join(SCENARIOS_DIR, `${name}.yaml`);
  if (!existsSync(yamlPath)) {
    return { name, status: "missing", drift: null, reportPath: null };
  }
  if (!skipReset) resetBrowserDaemon();
  const before = snapshotOutputDirs();
  // SIM_SCENARIO_PATH points the underlying runner at the skill's YAMLs
  // instead of the shared lms-simulator/scenarios directory.
  const result = spawnSync("node", [RUNNER, name], {
    cwd: resolve(__dirname, "../../.."),
    env: { ...process.env, SIM_SCENARIO_PATH: yamlPath },
    stdio: "inherit",
  });
  // The new run dir is whatever appeared in OUTPUT_BASE since `before`.
  // If the runner died before creating a dir (rare), reportPath stays null.
  let reportPath = null;
  if (existsSync(OUTPUT_BASE)) {
    const newDirs = readdirSync(OUTPUT_BASE).filter((d) => !before.has(d) && !d.startsWith("skill-"));
    if (newDirs.length > 0) {
      newDirs.sort();
      reportPath = join(OUTPUT_BASE, newDirs[newDirs.length - 1], "report.md");
    }
  }

  // Status detection: the runner exit code is 0 even when individual
  // steps fail (it catches step errors to keep the scenario report
  // generation alive). The report.md only documents drift checkpoints —
  // it does NOT include step-error lines. So we detect failures via
  // the only authoritative artifact: `*FAIL*` screenshot files in the
  // scenario's screenshots dir. Those exist iff a step threw.
  let driftCount = null;
  let stepErrorCount = 0;
  if (reportPath && existsSync(reportPath)) {
    const text = readFileSync(reportPath, "utf8");
    const m = text.match(/Drift findings:\*\*\s*(\d+)/);
    driftCount = m ? parseInt(m[1], 10) : 0;
  }
  // Count FAIL screenshots in the run's screenshots dir.
  if (reportPath) {
    const screenshotsDir = join(reportPath.replace(/report\.md$/, ""), "screenshots");
    if (existsSync(screenshotsDir)) {
      stepErrorCount = readdirSync(screenshotsDir).filter((f) => /FAIL/.test(f)).length;
    }
  }

  const ok = result.status === 0 && stepErrorCount === 0;
  return {
    name,
    status: ok ? "ok" : "fail",
    drift: driftCount,
    stepErrors: stepErrorCount,
    reportPath,
  };
}

function writeAggregateReport(results) {
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const dir = join(OUTPUT_BASE, `skill-${ts}`);
  mkdirSync(dir, { recursive: true });
  const md = [
    `# lms-year-simulator — aggregated report`,
    ``,
    `Generated: ${new Date().toISOString()}`,
    ``,
    `| Scenario | Status | Drift | Step errors | Report |`,
    `|---|---|---|---|---|`,
    ...results.map((r) => {
      const status = r.status === "ok" ? "✅" : r.status === "missing" ? "⚪ skipped" : "❌";
      const drift = r.drift == null ? "—" : r.drift;
      const stepErrors = r.stepErrors == null ? "—" : r.stepErrors;
      const link = r.reportPath ? `[link](${r.reportPath})` : "—";
      return `| ${r.name} | ${status} | ${drift} | ${stepErrors} | ${link} |`;
    }),
    ``,
  ].join("\n");
  const reportPath = join(dir, "skill-report.md");
  writeFileSync(reportPath, md);
  console.log(`\n✓ Aggregated report: ${reportPath}`);
  return reportPath;
}

function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.log("Available scenarios:");
    for (const n of listAvailable()) console.log(`  ${n}`);
    console.log("\nUsage:");
    console.log("  node .claude/skills/lms-year-simulator/run.mjs <name>");
    console.log("  node .claude/skills/lms-year-simulator/run.mjs all");
    return;
  }
  const names = arg === "all" ? ORDER : arg.split(",").map((s) => s.trim());
  const results = [];
  // Skip the reset before the first scenario — assume the caller already
  // ran a clean kill if they wanted one. Subsequent scenarios get a fresh
  // browser daemon to avoid the "Resource temporarily unavailable" hangs.
  for (let i = 0; i < names.length; i++) {
    results.push(runScenario(names[i], { skipReset: i === 0 }));
  }
  writeAggregateReport(results);
  const failed = results.filter((r) => r.status === "fail").length;
  process.exit(failed === 0 ? 0 : 1);
}

main();
