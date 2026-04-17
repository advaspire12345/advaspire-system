import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getStudentFromCookie } from "@/lib/student-auth";
import { getTransactionsByStudentId } from "@/data/adcoins";
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

    const transactions = await getTransactionsByStudentId(studentId);
    return NextResponse.json(transactions);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
