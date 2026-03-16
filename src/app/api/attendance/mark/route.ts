import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { markAttendance, updateSessionTracking } from "@/data/attendance";
import { getUserByAuthId, getUserByEmail } from "@/data/users";
import { supabaseAdmin } from "@/db";
import type { AttendanceStatus, TrialStatus } from "@/db/schema";

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
  adcoin?: number;
  // Lesson and mission
  lesson?: string;
  mission?: string;
  // Trial-specific fields
  instructorFeedback?: string;
  isTrial?: boolean;
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

    // Get the user record from our users table using auth_id, fall back to email
    let user = await getUserByAuthId(authUser.id);
    if (!user && authUser.email) {
      user = await getUserByEmail(authUser.email);
    }
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

    // Check if this is a trial attendance (enrollmentId starts with "trial-")
    if (body.enrollmentId.startsWith('trial-')) {
      const trialId = body.enrollmentId.replace('trial-', '');

      // Map attendance status to trial status
      let trialStatus: TrialStatus;
      if (body.status === 'present' || body.status === 'late') {
        trialStatus = 'completed';
      } else if (body.status === 'absent') {
        trialStatus = 'no_show';
      } else {
        trialStatus = 'cancelled'; // For 'excused' status
      }

      // Fetch existing trial to get current message and scheduled info
      const { data: existingTrial, error: fetchError } = await supabaseAdmin
        .from('trials')
        .select('message, scheduled_date, scheduled_time')
        .eq('id', trialId)
        .single();

      if (fetchError) {
        console.error('Error fetching trial:', fetchError);
        return NextResponse.json(
          { error: "Failed to fetch trial" },
          { status: 500 }
        );
      }

      // Build updated message with instructor feedback
      let updatedMessage = existingTrial?.message || '';
      if (body.instructorFeedback && body.instructorFeedback.trim()) {
        if (updatedMessage) {
          updatedMessage += '\n\n';
        }
        updatedMessage += `Instructor Feedback: ${body.instructorFeedback.trim()}`;
      }

      // Build trial update data
      const trialUpdateData: Record<string, any> = {
        status: trialStatus,
        message: updatedMessage || null,
        updated_at: new Date().toISOString()
      };

      // If day/time changed in modal, update trial's scheduled_date and scheduled_time
      if (body.actualDay && body.actualDay !== existingTrial?.scheduled_date) {
        // Convert day name to actual date (find next occurrence of that day in the week)
        const dayMap: Record<string, number> = {
          'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
          'Thursday': 4, 'Friday': 5, 'Saturday': 6
        };
        const targetDayNum = dayMap[body.actualDay];
        if (targetDayNum !== undefined) {
          const today = new Date();
          const currentDay = today.getDay();
          let diff = targetDayNum - currentDay;
          if (diff < 0) diff += 7;
          const targetDate = new Date(today);
          targetDate.setDate(today.getDate() + diff);
          trialUpdateData.scheduled_date = targetDate.toISOString().split('T')[0];
        }
      }
      if (body.actualStartTime && body.actualStartTime !== existingTrial?.scheduled_time) {
        trialUpdateData.scheduled_time = body.actualStartTime;
      }

      // Update trial status, message, and optionally scheduled_date/time
      const { data: updatedTrial, error: updateError } = await supabaseAdmin
        .from('trials')
        .update(trialUpdateData)
        .eq('id', trialId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating trial status:', updateError);
        return NextResponse.json(
          { error: "Failed to update trial status" },
          { status: 500 }
        );
      }

      // For present/late: Create attendance history record (adcoin = 0)
      // For absent/excused: No attendance record, just trial status update
      if (body.status === 'present' || body.status === 'late') {
        const { data: attendanceRecord, error: attendanceError } = await supabaseAdmin
          .from('attendance')
          .insert({
            trial_id: trialId,
            enrollment_id: null,
            date: body.date,
            status: body.status,
            actual_day: body.actualDay || null,
            actual_start_time: body.actualStartTime || null,
            actual_end_time: body.actualEndTime || null,
            class_type: body.classType || null,
            instructor_name: body.instructorName || null,
            last_activity: body.lastActivity || null,
            project_photos: body.projectPhotos || null,
            notes: body.instructorFeedback || body.notes || null,
            marked_by: user.id,
            adcoin: 0, // Trials always have 0 adcoin
            lesson: body.lesson || null,
            mission: body.mission || null,
          })
          .select()
          .single();

        if (attendanceError) {
          console.error('Error creating trial attendance record:', attendanceError);
          // Don't fail the whole request, trial status was already updated
        }

        return NextResponse.json({
          success: true,
          trial: updatedTrial,
          attendance: attendanceRecord,
          isNew: true,
          trialStatus
        });
      }

      // For absent/excused - no attendance record
      return NextResponse.json({
        success: true,
        trial: updatedTrial,
        isNew: true,
        trialStatus
      });
    }

    console.log('[API Mark Attendance] Received data:', {
      enrollmentId: body.enrollmentId,
      date: body.date,
      actualDay: body.actualDay,
      actualStartTime: body.actualStartTime,
      lesson: body.lesson,
      mission: body.mission,
    });

    const result = await markAttendance(
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
        adcoin: body.adcoin ?? 0,
        lesson: body.lesson,
        mission: body.mission,
      }
    );

    console.log('[API Mark Attendance] Result:', {
      success: !!result.attendance,
      attendanceId: result.attendance?.id,
      isNew: result.isNew,
    });

    if (!result.attendance) {
      return NextResponse.json(
        { error: "Failed to mark attendance" },
        { status: 500 }
      );
    }

    // Update session tracking when:
    // 1. NEW attendance marked as present/late
    // 2. Existing attendance changed FROM non-present TO present/late
    const isNewPresent = result.isNew && (body.status === 'present' || body.status === 'late');
    const wasNotPresent = result.previousStatus && !['present', 'late'].includes(result.previousStatus);
    const isNowPresent = body.status === 'present' || body.status === 'late';
    const changedToPresent = !result.isNew && wasNotPresent && isNowPresent;

    console.log('[Attendance Mark] Session tracking check:', {
      enrollmentId: body.enrollmentId,
      date: body.date,
      isNew: result.isNew,
      status: body.status,
      previousStatus: result.previousStatus,
      isNewPresent,
      wasNotPresent,
      isNowPresent,
      changedToPresent,
      shouldTrack: isNewPresent || changedToPresent
    });

    if (isNewPresent || changedToPresent) {
      console.log('[Attendance Mark] ====== CALLING SESSION TRACKING ======');
      console.log('[Attendance Mark] Enrollment ID:', body.enrollmentId);
      console.log('[Attendance Mark] Date:', body.date);

      const trackingResult = await updateSessionTracking(body.enrollmentId, body.date);

      console.log('[Attendance Mark] Session tracking result:', trackingResult);
      if (!trackingResult.success) {
        console.warn('[Attendance Mark] Session tracking warning:', trackingResult.message);
      }

      // ALWAYS revalidate affected pages after session tracking (even if no pending payment created)
      // This ensures UI updates with the new session count
      revalidatePath("/pending-payments");
      revalidatePath("/student");
      revalidatePath("/attendance");
      revalidatePath("/attendance-log");
      console.log('[Attendance Mark] Revalidated all paths');
    } else {
      console.log('[Attendance Mark] Skipping session tracking - conditions not met');
      console.log('[Attendance Mark] Conditions: isNew=%s, status=%s, previousStatus=%s', result.isNew, body.status, result.previousStatus);
    }

    return NextResponse.json({ success: true, attendance: result.attendance, isNew: result.isNew });
  } catch (error) {
    console.error("Error marking attendance:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
