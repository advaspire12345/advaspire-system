---
name: test-behavior
description: Automated behavior / business-logic tester for the LMS. Verifies chained side effects work end-to-end — e.g. marking attendance decrements sessions_remaining, exhausting paid sessions auto-creates a pending payment, attendance awards adcoin, vouchers auto-issue on depletion, monthly periods reset. Performs the action through the real UI via agent-browser and asserts on the resulting database state via Supabase MCP. Supports both a built-in scenario suite (run with no args) and ad-hoc scenarios described in natural language. Use when the user asks to "test the values are correct", "test business rules", "verify side effects", "test attendance flow", "test payment flow", or after touching any code under src/data/attendance.ts, src/data/payments.ts, or src/data/examinations.ts.
allowed-tools: Bash(npx agent-browser:*), Bash(curl:*), Bash(mkdir:*), Bash(date:*), Read, Write, Edit, Grep, Glob, mcp__supabase__execute_sql, mcp__supabase__list_projects, mcp__supabase__list_tables
---

# test-behavior — chained side-effect / value-correctness tester

Drives a real Chrome via `agent-browser` to perform actions (mark attendance, approve payment, etc.), then queries the Supabase DB to assert that all expected downstream state changes happened. Each test is self-contained: it sets up a known fixture, performs the action, asserts on the DB, and cleans up.

This skill is the companion to `test-crud`. `test-crud` answers *"can this role do this op?"*. `test-behavior` answers *"when this op runs, do all the right things change in the DB?"*.

## Usage

- `/test-behavior` — run the full built-in scenario set
- `/test-behavior <scenario_name>` — run one built-in scenario by name
- `/test-behavior --list` — list built-in scenarios
- `/test-behavior "<natural-language scenario>"` — ad-hoc: user describes a scenario, skill plans + runs + reports it
- `/test-behavior --keep-fixture` — don't tear down the fixture student at the end (debugging)

Output dir: `./test-behavior-output/{run-timestamp}/` with `report.md`, `screenshots/`, and per-scenario `before.json` / `after.json` DB snapshots.

## Prerequisites (verify before running)

1. Dev server up: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login` → 200
2. Auth vault has `lms-super_admin` (we run actions as super_admin — god-tier, has full CRUD on every resource so behavior scenarios never hit a permission gate)
3. Supabase MCP reachable: call `mcp__supabase__list_projects`, capture the project_id of the dev project. Hold it in a variable for all subsequent SQL.

If any prereq fails, stop and report the cause. Don't try to fix prereqs autonomously.

## Approach

```
[Action layer]    agent-browser as super_admin → click through UI
[Assertion layer] Supabase MCP execute_sql → read tables before/after
[Fixture layer]   one fixture student created per run, deleted at end
```

Why both? The UI path catches issues a real user would hit (modal field missing, confirm dialog, toast errors). The DB assertion catches issues the UI hides (e.g. trigger fired but UI table is cached, or row inserted but with wrong column value).

## Fixture setup (run once per test session)

Goal: a known-state student we can mutate freely without polluting production-shaped data.

1. Pick the **smallest active branch + program + course** in the dev DB (lowest existing student count) so listings stay readable.
2. Create the fixture student via UI as super_admin (more realistic than DB insert):
   - Log in via `agent-browser auth login lms-super_admin`
   - Navigate `/student`, click "Add Student"
   - Fill: name=`__behavior_fixture_{ts}`, email=`fixture{ts}@test.local`, phone=`0100000000`, DOB=`2015-01-01`, gender=Male, school=`Test School`, branch/course/package=first valid options, parent=first valid
   - Submit, capture the inserted student row's ID via SQL:
     ```sql
     SELECT id, name FROM students WHERE name = '__behavior_fixture_{ts}' LIMIT 1;
     ```
3. Create / locate the corresponding enrollment:
   ```sql
   SELECT id, course_id, sessions_remaining, level, period_start, adcoin_balance
   FROM enrollments
   WHERE student_id = $fixture_student_id;
   ```
4. Bring the enrollment to a **known starting state** for each scenario (see per-scenario "pre" SQL). It's fine to UPDATE the enrollment directly here — we're setting up a controlled fixture.

Save fixture IDs and starting state to `test-behavior-output/{run}/fixture.json`.

## Teardown (run once at end, even on failure)

```sql
-- Order matters: children before parents
DELETE FROM attendance WHERE enrollment_id IN
  (SELECT id FROM enrollments WHERE student_id = $fixture_student_id);
DELETE FROM adcoin_transactions WHERE student_id = $fixture_student_id;
DELETE FROM payments WHERE student_id = $fixture_student_id;
DELETE FROM vouchers WHERE student_id = $fixture_student_id;     -- if vouchers has student_id
DELETE FROM examinations WHERE enrollment_id IN
  (SELECT id FROM enrollments WHERE student_id = $fixture_student_id);
