---
name: simulator-architecture
description: How scripts/simulator/ is wired — runner, action library, YAML scenarios
metadata:
  type: reference
---

The simulator skills (`lms-simulator`, `lms-year-simulator`) are thin wrappers
over code in `scripts/simulator/`.

## Layout
- `scripts/simulator/runner.mjs` — orchestrator. Run via `npm run simulate`.
- `scripts/simulator/actions/` — one `.mjs` per atomic action, registered in `index.mjs`.
- `scripts/simulator/helpers/` — shared helpers.
- `.claude/skills/lms-year-simulator/run.mjs` — runs one/subset/all year scenarios in
  dependency order and aggregates per-scenario reports into one top-level report.
- Scenarios are **YAML** files under each skill's `scenarios/` dir.

## Action library (`scripts/simulator/actions/`)
add_student · import_students_csv · parent_self_register · add_trial · delete_trial ·
add_payment_for_student · approve_pending_payment · edit_pending_payment ·
backdate_payment · mark_offline_paid · add_voucher · apply_voucher_to_payment ·
adjust_adcoin · mark_present · mark_absent · take_extra_attendance ·
stamp_attendance_date · stamp_sessions_remaining · mark_exam_decision ·
create_event · create_session_transfer · cancel_enrollment · expire_enrollment ·
switch_course · switch_to_individual · switch_to_shared · run_cron

## Model
Each action is performed through the **real UI** as the actor role (via
`agent-browser`); the simulator then snapshots the **DB** (Supabase MCP/SQL) and the
**DOM** for each observer role. Comparing those snapshots surfaces UI/DB drift — see
[[ui-drift-testing]]. Year-simulator example questions: student level after a year of
attendance + renewals; whether a late-paying parent still earns the good-payer voucher;
what happens (and who's notified) when a student goes inactive; whether a course-switch
carries sessions over and dissolves the pool correctly.

Related domain data files: `src/data/attendance.ts`, `payments.ts`, `examinations.ts`,
`vouchers.ts`, `adcoins.ts`, `pools.ts`, `enrollments.ts`, `session-transfers.ts`.
