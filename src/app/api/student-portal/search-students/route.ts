import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getStudentFromCookie } from "@/lib/student-auth";
import { getStudentById, searchStudents } from "@/data/students";
import { getBranchRank } from "@/data/student-portal";
import type { RequestCookies } from "next/dist/compiled/@edge-runtime/cookies";

export async function GET(request: NextRequest) {
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

    const query = request.nextUrl.searchParams.get("query") ?? "";
    if (query.length < 2) {
      return NextResponse.json([]);
    }

    const results = await searchStudents(query);

    // Return only safe fields, exclude self, include branch rank
    const filtered = results.filter((s) => s.id !== studentId);
    const withRanks = await Promise.all(
      filtered.map(async (s) => ({
        id: s.id,
        name: s.name,
        studentId: s.student_id,
        photo: s.photo,
        coins: s.adcoin_balance ?? 0,
        branchRank: await getBranchRank(s.id),
      }))
    );

    return NextResponse.json(withRanks);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