DELETE FROM enrollments WHERE student_id = $fixture_student_id;
DELETE FROM students WHERE id = $fixture_student_id;
```

If any DELETE fails (FK violations from tables this skill doesn't know about), record the orphan IDs in `report.md` so the user can clean up manually. Skip teardown entirely when invoked with `--keep-fixture`.

## Built-in scenarios

Each scenario has the same shape: **pre** (SQL setup) → **action** (UI flow) → **assert** (SQL diff) → **verdict**.

### 1. `attendance_decrements_sessions_remaining`

Goal: marking present attendance reduces `enrollments.sessions_remaining` by exactly 1.

- **Pre**:
  ```sql
  UPDATE enrollments
  SET sessions_remaining = 5, period_start = NULL  -- session-package mode
  WHERE id = $enrollment_id;
  ```
  Snapshot before.
- **Action**: as super_admin, navigate `/attendance`, find the fixture student, mark Present, submit.
- **Assert**:
  ```sql
  SELECT sessions_remaining FROM enrollments WHERE id = $enrollment_id;
  -- expected: 4
  SELECT count(*) FROM attendance
  WHERE enrollment_id = $enrollment_id AND status = 'present' AND date = CURRENT_DATE;
  -- expected: 1
  ```
- **Verdict**:
  - sessions_remaining decreased by exactly 1 → ✅
  - decreased by 0 (no decrement) or by >1 → ❌ FAIL

### 2. `attendance_at_zero_creates_pending_payment`

Goal: marking attendance when only 1 session remains leaves `sessions_remaining = 0` and inserts a pending payment row.

- **Pre**:
  ```sql
  UPDATE enrollments SET sessions_remaining = 1 WHERE id = $enrollment_id;
  DELETE FROM payments WHERE student_id = $fixture_student_id AND status = 'pending';
  ```
- **Action**: mark attendance Present (same flow as scenario 1).
- **Assert**:
  ```sql
  SELECT sessions_remaining FROM enrollments WHERE id = $enrollment_id;
  -- expected: 0

  SELECT id, status, payment_type, amount, notes
  FROM payments
  WHERE student_id = $fixture_student_id AND status = 'pending'
  ORDER BY created_at DESC LIMIT 1;
  -- expected: 1 row, payment_type='package', notes contains 'Auto-created'
  ```
- **Verdict**:
  - sessions = 0 AND new pending payment row → ✅
  - sessions = 0 but no payment row → ❌ FAIL (the chained insert didn't fire)
  - payment row exists but already existed before → ❌ FAIL (duplicate or stale check)

Then verify the user-visible side: navigate `/pending-payments` and snapshot — confirm the new row is in the table.

### 3. `attendance_awards_adcoin`

Goal: marking attendance on a course with `adcoin > 0` increments `students.adcoin_balance` and inserts an `adcoin_transactions` row.

- **Pre**: pick a course with `adcoin > 0`. If the fixture course has `adcoin = 0`, switch the enrollment to a course that does, or update the course (and revert in teardown). Snapshot `students.adcoin_balance` before.
- **Action**: mark Present.
- **Assert**:
  ```sql
  SELECT adcoin_balance FROM students WHERE id = $fixture_student_id;
  -- expected: prev_balance + course.adcoin

  SELECT count(*) FROM adcoin_transactions
  WHERE student_id = $fixture_student_id
    AND created_at > $action_start_time;
  -- expected: 1
  ```
- **Verdict**: balance correctly incremented AND new transaction row → ✅

### 4. `attendance_at_zero_issues_voucher`

Goal: when `sessions_remaining` hits 0, `checkAndCreateVoucher` issues a voucher for the student.

- **Pre**:
  ```sql
  UPDATE enrollments SET sessions_remaining = 1 WHERE id = $enrollment_id;
  -- snapshot voucher count for this student
  ```
- **Action**: mark Present (this also triggers the pending payment from scenario 2 — that's fine, the assertions are independent).
- **Assert**:
  ```sql
  SELECT count(*) FROM vouchers
  WHERE student_id = $fixture_student_id
    AND created_at > $action_start_time;
  -- expected: 1 (or whatever checkAndCreateVoucher returns)
  ```
- **Verdict**: row inserted → ✅. If 0 rows, check `src/data/attendance.ts` for whether the voucher conditions matched the fixture (the function may have eligibility gates beyond just sessions=0).

### 5. `monthly_package_period_resets`

Goal: on monthly-package enrollments, after 4 attendances in the period, `period_start` advances to the next month.

- **Pre**:
  ```sql
  UPDATE enrollments
  SET period_start = CURRENT_DATE - INTERVAL '35 days',  -- expired period
      sessions_remaining = 4
  WHERE id = $enrollment_id;
  ```
- **Action**: mark Present.
- **Assert**:
  ```sql
  SELECT period_start FROM enrollments WHERE id = $enrollment_id;
  -- expected: a date ≥ CURRENT_DATE - 30 days (period rolled forward)
  ```
- **Verdict**: period_start advanced → ✅. If unchanged → ❌ FAIL (period reset didn't fire).

### 6. `level_up_creates_exam` — **EXPECTED FAIL** (feature not implemented)

Goal: when accumulated attendance reaches `courses.sessions_to_level_up`, an `examinations` row should be auto-inserted with `exam_level = enrollment.level`. Currently the codebase computes eligibility but does NOT insert.

- **Pre**:
  ```sql
  -- Look up sessions_to_level_up for the fixture course
  SELECT sessions_to_level_up FROM courses WHERE id = $course_id;  -- call this N
  -- Set the enrollment so the next attendance crosses the threshold
  -- (exact column for "attended count" depends on schema — confirm before running)
  ```
- **Action**: mark Present.
- **Assert**:
  ```sql
  SELECT count(*) FROM examinations
  WHERE enrollment_id = $enrollment_id
    AND exam_level = (SELECT level FROM enrollments WHERE id = $enrollment_id)
    AND created_at > $action_start_time;
  -- expected: 1 (per user spec)
  -- actual today: 0 (feature not built)
  ```
- **Verdict**: Mark this scenario **expected-fail** in the report with a note pointing at `src/data/attendance.ts → updateSessionTracking()` as the place auto-insert would belong. Do not flag it as a regression — known gap (see memory: project_levelup_exam_gap).

## Ad-hoc scenarios (user describes in natural language)

When the user invokes `/test-behavior "<description>"`, treat the quoted string as the scenario goal. Plan the test in this order before running anything:

1. **Restate the goal** in one sentence and confirm with the user.
2. **Identify the action** — what UI flow performs it? (search the codebase if unclear.)
3. **Identify the assertions** — what tables/columns should change, and to what values?
4. **Identify the precondition** — what fixture state is needed for the action to be meaningful?
5. **Identify cleanup** — what new rows or mutations need to be reverted?
6. Print a short plan to chat (4–6 bullets), then run.

If the user's description is ambiguous (e.g. "test the discount works"), ask one targeted question rather than guessing. If after one question it's still unclear, ask the user to point at the relevant code or describe a concrete before/after pair.

After running an ad-hoc scenario successfully, ask the user if they want it added as a permanent built-in scenario. If yes, append it to this SKILL.md using the [Adding new scenarios](#adding-new-scenarios) template.

## Action recipes (UI flows)

These are the concrete agent-browser sequences each scenario uses.

### Mark attendance Present for the fixture student

```bash
S=behavior
agent-browser --session $S open http://localhost:3000/attendance
agent-browser --session $S wait --load networkidle
agent-browser --session $S snapshot -i
# Find the fixture student's row by name '__behavior_fixture_*' — likely a search box or filter
agent-browser --session $S find label "Search" fill "__behavior_fixture"
agent-browser --session $S wait --text "__behavior_fixture"
agent-browser --session $S snapshot -i
# Click the Present button / radio for that row
agent-browser --session $S find role button click --name "Present"
# Submit / save (button label varies — likely "Save" or "Submit Attendance")
agent-browser --session $S find role button click --name "Save"
agent-browser --session $S wait --text "saved" --timeout 10000
agent-browser --session $S screenshot screenshots/{scenario}-after-action.png
```

If selectors don't match what's on the page, re-snapshot and adapt — don't guess. Record any selector divergence in the report so the skill can be updated.

## Output: report.md

```markdown
# Behavior Test Report — {timestamp}

