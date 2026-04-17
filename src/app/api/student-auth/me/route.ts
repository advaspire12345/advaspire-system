import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getStudentFromCookie } from "@/lib/student-auth";
import { getStudentById } from "@/data/students";
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

    const student = await getStudentById(studentId);

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: student.id,
      name: student.name,
      photo: student.photo,
      level: student.level,
      adcoinBalance: student.adcoin_balance,
      branchId: student.branch_id,
      studentId: student.student_id,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
