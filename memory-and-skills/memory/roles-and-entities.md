---
name: roles-and-entities
description: The LMS role hierarchy and the entities covered by the permission matrix
metadata:
  type: project
---

## Roles
Defined/enforced in `src/data/permissions.ts`. Tested by `test-crud` and `test-role`:

- `super_admin` — god-tier, full CRUD on every resource (used as the actor for
  behavior/simulator runs so they never hit a permission gate)
- `group_admin`
- `company_admin`
- `assistant_admin`
- `instructor`
- `parent`
- `student`

Plus two non-role surfaces tested by `test-role`: `public` (registration form) and
`login` (login features).

## Entities (permission-matrix columns)
`test-crud` walks Create / Read / Update / Delete for each role against:

students · programs · slots · vouchers · team · examinations · branches ·
attendance · payments · transactions · leaderboard · trial

Observed UI behavior is compared against the **expected** permissions in
`src/data/permissions.ts`. Mismatches are reported as **permission bugs**,
**regressions**, or **scope leaks**.

See [[testing-harness]] and [[project-overview]].
