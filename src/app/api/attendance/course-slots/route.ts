import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getSlotWindowsForCourse } from "@/data/attendance-slots";

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const courseId = request.nextUrl.searchParams.get("courseId");
  if (!courseId) return NextResponse.json({ windows: [] });
  const day = request.nextUrl.searchParams.get("day") || undefined;
  const branchId = request.nextUrl.searchParams.get("branchId") || undefined;
  const windows = await getSlotWindowsForCourse(courseId, day, branchId);
  return NextResponse.json({ windows });
}
