# CRUD Test Report — 2026-04-30 15:55 (READ-only sweep)

**Scope**: 5 admin roles × 14 entity URLs = 70 cells
**Mode**: READ-only — verifies whether the page renders or gets redirected to /dashboard. Does NOT test CREATE/UPDATE/DELETE buttons or scope leaks.
**Dev server**: http://localhost:3000

## Result

**70 / 70 cells match expected. 0 bugs.**

| Role | OK | Mismatches |
|------|:--:|:----------:|
| super_admin | 14/14 | 0 |
| group_admin | 14/14 | 0 |
| company_admin | 14/14 | 0 |
| assistant_admin | 14/14 | 0 |
| instructor | 14/14 | 0 |

## Matrix (V column only)

Legend: `✅` = page rendered (V=1 expected, observed allowed); `🚫` = redirected to /dashboard (V=0 expected, observed blocked); `BUG` = mismatch (none found).

| URL | super | group | company | assistant | instructor |
|------|:-----:|:-----:|:-------:|:---------:|:---------:|
| /dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| /branches | ✅ | ✅ | ✅ | ✅ | 🚫 |
| /trial | ✅ | ✅ | ✅ | ✅ | ✅ |
| /student | ✅ | ✅ | ✅ | ✅ | ✅ |
| /examination | ✅ | ✅ | ✅ | ✅ | ✅ |
| /program | ✅ | ✅ | ✅ | ✅ | ✅ |
| /team | ✅ | ✅ | ✅ | 🚫 | 🚫 |
| /attendance | ✅ | ✅ | ✅ | ✅ | ✅ |
| /attendance-log | ✅ | ✅ | ✅ | ✅ | ✅ |
| /payment-record | ✅ | ✅ | ✅ | ✅ | 🚫 |
| /pending-payments | ✅ | ✅ | ✅ | ✅ | 🚫 |
| /leaderboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| /transactions | ✅ | ✅ | ✅ | ✅ | ✅ |
| /import | ✅ | ✅ | 🚫 | 🚫 | 🚫 |

All 🚫 cells are expected blocks per `src/data/permissions.ts`:
- `/branches` blocked for instructor (V=0)
- `/team` blocked for assistant_admin + instructor (V=0)
- `/payment-record` blocked for instructor (V=0)
- `/pending-payments` blocked for instructor (V=0)
- `/import` blocked for company_admin + assistant_admin + instructor (V=0)

## What this run does NOT cover

- **CREATE / UPDATE / DELETE** — needs hand-crafted modal flows per entity. Add Student modal (multi-tab combobox + spinbuttons) is the main complexity that broke the first smoke attempt.
- **Scope leaks** — we didn't extract the Branch column from list pages. A company_admin / assistant_admin / instructor could in principle see rows from other branches; this run wouldn't detect that.
- **Inline error states** — pages that load with HTTP 200 but render "Forbidden" content would pass this READ check. None observed in screenshots, but not algorithmically checked.
- **Companies tab** — shares URL `/branches` with branches; not tested as separate resource.

## Artifacts

- `screenshots/{role}-{url}.png` — landing screenshot per cell (70 files)
- `{role}-read.log` — raw URL-after-navigation log per role (5 files)

## Recommended next moves

1. **Lock in this run as a regression baseline.** This sweep is fast (~5 min for all 5 roles) and catches the broad class of route-level permission bugs. Run it before every release.
2. **Build CREATE/UPDATE/DELETE recipes per entity.** Start with the simplest modals (voucher, slot) and incrementally cover the harder ones (students, programs, examinations).
3. **Add scope-leak detection** — extract the Branch column from list snapshots and assert single-branch for company_admin / assistant_admin / instructor.
