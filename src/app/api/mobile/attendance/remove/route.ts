import { NextRequest, NextResponse } from "next/server";
import { authenticateMobile } from "@/lib/mobile-auth";
import { deleteAttendance } from "@/data/attendance";
import { getPermissionsForUser } from "@/data/permissions";

// Mobile teacher: remove a mark (un-mark). Token-authed; reuses deleteAttendance so
// the session deducted on a present/late mark is refunded to the enrollment / pool
// (raw deletes are blocked for instructors by RLS and would skip the refund).
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateMobile(request);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (!auth.user) return NextResponse.json({ error: "Not a staff account." }, { status: 403 });

    const perms = await getPermissionsForUser(auth.user.id, auth.user.role);
    // Anyone who can mark attendance can correct/remove their mark within the week.
    if (!perms.attendance?.can_create && !perms.attendance?.can_edit) {
      return NextResponse.json({ error: "You don't have permission to change attendance." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const attendanceId = body?.attendanceId;
    if (!attendanceId || typeof attendanceId !== "string") {
      return NextResponse.json({ error: "Missing attendanceId." }, { status: 400 });
    }

    const ok = await deleteAttendance(attendanceId);
    if (!ok) return NextResponse.json({ error: "Failed to remove attendance." }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}
