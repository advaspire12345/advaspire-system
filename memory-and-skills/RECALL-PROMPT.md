# Session Kickoff / Recall Prompt

Paste the block below as your **first message** in any new Claude Code session on
this project. It tells Claude to load the committed source of truth before doing work,
so you don't have to re-explain the project each time.

---

## ▶ Copy-paste this (full version)

```
Before doing anything, recall this project's context:

1. Read memory-and-skills/memory/MEMORY.md and every file it links.
2. Read CLAUDE.md and the relevant files in /docs (architecture.md, data-fetching.md,
   ui.md) before writing any code.
3. Note the testing harness: skills test-crud, test-behavior, lms-simulator,
   lms-year-simulator, test-role (live in .claude/skills/). Don't verify fixes by DB
   alone — check the rendered UI per role (see memory/ui-drift-testing.md).

Then give me a 5-line summary of: what this app is, the role model, the testing skills
available, and anything in memory flagged as a gotcha. After that, wait for my task.
```

---

## ▶ Short version (when you're in a hurry)

```
Recall context first: read memory-and-skills/memory/MEMORY.md + everything it links,
then CLAUDE.md. Summarize the app, roles, and testing skills in 5 lines, then wait.
```

---

## ▶ Continue-development version (when resuming a feature)

```
Recall context: read memory-and-skills/memory/MEMORY.md + linked files, CLAUDE.md, and
the /docs file relevant to <AREA>. Summarize what's relevant to <AREA> in a few lines,
list which src/data/*.ts and components touch it, then propose a plan before coding.
Verify any change through the UI per affected role, not just the DB.
```
Replace `<AREA>` with e.g. "payments", "attendance", "vouchers", "examinations".

---

## Keeping this fresh

- When you learn something durable about the project (a gotcha, a decision, a
  convention not visible in code), ask me to **"save that to memory-and-skills/memory/"**
  and I'll add/update a file + the MEMORY.md index.
- The `skills/` folder here mirrors `.claude/skills/`. Skills are still *loaded* from
  `.claude/skills/`; edit there, then run `npm run sync-skills` to refresh the mirror
  (`npm run sync-skills:check` fails if it's stale — handy in CI / pre-commit).
