# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important: Documentation First

**ALWAYS refer to the relevant docs file within the `/docs` directory before generating any code.** The docs directory contains specifications, patterns, and guidelines that must be followed when implementing features or making changes.

- /docs/ui.md
- /docs/data-fetching.md
- /docs/architecture.md

## Commands

- `npm run dev` - Start development server at localhost:3000
- `npm run build` - Build for production
- `npm run start` - Run production build
- `npm run lint` - Run ESLint

## Architecture

This is a Next.js 16 project using the App Router with React 19.

**Key configuration:**

- React Compiler enabled (`next.config.ts`)
- Tailwind CSS 4 via PostCSS
- TypeScript in strict mode
- Path alias: `@/*` maps to `./src/*`
- Supabase for authentication and database

**Source structure:**

- `src/app/` - App Router pages and layouts
- `src/app/layout.tsx` - Root layout with fonts
- `src/app/page.tsx` - Home page
- `src/middleware.ts` - Supabase auth middleware
- `src/lib/supabase/` - Supabase client utilities

**Authentication:**

- Uses Supabase Auth for authentication
- Server-side auth: `createClient()` from `@/lib/supabase/server`
- Client-side auth: `createClient()` from `@/lib/supabase/client`
- Requires `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in `.env`

**Database:**

- Uses Supabase PostgreSQL directly via `@supabase/supabase-js`
- Admin queries use `supabaseAdmin` from `@/db/index.ts`
- Data helpers in `/data` directory use Supabase client
