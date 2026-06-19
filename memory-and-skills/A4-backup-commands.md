# A4 — Full backups (run BEFORE any destructive step)

> **Status:** must complete + verify before Part C. These commands run on YOUR machine
> (the Supabase MCP can't `pg_dump`). Store outputs **off-platform** (not in either repo).

## 0. Prereqs
- **pg_dump v17** (server is PG 17.6 — an older client may refuse). Windows:
  `C:\Program Files\PostgreSQL\17\bin\pg_dump.exe`. Check: `pg_dump --version`.
- **Connection strings + DB password** for each project from the Supabase dashboard →
  **Project → Connect → Session pooler** (IPv4-friendly). Copy the exact URI; it looks like:
  `postgresql://postgres.<ref>:[YOUR-PASSWORD]@aws-0-<region>.pooler.supabase.com:5432/postgres`

| Project | ref | region | db host (direct) |
|---|---|---|---|
| LMS `advaspire-system` | `kbzrdsxzzqzbxqgwpsuq` | ap-southeast-1 | db.kbzrdsxzzqzbxqgwpsuq.supabase.co |
| Hub `advaspire-learning` | `sfxltburkhrgsojyvboj` | ap-northeast-1 | db.sfxltburkhrgsojyvboj.supabase.co |

Set the two connection strings once (PowerShell):
```powershell
$LMS = "postgresql://postgres.kbzrdsxzzqzbxqgwpsuq:[PWD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
$HUB = "postgresql://postgres.sfxltburkhrgsojyvboj:[PWD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"
```
> Replace `[PWD]` and confirm the exact pooler host from the dashboard (it may be `aws-1-…`).

## 1. Full database dumps (custom format = best for restore)
```powershell
pg_dump $LMS --format=custom --no-owner --no-privileges --file="lms_full_2026-06-18.dump"
pg_dump $HUB --format=custom --no-owner --no-privileges --file="hub_full_2026-06-18.dump"
```
Plain-SQL copies too (human-readable / greppable):
```powershell
pg_dump $LMS --no-owner --no-privileges --file="lms_full_2026-06-18.sql"
pg_dump $HUB --no-owner --no-privileges --file="hub_full_2026-06-18.sql"
```

## 2. Auth users (explicit, separate — this is the high-risk data in C4)
```powershell
pg_dump $LMS --schema=auth --no-owner --no-privileges --file="lms_auth_2026-06-18.sql"
pg_dump $HUB --schema=auth --no-owner --no-privileges --file="hub_auth_2026-06-18.sql"
```

## 3. ⚠️ Storage object FILES are NOT in pg_dump
`pg_dump` captures the `storage.objects` *metadata* rows but **not the actual files** in
the buckets. Use the backup script (downloads all 5 buckets across both projects):
- Hub buckets: `assessment-uploads` (private), `lesson-resources`, `student-uploads`
- LMS buckets: `program-covers`, `project-photos`
```powershell
# from the repo root (advaspire-system), so @supabase/supabase-js resolves:
$env:LMS_SERVICE_ROLE_KEY = "<LMS service_role secret>"   # = .env SUPABASE_SERVICE_ROLE_KEY
$env:HUB_SERVICE_ROLE_KEY = "<HUB service_role secret>"   # dashboard -> Hub -> Settings -> API
node scripts/backup-storage.mjs
```
Output lands in `./backup/<project>/<bucket>/…` and prints a per-bucket count table.

## 4. Verify the dumps (row counts must match A3 inventory, 2026-06-18)
Restore-list spot check (custom dumps):
```powershell
pg_restore --list "lms_full_2026-06-18.dump" | Select-String "TABLE DATA" | Measure-Object
```
Expected key counts to sanity-check against:
- **LMS:** auth.users 289 · students 370 · users 293 · payments 1752 · attendance 8706 · audit_log 23430
- **Hub:** auth.users 137 · users 137 · certificates 182 · lesson_progress 21 · assessment_attempts 19

## 5. Done criteria
- [ ] 4 DB dumps (`.dump` + `.sql` × 2 projects) created and non-empty
- [ ] 2 auth dumps created
- [ ] storage files copied for all 5 buckets
- [ ] counts verified vs A3
- [ ] all artifacts stored off-platform (encrypted; they contain PII + auth hashes)
