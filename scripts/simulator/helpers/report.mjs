// Markdown report writer. Takes the collected diff entries + step metadata and
// emits simulator-output/<ts>/report.md plus links the screenshots.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function makeRunDir() {
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const root = join(process.cwd(), "simulator-output", ts);
  mkdirSync(join(root, "screenshots"), { recursive: true });
  mkdirSync(join(root, "snapshots"), { recursive: true });
  return root;
}

export function writeReport({ runDir, scenarioName, fixtures, steps, diffs }) {
  const failures = diffs.filter((d) => d.result.startsWith("❌"));
  const lines = [];

  lines.push(`# Simulator report — ${scenarioName}`);
  lines.push("");
  lines.push(`**Run dir:** ${runDir}`);
  lines.push(`**Steps:** ${steps.length}`);
  lines.push(`**Drift findings:** ${failures.length}`);
  lines.push("");

  if (failures.length === 0) {
    lines.push("✅ All checkpoints passed.");
  } else {
    lines.push("## ❌ Drift / failure findings");
    lines.push("");
    lines.push("| Step | Role | Field | DOM | DB | Expected | Result |");
    lines.push("|------|------|-------|-----|-----|----------|--------|");
    for (const d of failures) {
      lines.push(
        `| ${d.step} | ${d.role} | \`${d.field}\` | ${fmt(d.dom)} | ${fmt(d.db)} | ${fmt(d.expected)} | ${d.result} |`,
      );
    }
  }

  lines.push("");
  lines.push("## Full checkpoint table");
  lines.push("");
  lines.push("| Step | Role | Field | DOM | DB | Expected | Result |");
  lines.push("|------|------|-------|-----|-----|----------|--------|");
  for (const d of diffs) {
    lines.push(
      `| ${d.step} | ${d.role} | \`${d.field}\` | ${fmt(d.dom)} | ${fmt(d.db)} | ${fmt(d.expected)} | ${d.result} |`,
    );
  }

  lines.push("");
  lines.push("## Per-step breakdown");
  lines.push("");
  for (const s of steps) {
    lines.push(`### Step ${s.index}: \`${s.action}\` as **${s.actor}**`);
    if (s.with) {
      lines.push("");
      lines.push("```yaml");
      for (const [k, v] of Object.entries(s.with)) {
        lines.push(`${k}: ${JSON.stringify(v)}`);
      }
      lines.push("```");
    }
    if (s.actorScreenshot) {
      lines.push(`- actor screenshot: \`${s.actorScreenshot}\``);
    }
    if (s.observerScreenshots) {
      for (const o of s.observerScreenshots) {
        lines.push(`- observer (${o.role}): \`${o.path}\``);
      }
    }
    if (s.error) {
      lines.push("");
      lines.push(`**Error:** \`${s.error}\``);
    }
    lines.push("");
  }

  lines.push("## Fixtures");
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify(fixtures, null, 2));
  lines.push("```");

  const reportPath = join(runDir, "report.md");
  writeFileSync(reportPath, lines.join("\n"));
  return reportPath;
}

function fmt(v) {
  if (v === undefined) return "—";
  if (v === null) return "null";
  return String(v);
}
