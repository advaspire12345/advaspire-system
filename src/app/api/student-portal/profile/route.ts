import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getStudentFromCookie } from "@/lib/student-auth";
import { getStudentProfile, getStudentEnrollments } from "@/data/student-portal";
import type { RequestCookies } from "next/dist/compiled/@edge-runtime/cookies";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const studentId = await getStudentFromCookie(
      cookieStore as unknown as RequestCookies
    );

    if (!studentId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [profile, enrollments] = await Promise.all([
      getStudentProfile(studentId),
      getStudentEnrollments(studentId),
    ]);

    if (!profile) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ profile, enrollments });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
