import { NextRequest, NextResponse } from "next/server";
import { authenticateMobile } from "@/lib/mobile-auth";
import { markAttendance, updateSessionTracking } from "@/data/attendance";
import { getPermissionsForUser } from "@/data/permissions";
import type { AttendanceStatus } from "@/db/schema";

// Mobile teacher: mark one student's attendance. Token-authed; reuses the exact
// web logic (markAttendance handles slot-dedup + record; updateSessionTracking
// decrements sessions / stamps expiry / fires renewals — same as the dashboard).
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateMobile(request);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (!auth.user) return NextResponse.json({ error: "Not a staff account." }, { status: 403 });

    const perms = await getPermissionsForUser(auth.user.id, auth.user.role);
    if (!perms.attendance?.can_create) {
      return NextResponse.json({ error: "You don't have permission to mark attendance." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { enrollmentId, date, status, slotDay, slotTime, activities } = body ?? {};
    if (!enrollmentId || !date || !status) {
      return NextResponse.json({ error: "Missing enrollmentId, date or status." }, { status: 400 });
    }
    const valid: AttendanceStatus[] = ["present", "absent", "late", "excused"];
    if (!valid.includes(status)) return NextResponse.json({ error: "Invalid status." }, { status: 400 });

    const result = await markAttendance(enrollmentId, date, status, auth.user.id, undefined, {
      markedBy: auth.user.id,
      adcoin: 0,
      activities: Array.isArray(activities) && activities.length ? activities : null,
      slotDay: slotDay ?? null,
      slotTime: slotTime ?? null,
      actualDay: slotDay ?? null,
      actualStartTime: slotTime ?? null,
    });
    if (!result.attendance) return NextResponse.json({ error: "Failed to mark attendance." }, { status: 500 });

    // Present/late → run the same session-tracking the dashboard runs.
    if (status === "present" || status === "late") {
      await updateSessionTracking(enrollmentId, date);
    }

    return NextResponse.json({ success: true, attendance: result.attendance, isNew: result.isNew });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}
