import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getActiveActivityEventsForStudent } from "@/data/events";

// Returns the list of activity-type events that are still active for a given
// student. Used by the mark-attendance modal's Lesson dropdown to surface
// ongoing activities (e.g. "Spring Showcase") alongside curriculum lessons.

export async function GET(req: NextRequest) {
  const authUser = await getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const studentId = req.nextUrl.searchParams.get("studentId");
  if (!studentId) return NextResponse.json({ error: "Missing studentId" }, { status: 400 });

  const activities = await getActiveActivityEventsForStudent(studentId);
  return NextResponse.json({ activities });
}
