import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getStudentFromCookie } from "@/lib/student-auth";
import { getStudentById, getAdcoinRanking, getStudentRank } from "@/data/students";
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

    const scope = request.nextUrl.searchParams.get("scope") ?? "branch";
    const center = request.nextUrl.searchParams.get("center") === "true";
    const branchId = scope === "branch" ? student.branch_id : undefined;
    const limit = 20;

    let offset = parseInt(request.nextUrl.searchParams.get("offset") ?? "0", 10);

    if (center) {
      const myRank = await getStudentRank(studentId, branchId);
      // Center the window: show ~2 rows before the user's rank
      offset = Math.max(0, myRank - 3);
    }

    const result = await getAdcoinRanking(branchId, limit, offset);

    return NextResponse.json({ ...result, offset });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
