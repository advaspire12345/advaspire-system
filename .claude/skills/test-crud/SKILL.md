---
name: test-crud
description: Automated CRUD permission tester for the LMS. Logs in as each role via agent-browser, walks every entity (students, programs, slots, vouchers, team, examinations, branches, attendance, payments, transactions, leaderboard, trial), runs Create / Read / Update / Delete, and produces a permission matrix report comparing actual UI behavior to expected permissions from src/data/permissions.ts. Use when the user asks to "test CRUD", "test all roles", "test permissions", "simulate roles", or verify role-based access after a permissions or actions change.
allowed-tools: Bash(npx agent-browser:*), Bash(curl:*), Bash(mkdir:*), Read, Write, Edit, Grep, Glob
---

# test-crud — automated role × entity CRUD tester

Drives a real Chrome via `agent-browser` to log in as each role and run Create / Read / Update / Delete against every entity in the LMS dashboard. Compares observed UI behavior against the expected permissions from `src/data/permissions.ts` and reports any mismatches as **permission bugs**, **regressions**, or **scope leaks**.

This skill executes the tests itself. It does **not** ask the user to click anything.

## Usage

- `/test-crud` — full matrix: all roles × all entities
- `/test-crud <role>` — one role × all entities
- `/test-crud <role> <entity>` — one role × one entity
- `/test-crud --resume` — continue from last saved checkpoint in `OUTPUT_DIR/state.json`

Output dir: `./test-crud-output/{run-timestamp}/` with `report.md`, `screenshots/`, `state.json`.

## Prerequisites (verify before running)

```bash
# 1. Dev server reachable
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login   # expect 200

# 2. Auth vault populated for every role you intend to test
npx -y agent-browser auth list                                       # expect lms-* profiles
```

If any vault profile is missing, stop and ask the user for the credentials. Do not invent or guess them.

### Vault profile names (fixed)

| Role | Vault profile | Skip if missing |
|------|---------------|-----------------|
| super_admin | `lms-super_admin` | abort run |
| group_admin | `lms-group_admin` | warn |
| company_admin | `lms-company_admin` | warn |
| assistant_admin | `lms-assistant_admin` | warn |
| instructor | `lms-instructor` | warn |
| parent | `lms-parent` | warn (often absent) |
| student | `lms-student` | warn (often absent) |

## Expected permission matrix

Sourced from `src/data/permissions.ts`. Hardcode here so the skill is self-contained; re-derive if that file changes.

Resource keys map to URLs as follows (from `NAV_ORDER` in `permissions.ts`):

| Resource | URL | Sidebar label |
|----------|-----|---------------|
| dashboard | `/dashboard` | Dashboard |
| companies | `/branches` (Companies tab/section) | Companies |
| branches | `/branches` | Branches |
| trials | `/trial` | Trial |
| students | `/student` | Student |
| examinations | `/examination` | Examination |
| programs | `/program` | Program |
| slots | `/slot` | Slot |
| vouchers | `/voucher` | Voucher |
| team | `/team` | Team |
| attendance | `/attendance` | Mark Attendance |
| attendance_log | `/attendance-log` | Attendance History |
| payment_record | `/payment-record` | Payment Record |
| pending_payments | `/pending-payments` | Pending Payments |
| leaderboard | `/leaderboard` | Leaderboard |
| transactions | `/transactions` | Transactions |
| marketplace | `/marketplace` | Marketplace |
| import | `/import` | Import |

Permission cells use the four-letter code `VCED` for `view / create / edit / delete` (1 = allowed, 0 = blocked).

| Resource | super_admin | group_admin | company_admin | assistant_admin | instructor |
|----------|:-----------:|:-----------:|:-------------:|:---------------:|:----------:|
| dashboard | 1111 | 1000 | 1000 | 0000 | 0000 |
| companies | 1111 | 1110 | 1000 | 0000 | 0000 |
| branches | 1111 | 1111 | 1000 | 0000 | 0000 |
| trials | 1111 | 1111 | 1111 | 1110 | 1010 |
| students | 1111 | 1111 | 1111 | 1110 | 1000 |
| examinations | 1111 | 1111 | 1111 | 1110 | 1110 |
| programs | 1111 | 1111 | 1000 | 1000 | 1000 |
| slots | 1111 | 1000 | 1111 | 1110 | 1000 |
| vouchers | 1111 | 1111 | 1111 | 0000 | 0000 |
| team | 1111 | 1111 | 1111 | 0000 | 0000 |
| attendance | 1111 | 0000 | 1111 | 1110 | 1110 |
| attendance_log | 1111 | 1111 | 1111 | 1010 | 1000 |
| payment_record | 1111 | 1000 | 1111 | 0000 | 0000 |
| pending_payments | 1111 | 1111 | 1111 | 1110 | 0000 |
| leaderboard | 1111 | 1100 | 1100 | 1100 | 1100 |
| transactions | 1111 | 0000 | 1100 | 1100 | 1100 |
| marketplace | 1111 | 1000 | 1100 | 0000 | 0000 |
| import | 1111 | 1100 | 0000 | 0000 | 0000 |

