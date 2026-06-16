# Unification Plan — One Identity, Two Apps, One Supabase

> **Status:** PLAN ONLY — decision record + step-by-step flow. **Nothing is amended
> until Part C.** Parts A–B are non-destructive (inventory, backups, design).
> **Last updated:** 2026-06-16.

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
- **Serve both apps on subdomains of one root domain** (e.g. `app.advaspire.com` +
  `learn.advaspire.com`) so the Supabase **auth cookie is shared at `.advaspire.com`**
  → true single sign-on, no redirect handshake.
- The **unified teacher dashboard lives in the LMS app**, reading progress from the
  shared DB.

**Confirmed inputs (2026-06-16):**
- One parent domain + subdomains: **`app.advaspire.com` = LMS**, **`learn.advaspire.com` = Learning Hub**.
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
                          one root domain: advaspire.com
                  ┌──────────────────────────┴──────────────────────────┐
        app.advaspire.com (Vercel proj A)              learn.advaspire.com (Vercel proj B)
            advaspire-system  (LMS)                       advaslearning-hub  (content + progress)
            attendance · payments · exams                 9 courses · lessons · progress · assessment
                  │                                                   │
                  └───────────────┬───────────────────────────────────┘
                       shared @supabase/ssr client
                       cookie domain = ".advaspire.com"   ← single login
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
- [ ] **A2. Pick the password strategy** — (a) recreate+reset or (b) hash import (§3).
- [ ] **A3. Inventory both databases.** For each: list tables, row counts, FKs, enums,
      RLS policies, storage buckets, and `auth.users` count. Capture exact column
      names (this plan's mapping is the design; the inventory is the ground truth).
- [ ] **A4. Full backups.** `pg_dump` (or Supabase dashboard backup) of **both**
      projects, plus an export of both `auth.users`. Store off-platform.
- [ ] **A5. Freeze schema-changing work** on the Hub for the migration window
      (lesson authoring can continue — it's static files).
- [ ] **A6. Write the canonical schema diff** — the exact DDL to add to the LMS DB
      (new `BranchType 'school'`, progress/assessment/cert tables, RLS). Review only.

> ✅ End of Part A: full understanding + backups + a reviewed schema design. Still
> zero changes to either live system.

## PART B — Shared foundation (build alongside, still non-destructive)

- [ ] **B1. (Recommended) Monorepo.** Create a pnpm workspace / Turborepo:
      `apps/lms`, `apps/learn`, `packages/db` (Supabase client + generated types),
      `packages/auth` (session helpers, role guards). *Minimum viable alt:* keep two
      repos, share a types package. Either way both apps end up pointing at one Supabase.
- [ ] **B2. Staging DB.** Use **Supabase branching** on the LMS project (or a throwaway
      clone) to apply the Part-A DDL and rehearse the migration without touching prod.
- [ ] **B3. ETL scripts.** Write idempotent migration scripts:
      - Build the **school→branch map** (Hub school ↔ existing LMS branch).
      - **Users:** dedup by **student ID** (match → skip/link; no match → create with
        username + password=username). Emit a `skipped / created / unmatched` report.
      - Progress/assessment/cert tables with FK rewrites (`school_id→branch_id`,
        old→new user ids).
      Dry-run against the staging DB until row counts + spot checks pass.
- [ ] **B4. Rebuild RLS** for the combined surface on staging: tenant isolation by
      `branch_id`, role-gated reads (instructor sees own branch's progress + attendance
      + payments per the LMS permission matrix).

## PART C — Migration execution (FIRST destructive step; on a maintenance window)

- [ ] **C1. Re-backup** both projects immediately before.
- [ ] **C2. Apply the canonical DDL** to the **LMS** Supabase (the new tables + enum).
- [ ] **C3. Run the ETL** (Part B scripts) to pull Hub data into the LMS DB.
- [ ] **C4. Migrate Hub users** into LMS auth via the dedup-by-student-ID strategy
      (skip existing; create-with-password=username for new). Keep the run report.
- [ ] **C5. Verify**: row counts match, FK integrity, a sample teacher + student +
      their progress resolve correctly under RLS.

## PART D — Point the Learning Hub at the LMS Supabase

- [ ] **D1.** Update Hub `.env.local` / Vercel env → **LMS** Supabase URL + keys.
- [ ] **D2.** Set the Hub's `@supabase/ssr` client **cookie domain = `.advaspire.com`**
      (and do the same in the LMS client) so the session cookie is shared.
- [ ] **D3.** Update Hub queries to the unified schema (`branch_id` not `school_id`,
      canonical `users`). Test login + progress on staging/subdomain.

## PART E — Unified teacher view in the LMS

- [ ] **E1.** Add a **Student Progress** resource to the LMS permission matrix
      (`src/data/permissions.ts`) and grant `instructor` (+ admins) read access.
- [ ] **E2.** Build the teacher dashboard section in the LMS app that reads the
      migrated progress/assessment/cert tables for students in the teacher's branch.
- [ ] **E3.** Cross-link to `learn.advaspire.com` lesson pages where useful.

## PART F — Domains, Vercel, single-login verification

- [ ] **F1.** Vercel: keep **two projects**; assign `app.advaspire.com` (LMS) and
      `learn.advaspire.com` (Hub). Configure DNS (CNAME → Vercel).
- [ ] **F2.** Set the shared `COOKIE_DOMAIN=.advaspire.com` env in both Vercel projects.
- [ ] **F3.** End-to-end: log in on `app.`, open `learn.` in the same browser → already
      authenticated. Test for all four mapped roles.

## PART G — Cutover & retire

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
- **Cookie domain** must be a registrable parent (`.advaspire.com`), and both apps must
  be true subdomains — not `*.vercel.app` previews (those can't share the cookie).

## Decisions log
| # | Question | Decision (2026-06-16) |
|---|---|---|
| 1 | Subdomains | `app.advaspire.com` = LMS, `learn.advaspire.com` = Hub |
| 2 | User import / passwords | Dedup by **student ID**; skip if exists, else create with password=username |
| 4 | School ↔ branch | Hub school links to an **existing** LMS branch |
| 5 | Student overlap | **LMS `students` is master**; every Hub student must resolve to an LMS student |

## Still OPEN — decide with the team
**Repo layout: monorepo vs two repos.** Subdomains do NOT force two repos (a Vercel
project deploys from a monorepo subdir via the Root Directory setting).

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
- Confirm the exact student-ID columns on both sides (Hub `users.verification_id` ↔ LMS student id) during Part A inventory.
- Handling for Hub students with **no** LMS match — confirm "report & investigate" (not auto-create).

## Related
See [[project-overview]], [[roles-and-permissions]] (the matrix `instructor` extends),
and the Hub's `memory_and_skills/Dashboard_Memory.md` (its schools/users/role model).
