#!/usr/bin/env node
/**
 * Points git at the committed .githooks/ directory so the pre-commit hook runs.
 * Wired to npm's `prepare` lifecycle, so it self-installs on `npm install`.
 * Silently no-ops outside a git checkout (e.g. CI installing from a tarball).
 */
import { execSync } from 'node:child_process';

try {
  execSync('git rev-parse --git-dir', { stdio: 'ignore' });
  execSync('git config core.hooksPath .githooks', { stdio: 'ignore' });
  console.log('✓ git hooks configured (core.hooksPath = .githooks)');
} catch {
  // not a git repo, or git unavailable — nothing to do
}