Notes:
- **super_admin**: god-tier, hardcoded FULL_ACCESS bypass — bypasses DB role_permissions entirely. The "1111" row is what the UI should expose; sidebar shows everything; per-company tabs render on the leaderboard.
- **group_admin**: oversight role. CRUD on companies/branches/team/programs/students/etc. but `companies.can_delete=false` (the only resource exception). NO access to mark-attendance, pending-payments → wait actually pending_payments=1111 (Q2 override — group_admin gets approve button). NO access to transactions. Slots view-only. Adjustment button visible (alongside transfer) on leaderboard.
- **company_admin**: operational role. CRUD on most things scoped to own branch. Approve button visible on pending payments. Local/Global tabs on leaderboard.
- **assistant_admin**: dashboard/branches/payment_record/vouchers/team = NO_ACCESS. CRUD-without-delete on trials/students/examinations/attendance. Pending payments has CRUD but **NO approve button** (UI conditional, not a permission).
- **instructor**: dashboard/branches NO_ACCESS — login redirects to `/attendance`. trials view+edit only (no create). students view-only. examinations VIEW_CREATE_EDIT.
- The matrix can also be DB-overridden per company. If a discrepancy looks like a deliberate company override, note it but don't flag as a bug.

### Sub-feature gates (not in the VCED matrix)

| Feature | super_admin | group_admin | company_admin | assistant_admin | instructor |
|---------|:-:|:-:|:-:|:-:|:-:|
| Pending payment approve button | ✅ | ✅ | ✅ | — | — |
| Leaderboard adcoin adjustment button | ✅ | ✅ | — | — | — |
| Leaderboard per-company tabs | ✅ | — | — | — | — |
| Leaderboard local/global tabs | — | — | ✅ | ✅ | ✅ |
| Marketplace top-up CARD view | — | — | ✅ | — | — |
| Marketplace request TABLE view | ✅ | ✅ (own company) | — | — | — |
| Marketplace approve/reject buttons | ✅ | — | — | — | — |

### Scope expectations

| Role | Expected scope |
|------|---------------|
| super_admin | All branches, all companies |
| group_admin | Own company only (all branches under it) |
| company_admin | Own branch only |
| assistant_admin | Own branch only |
| instructor | Own branch only |
| parent | Own children only |
| student | Own data only |

If a row from another scope is visible in the list view, that's a **scope leak**.

## Run loop

For each role in the requested set:

