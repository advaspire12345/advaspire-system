# Memory Index — Advaspire LMS

This is the committed, in-repo memory for the Advaspire Robotics Academy LMS.
It is the **source of truth** for Claude Code knowledge that would otherwise
live only in the per-machine global memory store (`~/.claude/projects/.../memory/`)
and would not travel with the repo.

- [Project overview](project-overview.md) — what the app is: Next 16 + React 19 + Supabase robotics-academy LMS, role-based, multi-branch
- [Testing harness](testing-harness.md) — the 5 Claude Code testing skills, what each answers, and how to run them
- [UI/DB drift testing](ui-drift-testing.md) — why we observe the rendered UI, not just the DB (the bug class that justifies lms-simulator)
- [Roles and entities](roles-and-entities.md) — the role hierarchy and the entities the permission matrix covers
- [Roles and permissions](roles-and-permissions.md) — all 7 roles + the full per-role permission matrix (what each role can do)
- [Simulator architecture](simulator-architecture.md) — scripts/simulator/ runner, action library, YAML scenarios
