import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { markAttendance } from "@/data/attendance";
import { getUserByAuthId } from "@/data/users";
import type { AttendanceStatus } from "@/db/schema";

interface MarkAttendanceRequest {
  enrollmentId: string;
  date: string;
  status: AttendanceStatus;
  notes?: string;
  actualDay?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  classType?: 'Physical' | 'Online';
  instructorName?: string;
  lastActivity?: string;
  projectPhotos?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser || !authUser.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user record from our users table using auth_id
    const user = await getUserByAuthId(authUser.id);
    if (!user) {
      return NextResponse.json({ error: "User not found in system" }, { status: 401 });
    }

    const body: MarkAttendanceRequest = await request.json();

    if (!body.enrollmentId || !body.date || !body.status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const validStatuses: AttendanceStatus[] = ["present", "absent", "late", "excused"];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    // Validate class type if provided
    if (body.classType && !['Physical', 'Online'].includes(body.classType)) {
      return NextResponse.json(
        { error: "Invalid class type. Must be 'Physical' or 'Online'" },
        { status: 400 }
      );
    }

    // Validate project photos limit
    if (body.projectPhotos && body.projectPhotos.length > 5) {
      return NextResponse.json(
        { error: "Maximum 5 project photos allowed" },
        { status: 400 }
      );
    }

    const attendance = await markAttendance(
      body.enrollmentId,
      body.date,
      body.status,
      user.id,
      body.notes,
      {
        actualDay: body.actualDay,
        actualStartTime: body.actualStartTime,
        actualEndTime: body.actualEndTime,
        classType: body.classType,
        instructorName: body.instructorName,
        lastActivity: body.lastActivity,
        projectPhotos: body.projectPhotos,
        notes: body.notes,
        markedBy: user.id,
      }
    );

    if (!attendance) {
      return NextResponse.json(
        { error: "Failed to mark attendance" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, attendance });
  } catch (error) {
    console.error("Error marking attendance:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
