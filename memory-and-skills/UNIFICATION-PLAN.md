# Unification Plan — One Identity, Two Apps, One Supabase

> **Status:** PLAN ONLY — decision record + step-by-step flow. **Nothing is amended
> until Part C.** Parts A–B are non-destructive (inventory, backups, design).
> **Last updated:** 2026-06-22.

> **🌐 Domain decision (2026-06-22):** the root domain is **`advaspire.io`** (the `.com`
> is used for an unrelated purpose). Subdomains: **`app.advaspire.io` = LMS**,
> **`learn.advaspire.io` = Hub**; shared cookie domain **`.advaspire.io`**.
> ⚠️ **The synthetic auth-email suffixes `@student.advaspire.com` / `@staff.advaspire.com`
> are deliberately UNCHANGED** — they are internal, never-delivered login identifiers
> already minted into `auth.users` (C3/C4, decisions #8/#9). They are independent of the
> web domain; rewriting them would break login for the 397 students + 7 staff already
> created. Only web/cookie/subdomain references were migrated to `.io`.

## 1. The decision (ADR)

**Problem.** A teacher must log in **once** and do attendance + payments (LMS) *and*
see student learning progress (Learning Hub). Today these are **2 apps on 2 Supabase
projects** with 2 different login systems.

**Decision.**
- **Keep 2 separate apps** (different runtime profiles: the LMS is heavy/transactional;
  the Hub is content-heavy — thousands of Claude-generated static lesson pages that
  rebuild on every change). Merging them into one Next app would couple unrelated
  deploys and blow up build times. **Do not fuse the frontends.**
- **Consolidate onto 1 Supabase** = the **LMS Supabase project** becomes the single
  **identity authority** and shared database. It has the richer role/org model and
  hosts the teacher experience.
- **Serve both apps on subdomains of one root domain** (`app.advaspire.io` +
  `learn.advaspire.io`) so the Supabase **auth cookie is shared at `.advaspire.io`**
  → true single sign-on, no redirect handshake.
- The **unified teacher dashboard lives in the LMS app**, reading progress from the
  shared DB.

**Confirmed inputs (2026-06-16):**
- One parent domain + subdomains: **`app.advaspire.io` = LMS**, **`learn.advaspire.io` = Learning Hub**.
- Both projects are in development **but contain real data** (migrate carefully, no throwaway).
- Teacher home = LMS app. Hosting = Vercel.
- **LMS `students` is the master record of students** — every Hub student must resolve
  to an LMS student.
- **User import dedup = by student ID.** When importing a Hub user, match on student ID
  first; if it already exists in the LMS, **skip creating** (link instead); otherwise
  create the user with the username and password **reset to the username**.
- **A Hub `school` links to an existing LMS `branch`** (not always a brand-new branch).
- **Repo layout (monorepo vs two repos): still OPEN** — to be decided with the team
  (see §"Open questions" for the pros/cons). Subdomains do NOT force separate repos:
  a Vercel project can deploy from a subdirectory of a monorepo.

## 2. Target architecture

```
                          one root domain: advaspire.io
                  ┌──────────────────────────┴──────────────────────────┐
        app.advaspire.io (Vercel proj A)              learn.advaspire.io (Vercel proj B)
            advaspire-system  (LMS)                       advaslearning-hub  (content + progress)
            attendance · payments · exams                 9 courses · lessons · progress · assessment
                  │                                                   │
                  └───────────────┬───────────────────────────────────┘
                       shared @supabase/ssr client
                       cookie domain = ".advaspire.io"   ← single login
                                  │
                    ┌─────────────┴──────────────┐
                    │   ONE Supabase project       │   ← was the LMS project
                    │   auth.users (single)        │
                    │   public.users (canonical)   │
                    │   branches (incl. schools)   │
                    │   payments/attendance/...    │   (LMS domain)
                    │   progress/assessment/certs  │   (Hub domain, migrated in)
                    └──────────────────────────────┘
            (the old advaspire-learning Supabase is retired at the end)
```

## 3. Concrete mapping (LMS = canonical)

### Roles
| Hub role | → LMS `UserRole` | Notes |
|---|---|---|
| `super-admin` | `super_admin` | god-tier already exists |
| `school-admin` | `company_admin` | manages one tenant; creates teachers/students |
| `school-teacher` | `instructor` | **the key persona** — gains a Progress view + attendance/payments |
| `school-student` | `student` | already a portal role in LMS |

### Org / tenancy
| Hub | → LMS | Notes |
|---|---|---|
| `schools` row | **an existing `branches` row** (mapped 1:1, confirmed) | each Hub school is linked to a specific existing LMS branch; ETL needs a school→branch mapping table |
| `school_id` FK | `branch_id` | rewrite during ETL using the school→branch map |

### Identity
- LMS uses **real emails**; Hub uses **synthetic `username@advaspire-learning.com`**.
  The two namespaces don't collide → Hub users migrate in **keeping their existing
  email** (login identity unchanged).
- **Import strategy (CONFIRMED): dedup by student ID, recreate + reset.**
  For each Hub user:
  1. **Match on student ID** against the LMS master (`students` is the source of truth).
  2. If a matching LMS record **already exists → skip creating** (link the Hub data to
     the existing LMS user/student instead of making a duplicate).
  3. If **no match → create** the user via the Admin API with the Hub username, and set
     the **password = username** (a reset value; user changes it on first login).
  - Implication: the ETL needs the student-ID column on **both** sides (Hub
    `users.verification_id` ↔ the LMS student identifier) and must log every skip vs
    create. Hub students with **no** LMS match are anomalies — **report, don't
    silently create** (LMS is master; investigate the gap).

### Table collisions to resolve
- **`users`** — the only real collision. One canonical `public.users`; Hub users
  merged in with mapped role + `branch_id`.
- **`schools`** — folded into `branches` (or kept as a thin lookup linked to a branch).
- Everything else from the Hub (`progress`, quiz attempts, uploads, `assessment*`,
  certificates, lesson resources) is **additive** — namespace if any name clashes.

---

# The flow & steps

## PART A — Non-destructive prep (do this first; nothing changes)

- [ ] **A1. Confirm names.** Root domain + the two subdomains (e.g. `app.` / `learn.`).
- [x] **A2. Password strategy — DECIDED (2026-06-18):** recreate+reset on Supabase auth. Students: email `<student_id>@student.advaspire.com`, pw = student_id. Staff: `<username>@staff.advaspire.com`, pw = username. Parents keep real email. See "Auth & identity strategy" below.
- [x] **A3. Inventory both databases — DONE (2026-06-18).** Tables, row counts, columns,
      enums, full FK graph, RLS posture, storage buckets, `auth.users` counts all captured.
      See "A3 Inventory findings" + "A3 inventory — COMPLETE" sections below.
- [x] **A4. Full backups — DONE (2026-06-18).** Both projects dumped (custom `.dump` +
      plain `.sql`), `auth` schemas exported, all 5 storage buckets downloaded via
      `scripts/backup-storage.mjs`. Verified Level 1 (sizes non-zero, LMS `.sql` 26.4 MB,
      `COPY auth.users` present, 89/52 TABLE DATA sections). Exact row-count check deferred
      to B2 branch restore. Commands → [`A4-backup-commands.md`](A4-backup-commands.md).
- [ ] **A5. Freeze schema-changing work** on the Hub for the migration window
      (lesson authoring can continue — it's static files).
- [x] **A6. Canonical schema diff — DRAFTED (2026-06-18):** see
      [`A6-canonical-ddl.sql`](A6-canonical-ddl.sql). Review-only. Covers `students.auth_id`,
      `branches.type='school'` + signature fields, ETL staging maps, the 2 Hub enums,
      the lesson catalog + the student-scoped tables with **remapped FKs** (owner
      `user_id→student_id→students`, `school_id→branch_id→branches`, staff cols→`users`),
      and RLS-on (policies deferred to B4). **D1/D2 now RESOLVED** (schools fold + Global
      Ark branch; class→slot merge with `slot_students`). RLS-enable of the 18 pre-existing
      exposed tables split out into [`B4-rls-enable.sql`](B4-rls-enable.sql).

> ✅ End of Part A: full understanding + backups + a reviewed schema design. Still
> zero changes to either live system.

## PART B — Shared foundation (build alongside, still non-destructive)

- [ ] **B1. (Recommended) Monorepo.** Create a pnpm workspace / Turborepo:
      `apps/lms`, `apps/learn`, `packages/db` (Supabase client + generated types),
      `packages/auth` (session helpers, role guards). *Minimum viable alt:* keep two
      repos, share a types package. Either way both apps end up pointing at one Supabase.
- [x] **B2. Staging validation — DONE (2026-06-18) via transactional dry-run.**
      Branching needs Pro (org is free-tier), so validated A6+B4 with a `BEGIN … RAISE …`
      self-aborting transaction on the dev DB (rollback confirmed honored; DB verified
      untouched after). **Result: A6 + B4 apply cleanly** — 16/16 new tables, `students.auth_id`,
      3/3 `course_slots` cols, GAIS branch, 2/2 enums, 18/18 RLS, kind CHECK all OK.
      🐞 **Caught a real bug:** `branches` has an existing `branches_type_check`
      CHECK (`company|hq|branch`) that rejected `'school'` → A6 now widens it before the
      Global Ark insert. (Full data-restore staging still useful later for B3 ETL volume tests.)
- [~] **B3. ETL scripts — DRAFTED (2026-06-18):** `scripts/etl/config.mjs` + `migrate.mjs`.
      **Dry-run-first** (reads both DBs, computes every mapping, writes
      `scripts/etl/etl-report.json`, touches nothing); `--commit` gated behind an A6-applied
      precondition check. Phases: 0 preconditions · 1 school→branch (by name) ·
      2 users (students link/create + staff create → `hub_user_map`) · 3 onboard all active
      LMS students to `auth.users` · 4 migrate additive tables w/ FK rewrites
      (`user_id→student_id`, `school_id→branch_id`, staff cols→`users`, `keepId` preserves
      intra-Hub refs) · 5 classes→class-slots + class_members→`slot_students` · 6 report.
      **Next: run the read-only dry-run** to get the real linked/created/unmatched numbers,
      then rehearse `--commit` against a data-loaded staging DB before C3.
- [x] **B4. RLS rebuilt — DONE (2026-06-18/19).** Applied via migrations
      `unify_b4_rls_policies` + `unify_b4_lock_staging_tables`. See [`B4-policies.sql`](B4-policies.sql).
      4 resolver fns (`app_current_student_id/role/branch_id`, `app_staff_sees_branch`) +
      27 policies translating the Hub model to the unified schema (`user_id→student_id` via
      `students.auth_id`, `school_id→branch_id`); public read on lesson content; legacy 18 +
      2 staging tables RLS-enabled. **Every public table now has RLS on** (advisor cleared).
      Validated by transactional dry-run before apply.

## PART C — Migration execution (FIRST destructive step; on a maintenance window)

- [x] **C1. Backups** — covered by A4 (DB + auth + storage, 2026-06-18); dev status, accepted risk.
- [x] **C2. Canonical DDL APPLIED to LMS — DONE (2026-06-18)** via migration
      `unify_a6_canonical_schema`. Verified: 16/16 new tables, `students.auth_id`,
      `course_slots` kind/name/teacher_in_charge, 2 enums, kind CHECK, widened
      `branches_type_check`, GAIS branch `5bcd17c5-e169-41b4-b1a2-371a77fd8db6`.
      (Pro unavailable → applied directly to dev DB with A4 backups as the safety net,
      per user's accepted-risk go-ahead.)
- [x] **C3. ETL run — DONE (2026-06-18).** `migrate.mjs --commit` (idempotent resume after
      two fixes: per-table conflict key, reuse hub_user_map). 102 linked + 27 created students,
      1 linked + 7 created staff, all additive tables migrated. Report: `scripts/etl/etl-report.json`.
- [x] **C4. Hub users → LMS auth — DONE (2026-06-18)** as ETL Phase 2/3: 397 students minted
      into `auth.users` (`<student_id>@student.advaspire.com`, pw=student_id), 7 staff
      (`<username>@staff.advaspire.com`), Hub super-admin linked to existing LMS super_admin.
- [x] **C5. Verify — DONE (2026-06-18).** Row counts match Hub source exactly; **0 FK orphans**
      (progress/cert→students, attempts→assessments, slot_students→slots); GAIS branch = 18
      students; sample lesson_progress resolves student+branch+approver to real records.

## PART D — Point the Learning Hub at the LMS Supabase

> **Repo locations (this machine):** LMS `advaspire-system` =
> `C:\Users\User\Desktop\Github\claude-code\advaspire-system`; Hub `advaspire-learning` =
> `C:\Users\User\Desktop\Github\claude-code\software_development`. Part D work happens in the Hub repo.

- [x] **D1. DONE (2026-06-19).** Hub `.env.local` repointed → LMS project
      (`kbzrdsxzzqzbxqgwpsuq`): URL, publishable key, service-role key all swapped to advaspire-system.
- [x] **D2. Cookie-domain code DONE (2026-06-22) in BOTH apps.** Added a shared
      `lib/supabase/cookie-options.ts` → `getSupabaseCookieOptions()` returning
      `{ domain }` only when **`NEXT_PUBLIC_COOKIE_DOMAIN`** is set (else `undefined` so
      `localhost`/`*.vercel.app` stay host-only and local login keeps working). Wired into
      all 3 SSR client sites per app via `cookieOptions:` — LMS: `src/lib/supabase/{server,client,proxy}.ts`;
      Hub: `lib/supabase/{server,client,middleware}.ts`. `@supabase/ssr@0.8.0` merges this
      over `DEFAULT_COOKIE_OPTIONS` so `path:'/'`/`sameSite:'lax'` are preserved. Both apps
      `tsc --noEmit` exit 0. **Activated by setting the env in F2** (no domain ⇒ no behavior change).
      ⚠️ **Env name is `NEXT_PUBLIC_COOKIE_DOMAIN`, not `COOKIE_DOMAIN`** — the browser client
      needs it inlined at build time, and server+browser cookie domains MUST match or two
      competing cookies are written (logout loops).
      ⚠️ **Student-portal SSO gap (open):** the LMS student portal authenticates with its own
      custom-JWT `student_token` cookie (`src/lib/student-auth.ts`), NOT the Supabase cookie, so
      it does **not** participate in this shared-cookie SSO. Per the app-split decision students
      live on the Hub (Supabase auth) — fine for F3's teacher/admin flow, but unifying the LMS
      student portal onto Supabase auth (or domain-scoping `student_token`) is a separate decision.
- [ ] **D3.** Update Hub queries to the unified schema. **SCOPED 2026-06-19** →
      [`PART-D-change-list.md`](PART-D-change-list.md): ~370 sites / ~30 files. Core change is a
      two-source auth resolver (student via `students.auth_id`, staff via `users.auth_id`) +
      `school_id→branch_id`, student `user_id→student_id`, `classes/class_members→course_slots/slot_students`,
      Hub→LMS role literals. 6 open decisions (esp. **provisioning ownership** — does the Hub still
      create students/branches, or does the LMS own that now).
  - [x] **D3-login. FIXED 2026-06-20.** Hub `app/dashboard/login/actions.ts` could not log staff
        in by **username** post-unification: it *guessed* the auth email by suffix
        (`<id>@staff.advaspire.com` / `@student.advaspire.com` / `@advaspire-learning.com`), which
        only works for synthetic-email accounts. Migrated/original LMS staff keep **real** emails
        (e.g. `myzhenhao@gmail.com`, `smartlearning@advaspire.com`), so the guess missed and only
        the LMS (which resolves `users.username→email`) worked. Fix mirrors the LMS: resolve the
        identifier to the real auth email via the **service-role admin client** (RLS-safe pre-login)
        against `users.username` (staff) + `students.username`/`students.student_id` (students),
        then fall back to the suffix guesses; full-email input still used as-is. Verified live
        (`myzhenhao` login confirmed working) + `tsc --noEmit` exit 0. **Note:** username-NULL
        accounts (e.g. super_admin `advaspire@gmail.com`) still log in by **email only** until an
        admin assigns a username (per decision #10).

## App-split architecture — DECIDED 2026-06-19
**Hub (`learn.`) = learning domain:** student learning portal (lessons, progress, assessments,
certificates) **+ lesson-content authoring stays here** (content team / super-admin). **LMS (`app.`) =
staff cockpit:** attendance, payments, programs, **slots/classes (merged — `course_slots`/`slot_students`,
capacity-enforced here)**, exams, **+ per-student learning supervision** (progress oversight, then
assessment unlock/mark + cert issuance). End state: **students→Hub, teachers/admins→LMS**, bridged by
SSO. Reached in 2 phases (don't big-bang): **Phase 1 = LMS read-only progress view + Hub deep-links
(Part E below)**; **Phase 2 = port the supervisory actions into the LMS**, then Hub becomes student-only.

## PART E — Unified teacher view in the LMS (Phase 1: read-only + deep-links)

- [x] **E1. DONE (2026-06-19).** Added `student_progress` resource → `db/schema.ts`
      (`PermissionResource`/`ALL_RESOURCES`) + `data/permissions.ts` (`ALL_RESOURCE_KEYS`,
      `RESOURCE_LABELS`, `NAV_ORDER`, VIEW_ONLY for group/company/assistant_admin + instructor;
      super_admin auto-full) + both team permission modals. Sidebar nav item gated by `can_view`.
- [x] **E2. DONE (2026-06-19).** `data/student-progress.ts` `getStudentsProgressInBranch()` reads
      `lesson_progress`/`assessment_attempts`/`certificates` (real migrated schema; batched, no N+1)
      for the caller's branch students via `getUserBranchIds`. Page `(dashboard)/student-progress/page.tsx`
      (Server Component, permission-gated) + client table `components/student-progress/student-progress-table.tsx`
      (shadcn Table/Card/Badge, search + paginate). Read-only. **`tsc --noEmit` exit 0.**
- [x] **E3. DONE (2026-06-19).** Per-row "Open" deep-link → `${NEXT_PUBLIC_LEARN_URL}/dashboard/assessment/student/<id>`
      (shared `students.id`). Set `NEXT_PUBLIC_LEARN_URL` in the LMS env (dev fallback `http://localhost:3001`).
      **Part E Phase 1 COMPLETE** — Phase 2 (port unlock/mark/certify actions into the LMS) deferred.

## Post-E — unified lesson catalog + LMS "Courses" + attendance simplification (2026-06-19)
Decided: **Hub = student + lesson authoring; LMS staff cockpit**. The Hub has **10 courses** in two
storage models — 3 robotics in DB tables (`ev3/advasbot/microbit_lessons`) + 7 static in Hub code
(`lib/lessons.ts`). Unified them into one **`public.lessons`** table (course_code, coordinate, title,
level, position; public-read) = **1028 lessons / 10 courses** (robotics seeded via SQL; static via
`software_development/scripts/seed-static-lessons.ts`). LMS changes:
- `courses.lesson_catalog` links a course → a Hub catalog (EV3→ev3, Python→python, Scratch→scratch);
  create-course form gains a **Lesson Catalog** picker.
- Attendance `getCurriculumLessonsForCourse` now reads `lessons` by `lesson_catalog` (legacy fallback).
- **Attendance dialog simplified** to just the lesson picker (dropped mission/activity/adcoin/photos/instructor).
- **"Program" → "Courses"** (display only); **curriculum builder removed** from the course form (lessons
  authored in the Hub now); pricing kept. Full `tsc --noEmit` exit 0.
- Follow-ups: Courses table "Lessons" count still reads legacy `course_lessons` (shows 0 for catalog
  courses); `curriculum-builder.tsx` now unused; Hub lesson-management should write to `lessons` (sync).

## Post-E2 — Examination feature REMOVED from LMS (2026-06-23)
Decided: the LMS examination feature is redundant now that **assessment + certification live in the Hub**,
so it was removed entirely (avoids confusing two parallel exam systems). It had been the LMS's level-up
engine, so progression is now **manual**.
- **Code (LMS, `tsc --noEmit` exit 0):** deleted `(dashboard)/examination/`, `components/examination/*`,
  `data/examinations.ts`, `api/{examination/table, import/examinations, certificate/generate}`; removed the
  `examinations` permission resource (schema `PermissionResource`/`ALL_RESOURCES`, `permissions.ts` defaults×4 +
  `ALL_RESOURCE_KEYS` + `RESOURCE_LABELS` + `NAV_ORDER`, `lib/navigation.ts`, both team permission modals,
  onboarding tour) and the `Examination*`/`ExaminationStatus` types. Stripped exam coupling from
  `attendance.ts` (Exam badge + `hasExam`/`examLevel`), `api/attendance/mark` (auto-create + Exam status-bump),
  `api/import/attendance` (level-up scan), `api/cron/notifications` (exam reminders), `import-page.tsx` (the
  examinations import type/section/validators).
- **Manual progression replacement:** level is edited per-enrollment in the student modal (already existed);
  added **`completeEnrollmentAction`** (status=completed + `redistributePoolOnInactive`) wired to a per-row
  "Complete" button in the student table (gated by `students.can_edit`). Auto-leveling on exam-pass is gone.
- **DB migration `drop_examinations_feature`:** backed up 187 rows →
  [`examinations-backup-2026-06-23.json`](examinations-backup-2026-06-23.json) first; then DROP TABLE
  `examinations` + DROP TYPE `examination_status` (+ legacy `certificate_number_seq`), and deleted 7 orphaned
  `role_permissions` rows (`resource='examinations'`). Verified safe pre-drop (0 inbound FKs, enum unused
  elsewhere) and confirmed gone after.

## PART F — Domains, Vercel, single-login verification ✅ COMPLETE (2026-06-23)

> **DONE:** `advaspire.io` bought; both subdomains live on Vercel with TLS; `NEXT_PUBLIC_COOKIE_DOMAIN=.advaspire.io`
> set + both projects redeployed; SSO verified end-to-end across all mapped staff roles
> (instructor via agent-browser, super_admin + company_admin/school-admin confirmed by owner).
> The cookie-domain code (D2) + F2 env are live in production. **Next: Part G (soak + retire old Hub Supabase).**

- [x] **F0. Bought `advaspire.io`** (the `.com` is used elsewhere — decided 2026-06-22).

- [x] **F1. Vercel domains + DNS — DONE.** Two projects; `app.advaspire.io` → LMS
      project, `learn.advaspire.io` → Hub project (Vercel → Project → Settings → Domains → Add).
      Then add the DNS records Vercel shows. Typical:
      - `CNAME  app    → cname.vercel-dns.com`
      - `CNAME  learn  → cname.vercel-dns.com`
      (use the exact target Vercel displays; if the apex is needed later, Vercel gives an A record).
      Wait for "Valid Configuration" + issued TLS cert on both.
      ⚠️ Both must be **true subdomains of `advaspire.io`** — `*.vercel.app` preview URLs can NOT
      share the cookie, so SSO only works once the custom domains are live.

- [x] **F2. Shared cookie-domain env set in BOTH Vercel projects + redeployed — DONE** (Production scope):
      `NEXT_PUBLIC_COOKIE_DOMAIN=.advaspire.io` (leading dot; **not** `COOKIE_DOMAIN` — the
      browser bundle needs the `NEXT_PUBLIC_` prefix, see D2). Also set `NEXT_PUBLIC_LEARN_URL=https://learn.advaspire.io`
      on the LMS project (Part E deep-links). **Redeploy both** so the new env is baked into the
      client bundles. Leave the env UNSET in dev/Preview so `localhost` login keeps working.

- [x] **F3. End-to-end SSO smoke test — VERIFIED across all mapped staff roles (2026-06-23).**
      Instructor verified via agent-browser: logged in on `https://app.advaspire.io` as `teacher-kepong`
      (→ landed `/attendance`), then opened `https://learn.advaspire.io/dashboard` in the **same** browser
      → loaded **fully authenticated as "Teacher Kepong"**, no second login, no redirect. Cookie check:
      `sb-kbzrdsxzzqzbxqgwpsuq-auth-token` has **`domain=.advaspire.io`**, `path=/`, `sameSite=Lax` — one
      shared cookie. Screenshot: `f3-sso-hub-authenticated.png`. **super_admin + company_admin/`school-admin`
      confirmed working by owner.** ✅ D2 cookie-sharing code + F2 env confirmed live in both prod deploys.
      Student SSO is via the Hub's Supabase auth — the LMS student portal's custom `student_token` is out
      of scope (see D2 caveat).
      - ✅ **Cookie hardening DONE (2026-06-23):** `getSupabaseCookieOptions()` (both apps) now returns
            `secure:true` whenever `NEXT_PUBLIC_COOKIE_DOMAIN` is set, so the prod `.advaspire.io` cookie is
            HTTPS-only; left off in dev so localhost works. Takes effect on next deploy (one re-login expected).

## PART G — Cutover & retire

- [x] **G0. Advisor hardening — DONE (2026-06-23).** Ran security+performance advisors on the
      unified project; applied migration `g_advisor_hardening` (draft kept in
      [`G-advisor-hardening.sql`](G-advisor-hardening.sql)). Cleared: `rls_policy_always_true` x3
      (dropped vestigial over-broad policies on `examinations` {public} USING(true) + `trials`
      {authenticated} — both are service-role-only, verified, so now deny-by-default), 21×
      `function_search_path_mutable` (pinned `search_path=public` on 20 SECURITY DEFINER + 1 trigger
      fn), 4× `auth_rls_initplan` (wrapped `auth.uid()`→`(select auth.uid())` on users/parents
      select/update). Re-run confirms 0 of each; no regressions. **Accepted/remaining (non-blocking):**
      52× `*_security_definer_function_executable` (required for RLS to call the helpers — not fixable
      without breaking RLS), leaked-password toggle, `program-covers` bucket listing, `pg_trgm` in
      public, and perf INFOs (unindexed FKs / unused indexes / 2 duplicate indexes / no-PK on
      `role_hierarchy` / 9 multiple-permissive on migrated Hub tables) — revisit after soak.
- [x] **G0b. Advisor cleanup pass 2 — DONE (2026-06-23)** via migration `advisor_cleanup`. Added covering
      indexes for all unindexed FK columns; dropped 5 redundant duplicate indexes; added a PK to `role_hierarchy`;
      merged the 9 multiple-permissive RLS policy pairs (staff+student) into single OR'd policies
      (semantics-preserved). **Result: performance advisor now has 0 WARNINGS** (was 11). Remaining perf findings
      are all INFO `unused_index` (count rose to ~120 only because the newly-added FK indexes read as "unused"
      until queries exercise them — benign; do NOT drop). Security WARNs are the irreducible set: 52×
      `*_security_definer_function_executable` (required for RLS to call the helper fns — not fixable without
      breaking auth), `extension_in_public`/pg_trgm (risky to move, left), plus 2 owner-actions below.
      **Owner dashboard actions (cannot be done via SQL/code):**
      - [ ] Enable **Leaked Password Protection** (Auth settings). ⚠️ may block accounts whose password ==
            student_id/username on next change.
      - [ ] **`program-covers`** bucket: disable public listing (Storage settings) if object enumeration is a concern.
- [ ] **G1.** Soak on the subdomains; monitor auth + RLS errors.
- [ ] **G2.** Decommission the old `advaspire-learning` Supabase project (after a
      retention window with backups kept).

---

## Risks & rollback
- **Auth/password migration** is the highest-risk step (C4). Mitigation: choose hash
  import (option b) for zero friction, or batch-reset with comms. Rollback = the old
  Hub Supabase is untouched until Part G, so D1 can be reverted by flipping env back.
- **RLS gaps** could leak cross-tenant data. Mitigation: build + test RLS on staging
  (B4) before any prod data lands; verify with a per-role smoke test.
- **FK rewrites** (school_id→branch_id, user-id remap) are error-prone. Mitigation:
  idempotent ETL, dry-run on staging, row-count + spot-check gates (C5).
- **Cookie domain** must be a registrable parent (`.advaspire.io`), and both apps must
  be true subdomains — not `*.vercel.app` previews (those can't share the cookie).

## Decisions log
| # | Question | Decision (2026-06-16) |
|---|---|---|
| 1 | Subdomains | `app.advaspire.io` = LMS, `learn.advaspire.io` = Hub (domain `.io` chosen 2026-06-22; `.com` was in use elsewhere) |
| 2 | User import / passwords | Dedup by **student ID**; skip if exists, else create with password=username |
| 4 | School ↔ branch | Hub school links to an **existing** LMS branch |
| 5 | Student overlap | **LMS `students` is master**; every Hub student must resolve to an LMS student |
| 6 | Repo layout | **Monorepo** (pnpm workspaces + Turborepo): `apps/lms`, `apps/learn`, `packages/db`, `packages/auth`; separate Vercel projects + ignored-build-step keep deploys independent (decided 2026-06-18) |
| 7 | Auth model | **Everyone on Supabase auth.** Bring LMS students into `auth.users` (today they use `password_hash` only) (2026-06-18) |
| 8 | Student auth email | Derived from **`student_id`** (username is null for 369/370): `<student_id>@student.advaspire.com`, **password = student_id**; `username` left NULL until admin sets it (2026-06-18) |
| 9 | Email domains | **Sub-domains by type**: students `@student.advaspire.com`, staff `@staff.advaspire.com`, parents keep their **real** email (2026-06-18) |
| 10 | Login | Accept **username OR email**. Missing username → leave NULL; admin inputs later (2026-06-18) |
| 11 | Unresolved Hub students (27) | **Create** as new LMS students with placeholder `student_id` `ADV002-XXXX` (allocate above existing `ADV002*`); admin re-IDs later. Hub staff (8) → LMS `users` with auth email `<username>@staff.advaspire.com` (2026-06-18) |
| 12 | AdcoinSystem project | **Dead — ignore** (`qpfklgguirkaesncwtfz`); not part of unification (2026-06-18) |
| 13 | Schools↔branches (D1) | **branch = school** but UUIDs differ → keep `school_branch_map`. Kepong→002, Semenyih→001 by name; **Global Ark has no LMS branch → CREATE one** (`type='school'`, code `GAIS`); the 27 unresolved students land there (2026-06-18) |
| 14 | Class↔slot (D2) | **Merge Hub `class` into the LMS `slot` = "class slot".** Add `course_slots.kind` ('schedule'\|'class') + `name`, schedule cols nullable for class-kind (kind-aware CHECK); NEW `slot_students` roster (students only). Hub `classes`→class-kind slots, `class_members`→`slot_students`. Optional nullable `course_slots.teacher_in_charge`→`users` (2026-06-18) |
| 15 | RLS on 18 exposed tables | **Enable RLS** — verified safe (all access via service-role `supabaseAdmin`; anon client only does auth). See [`B4-rls-enable.sql`](B4-rls-enable.sql); apply on a branch first (2026-06-18) |
| 16 | Hub super-admin | **Link to the existing LMS `super_admin`** (no 2nd god account); other 7 staff created. `config.LINK_HUB_SUPERADMIN` (2026-06-18) |
| 17 | Placeholder student ids | **Derive per branch**: numeric code→`ADV<code>-####`, else `<code>-####` (Kepong `ADV002-`, Semenyih `ADV001-`, Global Ark `GAIS-`); admin re-IDs later (2026-06-18) |

**B3 dry-run validated (2026-06-18).** `node scripts/etl/migrate.mjs` (read-only) reproduced the
A3 numbers exactly: **102 linked · 27 created · 8 staff** (now 1 linked super-admin + 7 created),
all migrate-table counts match (certificates 182, lesson_progress 21, classes 12, members 31…),
every owner ref resolves (linked now / created on `--commit`). Remaining dry-run anomalies are
all the **pre-A6 Global Ark** artifact (GAIS branch not yet created) and clear once A6 is applied
at C2. Report: `scripts/etl/etl-report.json`.

## Repo layout — DECIDED: monorepo (2026-06-18)
**Monorepo** (pnpm workspaces + Turborepo). Subdomains do NOT force two repos (a Vercel
project deploys from a monorepo subdir via the Root Directory setting). The shared
Supabase contract (user/role/auth model + DB types) is the crux, so one place to change
it wins; separate Vercel projects + "ignored build step" keep `app.` and `learn.`
deploys independent.

| | Monorepo (`apps/lms`,`apps/learn`,`packages/*`) | Two repos (current) |
|---|---|---|
| Shared user/role/auth model + DB types | ✅ Change once, both consume | ❌ Duplicate (drift) or publish a private package + version-bump both |
| Cross-app change vs shared DB | ✅ Atomic, one PR | ❌ Spans repos, can deploy out of order |
| Independent deploys / subdomains | ✅ Separate Vercel projects + ignored-build-step | ✅ Natural |
| Per-app access control / clean history | ❌ Repo-wide; Hub lesson-churn next to LMS | ✅ Isolated |
| Disruption now | ❌ Needs Turborepo/workspace setup | ✅ Zero |

**Recommendation:** **monorepo** (pnpm workspaces + Turborepo) — both apps read one
shared Supabase, so the shared contract is the crux; one place to change it. Keep
separate Vercel projects/subdomains + "ignored build step" so deploys stay independent.
*Middle path:* stay two-repo but extract a shared `@advaspire/db` types package early.

### Remaining smaller questions
- ~~Confirm the exact student-ID columns on both sides~~ → **RESOLVED (A3, 2026-06-18):** Hub `users.verification_id` (text) ↔ LMS `students.student_id` (text). See findings below.
- Handling for Hub students with **no** LMS match — confirm "report & investigate" (not auto-create). **27 such cases found** (see below) — needs a decision.

---

## A3 Inventory findings (2026-06-18) — GROUND TRUTH

Live read-only inventory of both projects in org `advaspire` (`dlvmwdtgjkhtnkdzjzrl`).

**Project IDs**
- LMS (canonical): `advaspire-system` = `kbzrdsxzzqzbxqgwpsuq` (ap-southeast-1, ACTIVE).
- Hub (migrates in): `advaspire-learning` = `sfxltburkhrgsojyvboj` (ap-northeast-1, ACTIVE).
- ⚠️ A third project `AdcoinSystem` = `qpfklgguirkaesncwtfz` is **INACTIVE/paused** — not in the plan; confirm whether dead or relevant before cutover.

**Row counts (key tables).** LMS: branches 3, users 293, parents 283, students 370, enrollments 736, attendance 8 706, payments 1 752, adcoin_transactions 2 813, audit_log 23 430, examinations 176, role_permissions 133, shared_session_pools 157. Hub: schools 3, users 137, lesson_progress 21, assessments 15, assessment_attempts 19, certificates 182, ev3_lessons 153, classes 12, class_members 31.

**🔴 SECURITY (LMS):** Supabase advisor flags **18 `public` tables with RLS DISABLED** — incl. `role_permissions`, `vouchers`, `session_transfers`, `custom_roles`, `user_permissions`, `pool_students`, `events`. Anyone with the anon key can read/write them. Fold remediation into **B4**; do NOT enable RLS without policies (locks out the app).

**Identity model mismatch (the big one).** The plan §3 "one canonical `public.users`" is only half right:
- **LMS splits identity across 3 tables:** staff `users` (has `auth_id` → `auth.users`, `role` = plain text) + parents (also in `users`, role `parent`, 283 rows) ; `students` (own table, `username` + **`password_hash`** = custom auth, NOT Supabase auth, keyed by `student_id`) ; `parents`.
- **Hub keeps everyone in one `users` table** (role = enum, 1:1 with `auth.users`).
- Consequence: Hub **staff** → LMS `users`; Hub **students** → LMS `students` (not `users`). And Hub students live in `auth.users` while **LMS students do not** → SSO for students needs an explicit decision (bring LMS students into `auth.users`, or unify on `password_hash`). Blocks/reshapes Part D & F for the student persona.

**auth.users counts:** LMS 289 (= 6 staff + 283 parents; students absent) · Hub 137 (= all users incl. 129 students).

**Hub role breakdown:** super-admin 1, school-admin 4, school-teacher 3, school-student 129.

**Student dedup (verification_id → student_id), C4 sizing — by set comparison:**
- 129 Hub students; 103 have a `verification_id`; **102 match** an existing LMS `student_id` (skip/link); **1 no-match** (`ADV002-S008`, malformed); **26 have no verification_id**.
- → **27/129 (~21%) do not cleanly resolve** = anomalies to report & investigate (NOT auto-create). All 370 LMS students have a `student_id` (full master-side coverage).
- ⚠️ **Staff have no `student_id`** — the dedup-by-student-ID strategy covers only the 129 students. The **8 Hub staff** need a separate match key (email/username) — open for B3.
- *(Numbers derived by in-memory set comparison; reproduce via the B3 ETL dry-run before trusting for execution.)*

**Still TODO to finish A3:** full FK graph, enum definitions (Hub role enum + LMS `BranchType`/status enums), RLS policy dump, storage buckets, complete column inventory of the additive Hub tables (progress/assessment/cert/lessons).

---

## Auth & identity strategy — DECIDED 2026-06-18

**Goal:** one Supabase auth for *all* personas (staff, parents, students — both apps), enabling the shared `.advaspire.io` cookie SSO.

**1. Onboard the 370 existing LMS students into `auth.users` (NEW migration sub-step, LMS-side).**
- They have `password_hash` today and are NOT in `auth.users`. 369/370 have no username and none have an email.
- For each active student: create an `auth.users` row with email `<lower(student_id)>@student.advaspire.com`, password = `student_id` (reset value; student/admin changes later). Leave `students.username` NULL.
- Link back: store the new `auth_id` on the student row (needs a `students.auth_id` column — add in DDL if absent).
- `password_hash` is retained read-only during transition, then retired.

**2. Hub users → LMS.**
- **Hub students (129):** match `verification_id` → LMS `students.student_id`. 102 match → **link** to the existing LMS student (no new row, no new auth). 27 unresolved (26 no `verification_id` + 1 malformed `ADV002-S008`) → **create** new LMS students with placeholder `student_id = ADV002-XXXX` (allocate above the 10 existing `ADV002*`), then onboard to auth per step 1.
- **Hub staff (8):** create LMS `users` rows; auth email `<username>@staff.advaspire.com`, password = username. Hub usernames are unique (verified).

**3. Parents (283):** already in `auth.users` with real emails — unchanged.

**4. Login UX:** accept **username OR email**. Resolve username→email server-side, then Supabase password auth. Null-username accounts simply log in by email until an admin assigns a username.

**Placeholder students (the 27).** Confirmed (2026-06-18): no duplicate concern. Each gets `student_id = ADV002-XXXXX` (allocate above the **10 existing `ADV002*`** ids), auth email `<lower(student_id)>@student.advaspire.com`, **temporary `username` = the same id** (super-admin renames later), password = student_id.

**Open sub-items:**
- ✅ `students.auth_id` column — **confirmed ABSENT** in A3; **add in A6 DDL** (uuid → `auth.users.id`).
- Username uniqueness rule once admins start assigning them (per-tenant or global?).

---

## A3 inventory — COMPLETE (2026-06-18): enums, FKs, RLS, storage

**Enums**
- LMS (3): `examination_status`, `trial_source`, `trial_status`. ⚠️ **No role enum and no `BranchType` enum** — `users.role` and `branches.type` are **plain `text`**. So "add `BranchType 'school'`" is **not** an enum ALTER; it's just a new allowed text value (e.g. `branches.type = 'school'`). Adjust A6 accordingly.
- Hub (3): `assessment_status` (unlocked, in_progress, submitted, marked), `progress_status` (not_done, pending, approved), `user_role` (super-admin, school-admin, school-teacher, school-student).

**🔑 Structural finding — the user_id FK split (biggest A6/B3 driver).**
In the Hub, **students are rows in `users`**, so every progress/assessment/cert table FKs its owner to `users(id)`. The LMS keeps students in `students` (NOT `users`). Therefore each migrated Hub table must have its **owner column re-pointed to `students.id`**, while **staff/approver columns stay → `users.id`**:
| Hub table | owner col → `students.id` | staff cols stay → `users.id` |
|---|---|---|
| `lesson_progress` | `user_id` | `learnt/challenge/homework/mission1-3_approved_by` |
| `assessment_attempts` | `user_id` | `unlocked_by`, `marked_by` |
| `certificates` | `user_id` | `issued_by` |
| `lesson_quiz_attempts`, `lesson_ratings`, `lesson_remarks`, `lesson_uploads` | `user_id` | `updated_by` |
| `class_members` | `user_id` (students) | — (but classes/teachers via `users`) |
All also carry `school_id → schools(id)` → rewrite to `branch_id → branches(id)` via the school→branch map. ETL must resolve each Hub `user_id`: if that Hub user is a **school-student**, map to the linked/created `students.id`; if **staff**, map to the migrated `users.id`.

**RLS posture**
- LMS: 28 tables carry policies (mostly full CRUD sets); **18 tables have RLS *disabled*** (advisor — incl. `role_permissions`, `vouchers`, `session_transfers`, `custom_roles`, `events`, `pool_students`). App runs via **service-role (`supabaseAdmin`)** which bypasses RLS, so the disabled tables are a real anon-key exposure, not an app dependency. **Fix in B4.**
- Hub: 16 tables carry policies — **SELECT-heavy / public-read** (lesson pages render publicly); `lesson_progress` & `assessment_attempts` also allow INSERT/UPDATE. B4 must re-derive these under the unified `branch_id` tenancy + LMS permission matrix.

**Storage buckets (must recreate in LMS project + copy objects in ETL)**
- LMS (2): `program-covers` (public), `project-photos` (public).
- Hub (3) → migrate in: `assessment-uploads` (**private**), `lesson-resources` (public), `student-uploads` (public). Referenced by `lesson_resources.image_path/pdf_path`, `lesson_uploads.image_path`, `assessment_attempts.answer_files` — copy objects + keep paths (or rewrite) during ETL.

✅ **A3 done.** Ground truth captured: tables, row counts, columns, enums, full FK graph, RLS posture, storage. **Next: A4 (backups)** before any change; A6 DDL can be drafted in parallel (review-only).

## Related
See [[project-overview]], [[roles-and-permissions]] (the matrix `instructor` extends),
and the Hub's `memory_and_skills/Dashboard_Memory.md` (its schools/users/role model).