Fixture student: __behavior_fixture_{ts}  (id: {uuid})
Fixture enrollment: {uuid}  (course: {course_name})
Run scope: {N} scenarios

| # | Scenario | Verdict | Notes |
|---|----------|---------|-------|
| 1 | attendance_decrements_sessions_remaining | ✅ | sessions 5 → 4 |
| 2 | attendance_at_zero_creates_pending_payment | ✅ | payment id: {uuid} |
| 3 | attendance_awards_adcoin | ❌ FAIL | balance unchanged; expected +5 |
| 4 | attendance_at_zero_issues_voucher | ✅ | voucher id: {uuid} |
| 5 | monthly_package_period_resets | ⚠ INVESTIGATE | period_start NULL after action |
| 6 | level_up_creates_exam | ❌ EXPECTED FAIL | feature not built — see memory:project_levelup_exam_gap |

## Findings

### #3 attendance_awards_adcoin — FAIL
- Pre: students.adcoin_balance = 100, course.adcoin = 5
- Action: marked Present via /attendance
- Post: students.adcoin_balance = 100 (expected 105)
- adcoin_transactions rows for student in window: 0 (expected 1)
- Likely cause: src/app/api/attendance/mark/route.ts:508 `updateAdcoinBalance` not called, or course.adcoin read wrong
- Repro: see screenshots/3-attendance-awards-adcoin-after-action.png + before.json / after.json
```

## Adding new scenarios

When the user wants to make an ad-hoc scenario permanent, append it here using this template:

```
### N. `scenario_name`

Goal: <one-sentence outcome>

- **Pre**: <SQL to set up known state>
- **Action**: <UI flow via agent-browser>
- **Assert**: <SQL queries with expected results>
- **Verdict**: <how to interpret pass/fail>
```

Keep the assertion SQL minimal — read only the columns you're asserting on. The diff between `before.json` and `after.json` tells the user what changed; the assertion just decides pass/fail.

## When NOT to use

- For permission gating (can/can't do) → use `test-crud`.
- For UI exploration / bug hunts → use `dogfood` from agent-browser.
- For schema / migration testing → write a Supabase migration test instead; this skill assumes the schema is already correct.
