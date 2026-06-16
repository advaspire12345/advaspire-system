# memory-and-skills — Source of Truth

Consolidated, **committed-in-repo** knowledge for the Advaspire Robotics Academy LMS.
This folder is the single source of truth for the Claude Code context around this
project. Unlike the global memory store (`~/.claude/projects/<slug>/memory/`, which is
per-machine and does **not** travel with the repo), everything here is in git.

## Contents

```
memory-and-skills/
├── README.md            ← you are here
├── RECALL-PROMPT.md     ← paste this at the start of every new session
├── memory/              ← project knowledge (the part that was NOT in the repo before)
│   ├── MEMORY.md        ← index of memory files
│   ├── project-overview.md
│   ├── testing-harness.md
│   ├── ui-drift-testing.md
│   ├── roles-and-entities.md
│   └── simulator-architecture.md
└── skills/              ← readable copies of the live skills
    ├── agent-browser/        (browser automation CLI wrapper)
    ├── lms-simulator/        (multi-role UI flow simulator)
    ├── lms-year-simulator/   (12-month lifecycle simulator)
    ├── test-behavior/        (chained side-effect / value tester)
    ├── test-crud/            (role × entity permission matrix)
    ├── test-role/            (interactive manual checklist)
    └── _commands/            (copy of .claude/commands/)
```

## Important: live vs. canonical

- **Claude Code loads skills from `.claude/skills/` and commands from `.claude/commands/`.**
  Those are the *operational* locations. The `skills/` folder here is a **readable,
  committed mirror** — if you edit a skill, edit it in `.claude/skills/`, then run
  `npm run sync-skills` to refresh this mirror (`npm run sync-skills:check` verifies it's current).
- **Memory** is the real addition: the project's global memory store was empty and the
  `feedback_ui_drift_testing.md` note referenced by `lms-simulator` was missing. The
  `memory/` folder here reconstructs and commits that knowledge so it survives clones
  and machine changes. See `memory/ui-drift-testing.md` for the reconstruction note.

## Also part of the project's source of truth (not duplicated here)

- `CLAUDE.md` (repo root) — "documentation first" rules for Claude Code.
- `/docs/` — `architecture.md`, `data-fetching.md`, `ui.md`, `onboarding-by-role.md`,
  `student-session-flows.md`, `testing-checklist.md`.
- `src/data/permissions.ts` — the canonical permission definitions the tests assert against.
- `.mcp.json` — Supabase MCP server. `skills-lock.json` — pins `agent-browser` skill version.
