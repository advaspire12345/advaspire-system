---
name: testing-harness
description: The 5 Claude Code testing skills for the LMS, what each answers, and how to run them
metadata:
  type: project
---

The LMS ships with a layered automated-testing harness built as Claude Code
**skills**, all driving a **real Chrome** session via `agent-browser` (Chromium
over CDP). The live copies are in `.claude/skills/`; readable copies are in
`memory-and-skills/skills/`.

## The skills, by question they answer

| Skill | Answers | Asserts on |
|-------|---------|-----------|
| **test-crud** | "Can role X do op O on entity E?" | UI behavior vs `src/data/permissions.ts` |
| **test-behavior** | "When op O runs, do all the right things change?" | DB state via Supabase MCP |
| **lms-simulator** | "When role X does Y, what does every other role see?" | DOM **and** DB, per observer role |
| **lms-year-simulator** | "After a year of activity, is the end state correct?" | aggregated DB + DOM over 20+ scenarios |
| **test-role** | manual, role-by-role checklist | human pass/fail (interactive) |

`test-crud` = permission matrix. `test-behavior` = single-role chained side
effects. `lms-simulator` = multi-role chained UI flows with cross-role observation.
`lms-year-simulator` = full 12-month lifecycle. `test-role` = guided manual.

## How to run
- `/test-crud [role] [entity]` · `--resume`
- `/test-behavior [scenario | "<nl scenario>"]` · `--list` · `--keep-fixture`
- `/lms-simulator [scenario | new | actions]`
- `npm run simulate` (= `node scripts/simulator/runner.mjs`) — backs the year simulator
- `/test-role [role]`

## Shared prerequisites
1. Dev server up: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login` → `200`.
2. `agent-browser` auth vault populated with `lms-*` profiles (`npx agent-browser auth list`).
   Behavior/simulator runs act as **`lms-super_admin`** (god-tier — full CRUD, never
   hits a permission gate, so side-effect tests aren't blocked).
3. Supabase MCP reachable: `mcp__supabase__list_projects` → capture the dev `project_id`
   for all subsequent SQL.

If a prereq fails: **stop and report** — do not try to fix prereqs autonomously.

## Output
- `test-crud-output/{timestamp}/` — `report.md`, `screenshots/`, `state.json`
- `test-behavior-output/{timestamp}/` — `report.md`, `screenshots/`, per-scenario `before.json`/`after.json`

See [[ui-drift-testing]] for *why* these observe the UI, and [[simulator-architecture]]
for how the simulator is wired.
