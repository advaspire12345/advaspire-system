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

**Confirmed inputs (2026-06-16):** one parent domain + subdomains; both projects are
in development **but contain real data** (migrate carefully, no throwaway); teacher
home = LMS app; hosting = Vercel.

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
| `schools` row | a `branches` row, new `BranchType = 'school'` | teacher/student attach to a branch as everything else does; progress data becomes branch-scoped |
| `school_id` FK | `branch_id` | rewrite during ETL |

### Identity
- LMS uses **real emails**; Hub uses **synthetic `username@advaspire-learning.com`**.
  The two namespaces don't collide → Hub users migrate in **keeping their existing
  email** (login identity unchanged).
- Passwords can't be exported as plaintext. Two options (pick in Part A):
  - **(a) Recreate + reset** (simplest for small dev userbase): create each Hub user
    in the LMS auth via Admin API; set a temporary password (Hub convention =
    username) and require reset on first login.
  - **(b) Hash import**: insert `auth.users` rows carrying the existing
    `encrypted_password` (bcrypt) so current passwords keep working. More work, zero
    user friction.

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
- [ ] **B3. ETL scripts.** Write idempotent migration scripts: copy Hub `schools →
      branches`, `users → users` (role+email+branch mapping), then progress/assessment/
      cert tables with FK rewrites (`school_id→branch_id`, old→new user ids). Dry-run
      against the staging DB until row counts + spot checks pass.
- [ ] **B4. Rebuild RLS** for the combined surface on staging: tenant isolation by
      `branch_id`, role-gated reads (instructor sees own branch's progress + attendance
      + payments per the LMS permission matrix).

## PART C — Migration execution (FIRST destructive step; on a maintenance window)

- [ ] **C1. Re-backup** both projects immediately before.
- [ ] **C2. Apply the canonical DDL** to the **LMS** Supabase (the new tables + enum).
- [ ] **C3. Run the ETL** (Part B scripts) to pull Hub data into the LMS DB.
- [ ] **C4. Migrate Hub `auth.users`** into LMS auth via the chosen password strategy.
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

## Open questions to settle before Part C
1. Exact subdomains (`app.` vs `lms.`? `learn.` vs `hub.`?).
2. Password strategy (a) recreate+reset or (b) hash import.
3. Monorepo now (B1) or keep two repos + shared types?
4. Does a Hub "school" ever map to an existing LMS branch, or always a new branch?
5. Are Hub students the same people as LMS students (dedupe needed), or disjoint?

## Related
See [[project-overview]], [[roles-and-permissions]] (the matrix `instructor` extends),
and the Hub's `memory_and_skills/Dashboard_Memory.md` (its schools/users/role model).
