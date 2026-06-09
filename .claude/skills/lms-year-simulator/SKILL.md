# lms-year-simulator

End-to-end LMS lifecycle simulator. Drives 20+ focused scenarios + one
12-month woven scenario through a real Chrome session via agent-browser,
and answers questions like:

- "After a year of attendance + renewals, what's the student's level?"
- "If a parent pays late, do they still get the good-payer voucher?"
- "When a student goes inactive for a month, who gets notified, and does anything destructive happen?"
- "Does a course-switch carry sessions over and dissolve the pool correctly?"

The skill wraps the existing `scripts/simulator/runner.mjs`. Each
sub-scenario is a YAML file under `scenarios/`. The orchestrator
`run.mjs` runs one named scenario, a subset, or every scenario in
dependency order, then aggregates the per-scenario reports into one
top-level report.

## When to use this skill

- "Run the year simulator"
- "Test all the LMS flows end-to-end in a browser"
- "Verify the new good-payer voucher / course-switch / inactivity-reminder logic"
- "Simulate the mixed student archetypes over a year"

If the user only wants ONE narrow flow (e.g. just inactivity reminders),
invoke a single scenario by name. Don't run `all` for a single-flow
question.

## Usage

```
/lms-year-simulator                                  # list scenarios
/lms-year-simulator <scenario-name>                  # run one
/lms-year-simulator all                              # run every scenario in dep order
```

Direct CLI (same thing, without the skill wrapper):

```
node .claude/skills/lms-year-simulator/run.mjs                  # list
node .claude/skills/lms-year-simulator/run.mjs <name>           # run one
node .claude/skills/lms-year-simulator/run.mjs all              # run every
```

Output: `simulator-output/<run-ts>/skill-report.md` aggregates every
sub-scenario's status + drift findings.

## Prerequisites (verify before running)

1. Dev server up: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login` → 200
2. agent-browser installed: `npx --yes agent-browser --version` succeeds
3. Supabase MCP reachable: `mcp__supabase__list_projects` returns something
4. Base auth profiles: `lms-super_admin`, `lms-group_admin`, `lms-company_admin`, `lms-assistant_admin`, `lms-instructor` in the agent-browser vault.
5. `CRON_SECRET` set in the dev process environment so the `run_cron` action can fire the daily sweep.

If any prereq fails, stop and report. Don't try to fix prereqs autonomously.

## How to interpret the aggregated report

Each scenario contributes a row to a top-level table:

```
| Scenario                          | Status | Drift | Notes                |
|-----------------------------------|--------|-------|----------------------|
| inactivity-reminders              | ✅     | 0     |                      |
| course-switch-midway              | ✅     | 0     |                      |
| good-payer-voucher-within-window  | ✅     | 0     | voucher granted      |
| good-payer-voucher-missed-window  | ❌     | 1     | grant despite +40d   |
| ...                                                                       |
| mixed-year (mega-scenario)        | ✅     | 0     | year-end SQL matches |
```

A `❌` row points to the sub-report at
`simulator-output/<ts>/<scenario>/report.md` — read the drift table there.

## Scenario list (per the approved plan)

Focused (1 situation each):
1. exam-pass-then-next-level
2. exam-fail-then-8week-reattempt
3. voucher-application-on-renewal
4. good-payer-voucher-within-window
5. good-payer-voucher-missed-window
6. voucher-earn-on-completion
7. settle-deficit-toggle
8. pool-dissolve-to-individual-renewal
9. pool-fast-burn-three-siblings
10. pool-slow-burn-uneven
11. individual-multi-slot
12. course-switch-midway
13. inactivity-reminders
14. trial-converted-and-billed
15. adcoin-instructor-award
16. adcoin-admin-adjustment
17. adcoin-student-transfer
18. holiday-broadcast
19. activity-broadcast
20. parent-self-register
21. import-students-with-history

Mega:
22. mixed-year (Steady Sam / Trial Tina / Sibling Sam / Bouncing Bobo / Reliable Rita / Switching Sara)

## Adding a new scenario

Drop a YAML in `scenarios/` and add the filename to the `ORDER` list in
`run.mjs`. The YAML follows the existing lms-simulator scenario schema
(`fixtures`, `users`, `steps`, optional per-step `expect:`).
