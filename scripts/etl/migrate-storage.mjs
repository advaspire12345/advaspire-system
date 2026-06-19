// scripts/etl/migrate-storage.mjs
// -----------------------------------------------------------------------------
// Copy the 3 Hub storage buckets INTO the LMS project, preserving object paths
// (so lesson_resources/lesson_uploads/assessment_attempts path columns stay valid).
// Source = the local backup made by scripts/backup-storage.mjs (./backup/...).
//
// Run from repo root:
//   node scripts/etl/migrate-storage.mjs            (dry-run: lists what it would upload)
//   node scripts/etl/migrate-storage.mjs --commit   (creates buckets + uploads)
// -----------------------------------------------------------------------------
import "./load-env.mjs";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, sep, extname } from "node:path";
import { TARGET } from "./config.mjs";

const COMMIT = process.argv.includes("--commit");
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..");
const BACKUP_DIR = join(REPO_ROOT, "backup", "hub-advaspire-learning");

// bucket -> public flag (matches the Hub originals; assessment-uploads is private)
const BUCKETS = { "assessment-uploads": false, "lesson-resources": true, "student-uploads": true };

const CONTENT_TYPES = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
  ".webp": "image/webp", ".pdf": "application/pdf", ".mp4": "video/mp4", ".json": "application/json",
};

function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

async function main() {
  if (!TARGET.key) throw new Error("Missing LMS key (LMS_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY).");
  if (!existsSync(BACKUP_DIR)) throw new Error(`No backup at ${BACKUP_DIR}. Run scripts/backup-storage.mjs first.`);
  const lms = createClient(TARGET.url, TARGET.key, { auth: { persistSession: false } });
  console.log(`\n=== Storage copy Hub -> LMS [${COMMIT ? "COMMIT" : "DRY-RUN"}] ===`);

  let total = 0, failed = 0;
  for (const [bucket, isPublic] of Object.entries(BUCKETS)) {
    const localDir = join(BACKUP_DIR, bucket);
    const files = walk(localDir);
    console.log(`\n== ${bucket} (${isPublic ? "public" : "private"}) — ${files.length} file(s) ==`);
    if (!files.length) continue;

    if (COMMIT) {
      const { error: be } = await lms.storage.createBucket(bucket, { public: isPublic });
      if (be && !/already exists/i.test(be.message)) throw new Error(`createBucket ${bucket}: ${be.message}`);
    }
    for (const file of files) {
      const objectPath = relative(localDir, file).split(sep).join("/"); // bucket-relative, forward slashes
      if (!COMMIT) { total++; continue; }
      const body = readFileSync(file);
      const { error } = await lms.storage.from(bucket).upload(objectPath, body, {
        upsert: true, contentType: CONTENT_TYPES[extname(file).toLowerCase()] || "application/octet-stream",
      });
      if (error) { console.error(`  FAIL ${objectPath}: ${error.message}`); failed++; }
      else total++;
    }
  }
  console.log(`\n${COMMIT ? "Uploaded" : "Would upload"} ${total} file(s), ${failed} failure(s).`);
  if (!COMMIT) console.log("Dry-run — re-run with --commit to create buckets + upload.");
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error("\nSTORAGE COPY FAILED:", e.message); process.exit(1); });
