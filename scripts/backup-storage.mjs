// scripts/backup-storage.mjs
// -----------------------------------------------------------------------------
// A4 storage backup — downloads EVERY object from all buckets in BOTH projects
// into ./backup/<project>/<bucket>/<path>. Reliable + restartable (re-running
// just re-downloads; safe to interrupt). Uses the service-role key (full read).
//
// Run from the repo root (so @supabase/supabase-js resolves):
//   PowerShell:
//     $env:LMS_SERVICE_ROLE_KEY = "<LMS service_role secret>"
//     $env:HUB_SERVICE_ROLE_KEY = "<HUB service_role secret>"
//     node scripts/backup-storage.mjs
// Keys: Supabase dashboard -> each Project -> Settings -> API -> service_role.
// (The LMS key is also in this app's .env as SUPABASE_SERVICE_ROLE_KEY.)
// -----------------------------------------------------------------------------
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

// Plain `node` does NOT auto-load .env files (Next.js does that for the app).
// Load .env.local ourselves so the service keys are available. No dependency.
function loadEnvLocal(file = ".env.local") {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    if (/^\s*(#|$)/.test(line)) continue;
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    const val = m[2].replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnvLocal();

const PROJECTS = [
  {
    name: "lms-advaspire-system",
    url: "https://kbzrdsxzzqzbxqgwpsuq.supabase.co",
    key: process.env.LMS_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
    buckets: ["program-covers", "project-photos"],
  },
  {
    name: "hub-advaspire-learning",
    url: "https://sfxltburkhrgsojyvboj.supabase.co",
    key: process.env.HUB_SERVICE_ROLE_KEY || process.env.HUB_SUPABASE_SERVICE_ROLE_KEY,
    buckets: ["assessment-uploads", "lesson-resources", "student-uploads"],
  },
];

const OUT = "./backup";
const PAGE = 100;

// Recursively list every object path under a bucket. Folders come back with a
// null id (no metadata) — recurse into them; real files get collected.
async function listAll(supabase, bucket, prefix = "") {
  const files = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: PAGE,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) files.push(...(await listAll(supabase, bucket, path)));
      else files.push(path);
    }
    if (data.length < PAGE) break;
  }
  return files;
}

async function run() {
  let total = 0;
  let failed = 0;
  const manifest = [];
  for (const p of PROJECTS) {
    if (!p.key) {
      console.error(`! Missing key for ${p.name} — set its *_SERVICE_ROLE_KEY env. Skipping.`);
      failed++;
      continue;
    }
    const supabase = createClient(p.url, p.key, { auth: { persistSession: false } });
    for (const bucket of p.buckets) {
      console.log(`\n== ${p.name} / ${bucket} ==`);
      let paths;
      try {
        paths = await listAll(supabase, bucket);
      } catch (e) {
        console.error(`  list failed: ${e.message}`);
        failed++;
        continue;
      }
      console.log(`  ${paths.length} object(s)`);
      let ok = 0;
      for (const path of paths) {
        const { data, error } = await supabase.storage.from(bucket).download(path);
        if (error) {
          console.error(`  FAIL ${path}: ${error.message}`);
          failed++;
          continue;
        }
        const dest = join(OUT, p.name, bucket, path);
        await mkdir(dirname(dest), { recursive: true });
        await writeFile(dest, Buffer.from(await data.arrayBuffer()));
        total++;
        ok++;
      }
      manifest.push({ project: p.name, bucket, objects: paths.length, downloaded: ok });
    }
  }
  console.table(manifest);
  console.log(`\nDone. ${total} file(s) downloaded, ${failed} failure(s). Output: ${OUT}/`);
  process.exit(failed ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
