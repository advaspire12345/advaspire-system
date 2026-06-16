---
name: project-overview
description: Advaspire Robotics Academy LMS — Next 16 + React 19 + Supabase, role-based, multi-branch
metadata:
  type: project
---

**Advaspire Robotics Academy LMS** — a learning-management system for a robotics
academy, built by Claude Code.

## Stack
- **Next.js 16** App Router, **React 19**, React Compiler enabled (`next.config.ts`)
- **Tailwind CSS 4** via PostCSS; Radix UI + `lucide-react` components
- **TypeScript** strict mode; path alias `@/*` → `./src/*`
- **Supabase** for auth + PostgreSQL (`@supabase/ssr`, `@supabase/supabase-js`)
- Other notable deps: `@anthropic-ai/sdk`, `@dnd-kit/*`, `exceljs`, `papaparse`,
  `jspdf`, `html2canvas-pro`, `jose`, `bcryptjs`, `date-fns`
- Deploy: Vercel (`vercel.json`); package manager: pnpm (`pnpm-lock.yaml`)

## Auth
- Supabase Auth. Server: `createClient()` from `@/lib/supabase/server`.
  Client: `createClient()` from `@/lib/supabase/client`. Middleware in `src/middleware.ts`.
- Admin queries use `supabaseAdmin` from `@/db/index.ts`.
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

## App structure (route groups)
`src/app/` route groups: `(auth)`, `(dashboard)`, `(parent)`, `(public)`,
`(student-auth)`, `(student-portal)`, plus `api/`, `auth/`, `learn/`.

## Domain
Data helpers live in `src/data/*.ts` — one file per domain object:
students, parents, programs, courses, slots, enrollments, pools, attendance,
payments, vouchers, adcoins, examinations, marketplace, leaderboard, trial,
branches, team, users, reschedules, session-transfers, notifications, settings.

Multi-tenant: organized by **branches / companies**. See [[roles-and-entities]].

## Where the rules live
- **CLAUDE.md** (repo root) — "documentation first": always read `/docs/*` before coding.
- `/docs/` — `architecture.md`, `data-fetching.md`, `ui.md`, `onboarding-by-role.md`,
  `student-session-flows.md`, `testing-checklist.md`, plus DB spreadsheets and import CSVs.