1. Open a fresh named session: `agent-browser --session crud-{role} open http://localhost:3000/login`
2. `agent-browser --session crud-{role} auth login lms-{role}`
3. `agent-browser --session crud-{role} wait --load networkidle` — **do not** use `wait --url "**/dashboard"`; the glob form hangs to timeout in this app.
4. `agent-browser --session crud-{role} get url` — verify it's on `/dashboard` (or `/parent` / `/student-portal`)
5. Take a landing screenshot to `screenshots/{role}-landing.png`
5. For each entity in the entity list:
   - Run the [Per-entity CRUD workflow](#per-entity-crud-workflow)
   - Record results into the in-memory results map
6. Click the avatar dropdown → Log out (or `agent-browser --session crud-{role} close`)
7. Persist `state.json` checkpoint after every entity so a crashed run can resume.

After all roles done, write `report.md` and print the summary table to chat.

## Per-entity CRUD workflow

Inputs: `role`, `entity`, expected `VCED` from the matrix above.

```
session=crud-{role}
url=<entity URL from table>
```

### Step 1 — READ

```bash
agent-browser --session $session open http://localhost:3000$url
agent-browser --session $session wait --load networkidle
agent-browser --session $session snapshot -i > /tmp/test-crud/$role-$entity-list.snapshot
agent-browser --session $session screenshot screenshots/$role-$entity-list.png
```

Verdicts:
- Page loads (HTTP 200, no error component) → READ ✅
- Page redirects to `/dashboard` or shows "Forbidden" / "Not authorized" / 404 → READ blocked
- Page loads with empty-state copy (e.g. "No records") → READ ✅ but flag if scope expected to have data

If expected `view = 0` and READ ✅ → **permission bug**.
If expected `view = 1` and READ blocked → **regression**.

### Step 2 — CREATE

Find the Add button. Look in the snapshot for buttons like:
- `Add {Entity}` (e.g. "Add Student", "Add Program")
- `Add` (plain, common on `/branches` and `/slot`)
- `+ New`

```bash
# Try by role+name first (most reliable)
agent-browser --session $session find role button click --name "Add Student"
# Fallback to text search if role/name fails
agent-browser --session $session find text "Add Student" click --exact
```

Verdicts:
- Button absent from snapshot → CREATE blocked at UI gate
- Button present, modal opens → fill form (see [Entity fixtures](#entity-fixtures)), submit
- Submit succeeds, new row visible → CREATE ✅
- Submit returns "Forbidden" / red toast → CREATE blocked at action gate

If expected `create = 0` and CREATE ✅ → **permission bug** (record screenshot of new row).
If expected `create = 1` and CREATE blocked → **regression**.

### Step 3 — UPDATE

Re-snapshot after create. Find the Edit icon on the row we just created (or the first row if create was blocked but edit may still apply to existing rows).

```bash
agent-browser --session $session snapshot -i
# Edit buttons are typically icon buttons; scope to the row by text first
agent-browser --session $session find role button click --name "Edit"
# OR: find the row by the test record's name, then click the pencil icon
```

In the modal, change one field (e.g. append " EDITED" to the name) and save.

Verdicts: same shape as CREATE.

### Step 4 — DELETE

Re-snapshot. Click the Delete (trash) icon for our test row. Confirm in the dialog.

```bash
agent-browser --session $session find role button click --name "Delete"
agent-browser --session $session wait --text "Are you sure"
agent-browser --session $session find role button click --name "Confirm"   # or "Delete", "Yes"
agent-browser --session $session wait --load networkidle
```

Verdicts: same shape as CREATE. After delete, re-snapshot and confirm the test row is gone (READ verifies the delete actually happened, not just the toast).

### Step 5 — Cleanup

If CREATE succeeded but DELETE was blocked or failed, the test data persists. Add a `cleanup` entry to `state.json` so the next run (as super_admin) can remove it. Never leave test data lying around in production-shaped data.

## Entity fixtures

Minimum required fields for a CREATE in each entity. Field labels are what shows up in the modal — match by `find label "..."` or by ref from a fresh snapshot.

| Entity | Required fields | Test value |
|--------|----------------|------------|
| branches | Type, Code, Name, Address, Email, Phone | type=Branch, code=`TST{ts}`, name=`Test Branch {ts}`, addr=`123 Test St`, email=`branch{ts}@test.local`, phone=`0100000000` |
| students | Name, Email, Phone, DOB, Gender, School, Branch, Course, Package, Parent | name=`Test Student {ts}`, email=`s{ts}@test.local`, phone=`0100000000`, DOB=`2015-01-01`, gender=Male, school=`Test School`, branch=first option, course=first option, package=first, parent=first |
| programs | Name, Category, Branch, Instructor, Pricing fields | name=`Test Program {ts}`, category=first, branch=first, instructor=first, monthly price=`100`, levels=`1`, sessions=`4` |
| slots | Course, Branch, Day, Time, Duration, Limit | course=first, branch=first, day=Monday, time=`10:00`, duration=`60`, limit=`10` |
| voucher | Code (auto), Discount type, Discount value, Expiry type, Expiry | type=Percentage, value=`10`, expiry=Monthly, months=`1` |
| team | Name, Email, Role, Branch | name=`Test Team {ts}`, email=`t{ts}@test.local`, role=`instructor` (super_admin can pick any; company_admin only assistant/instructor), branch=first |
| examination | Student, Course, Level, Examiner, Branch, Date, Status | student=first, course=first, level=`1`, examiner=first, branch=first, date=tomorrow, status=Pending |
| attendance | Enrollment, Status, Instructor | enrollment=first, status=Present, instructor=first |
| attendance_log | (mostly view/edit, may not have create) | n/a — skip CREATE, only test READ/UPDATE if `e=1` |
| payment_record | (view/edit, no create) | skip CREATE, test READ/UPDATE if `e=1` |
| pending_payments | Student, Course, Package, Amount, Voucher | student=first, course=first, package=first, amount=`100`, voucher=none |
| trial | Parent name, Phone, Email, Child name, Child age, Branch, Course, Source, Date, Status | name=`Test Parent {ts}`, phone=`0100000000`, email=`tp{ts}@test.local`, child=`Test Child`, age=`8`, branch=first, course=first, source=walk_in, date=tomorrow, status=Pending |
| transactions | (Transfer Adcoin / Adcoin Adjustment buttons) | sender=self, receiver=first student, amount=`1`, note=`crud test` |
| leaderboard | (no create — READ only; Transfer button counts as create-like) | skip CREATE unless transfer button present |
| import | (no row CRUD — has Download Templates + Upload CSV) | skip; just verify page access matches `view` |

`{ts}` = millisecond timestamp at run time so test rows are unique and easy to find.

## Verdict logic

For each cell `(role, entity, op)`:

```
expected = matrix[role][entity][op]   # 0 or 1
observed = ran the op, succeeded?     # ✅, ❌blocked, or ⚠ error

if expected == 1 and observed == ❌blocked:  REGRESSION
if expected == 0 and observed == ✅:         PERMISSION BUG
if expected == 1 and observed == ✅:         OK
if expected == 0 and observed == ❌blocked:  OK
if observed == ⚠ error:                      INVESTIGATE  (selector failed, modal didn't open, etc. — not necessarily a permission issue)
```

Scope check (run on the READ snapshot):
- Count rows visible.
- For `company_admin` / `assistant_admin` / `instructor`: extract the Branch column values; if more than one distinct branch appears, flag **scope leak**.
- For `group_admin`: skip (multiple branches expected, all under same company — verifying this fully needs DB knowledge).

## Output: report.md

```markdown
# CRUD Test Report — {timestamp}

Run scope: {roles tested} × {entities tested}
Dev server: http://localhost:3000
Total cells: N   OK: A   Permission bugs: B   Regressions: C   Investigate: D   Scope leaks: E

## Matrix

| Entity | super_admin | group_admin | company_admin | assistant_admin | instructor |
|--------|:-----------:|:-----------:|:-------------:|:---------------:|:----------:|
| students | ✅✅✅✅ | ✅✅✅✅ | ✅✅✅❌**REG** | ✅✅✅— | ✅———— |
| ...

Legend: V C E D — green ✅ matches expected-allow, red ❌ matches expected-block,
**REG** = regression, **BUG** = permission bug, **SCOPE** = scope leak,
— = skipped (expected blocked, didn't try), ⚠ = investigate.

## Findings

### REG: students.delete (assistant_admin)
- Expected: blocked (matrix says e=1, d=0)
- Observed: delete succeeded
- Evidence: screenshots/assistant_admin-students-after-delete.png
- Repro: log in as assistant_admin → /student → click trash on row → Confirm → row removed
- Likely fix: check authorizeAction("students", "can_delete") in src/app/(dashboard)/student/actions.ts
```

## When NOT to use

- For UI/UX bugs unrelated to permissions → use the `dogfood` agent-browser skill instead.
- For DB-level RLS testing without a UI → use Supabase MCP directly with `mcp__supabase__execute_sql` impersonating each role's `auth.uid()`.

## Tips for running

- The browser stays open between commands within a session — reuse the same `--session crud-{role}` for all that role's commands.
- Agent-browser refs `@e1`, `@e2` go stale on re-render. Always re-snapshot after a click that changes the page. **Inside modals, refs go stale extremely fast** — prefer `find role button --name "Cancel"` over cached `@eN` refs after any DOM change. A wrong cached ref can land on a logout button and silently end your session.
- Avoid `wait --url "**/path"` — the glob form hangs. Use `wait --load networkidle` then `get url` to verify, or `wait --text "..."` for a specific element.
- If a CREATE fixture has a dropdown with no options yet (e.g. instructor has no programs in the seed DB), record `INVESTIGATE: empty dropdown` rather than failing the cell. The user can seed data and re-run with `--resume`.
- When iterating on the skill, run a single cell first: `/test-crud super_admin students` to validate the workflow before doing the full matrix.
- Don't share or commit `~/.config/agent-browser/auth/*` — it contains the encrypted vault.
