import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { searchStudentsForManualAttendance } from "@/data/attendance";

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = request.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json({ rows: [] });
  const rows = await searchStudentsForManualAttendance(user.email, q, 50);
  return NextResponse.json({ rows });
}
