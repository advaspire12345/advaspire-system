import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/server";
import { getUserByAuthId } from "@/data/users";
import { switchEnrollmentCourse } from "@/data/enrollments";

/**
 * POST /api/enrollments/[id]/switch-course
 * Body: { new_course_id: string, notes?: string }
 *
 * Admin-only. Marks the source enrollment `course_switched`, creates a
 * fresh active enrollment on `new_course_id` with the same sessions
 * carried over 1:1, and records an audit row.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUser();
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const me = await getUserByAuthId(user.id);
    if (!me || !["super_admin", "group_admin", "company_admin", "assistant_admin"].includes(me.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: enrollmentId } = await context.params;
    const body = (await request.json()) as { new_course_id?: string; notes?: string };
    if (!body.new_course_id) {
      return NextResponse.json({ error: "Missing new_course_id" }, { status: 400 });
    }

    const result = await switchEnrollmentCourse(
      enrollmentId,
      body.new_course_id,
      me.id,
      body.notes ?? null,
    );

    if (!result) {
      return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
    }

    revalidatePath("/student");
    revalidatePath("/attendance");
    revalidatePath("/parent");
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("[POST /enrollments/:id/switch-course]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
