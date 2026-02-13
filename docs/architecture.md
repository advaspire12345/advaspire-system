# Project Architecture

This document defines the mandatory folder structure and architectural rules for this LMS application.

## Directory Structure

```
src/
├── app/                          # Next.js App Router (ALL pages/layouts = Server Components)
│   ├── (auth)/                   # Public auth routes
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── layout.tsx            # Minimal auth layout (no auth protection)
│   ├── (dashboard)/              # PROTECTED ROUTES (require auth)
│   │   ├── dashboard/page.tsx
│   │   ├── courses/[courseId]/page.tsx
│   │   └── layout.tsx            # Auth-protected layout (checks user session)
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Public homepage
├── components/                   # React components (shadcn/ui ONLY)
│   ├── ui/                       # shadcn/ui primitives (auto-generated)
│   ├── auth/                     # Auth forms (composed of shadcn/ui)
│   │   ├── login-form.tsx
│   │   └── signup-form.tsx
│   └── dashboard/                # Dashboard UI components
│       └── sidebar.tsx
├── data/                         # NON-NEGOTIABLE: ALL database queries
│   ├── courses.ts
│   ├── lessons.ts
│   ├── enrollments.ts
│   ├── assignments.ts
│   ├── progress.ts
│   └── users.ts                  # User data helpers (user ID filtered)
├── db/                           # Database configuration
│   └── index.ts                  # Supabase admin client init
├── lib/                          # PURE UTILITIES ONLY (ZERO DATA ACCESS)
│   ├── supabase/                 # Supabase client utilities
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server client
│   │   └── middleware.ts         # Auth middleware helper
│   ├── utils/                    # Reusable helpers
│   │   ├── format-date.ts
│   │   ├── slugify.ts
│   │   └── cn.ts                 # Classname merger (from shadcn/ui)
│   └── validations/              # Zod schemas (for Server Actions ONLY)
│       ├── user-schema.ts
│       └── course-schema.ts
├── types/                        # TypeScript definitions ONLY
│   └── app-types.ts              # Enums, UI state types
├── hooks/                        # MINIMAL: Client UI hooks ONLY
│   ├── use-media-query.ts
│   └── use-debounce.ts
├── public/                       # Static assets ONLY
│   ├── favicon.ico
│   └── images/
├── middleware.ts                 # Supabase auth middleware
├── .env                          # Environment variables (gitignored)
└── package.json
```

## Critical Rules

### 1. App Router (`app/`)

**ALL pages and layouts are Server Components by default.**

| Directory | Purpose | Auth Required |
|-----------|---------|---------------|
| `(auth)/` | Public authentication routes | No |
| `(dashboard)/` | Protected user routes | Yes |

#### Route Groups

- **`(auth)/`** - Public routes for login/signup. No auth checks.
- **`(dashboard)/`** - Protected routes. Layout MUST check user session and redirect if not authenticated.

---

### 2. Components (`components/`)

**Use shadcn/ui components ONLY.**

```
components/
├── ui/           # Auto-generated shadcn/ui primitives (Button, Card, etc.)
├── auth/         # Auth-specific composed components
└── dashboard/    # Dashboard-specific composed components
```

#### Rules

- **DO NOT** create custom UI primitives. Use shadcn/ui.
- **DO NOT** fetch data in components. Data comes from Server Component props.
- Compose shadcn/ui components into feature-specific components.

---

### 3. Data Layer (`data/`)

**ALL database queries MUST go through this directory.**

```typescript
// data/courses.ts
import { supabaseAdmin } from "@/db";

export async function getUserCourses(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('enrollments')
    .select(`
      *,
      courses (*)
    `)
    .eq('user_id', userId);

  if (error) throw error;
  return data;
}
```

#### Rules

- Every function MUST accept `userId` as a parameter
- Every query MUST filter by `userId` (data isolation)
- Use Supabase client (no raw SQL)
- See `/docs/data-fetching.md` for complete guidelines

---

### 4. Database (`db/`)

**Supabase client configuration.**

```
db/
└── index.ts      # Supabase admin client initialization
```

#### `db/index.ts` Example

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Admin client for server-side operations (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
```

---

### 5. Lib (`lib/`)

**PURE utilities only. ZERO data access.**

```
lib/
├── supabase/       # Supabase client utilities
│   ├── client.ts   # Browser client (createBrowserClient)
│   ├── server.ts   # Server client (createServerClient)
│   └── middleware.ts # Auth session management
├── utils/          # Pure helper functions
│   ├── cn.ts       # Classname merger (shadcn/ui)
│   └── format-date.ts
└── validations/    # Zod schemas for Server Actions
```

#### Rules

- **NO database imports** in this directory (except supabase client setup)
- **NO API calls** in this directory
- Pure functions only (input → output, no side effects)
- Zod schemas for form validation in Server Actions

---

### 6. Authentication

**Supabase Auth is used for all authentication.**

#### Server-side auth check:

```typescript
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Use user.id for data queries
  const data = await getUserData(user.id);

  return <div>Protected content</div>;
}
```

#### Client-side auth:

```typescript
"use client";

import { createClient } from "@/lib/supabase/client";

export function ClientComponent() {
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // ...
}
```

---

### 7. Middleware (`middleware.ts`)

**Supabase auth session management.**

```typescript
import { updateSession } from '@/lib/supabase/middleware';
import { type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
```

---

## Summary Table

| Directory | Purpose | Data Access Allowed |
|-----------|---------|---------------------|
| `app/` | Pages, layouts, Server Actions | Via `/data` helpers only |
| `components/` | UI components (shadcn/ui) | NO |
| `data/` | Database query helpers | YES (Supabase only) |
| `db/` | Supabase admin client | YES |
| `lib/` | Pure utilities & Supabase clients | Supabase client setup only |
| `types/` | TypeScript definitions | NO |
| `hooks/` | Client UI hooks | NO |
| `public/` | Static assets | NO |

## Anti-Patterns (DO NOT DO)

| Anti-Pattern | Correct Approach |
|--------------|------------------|
| Fetching data in `useEffect` | Fetch in Server Component, pass as props |
| Creating API routes for CRUD | Use Server Actions + `/data` helpers |
| Raw SQL queries | Use Supabase client |
| Custom UI primitives | Use shadcn/ui |
| Data fetching in `/lib` | Move to `/data` directory |
| Hooks that call APIs | Fetch in Server Component |
