# lms-year-simulator scenarios

Status snapshot of each YAML in this directory. ✅ = fully driven; 🟡 =
scaffold present (fixtures + steps) but may need a small tweak (e.g.
voucher template seeded, second course fixture) before passing; ⚪ =
not yet written — placeholder file noting what it should cover.

| Scenario | Status | Tests |
|---|---|---|
| `inactivity-reminders` | ✅ | Phase A1 (no auto-forfeit, admin-only reminders, 7-day dedupe, reset on attendance / cancel) |
| `course-switch-midway` | 🟡 | Phase A2 — needs a second course in fixture before pass |
| `good-payer-voucher-within-window` | 🟡 | Phase A3 — needs `good_payer_voucher_id` wired on the pricing row |
| `good-payer-voucher-missed-window` | 🟡 | Phase A3 negative case |
| `exam-pass-then-next-level` | ⚪ | Reuses existing scenario from `lms-simulator/scenarios/examination-pass-bumps-level.yaml`; can run via the existing simulator until copied here |
| `exam-fail-then-8week-reattempt` | ⚪ | Likewise — existing `examination-fail-reattempt-8-weeks.yaml` |
| `voucher-application-on-renewal` | ⚪ | TODO: build with `apply_voucher_to_payment` action |
| `voucher-earn-on-completion` | ⚪ | Existing `scenario-11-13-voucher-earn-and-redeem.yaml` |
| `settle-deficit-toggle` | ⚪ | Existing `settle-deficit-toggle.yaml` in `lms-simulator/scenarios/` |
| `pool-dissolve-to-individual-renewal` | ⚪ | TODO |
| `pool-fast-burn-three-siblings` | ⚪ | TODO |
| `pool-slow-burn-uneven` | ⚪ | TODO |
| `individual-multi-slot` | ⚪ | TODO |
| `trial-converted-and-billed` | ⚪ | TODO — driven by add_trial + add_student with matching parent phone |
| `adcoin-instructor-award` | ⚪ | TODO — exercise mark_present's adcoin field |
| `adcoin-admin-adjustment` | ⚪ | TODO — uses `adjust_adcoin` |
| `adcoin-student-transfer` | ⚪ | TODO — uses `transfer_adcoin_student` |
| `holiday-broadcast` | ⚪ | TODO — uses `create_event` with type=holiday |
| `activity-broadcast` | ⚪ | TODO — uses `create_event` with type=activity |
| `parent-self-register` | ⚪ | TODO — uses `parent_self_register` |
| `import-students-with-history` | ⚪ | TODO — uses `import_students_csv` |
| `mixed-year` | ⚪ | Mega scenario weaving Steady Sam / Trial Tina / Sibling Sam / Bouncing Bobo / Reliable Rita / Switching Sara across 12 months |

## What ships today

- The orchestrator + skill structure are complete.
- Every action listed in the SKILL.md is registered with the simulator
  runner (verify with `node -e "import('./scripts/simulator/actions/index.mjs').then(m => console.log(Object.keys(m.ACTIONS)))"`).
- Backend changes from Phase A (inactivity reminder, course-switch,
  good-payer voucher) are live in production after migration `030_lms_lifecycle_additions.sql`.

## Filling in the ⚪ scenarios

Each placeholder follows the same structure as the green/yellow files.
Start from the closest existing YAML in `lms-simulator/scenarios/`, copy
into this directory, rename, then update the `name:` field. Run
`node .claude/skills/lms-year-simulator/run.mjs <name>` to verify, then
update the row above to 🟡 or ✅.

## Fixture seeding for the good-payer tests

Until the program-modal UI flow has been driven via the simulator, the
two good-payer scenarios need a voucher template wired onto the
pricing row created by `fixtures.pricing`. Run this SQL after the
runner provisions the fixture (it's a one-off; the manual-teardown
flag keeps the data alive long enough to inspect):

```sql
-- Pick the voucher template you want to grant (or insert one if needed).
WITH tmpl AS (
  SELECT id FROM public.vouchers WHERE student_id IS NULL LIMIT 1
)
UPDATE public.course_pricing
   SET good_payer_voucher_id = (SELECT id FROM tmpl),
       good_payer_voucher_window_days = 35
 WHERE course_id IN (
   SELECT id FROM public.courses WHERE name LIKE '__sim_%_GoodCourse'
                                     OR name LIKE '__sim_%_LateCourse'
 );
```
