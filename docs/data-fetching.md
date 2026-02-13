# Data Fetching Guidelines

## Critical Rules

**ALL data fetching in this application MUST be done via Server Components.**

This is non-negotiable. Do NOT fetch data via:

- Route handlers (`/api/*`)
- Client components (`'use client'`)
- `useEffect` or any client-side fetching hooks
- Any other method

## Database Queries

### Use Helper Functions in `/data`

All database queries MUST go through helper functions located in the `/data` directory.

```
src/
  data/
    courses.ts      # Course-related queries
    lessons.ts      # Lesson-related queries
    enrollments.ts  # Enrollment-related queries
    assignments.ts  # Assignment-related queries
    progress.ts     # Student progress queries
    users.ts        # User-related queries
    ...
```

### Use Supabase Client Only

**DO NOT use raw SQL.** All queries must use Supabase client.

```typescript
// CORRECT - Using Supabase client
export async function getUserEnrollments(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('enrollments')
    .select(`
      *,
      courses (*)
    `)
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching enrollments:', error);
    return [];
  }

  return data;
}

// WRONG - Raw SQL
export async function getUserEnrollments(userId: string) {
  return await db.execute(
    `SELECT * FROM enrollments WHERE user_id = '${userId}'`,
  );
}
```

## User Data Isolation (CRITICAL)

**A logged-in user can ONLY access their own data. They MUST NOT be able to access any other user's data.**

Every data helper function MUST:

1. Accept the authenticated user's ID as a parameter
2. Filter ALL queries by that user ID
3. Never expose data belonging to other users

### Implementation Pattern

```typescript
import { supabaseAdmin } from "@/db";

// In /data/enrollments.ts
export async function getUserEnrollments(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('enrollments')
    .select(`
      *,
      courses (*)
    `)
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching enrollments:', error);
    return [];
  }

  return data;
}

export async function getCourseProgress(userId: string, courseId: string) {
  // ALWAYS filter by userId to prevent unauthorized access
  const { data, error } = await supabaseAdmin
    .from('progress')
    .select('*')
    .eq('course_id', courseId)
    .eq('user_id', userId)  // CRITICAL: Never omit this
    .single();

  if (error) {
    console.error('Error fetching progress:', error);
    return null;
  }

  return data;
}

// In /data/courses.ts
export async function getEnrolledCourse(userId: string, courseId: string) {
  // Verify user is enrolled before returning course data
  const { data, error } = await supabaseAdmin
    .from('enrollments')
    .select(`
      *,
      courses (
        *,
        lessons (*)
      )
    `)
    .eq('course_id', courseId)
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching course:', error);
    return null;
  }

  return data?.courses ?? null;
}
```

### Usage in Server Components

```typescript
// In a Server Component (e.g., src/app/dashboard/page.tsx)
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUserEnrollments } from "@/data/enrollments";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch data via helper function, passing the authenticated userId
  const enrollments = await getUserEnrollments(user.id);

  return (
    <div>
      <h1>My Courses</h1>
      {enrollments.map((enrollment) => (
        <CourseCard key={enrollment.id} course={enrollment.courses} />
      ))}
    </div>
  );
}
```

```typescript
// In a Server Component (e.g., src/app/courses/[courseId]/page.tsx)
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getEnrolledCourse, getCourseProgress } from "@/data/courses";

export default async function CoursePage({
  params
}: {
  params: Promise<{ courseId: string }>
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { courseId } = await params;

  if (!user) {
    redirect("/login");
  }

  const course = await getEnrolledCourse(user.id, courseId);

  if (!course) {
    notFound(); // User not enrolled or course doesn't exist
  }

  const progress = await getCourseProgress(user.id, courseId);

  return (
    <div>
      <h1>{course.title}</h1>
      <ProgressBar value={progress?.percent_complete ?? 0} />
      <LessonList lessons={course.lessons} />
    </div>
  );
}
```

## Summary

| Requirement          | Rule                                 |
| -------------------- | ------------------------------------ |
| Where to fetch data  | Server Components ONLY               |
| Where to put queries | `/data` directory helper functions   |
| Database client      | Supabase client only (no raw SQL)    |
| Data access          | Users can ONLY access their own data |
| User filtering       | EVERY query MUST filter by `userId`  |
