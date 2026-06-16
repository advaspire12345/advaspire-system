---
name: ui-drift-testing
description: Why we observe the rendered UI, not just the DB — the drift bug class that justifies lms-simulator
metadata:
  type: feedback
---

> **Note:** the original global memory `feedback_ui_drift_testing.md` referenced by
> the `lms-simulator` skill was **not present** on this machine or in the repo when
> this source-of-truth folder was created. This file reconstructs the principle from
> the skill descriptions so the knowledge isn't lost. Treat it as faithful-but-derived.

The single most painful bug class in this LMS is: **the database is correct but
what the user sees on screen is wrong** — or **what one role sees doesn't match
what another role sees** after the same action.

Canonical example: a table cell shows `-1` sessions remaining while the modal for
the same student still shows `0`. The DB row may be perfectly correct; the drift is
purely in the rendered UI (stale cache, wrong selector, optimistic update gone wrong,
role-scoped query mismatch).

**Why:** pure DB-assertion tests pass on these bugs — they only check the DB, which
is right. The defect only exists in the DOM, and only some roles may see it.

**How to apply:**
- When testing a flow, capture **both** the DOM **and** the DB for **every observer
  role** at each step, and compare them. Drift between DOM and DB — or between two
  roles' DOMs — is the smoking gun.
- This is exactly why [[testing-harness]]'s `lms-simulator` exists, and why
  `test-behavior` complements DB asserts with screenshots. Don't "verify a fix" by
  reading the DB alone — look at the rendered screen as each role.
- Prefer multi-role cross-observation (`lms-simulator`) for anything where one role
  creates/changes data that another role is supposed to see.
