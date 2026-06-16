#!/usr/bin/env node
/**
 * sync-skills.mjs
 *
 * Refreshes the readable, committed mirror of the project's Claude Code skills
 * and commands so `memory-and-skills/skills/` never drifts from the live copies.
 *
 *   live (loaded by Claude Code)        ->  mirror (source of truth, in git)
 *   .claude/skills/<skill>/             ->  memory-and-skills/skills/<skill>/
 *   .claude/commands/                   ->  memory-and-skills/skills/_commands/
 *
 * Usage:
 *   node scripts/sync-skills.mjs           # sync
 *   node scripts/sync-skills.mjs --check    # exit 1 if mirror is out of date (CI-friendly)
 */

import { cpSync, rmSync, mkdirSync, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LIVE_SKILLS = join(ROOT, '.claude', 'skills');
const LIVE_COMMANDS = join(ROOT, '.claude', 'commands');
const MIRROR = join(ROOT, 'memory-and-skills', 'skills');
const MIRROR_COMMANDS = join(MIRROR, '_commands');

const checkOnly = process.argv.includes('--check');

/** Recursively list relative file paths under a dir (sorted, stable). */
function listFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listFiles(full).map((p) => join(name, p)));
    else out.push(name);
  }
  return out.sort();
}

/** Compare two dirs file-by-file; return list of differing/missing relative paths. */
function diff(srcDir, dstDir) {
  const drift = [];
  const srcFiles = listFiles(srcDir);
  const dstFiles = new Set(listFiles(dstDir));
  for (const rel of srcFiles) {
    if (!dstFiles.has(rel)) { drift.push(`missing: ${rel}`); continue; }
    if (readFileSync(join(srcDir, rel), 'utf8') !== readFileSync(join(dstDir, rel), 'utf8'))
      drift.push(`changed: ${rel}`);
    dstFiles.delete(rel);
  }
  for (const rel of dstFiles) drift.push(`stale (mirror-only): ${rel}`);
  return drift;
}

if (!existsSync(LIVE_SKILLS)) {
  console.error(`✗ No live skills dir at ${relative(ROOT, LIVE_SKILLS)} — nothing to sync.`);
  process.exit(1);
}

if (checkOnly) {
  // Build the expected mirror layout for comparison: skills + commands under _commands.
  const drift = [
    ...diff(LIVE_SKILLS, MIRROR).filter((d) => !d.includes('_commands')),
    ...diff(LIVE_COMMANDS, MIRROR_COMMANDS).map((d) => d.replace(/: /, ': _commands/')),
  ];
  if (drift.length) {
    console.error('✗ Mirror is OUT OF DATE. Run: node scripts/sync-skills.mjs\n');
    for (const d of drift) console.error('  ' + d);
    process.exit(1);
  }
  console.log('✓ Mirror is up to date.');
  process.exit(0);
}

// Sync: wipe mirror, recreate, copy skills, then commands into _commands.
rmSync(MIRROR, { recursive: true, force: true });
mkdirSync(MIRROR, { recursive: true });
cpSync(LIVE_SKILLS, MIRROR, { recursive: true });
if (existsSync(LIVE_COMMANDS)) cpSync(LIVE_COMMANDS, MIRROR_COMMANDS, { recursive: true });

const skillCount = readdirSync(MIRROR).filter(
  (n) => n !== '_commands' && statSync(join(MIRROR, n)).isDirectory(),
).length;
const cmdCount = existsSync(MIRROR_COMMANDS) ? listFiles(MIRROR_COMMANDS).length : 0;
console.log(`✓ Synced ${skillCount} skill(s) and ${cmdCount} command(s) -> ${relative(ROOT, MIRROR)}`);
