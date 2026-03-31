import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { markAttendance, updateSessionTracking } from "@/data/attendance";
import { getUserByAuthId, getUserByEmail } from "@/data/users";
import { updateAdcoinBalance, getStudentById } from "@/data/students";
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
  // Existing attendance ID for direct updates
  attendanceId?: string;
  // Original slot info from enrollment schedule
  slotDay?: string;
  slotTime?: string;
  // Password for adcoin transfer verification
  adcoinPassword?: string;
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

    // Check permissions
    const { getPermissionsForUser } = await import("@/data/permissions");
    const permissions = await getPermissionsForUser(user.id, user.role);
    if (!permissions.attendance.can_create) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    // ── Duplicate checks (only for new records, skip if editing existing) ──
    if (!body.attendanceId && body.actualDay && body.actualStartTime) {
      const normalizeTime = (t: string | null) => {
        if (!t) return '';
        const parts = t.split(':');
        return parts.length >= 2 ? `${parts[0].padStart(2, '0')}:${parts[1]}` : t;
      };
      const normalizeDay = (d: string | null) => (d || '').toLowerCase().trim();
      const enteredDay = normalizeDay(body.actualDay);
      const enteredTime = normalizeTime(body.actualStartTime);

      // Calculate current week boundaries
      const today = new Date();
      const currentDayOfWeek = today.getDay();
      const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
      const monday = new Date(today);
      monday.setDate(today.getDate() + mondayOffset);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const mondayStr = fmt(monday);
      const sundayStr = fmt(sunday);

      // Fetch all current-week attendance for this enrollment
      const { data: weekRecords } = await supabaseAdmin
        .from('attendance')
        .select('id, slot_day, slot_time, actual_day, actual_start_time, enrollment_id')
        .eq('enrollment_id', body.enrollmentId)
        .gte('date', mondayStr)
        .lte('date', sundayStr);

      // Check 1: Slot duplicate — does this enrollment already have attendance for the same slot?
      if (body.slotDay && body.slotTime) {
        // Mark Present / Mark Absent mode: check by slot_day + slot_time
        const slotDup = (weekRecords ?? []).find(r =>
          normalizeDay(r.slot_day) === normalizeDay(body.slotDay!) &&
          normalizeTime(r.slot_time) === normalizeTime(body.slotTime!)
        );
        if (slotDup) {
          return NextResponse.json(
            { error: `Attendance already exists for this ${body.slotDay} ${body.slotTime} slot this week.` },
            { status: 409 }
          );
        }
      } else {
        // Take Attendance (add) mode: check by slot_day + slot_time OR actual_day + actual_start_time
        const slotDup = (weekRecords ?? []).find(r =>
          // Match by schedule slot info
          (normalizeDay(r.slot_day) === enteredDay && normalizeTime(r.slot_time) === enteredTime) ||
          // Match by actual day+time (any record, regardless of slot info)
          (normalizeDay(r.actual_day) === enteredDay && normalizeTime(r.actual_start_time) === enteredTime)
        );
        if (slotDup) {
          return NextResponse.json(
            { error: `This enrollment already has attendance on ${body.actualDay} at ${body.actualStartTime} this week.` },
            { status: 409 }
          );
        }
      }

      // Check 2: Actual time duplicate — does this student have attendance at the same actual day+time
      // across ANY enrollment (including the same one)?
      const { data: enrollment } = await supabaseAdmin
        .from('enrollments')
        .select('student_id')
        .eq('id', body.enrollmentId)
        .single();

      if (enrollment?.student_id) {
        // Get all enrollments for the student, then query their attendance
        const { data: studentEnrollments } = await supabaseAdmin
          .from('enrollments')
          .select('id')
          .eq('student_id', enrollment.student_id)
          .is('deleted_at', null);

        const enrollmentIds = (studentEnrollments ?? []).map(e => e.id);
        if (enrollmentIds.length > 0) {
          const { data: allStudentRecords } = await supabaseAdmin
            .from('attendance')
            .select('id, actual_day, actual_start_time, enrollment_id')
            .in('enrollment_id', enrollmentIds)
            .gte('date', mondayStr)
            .lte('date', sundayStr);

          const timeDup = (allStudentRecords ?? []).find(r =>
            normalizeDay(r.actual_day) === enteredDay &&
            normalizeTime(r.actual_start_time) === enteredTime
          );
          if (timeDup) {
            const isSameEnrollment = timeDup.enrollment_id === body.enrollmentId;
            return NextResponse.json(
              { error: `This student already has attendance on ${body.actualDay} at ${body.actualStartTime} this week${isSameEnrollment ? '' : ' (different program)'}.` },
              { status: 409 }
            );
          }
        }
      }
    }

    // ── Auto-match slot from enrollment schedule when slotDay/slotTime not provided ──
    // This handles "Take Attendance" (add mode) where the user enters a day+time
    // that matches an existing enrollment schedule slot.
    let resolvedSlotDay = body.slotDay || null;
    let resolvedSlotTime = body.slotTime || null;

    if (!resolvedSlotDay && body.actualDay) {
      const { data: enrollmentData } = await supabaseAdmin
        .from('enrollments')
        .select('schedule, day_of_week, start_time')
        .eq('id', body.enrollmentId)
        .single();

      if (enrollmentData) {
        const normD = (d: string | null) => (d || '').toLowerCase().trim();
        const normT = (t: string | null) => {
          if (!t) return '';
          const parts = t.split(':');
          return parts.length >= 2 ? `${parts[0].padStart(2, '0')}:${parts[1]}` : t;
        };

        interface ScheduleSlot { day: string; time?: string }
        let slots: ScheduleSlot[] = [];

        // Parse schedule field
        if (enrollmentData.schedule) {
          try {
            const parsed = JSON.parse(enrollmentData.schedule as string);
            if (Array.isArray(parsed)) {
              slots = parsed.filter((s: ScheduleSlot) => s.day && s.day.trim());
            }
          } catch { /* ignore */ }
        }

        // Fallback to day_of_week
        if (slots.length === 0 && enrollmentData.day_of_week) {
          try {
            const parsed = JSON.parse(enrollmentData.day_of_week);
            if (Array.isArray(parsed)) {
              slots = parsed.map((d: string) => ({ day: d, time: enrollmentData.start_time ?? undefined }));
            }
          } catch {
            slots = enrollmentData.day_of_week.split(',').map((d: string) => ({
              day: d.trim(),
              time: enrollmentData.start_time ?? undefined,
            }));
          }
        }

        // Find a matching slot
        const match = slots.find(s => {
          const slotDay = s.day.charAt(0).toUpperCase() + s.day.slice(1).toLowerCase();
          const slotTime = s.time || enrollmentData.start_time;
          return normD(slotDay) === normD(body.actualDay!) &&
                 normT(slotTime) === normT(body.actualStartTime!);
        });

        if (match) {
          resolvedSlotDay = match.day.charAt(0).toUpperCase() + match.day.slice(1).toLowerCase();
          resolvedSlotTime = match.time || enrollmentData.start_time;
          console.log('[API Mark Attendance] Auto-matched slot:', resolvedSlotDay, resolvedSlotTime);
        }
      }
    }

    console.log('[API Mark Attendance] Received data:', {
      enrollmentId: body.enrollmentId,
      date: body.date,
      actualDay: body.actualDay,
      actualStartTime: body.actualStartTime,
      slotDay: resolvedSlotDay,
      slotTime: resolvedSlotTime,
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
        attendanceId: body.attendanceId,
        slotDay: resolvedSlotDay,
        slotTime: resolvedSlotTime,
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

    // Create/update adcoin transaction if adcoin > 0 and student is present/late
    if (body.adcoin && body.adcoin > 0 && (body.status === 'present' || body.status === 'late')) {
      // Verify password before processing adcoin transfer
      if (!body.adcoinPassword) {
        return NextResponse.json(
          { error: "Password is required to transfer adcoin." },
          { status: 400 }
        );
      }

      const verifyClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { error: signInError } = await verifyClient.auth.signInWithPassword({
        email: authUser.email!,
        password: body.adcoinPassword,
      });

      if (signInError) {
        return NextResponse.json(
          { error: "Invalid password. Adcoin transfer denied." },
          { status: 401 }
        );
      }
      // Get student_id from enrollment
      const { data: enrollment } = await supabaseAdmin
        .from('enrollments')
        .select('student_id')
        .eq('id', body.enrollmentId)
        .single();

      if (enrollment?.student_id) {
        const student = await getStudentById(enrollment.student_id);
        if (student) {
          const txDescription = `Attendance reward - ${body.date}`;

          // Check if a transaction already exists for this attendance date + student
          const { data: existingTx } = await supabaseAdmin
            .from('adcoin_transactions')
            .select('id, amount')
            .eq('receiver_id', enrollment.student_id)
            .eq('type', 'earned')
            .eq('description', txDescription)
            .maybeSingle();

          if (!existingTx) {
            // No existing transaction — create one
            const { error: txError } = await supabaseAdmin
              .from('adcoin_transactions')
              .insert({
                sender_id: user.id,
                receiver_id: enrollment.student_id,
                type: 'earned',
                amount: body.adcoin,
                description: txDescription,
                verified_by: user.id,
              });

            if (txError) {
              console.warn('[Attendance Mark] Failed to create adcoin transaction:', txError);
            } else {
              await updateAdcoinBalance(enrollment.student_id, student.adcoin_balance + body.adcoin);
            }
          } else if (existingTx.amount !== body.adcoin) {
            // Transaction exists but amount changed — update and adjust balance
            const diff = body.adcoin - existingTx.amount;
            const { error: updateTxError } = await supabaseAdmin
              .from('adcoin_transactions')
              .update({ amount: body.adcoin })
              .eq('id', existingTx.id);

            if (updateTxError) {
              console.warn('[Attendance Mark] Failed to update adcoin transaction:', updateTxError);
            } else {
              await updateAdcoinBalance(enrollment.student_id, student.adcoin_balance + diff);
            }
          }
          // If existingTx.amount === body.adcoin, no change needed
        }
      }
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

    // Invalidate dashboard cache so stats/charts show updated data
    revalidateTag("dashboard", "max");

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
