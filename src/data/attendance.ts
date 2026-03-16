import { supabaseAdmin } from "@/db";
import type {
  Attendance,
  AttendanceInsert,
  AttendanceUpdate,
  AttendanceStatus,
  AttendanceWithEnrollment,
  AttendanceFull,
} from "@/db/schema";

// ============================================
// READ OPERATIONS
// ============================================

export async function getAttendanceById(attendanceId: string): Promise<Attendance | null> {
  const { data, error } = await supabaseAdmin
    .from('attendance')
    .select('*')
    .eq('id', attendanceId)
    .single();

  if (error) {
    console.error('Error fetching attendance:', error);
    return null;
  }

  return data;
}

export async function getAttendanceWithEnrollment(attendanceId: string): Promise<AttendanceWithEnrollment | null> {
  const { data, error } = await supabaseAdmin
    .from('attendance')
    .select(`
      *,
      enrollment:enrollments(
        *,
        student:students(*)
      )
    `)
    .eq('id', attendanceId)
    .single();

  if (error) {
    console.error('Error fetching attendance with enrollment:', error);
    return null;
  }

  return data as AttendanceWithEnrollment;
}

export async function getAttendanceFull(attendanceId: string): Promise<AttendanceFull | null> {
  const { data, error } = await supabaseAdmin
    .from('attendance')
    .select(`
      *,
      enrollment:enrollments(
        *,
        student:students(
          *,
          branch:branches(*)
        ),
        course:courses(*),
        package:course_pricing(*)
      )
    `)
    .eq('id', attendanceId)
    .single();

  if (error) {
    console.error('Error fetching full attendance:', error);
    return null;
  }

  return data as AttendanceFull;
}

export async function getAttendanceByEnrollmentId(enrollmentId: string): Promise<Attendance[]> {
  const { data, error } = await supabaseAdmin
    .from('attendance')
    .select('*')
    .eq('enrollment_id', enrollmentId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching attendance by enrollment:', error);
    return [];
  }

  return data ?? [];
}

export async function getAttendanceByStudentId(studentId: string): Promise<Attendance[]> {
  const { data, error } = await supabaseAdmin
    .from('attendance')
    .select(`
      *,
      enrollments!inner(student_id)
    `)
    .eq('enrollments.student_id', studentId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching attendance by student:', error);
    return [];
  }

  return data ?? [];
}

export async function getAttendanceByDate(date: string, branchId?: string): Promise<AttendanceFull[]> {
  let query = supabaseAdmin
    .from('attendance')
    .select(`
      *,
      enrollment:enrollments(
        *,
        student:students!inner(
          *,
          branch:branches(*)
        ),
        course:courses(*),
        package:course_pricing(*)
      )
    `)
    .eq('date', date)
    .order('created_at', { ascending: false });

  if (branchId) {
    query = query.eq('enrollments.students.branch_id', branchId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching attendance by date:', error);
    return [];
  }

  return data as AttendanceFull[];
}

export async function getAttendanceByDateRange(
  startDate: string,
  endDate: string,
  branchId?: string
): Promise<AttendanceFull[]> {
  let query = supabaseAdmin
    .from('attendance')
    .select(`
      *,
      enrollment:enrollments(
        *,
        student:students!inner(
          *,
          branch:branches(*)
        ),
        course:courses(*),
        package:course_pricing(*)
      )
    `)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false });

  if (branchId) {
    query = query.eq('enrollments.students.branch_id', branchId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching attendance by date range:', error);
    return [];
  }

  return data as AttendanceFull[];
}

export async function getRecentAttendance(
  branchId?: string,
  limit = 50
): Promise<AttendanceFull[]> {
  let query = supabaseAdmin
    .from('attendance')
    .select(`
      *,
      enrollment:enrollments(
        *,
        student:students!inner(
          *,
          branch:branches(*)
        ),
        course:courses(*),
        package:course_pricing(*)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (branchId) {
    query = query.eq('enrollments.students.branch_id', branchId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching recent attendance:', error);
    return [];
  }

  return data as AttendanceFull[];
}

// ============================================
// STATISTICS
// ============================================

export interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  presentRate: number;
}

export async function getAttendanceStats(
  startDate: string,
  endDate: string,
  branchId?: string
): Promise<AttendanceStats> {
  let query = supabaseAdmin
    .from('attendance')
    .select(`
      status,
      enrollments!inner(student_id, students!inner(branch_id))
    `)
    .gte('date', startDate)
    .lte('date', endDate);

  if (branchId) {
    query = query.eq('enrollments.students.branch_id', branchId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching attendance stats:', error);
    return {
      total: 0,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      presentRate: 0,
    };
  }

  const records = data ?? [];
  const total = records.length;
  const present = records.filter(r => r.status === 'present').length;
  const absent = records.filter(r => r.status === 'absent').length;
  const late = records.filter(r => r.status === 'late').length;
  const excused = records.filter(r => r.status === 'excused').length;

  return {
    total,
    present,
    absent,
    late,
    excused,
    presentRate: total > 0 ? ((present + late) / total) * 100 : 0,
  };
}

export async function getAttendanceCount(
  startDate: string,
  endDate: string,
  branchId?: string
): Promise<number> {
  let query = supabaseAdmin
    .from('attendance')
    .select('id, enrollments!inner(student_id, students!inner(branch_id))', { count: 'exact', head: true })
    .gte('date', startDate)
    .lte('date', endDate);

  if (branchId) {
    query = query.eq('enrollments.students.branch_id', branchId);
  }

  const { count, error } = await query;

  if (error) {
    console.error('Error counting attendance:', error);
    return 0;
  }

  return count ?? 0;
}

// ============================================
// WRITE OPERATIONS
// ============================================

export async function createAttendance(attendanceData: AttendanceInsert): Promise<Attendance | null> {
  console.log('[Create Attendance] Creating with data:', JSON.stringify(attendanceData, null, 2));

  const { data, error } = await supabaseAdmin
    .from('attendance')
    .insert(attendanceData)
    .select()
    .single();

  if (error) {
    console.error('[Create Attendance] Error:', error);
    console.error('[Create Attendance] Error details:', JSON.stringify(error, null, 2));
    return null;
  }

  console.log('[Create Attendance] Success! ID:', data.id, 'Date:', data.date, 'Status:', data.status);
  return data;
}

export async function updateAttendance(attendanceId: string, attendanceData: AttendanceUpdate): Promise<Attendance | null> {
  console.log('Updating attendance:', attendanceId, 'with data:', JSON.stringify(attendanceData, null, 2));

  const { data, error } = await supabaseAdmin
    .from('attendance')
    .update(attendanceData)
    .eq('id', attendanceId)
    .select()
    .single();

  if (error) {
    console.error('Error updating attendance:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return null;
  }

  return data;
}

export interface MarkAttendanceData {
  actualDay?: string | null;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  classType?: 'Physical' | 'Online' | null;
  instructorName?: string | null;
  lastActivity?: string | null;
  projectPhotos?: string[] | null;
  notes?: string | null;
  markedBy?: string | null;
  adcoin?: number | null;
  lesson?: string | null;
  mission?: string | null;
}

export interface MarkAttendanceResult {
  attendance: Attendance | null;
  isNew: boolean;
  previousStatus: AttendanceStatus | null;
}

export async function markAttendance(
  enrollmentId: string,
  date: string,
  status: AttendanceStatus,
  markedBy?: string,
  notes?: string,
  data?: MarkAttendanceData
): Promise<MarkAttendanceResult> {
  console.log('markAttendance called with:', { enrollmentId, date, status, markedBy, notes, data });

  // Check if attendance already exists for this enrollment and date
  const { data: existingRecords, error: existingError } = await supabaseAdmin
    .from('attendance')
    .select('id, status, actual_start_time, actual_day')
    .eq('enrollment_id', enrollmentId)
    .eq('date', date);

  if (existingError && existingError.code !== 'PGRST116') {
    console.error('Error checking existing attendance:', existingError);
  }

  // Find an existing record that matches BOTH the day AND time slot
  type ExistingRecord = { id: string; status: AttendanceStatus; actual_start_time: string | null; actual_day: string | null };
  let existing: ExistingRecord | null = null;
  const newStartTime = data?.actualStartTime || null;
  const newActualDay = data?.actualDay || null;

  // Helper to normalize time for comparison (e.g., "11:00" and "11:00:00" should match)
  const normalizeTime = (time: string | null): string => {
    if (!time) return '';
    const parts = time.split(':');
    if (parts.length >= 2) {
      return `${parts[0].padStart(2, '0')}:${parts[1]}`;
    }
    return time;
  };

  // Helper to normalize day for comparison (case-insensitive)
  const normalizeDay = (day: string | null): string => {
    if (!day) return '';
    return day.toLowerCase().trim();
  };

  if (existingRecords && existingRecords.length > 0) {
    console.log('markAttendance: Found', existingRecords.length, 'existing records for this date');
    console.log('markAttendance: Looking for match - day:', newActualDay, 'time:', newStartTime);

    if (newStartTime && newActualDay) {
      // Match by BOTH day AND time - this is the most specific match
      const normalizedNewTime = normalizeTime(newStartTime);
      const normalizedNewDay = normalizeDay(newActualDay);

      const match = existingRecords.find(r => {
        const recordTime = normalizeTime(r.actual_start_time);
        const recordDay = normalizeDay(r.actual_day);
        const timeMatch = recordTime === normalizedNewTime;
        const dayMatch = recordDay === normalizedNewDay;
        console.log('markAttendance: Comparing record', r.id, '- day:', r.actual_day, '(', recordDay, ') time:', r.actual_start_time, '(', recordTime, ') -> dayMatch:', dayMatch, 'timeMatch:', timeMatch);
        return timeMatch && dayMatch;
      });

      existing = match ? (match as ExistingRecord) : null;
      console.log('markAttendance: Day+Time match result:', existing?.id || 'none (will create new)');
    } else if (newStartTime) {
      // Only time provided - match by time only (legacy behavior)
      const normalizedNewTime = normalizeTime(newStartTime);
      const match = existingRecords.find(r => normalizeTime(r.actual_start_time) === normalizedNewTime);
      existing = match ? (match as ExistingRecord) : null;
      console.log('markAttendance: Time-only match:', normalizedNewTime, 'found:', existing?.id || 'none');
    } else {
      // If no time provided, only update if there's exactly one record for this date
      if (existingRecords.length === 1) {
        existing = existingRecords[0] as ExistingRecord;
      }
    }
  }

  const attendanceData: AttendanceInsert = {
    enrollment_id: enrollmentId,
    date,
    status,
    marked_by: data?.markedBy ?? markedBy ?? null,
    notes: data?.notes ?? notes ?? null,
    actual_day: data?.actualDay ?? null,
    actual_start_time: data?.actualStartTime ?? null,
    actual_end_time: data?.actualEndTime ?? null,
    class_type: data?.classType ?? null,
    instructor_name: data?.instructorName ?? null,
    last_activity: data?.lastActivity ?? null,
    project_photos: data?.projectPhotos ?? null,
    adcoin: data?.adcoin ?? 0,
    lesson: data?.lesson ?? null,
    mission: data?.mission ?? null,
  };

  console.log('Prepared attendance data:', attendanceData);

  if (existing) {
    console.log('markAttendance: UPDATING existing attendance:', existing.id, 'day:', existing.actual_day, 'time:', existing.actual_start_time, 'previous status:', existing.status);
    // Update existing - remove enrollment_id and date as they're not in update type
    const { enrollment_id: _, date: __, ...updateData } = attendanceData;
    const attendance = await updateAttendance(existing.id, updateData);
    return { attendance, isNew: false, previousStatus: existing.status as AttendanceStatus };
  }

  console.log('markAttendance: CREATING NEW attendance - day:', newActualDay, 'time:', newStartTime);
  // Create new
  const attendance = await createAttendance(attendanceData);
  return { attendance, isNew: true, previousStatus: null };
}

export async function deleteAttendance(attendanceId: string): Promise<boolean> {
  // First get the attendance record to know enrollment_id and status
  const { data: attendance, error: fetchError } = await supabaseAdmin
    .from('attendance')
    .select('id, enrollment_id, status, trial_id')
    .eq('id', attendanceId)
    .single();

  if (fetchError || !attendance) {
    console.error('Error fetching attendance for delete:', fetchError);
    return false;
  }

  // Delete the attendance record
  const { error } = await supabaseAdmin
    .from('attendance')
    .delete()
    .eq('id', attendanceId);

  if (error) {
    console.error('Error deleting attendance:', error);
    return false;
  }

  // If attendance was for a trial, no session tracking needed
  if (attendance.trial_id) {
    return true;
  }

  // If attendance was present or late, reverse the session deduction
  if (attendance.status === 'present' || attendance.status === 'late') {
    await reverseSessionDeduction(attendance.enrollment_id);
  }

  return true;
}

/**
 * Reverse a session deduction when attendance is deleted
 * Adds 1 session back and removes pending payment if sessions become positive
 */
async function reverseSessionDeduction(enrollmentId: string): Promise<void> {
  // Get enrollment with package info and pool_id
  const { data: enrollment, error: enrollmentError } = await supabaseAdmin
    .from('enrollments')
    .select(`
      id,
      student_id,
      course_id,
      sessions_remaining,
      pool_id,
      package:course_pricing(id, package_type)
    `)
    .eq('id', enrollmentId)
    .single();

  if (enrollmentError || !enrollment) {
    console.error('Error fetching enrollment for session reversal:', enrollmentError);
    return;
  }

  // Check if this enrollment uses a shared session pool
  if (enrollment.pool_id) {
    // Add session back to the shared pool
    const { data: pool } = await supabaseAdmin
      .from('shared_session_pools')
      .select('sessions_remaining')
      .eq('id', enrollment.pool_id)
      .single();

    if (pool) {
      const newPoolSessions = (pool.sessions_remaining ?? 0) + 1;

      await supabaseAdmin
        .from('shared_session_pools')
        .update({
          sessions_remaining: newPoolSessions,
          updated_at: new Date().toISOString(),
        })
        .eq('id', enrollment.pool_id);

      // If pool sessions become positive, delete PENDING payment for this pool
      // NOTE: Only delete payments with status='pending', never delete approved/paid payments
      if (newPoolSessions > 0) {
        const { data: pendingPoolPayment } = await supabaseAdmin
          .from('payments')
          .select('id, status')
          .eq('pool_id', enrollment.pool_id)
          .eq('status', 'pending')
          .maybeSingle();

        if (pendingPoolPayment) {
          console.log(`[Session Reversal] Found pending pool payment to delete:`, pendingPoolPayment);
          await supabaseAdmin
            .from('payments')
            .delete()
            .eq('id', pendingPoolPayment.id)
            .eq('status', 'pending'); // Double-check status to be safe
        }
      }
    }
    return;
  }

  // For regular enrollments, add 1 session back
  const currentSessions = enrollment.sessions_remaining ?? 0;
  const newSessionsRemaining = currentSessions + 1;

  const { error: updateError } = await supabaseAdmin
    .from('enrollments')
    .update({
      sessions_remaining: newSessionsRemaining,
      updated_at: new Date().toISOString(),
    })
    .eq('id', enrollmentId);

  if (updateError) {
    console.error('Error reversing session deduction:', updateError);
    return;
  }

  console.log(`Session reversed for enrollment ${enrollmentId}. ${currentSessions} → ${newSessionsRemaining}`);

  // If sessions become positive, delete any PENDING payment for this student/course
  // NOTE: Only delete payments with status='pending', never delete approved/paid payments
  if (newSessionsRemaining > 0) {
    // First check if there's a pending payment to delete
    const { data: pendingPayment } = await supabaseAdmin
      .from('payments')
      .select('id, status')
      .eq('student_id', enrollment.student_id)
      .eq('course_id', enrollment.course_id)
      .eq('status', 'pending')
      .is('pool_id', null)
      .maybeSingle();

    if (pendingPayment) {
      console.log(`[Session Reversal] Found pending payment to delete:`, pendingPayment);

      const { error: deletePaymentError } = await supabaseAdmin
        .from('payments')
        .delete()
        .eq('id', pendingPayment.id)
        .eq('status', 'pending'); // Double-check status to be safe

      if (deletePaymentError) {
        console.error('Error deleting pending payment:', deletePaymentError);
      } else {
        console.log(`[Session Reversal] Deleted pending payment ${pendingPayment.id} for student ${enrollment.student_id}`);
      }
    } else {
      console.log(`[Session Reversal] No pending payment found for student ${enrollment.student_id}, course ${enrollment.course_id}`);
    }
  }
}

// ============================================
// ATTENDANCE TABLE DATA
// ============================================

export interface AttendanceTableRow {
  id: string;
  enrollmentId: string;
  studentId: string;
  studentName: string;
  studentPhoto: string | null;
  branchId: string;
  branchName: string;
  courseId: string;
  courseName: string;
  packageName: string | null;
  dayOfWeek: string | null;
  slotDay: string; // The specific day for this slot
  slotTime: string | null; // The specific time for this slot
  startTime: string | null;
  endTime: string | null;
  lastAttendanceDate: string | null;
  lastAttendanceStatus: AttendanceStatus | null;
  sessionsRemaining: number;
  // Type to distinguish between enrollment and trial
  type: 'enrollment' | 'trial';
  // Trial-specific fields
  trialId?: string;
  parentName?: string;
  childAge?: number;
  // Existing attendance data for this week (if partially filled)
  existingAttendance?: {
    id: string;
    date: string;
    status: AttendanceStatus;
    classType: 'Physical' | 'Online' | null;
    actualDay: string | null;
    actualStartTime: string | null;
    instructorName: string | null;
    lastActivity: string | null;
    projectPhotos: string[] | null;
    notes: string | null;
    adcoin: number;
    lesson: string | null;
    mission: string | null;
  } | null;
}

// Day order for sorting
const DAY_ORDER: Record<string, number> = {
  'monday': 1,
  'tuesday': 2,
  'wednesday': 3,
  'thursday': 4,
  'friday': 5,
  'saturday': 6,
  'sunday': 7,
};

export async function getEnrollmentsForAttendance(
  userEmail: string
): Promise<AttendanceTableRow[]> {
  // Auto-mark absent for previous week's unmarked slots
  await autoMarkAbsentForPreviousWeek();

  // Import user helpers dynamically to avoid circular imports
  const { getUserBranchIdByEmail } = await import("./users");
  const userBranchId = await getUserBranchIdByEmail(userEmail);

  // Build query - package_id references course_pricing table
  const selectQuery = `
    id,
    student_id,
    course_id,
    day_of_week,
    schedule,
    start_time,
    end_time,
    sessions_remaining,
    student:students!inner(
      id,
      name,
      photo,
      branch_id,
      deleted_at,
      branch:branches!inner(id, name)
    ),
    course:courses!inner(id, name),
    package:course_pricing(description),
    attendance(id, date, status, class_type, actual_day, actual_start_time, instructor_name, last_activity, project_photos, notes, adcoin, lesson, mission)
  `;

  let query = supabaseAdmin
    .from('enrollments')
    .select(selectQuery)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching enrollments for attendance:', error);
    return [];
  }

  // Filter out deleted students and apply branch filter in code
  const filteredData = (data ?? []).filter((enrollment) => {
    const studentData = enrollment.student as unknown as {
      deleted_at: string | null;
      branch_id: string;
    };
    // Filter out deleted students
    if (studentData.deleted_at) return false;
    // Apply branch filter if user has a specific branch
    if (userBranchId && studentData.branch_id !== userBranchId) return false;
    return true;
  });

  const result: AttendanceTableRow[] = [];

  // Calculate current week boundaries (Monday to Sunday) - used for both enrollments and trials
  const today = new Date();
  const currentDayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
  const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  const currentWeekMonday = new Date(today);
  currentWeekMonday.setDate(today.getDate() + mondayOffset);
  currentWeekMonday.setHours(0, 0, 0, 0);
  const currentWeekSunday = new Date(currentWeekMonday);
  currentWeekSunday.setDate(currentWeekMonday.getDate() + 6);

  // Helper to format date as YYYY-MM-DD in local timezone (not UTC)
  const formatLocalDate = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const mondayStr = formatLocalDate(currentWeekMonday);
  const sundayStr = formatLocalDate(currentWeekSunday);

  for (const enrollment of filteredData) {
    // Supabase returns nested relations - handle type coercion safely
    const studentData = enrollment.student as unknown as {
      id: string;
      name: string;
      photo: string | null;
      branch_id: string;
      branch: { id: string; name: string };
    };
    const courseData = enrollment.course as unknown as { id: string; name: string };
    const pkgData = enrollment.package as unknown as { description: string } | null;

    // Full attendance record type
    interface AttendanceRecord {
      id: string;
      date: string;
      status: AttendanceStatus;
      class_type: 'Physical' | 'Online' | null;
      actual_day: string | null;
      actual_start_time: string | null;
      instructor_name: string | null;
      last_activity: string | null;
      project_photos: string[] | null;
      notes: string | null;
      adcoin: number;
      lesson: string | null;
      mission: string | null;
    }
    const attendanceRecords = (enrollment.attendance as unknown as AttendanceRecord[]) ?? [];

    // Get most recent attendance
    const sortedAttendance = [...attendanceRecords].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const lastAttendance = sortedAttendance[0] ?? null;

    // Parse schedule slots from the schedule field
    interface ScheduleEntry {
      day: string;
      time?: string;
    }
    let scheduleSlots: ScheduleEntry[] = [];

    // Try to parse schedule field first (more detailed with day+time per slot)
    if (enrollment.schedule) {
      try {
        const parsed = JSON.parse(enrollment.schedule as string);
        if (Array.isArray(parsed)) {
          scheduleSlots = parsed.filter((entry: ScheduleEntry) => entry.day && entry.day.trim() !== '');
        }
      } catch {
        // Ignore parse errors
      }
    }

    // If no schedule slots found, fall back to day_of_week field
    if (scheduleSlots.length === 0 && enrollment.day_of_week) {
      try {
        // Try to parse as JSON array (e.g., '["friday", "saturday"]')
        const parsed = JSON.parse(enrollment.day_of_week);
        if (Array.isArray(parsed)) {
          scheduleSlots = parsed.map((day: string) => ({
            day: day,
            time: enrollment.start_time ?? undefined
          }));
        }
      } catch {
        // If not JSON, treat as single day or comma-separated
        const days = enrollment.day_of_week.split(',').map((d: string) => d.trim()).filter((d: string) => d !== '');
        scheduleSlots = days.map((day: string) => ({
          day: day,
          time: enrollment.start_time ?? undefined
        }));
      }
    }

    // If still no slots, create a single row with available data
    if (scheduleSlots.length === 0) {
      scheduleSlots = [{
        day: enrollment.day_of_week || 'Not set',
        time: enrollment.start_time ?? undefined
      }];
    }

    // Helper to get day index (0 = Sunday, 1 = Monday, etc.)
    const getDayIndex = (dayName: string): number => {
      const days: Record<string, number> = {
        'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
        'thursday': 4, 'friday': 5, 'saturday': 6
      };
      return days[dayName.toLowerCase()] ?? -1;
    };

    // Get all attendance records for current week
    const currentWeekAttendanceRecords = attendanceRecords.filter(a => {
      const dateStr = a.date.includes('T') ? a.date.split('T')[0] : a.date;
      return dateStr >= mondayStr && dateStr <= sundayStr;
    });

    // Debug: Log attendance records found for this enrollment
    if (currentWeekAttendanceRecords.length > 0) {
      console.log(`[Attendance Table] Enrollment ${enrollment.id} (${studentData.name}) has ${currentWeekAttendanceRecords.length} attendance records this week:`,
        currentWeekAttendanceRecords.map(a => ({ id: a.id, date: a.date, time: a.actual_start_time, status: a.status, classType: a.class_type, instructor: a.instructor_name }))
      );
    }

    // Helper to normalize time for comparison (convert to HH:MM format)
    const normalizeTime = (time: string | null | undefined): string => {
      if (!time) return '';
      // Remove seconds if present (e.g., "17:00:00" -> "17:00")
      const parts = time.split(':');
      if (parts.length >= 2) {
        return `${parts[0].padStart(2, '0')}:${parts[1]}`;
      }
      return time;
    };

    // Track which attendance records have been matched to slots
    const matchedAttendanceIds = new Set<string>();

    // Create a row for each schedule slot for the current week (Mon-Sun)
    for (let i = 0; i < scheduleSlots.length; i++) {
      const slot = scheduleSlots[i];
      const slotDay = slot.day.charAt(0).toUpperCase() + slot.day.slice(1).toLowerCase();
      const slotTime = slot.time || enrollment.start_time;

      // Calculate the date for this slot in the current week
      const slotDayIndex = getDayIndex(slot.day);
      if (slotDayIndex === -1) continue; // Skip invalid days

      // Calculate the slot date within the current week (Monday to Sunday)
      const daysFromMonday = slotDayIndex === 0 ? 6 : slotDayIndex - 1; // Sunday is at end of week
      const slotDate = new Date(currentWeekMonday);
      slotDate.setDate(currentWeekMonday.getDate() + daysFromMonday);
      const slotDateStr = slotDate.toISOString().split('T')[0];

      // Find attendance for THIS specific slot
      // Match by time within the week (attendance might be saved with different date)
      const normalizedSlotTime = normalizeTime(slotTime);
      const todayStr = new Date().toISOString().split('T')[0];

      // Get all unmatched attendance records for this week
      const availableAttendance = currentWeekAttendanceRecords.filter(a => {
        if (matchedAttendanceIds.has(a.id)) return false;
        return true;
      });

      let slotAttendance: AttendanceRecord | undefined;

      // Try to match attendance to this slot
      // Normalize slot day for comparison
      const normalizedSlotDay = slotDay.toLowerCase().trim();

      console.log(`[Slot Match] Looking for slot: day=${normalizedSlotDay}, time=${normalizedSlotTime}, date=${slotDateStr}`);
      console.log(`[Slot Match] Available attendance (${availableAttendance.length}):`,
        availableAttendance.map(a => ({
          id: a.id.substring(0, 8),
          actual_day: a.actual_day,
          actual_start_time: a.actual_start_time,
          lesson: a.lesson
        }))
      );

      // First try: match by actual_day + time (most reliable since user explicitly selects the day)
      slotAttendance = availableAttendance.find(a => {
        const normalizedAttendanceDay = (a.actual_day || '').toLowerCase().trim();
        const normalizedAttendanceTime = normalizeTime(a.actual_start_time);
        const match = normalizedAttendanceDay === normalizedSlotDay && normalizedAttendanceTime === normalizedSlotTime;
        if (match) console.log(`[Slot Match] Try1 MATCHED: day=${normalizedAttendanceDay}, time=${normalizedAttendanceTime}`);
        return match;
      });

      // Second try: exact date + time match
      if (!slotAttendance && normalizedSlotTime) {
        slotAttendance = availableAttendance.find(a => {
          const dateStr = a.date.includes('T') ? a.date.split('T')[0] : a.date;
          const normalizedAttendanceTime = normalizeTime(a.actual_start_time);
          const match = dateStr === slotDateStr && normalizedAttendanceTime === normalizedSlotTime;
          if (match) console.log(`[Slot Match] Try2 MATCHED: date=${dateStr}, time=${normalizedAttendanceTime}`);
          return match;
        });
      }

      // Third try: match by actual_day only (if times don't match but day does)
      if (!slotAttendance) {
        slotAttendance = availableAttendance.find(a => {
          const normalizedAttendanceDay = (a.actual_day || '').toLowerCase().trim();
          const match = normalizedAttendanceDay === normalizedSlotDay;
          if (match) console.log(`[Slot Match] Try3 MATCHED: day=${normalizedAttendanceDay}`);
          return match;
        });
      }

      // Fourth try: time match when there's only ONE unmatched record with this time
      if (!slotAttendance && normalizedSlotTime) {
        const timeMatches = availableAttendance.filter(a => {
          const normalizedAttendanceTime = normalizeTime(a.actual_start_time);
          return normalizedAttendanceTime === normalizedSlotTime;
        });
        if (timeMatches.length === 1) {
          slotAttendance = timeMatches[0];
          console.log(`[Slot Match] Try4 MATCHED: only one time match`);
        }
      }

      console.log(`[Slot Match] Final result for ${slotDay} ${slotTime}:`, slotAttendance ? `FOUND (lesson=${slotAttendance.lesson})` : 'NOT FOUND');

      // If no time match but there's only one attendance for the slot date, use it
      if (!slotAttendance) {
        const slotDateAttendance = availableAttendance.filter(a => {
          const dateStr = a.date.includes('T') ? a.date.split('T')[0] : a.date;
          return dateStr === slotDateStr;
        });
        if (slotDateAttendance.length === 1) {
          slotAttendance = slotDateAttendance[0];
        }
      }

      // Mark this attendance as matched so other slots won't use it
      if (slotAttendance) {
        matchedAttendanceIds.add(slotAttendance.id);
        console.log(`[Attendance Table] Slot ${slotDay} ${slotTime} matched to attendance:`, {
          id: slotAttendance.id,
          date: slotAttendance.date,
          status: slotAttendance.status,
          classType: slotAttendance.class_type,
          instructor: slotAttendance.instructor_name
        });
      } else {
        console.log(`[Attendance Table] Slot ${slotDay} ${slotTime} (date: ${slotDateStr}) - NO attendance matched. Available: ${availableAttendance.length}`);
      }

      // Check if THIS slot's attendance is complete
      const isSlotComplete = slotAttendance &&
        slotAttendance.class_type &&
        slotAttendance.instructor_name;

      // Skip this slot only if its attendance is complete
      if (isSlotComplete) {
        continue;
      }

      result.push({
        id: `${enrollment.id}-slot-${i}-${slotDateStr}`,
        enrollmentId: enrollment.id,
        studentId: studentData.id,
        studentName: studentData.name,
        studentPhoto: studentData.photo,
        branchId: studentData.branch_id,
        branchName: studentData.branch.name,
        courseId: courseData.id,
        courseName: courseData.name,
        packageName: pkgData?.description ?? null,
        dayOfWeek: enrollment.day_of_week,
        slotDay: slotDay,
        slotTime: slotTime,
        startTime: enrollment.start_time,
        endTime: enrollment.end_time,
        // Use this slot's specific attendance date, not the enrollment's overall last attendance
        lastAttendanceDate: slotAttendance?.date ?? null,
        lastAttendanceStatus: slotAttendance?.status ?? null,
        sessionsRemaining: enrollment.sessions_remaining,
        type: 'enrollment',
        // Include existing attendance data if partially filled
        existingAttendance: slotAttendance ? {
          id: slotAttendance.id,
          date: slotAttendance.date,
          status: slotAttendance.status,
          classType: slotAttendance.class_type,
          actualDay: slotAttendance.actual_day,
          actualStartTime: slotAttendance.actual_start_time,
          instructorName: slotAttendance.instructor_name,
          lastActivity: slotAttendance.last_activity,
          projectPhotos: slotAttendance.project_photos,
          notes: slotAttendance.notes,
          adcoin: slotAttendance.adcoin ?? 0,
          lesson: slotAttendance.lesson,
          mission: slotAttendance.mission,
        } : null,
      });
    }

    // Also create rows for any UNMATCHED incomplete attendance records
    // This handles cases where attendance was added manually without matching schedule slots
    // But only if the day/time combination doesn't already exist in result
    const unmatchedAttendance = currentWeekAttendanceRecords.filter(a =>
      !matchedAttendanceIds.has(a.id)
    );

    // Track which day+time combinations we've already added for this enrollment
    const addedSlots = new Set<string>();

    // Add existing slots to the set
    for (const row of result) {
      if (row.enrollmentId === enrollment.id) {
        const slotKey = `${row.slotDay}-${normalizeTime(row.slotTime)}`;
        addedSlots.add(slotKey);
      }
    }

    for (let j = 0; j < unmatchedAttendance.length; j++) {
      const attendance = unmatchedAttendance[j];

      // Check if this attendance is complete
      const isComplete = attendance.class_type && attendance.instructor_name;
      if (isComplete) {
        continue; // Skip complete attendance
      }

      // Get the day name from the attendance date
      const attendanceDate = new Date(attendance.date);
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const attendanceDayName = dayNames[attendanceDate.getDay()];
      const attendanceDay = attendance.actual_day || attendanceDayName;
      const attendanceTime = attendance.actual_start_time || enrollment.start_time;

      // Check if this day+time already exists - if so, skip to avoid duplicates
      const slotKey = `${attendanceDay}-${normalizeTime(attendanceTime)}`;
      if (addedSlots.has(slotKey)) {
        continue;
      }
      addedSlots.add(slotKey);

      result.push({
        id: `${enrollment.id}-attendance-${attendance.id}`,
        enrollmentId: enrollment.id,
        studentId: studentData.id,
        studentName: studentData.name,
        studentPhoto: studentData.photo,
        branchId: studentData.branch_id,
        branchName: studentData.branch.name,
        courseId: courseData.id,
        courseName: courseData.name,
        packageName: pkgData?.description ?? null,
        dayOfWeek: enrollment.day_of_week,
        slotDay: attendanceDay,
        slotTime: attendanceTime,
        startTime: attendanceTime,
        endTime: enrollment.end_time,
        // Use this specific attendance's date, not the enrollment's overall last attendance
        lastAttendanceDate: attendance.date,
        lastAttendanceStatus: attendance.status,
        sessionsRemaining: enrollment.sessions_remaining,
        type: 'enrollment',
        existingAttendance: {
          id: attendance.id,
          date: attendance.date,
          status: attendance.status,
          classType: attendance.class_type,
          actualDay: attendance.actual_day,
          actualStartTime: attendance.actual_start_time,
          instructorName: attendance.instructor_name,
          lastActivity: attendance.last_activity,
          projectPhotos: attendance.project_photos,
          notes: attendance.notes,
          adcoin: attendance.adcoin ?? 0,
          lesson: attendance.lesson,
          mission: attendance.mission,
        },
      });
    }
  }

  // ============================================
  // FETCH TRIALS WITHIN CURRENT WEEK
  // ============================================

  // Fetch trials with status 'pending' or 'confirmed' whose scheduled_date is within current week
  const { data: trialsData, error: trialsError } = await supabaseAdmin
    .from('trials')
    .select(`
      id,
      parent_name,
      child_name,
      child_age,
      branch_id,
      course_id,
      scheduled_date,
      scheduled_time,
      status,
      branch:branches!inner(id, name),
      course:courses(id, name)
    `)
    .in('status', ['pending', 'confirmed'])
    .gte('scheduled_date', mondayStr)
    .lte('scheduled_date', sundayStr)
    .is('deleted_at', null);

  if (trialsError) {
    console.error('Error fetching trials for attendance:', trialsError);
  } else {
    // Filter trials by branch if user has a specific branch
    const filteredTrials = (trialsData ?? []).filter((trial) => {
      if (userBranchId && trial.branch_id !== userBranchId) return false;
      return true;
    });

    for (const trial of filteredTrials) {
      const branchData = trial.branch as unknown as { id: string; name: string };
      const trialCourseData = trial.course as unknown as { id: string; name: string } | null;

      // Get day name from scheduled_date
      const trialDate = new Date(trial.scheduled_date);
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const slotDay = dayNames[trialDate.getDay()];

      result.push({
        id: `trial-${trial.id}`,
        enrollmentId: `trial-${trial.id}`, // Special identifier for trials
        studentId: `trial-${trial.id}`,
        studentName: `${trial.child_name} (Trial)`,
        studentPhoto: null,
        branchId: trial.branch_id,
        branchName: branchData.name,
        courseId: trialCourseData?.id ?? '',
        courseName: trialCourseData?.name ?? 'Trial Class',
        packageName: 'Trial',
        dayOfWeek: slotDay,
        slotDay: slotDay,
        slotTime: trial.scheduled_time,
        startTime: trial.scheduled_time,
        endTime: null,
        lastAttendanceDate: null,
        lastAttendanceStatus: null,
        sessionsRemaining: 1,
        type: 'trial',
        trialId: trial.id,
        parentName: trial.parent_name,
        childAge: trial.child_age,
        existingAttendance: null,
      });
    }
  }

  // Sort by day order, then by time, then by student name
  result.sort((a, b) => {
    const dayA = DAY_ORDER[a.slotDay.toLowerCase()] ?? 8;
    const dayB = DAY_ORDER[b.slotDay.toLowerCase()] ?? 8;
    if (dayA !== dayB) return dayA - dayB;

    // Sort by time
    const timeA = a.slotTime || '23:59';
    const timeB = b.slotTime || '23:59';
    if (timeA !== timeB) return timeA.localeCompare(timeB);

    // Sort by student name
    return a.studentName.localeCompare(b.studentName);
  });

  return result;
}

export async function getBranchesForAttendance(
  userEmail: string
): Promise<{ id: string; name: string }[]> {
  const { getUserBranchIdByEmail } = await import("./users");
  const userBranchId = await getUserBranchIdByEmail(userEmail);

  let query = supabaseAdmin
    .from('branches')
    .select('id, name')
    .is('deleted_at', null)
    .order('name');

  if (userBranchId) {
    query = query.eq('id', userBranchId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching branches:', error);
    return [];
  }

  return data ?? [];
}

// ============================================
// ALL STUDENTS FOR MANUAL ATTENDANCE
// ============================================

/**
 * Get all active students with their enrollments for manual attendance.
 * Unlike getEnrollmentsForAttendance, this does NOT filter out students
 * with complete attendance - it returns ALL active students so they can
 * be found in the manual "Take Attendance" search.
 */
export async function getAllStudentsForManualAttendance(
  userEmail: string
): Promise<AttendanceTableRow[]> {
  const { getUserBranchIdByEmail } = await import("./users");
  const userBranchId = await getUserBranchIdByEmail(userEmail);

  const { data, error } = await supabaseAdmin
    .from('enrollments')
    .select(`
      id,
      student_id,
      course_id,
      day_of_week,
      schedule,
      start_time,
      end_time,
      sessions_remaining,
      student:students!inner(
        id,
        name,
        photo,
        branch_id,
        deleted_at,
        branch:branches!inner(id, name)
      ),
      course:courses!inner(id, name),
      package:course_pricing(description)
    `)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all students for manual attendance:', error);
    return [];
  }

  // Filter by branch and deleted students
  const filteredData = (data ?? []).filter((enrollment) => {
    const studentData = enrollment.student as unknown as {
      deleted_at: string | null;
      branch_id: string;
    };
    if (studentData.deleted_at) return false;
    if (userBranchId && studentData.branch_id !== userBranchId) return false;
    return true;
  });

  const result: AttendanceTableRow[] = [];

  // Helper to format date as YYYY-MM-DD
  const formatLocalDate = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = new Date();
  const todayStr = formatLocalDate(today);

  for (const enrollment of filteredData) {
    const studentData = enrollment.student as unknown as {
      id: string;
      name: string;
      photo: string | null;
      branch_id: string;
      branch: { id: string; name: string };
    };
    const courseData = enrollment.course as unknown as { id: string; name: string };
    const pkgData = enrollment.package as unknown as { description: string } | null;

    // Get start time from schedule or default
    let slotTime = enrollment.start_time;
    if (enrollment.schedule) {
      try {
        const parsed = JSON.parse(enrollment.schedule as string);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].time) {
          slotTime = parsed[0].time;
        }
      } catch { /* ignore */ }
    }

    result.push({
      id: `manual-${enrollment.id}`,
      enrollmentId: enrollment.id,
      studentId: studentData.id,
      studentName: studentData.name,
      studentPhoto: studentData.photo,
      branchId: studentData.branch_id,
      branchName: studentData.branch.name,
      courseId: courseData.id,
      courseName: courseData.name,
      packageName: pkgData?.description ?? null,
      dayOfWeek: enrollment.day_of_week,
      slotDay: 'Manual',
      slotTime: slotTime,
      startTime: enrollment.start_time,
      endTime: enrollment.end_time,
      lastAttendanceDate: null,
      lastAttendanceStatus: null,
      sessionsRemaining: enrollment.sessions_remaining,
      type: 'enrollment',
      existingAttendance: null,
    });
  }

  // Sort by student name
  result.sort((a, b) => a.studentName.localeCompare(b.studentName));

  return result;
}

// ============================================
// STUDENT ENROLLMENT HELPERS
// ============================================

export interface StudentEnrollmentForAttendance {
  enrollmentId: string;
  courseId: string;
  courseName: string;
  packageId: string | null;
  packageName: string | null;
  dayOfWeek: string | null;
  startTime: string | null;
  endTime: string | null;
  sessionsRemaining: number;
}

export async function getStudentActiveEnrollments(
  studentId: string
): Promise<StudentEnrollmentForAttendance[]> {
  const { data, error } = await supabaseAdmin
    .from('enrollments')
    .select(`
      id,
      course_id,
      package_id,
      day_of_week,
      start_time,
      end_time,
      sessions_remaining,
      course:courses!inner(id, name),
      package:course_pricing(id, description)
    `)
    .eq('student_id', studentId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching student active enrollments:', error);
    return [];
  }

  return (data ?? []).map((enrollment) => {
    const courseData = enrollment.course as unknown as { id: string; name: string };
    const pkgData = enrollment.package as unknown as { id: string; description: string } | null;

    return {
      enrollmentId: enrollment.id,
      courseId: courseData.id,
      courseName: courseData.name,
      packageId: pkgData?.id ?? null,
      packageName: pkgData?.description ?? null,
      dayOfWeek: enrollment.day_of_week,
      startTime: enrollment.start_time,
      endTime: enrollment.end_time,
      sessionsRemaining: enrollment.sessions_remaining ?? 0,
    };
  });
}

// ============================================
// AUTO-MARK ABSENT FOR PREVIOUS WEEK
// ============================================

/**
 * Automatically marks absent for all unmarked attendance slots from previous weeks.
 * This should be called when loading the attendance page to clean up old unmarked slots.
 */
export async function autoMarkAbsentForPreviousWeek(): Promise<number> {
  // Calculate Monday of current week
  const today = new Date();
  const currentDayOfWeek = today.getDay();
  const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  const currentWeekMonday = new Date(today);
  currentWeekMonday.setDate(today.getDate() + mondayOffset);
  currentWeekMonday.setHours(0, 0, 0, 0);

  // Get all active enrollments with their schedules and attendance
  const { data: enrollments, error } = await supabaseAdmin
    .from('enrollments')
    .select(`
      id,
      enrolled_at,
      schedule,
      day_of_week,
      start_time,
      attendance(date, status)
    `)
    .eq('status', 'active')
    .is('deleted_at', null);

  if (error) {
    console.error('Error fetching enrollments for auto-mark absent:', error);
    return 0;
  }

  const getDayIndex = (dayName: string): number => {
    const days: Record<string, number> = {
      'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
      'thursday': 4, 'friday': 5, 'saturday': 6
    };
    return days[dayName.toLowerCase()] ?? -1;
  };

  let markedCount = 0;

  // Calculate last week's Monday
  const lastWeekMonday = new Date(currentWeekMonday);
  lastWeekMonday.setDate(lastWeekMonday.getDate() - 7);

  for (const enrollment of enrollments ?? []) {
    // Parse schedule slots
    interface ScheduleEntry { day: string; time?: string; }
    let scheduleSlots: ScheduleEntry[] = [];

    if (enrollment.schedule) {
      try {
        const parsed = JSON.parse(enrollment.schedule as string);
        if (Array.isArray(parsed)) {
          scheduleSlots = parsed.filter((entry: ScheduleEntry) => entry.day && entry.day.trim() !== '');
        }
      } catch { /* ignore */ }
    }

    if (scheduleSlots.length === 0 && enrollment.day_of_week) {
      try {
        const parsed = JSON.parse(enrollment.day_of_week);
        if (Array.isArray(parsed)) {
          scheduleSlots = parsed.map((day: string) => ({ day }));
        }
      } catch {
        const days = enrollment.day_of_week.split(',').map((d: string) => d.trim()).filter((d: string) => d !== '');
        scheduleSlots = days.map((day: string) => ({ day }));
      }
    }

    // Get existing attendance dates
    const attendanceRecords = (enrollment.attendance as unknown as { date: string; status: AttendanceStatus }[]) ?? [];
    const markedDates = new Set(attendanceRecords.map(a => a.date));

    // Check each slot for last week
    for (const slot of scheduleSlots) {
      const slotDayIndex = getDayIndex(slot.day);
      if (slotDayIndex === -1) continue;

      const daysFromMonday = slotDayIndex === 0 ? 6 : slotDayIndex - 1;
      const lastWeekSlotDate = new Date(lastWeekMonday);
      lastWeekSlotDate.setDate(lastWeekMonday.getDate() + daysFromMonday);
      const lastWeekSlotDateStr = lastWeekSlotDate.toISOString().split('T')[0];

      // If not marked, auto-mark as absent
      // But only if the enrollment existed at that time (don't mark absent for dates before enrollment)
      if (!markedDates.has(lastWeekSlotDateStr)) {
        // Check if enrollment existed on this date
        const enrolledAt = enrollment.enrolled_at ? new Date(enrollment.enrolled_at) : null;
        if (enrolledAt) {
          enrolledAt.setHours(0, 0, 0, 0);
          // Only mark absent if the slot date is on or after the enrollment date
          if (lastWeekSlotDate < enrolledAt) {
            continue; // Skip - student wasn't enrolled yet
          }
        }

        const result = await markAttendance(
          enrollment.id,
          lastWeekSlotDateStr,
          'absent',
          undefined, // markedBy - null for system auto-mark
          'Auto-marked absent (previous week unmarked)'
        );
        if (result.attendance) {
          markedCount++;
        }
      }
    }
  }

  return markedCount;
}

// ============================================
// BULK OPERATIONS
// ============================================

export async function markBulkAttendance(
  records: Array<{ enrollmentId: string; date: string; status: AttendanceStatus }>,
  markedBy?: string
): Promise<number> {
  let successCount = 0;

  for (const record of records) {
    const result = await markAttendance(
      record.enrollmentId,
      record.date,
      record.status,
      markedBy
    );
    if (result.attendance) {
      successCount++;
    }
  }

  return successCount;
}

// ============================================
// SESSION TRACKING FOR ATTENDANCE
// ============================================

/**
 * Updates enrollment session tracking when attendance is marked as present.
 *
 * For SESSION packages:
 * - Deduct 1 from sessions_remaining
 *
 * For MONTHLY packages:
 * - If period_start is null, set it to the attendance date (first attendance starts the period)
 * - Count sessions in the current period
 * - If attendance is after period_end (period expired):
 *   - If < 3 sessions during period: wait mode, new period starts from this attendance
 *   - If >= 3 sessions: normal completion, new period starts from this attendance
 * - If > 4 sessions during active period: shorten period, new period starts from this attendance
 */
export async function updateSessionTracking(
  enrollmentId: string,
  attendanceDate: string
): Promise<{ success: boolean; message?: string }> {
  console.log('');
  console.log('========================================');
  console.log('[Session Tracking] FUNCTION CALLED');
  console.log('[Session Tracking] Enrollment ID:', enrollmentId);
  console.log('[Session Tracking] Attendance Date:', attendanceDate);
  console.log('========================================');

  // Get enrollment with package info and pool_id
  const { data: enrollment, error: enrollmentError } = await supabaseAdmin
    .from('enrollments')
    .select(`
      id,
      student_id,
      course_id,
      package_id,
      sessions_remaining,
      period_start,
      pool_id,
      package:course_pricing(id, package_type, duration, price)
    `)
    .eq('id', enrollmentId)
    .single();

  if (enrollmentError || !enrollment) {
    console.error('Error fetching enrollment for session tracking:', enrollmentError);
    return { success: false, message: 'Enrollment not found' };
  }

  const packageData = enrollment.package as unknown as {
    id: string;
    package_type: 'session' | 'monthly';
    duration: number;
    price: number;
  } | null;

  console.log('[Session Tracking] Enrollment data:', {
    id: enrollment.id,
    student_id: enrollment.student_id,
    course_id: enrollment.course_id,
    sessions_remaining: enrollment.sessions_remaining,
    pool_id: enrollment.pool_id,
    package: packageData,
  });

  // If no package assigned, still track sessions and create pending payment if needed
  if (!packageData) {
    console.log('[Session Tracking] No package assigned, treating as session-based');
    // Deduct session and create pending payment if depleted
    const currentSessions = enrollment.sessions_remaining ?? 0;
    const newSessionsRemaining = currentSessions - 1;

    console.log('[Session Tracking] Deducting session (no package):', currentSessions, '→', newSessionsRemaining);

    const { error: updateError } = await supabaseAdmin
      .from('enrollments')
      .update({
        sessions_remaining: newSessionsRemaining,
        updated_at: new Date().toISOString(),
      })
      .eq('id', enrollmentId);

    if (updateError) {
      console.error('[Session Tracking] Error updating sessions:', updateError);
      return { success: false, message: 'Failed to update sessions' };
    }

    console.log('[Session Tracking] Sessions updated successfully. New value:', newSessionsRemaining);

    // Create pending payment if sessions depleted (0 or negative)
    console.log('[Session Tracking] Checking if pending payment needed: newSessionsRemaining =', newSessionsRemaining, ', condition (<=0):', newSessionsRemaining <= 0);

    if (newSessionsRemaining <= 0) {
      console.log('[Session Tracking] *** SESSIONS DEPLETED (no package) *** Creating pending payment...');
      const { createEnrollmentRenewalPayment } = await import("./payments");
      const payment = await createEnrollmentRenewalPayment(enrollmentId);
      if (payment) {
        console.log('[Session Tracking] *** PENDING PAYMENT CREATED *** ID:', payment.id);
      } else {
        console.log('[Session Tracking] *** PENDING PAYMENT NOT CREATED - TRYING FORCE CREATE ***');

        // Force create as safety check
        const { data: existingPending } = await supabaseAdmin
          .from('payments')
          .select('id')
          .eq('student_id', enrollment.student_id)
          .eq('status', 'pending')
          .is('pool_id', null)
          .limit(1);

        if (!existingPending || existingPending.length === 0) {
          console.log('[Session Tracking] No pending payment found - FORCE CREATING');

          // Get price from enrollment's package, fallback to course pricing
          let price = 0;
          if (enrollment.package_id) {
            const { data: pkgPricing } = await supabaseAdmin
              .from('course_pricing')
              .select('price')
              .eq('id', enrollment.package_id)
              .maybeSingle();
            price = pkgPricing?.price || 0;
          }
          if (price === 0 && enrollment.course_id) {
            const { data: coursePricing } = await supabaseAdmin
              .from('course_pricing')
              .select('price')
              .eq('course_id', enrollment.course_id)
              .is('deleted_at', null)
              .limit(1)
              .maybeSingle();
            price = coursePricing?.price || 0;
          }

          // Note: Don't set package_id - it references legacy 'packages' table, not 'course_pricing'
          // Package is looked up by course_id + amount in getPendingPaymentsForTable
          const { data: forcePayment, error: forceError } = await supabaseAdmin
            .from('payments')
            .insert({
              student_id: enrollment.student_id,
              course_id: enrollment.course_id,
              amount: price,
              payment_type: 'package',
              status: 'pending',
              notes: 'Auto-created pending payment',
            })
            .select()
            .single();

          if (forceError) {
            console.error('[Session Tracking] FORCE CREATE ERROR:', forceError);
          } else {
            console.log('[Session Tracking] *** FORCE CREATED PAYMENT:', forcePayment.id, '***');
          }
        } else {
          console.log('[Session Tracking] Pending payment already exists:', existingPending[0].id);
        }
      }
    } else {
      console.log('[Session Tracking] Sessions still positive, no pending payment needed');
    }

    return { success: true, message: `Session deducted (no package). ${newSessionsRemaining} remaining.` };
  }

  const packageType = packageData.package_type;

  // Check if this enrollment uses a shared session pool
  if (enrollment.pool_id) {
    // Deduct from the shared pool - each sibling's attendance deducts 1 session
    const { deductPoolSession, getPoolById } = await import("./pools");
    const { createPoolRenewalPayment } = await import("./payments");

    const newRemaining = await deductPoolSession(enrollment.pool_id);

    if (newRemaining === null) {
      return { success: false, message: 'Failed to deduct from shared pool' };
    }

    // If pool is depleted (0 or negative), create a renewal payment
    if (newRemaining <= 0) {
      const pool = await getPoolById(enrollment.pool_id);
      if (pool) {
        await createPoolRenewalPayment(enrollment.pool_id);
      }
    }

    return {
      success: true,
      message: `Shared pool session deducted. ${newRemaining} remaining in pool.`
    };
  }

  // Get current sessions (can be negative if used before payment)
  const currentSessions = enrollment.sessions_remaining ?? 0;

  console.log('[Session Tracking] Package type:', packageType, 'Current sessions:', currentSessions);

  // Handle SESSION packages - simply deduct (allow negative for tracking)
  if (packageType === 'session') {
    const newSessionsRemaining = currentSessions - 1;

    console.log('[Session Tracking] SESSION package: deducting', currentSessions, '→', newSessionsRemaining);

    const { error: updateError } = await supabaseAdmin
      .from('enrollments')
      .update({
        sessions_remaining: newSessionsRemaining,
        updated_at: new Date().toISOString(),
      })
      .eq('id', enrollmentId);

    if (updateError) {
      console.error('[Session Tracking] Error updating sessions_remaining:', updateError);
      return { success: false, message: 'Failed to update sessions' };
    }

    console.log('[Session Tracking] Sessions updated successfully. New value:', newSessionsRemaining);

    // If sessions depleted (0 or negative), create a pending payment
    console.log('[Session Tracking] Checking if pending payment needed: newSessionsRemaining =', newSessionsRemaining, ', condition (<=0):', newSessionsRemaining <= 0);

    if (newSessionsRemaining <= 0) {
      console.log('[Session Tracking] *** SESSIONS DEPLETED *** Creating pending payment for enrollment:', enrollmentId);
      const { createEnrollmentRenewalPayment, createPayment } = await import("./payments");
      const payment = await createEnrollmentRenewalPayment(enrollmentId);
      if (payment) {
        console.log('[Session Tracking] *** PENDING PAYMENT CREATED *** ID:', payment.id);
      } else {
        console.log('[Session Tracking] *** PENDING PAYMENT NOT CREATED - TRYING FORCE CREATE ***');

        // Force create as safety check
        const { data: existingPending } = await supabaseAdmin
          .from('payments')
          .select('id')
          .eq('student_id', enrollment.student_id)
          .eq('status', 'pending')
          .is('pool_id', null)
          .limit(1);

        if (!existingPending || existingPending.length === 0) {
          console.log('[Session Tracking] No pending payment found - FORCE CREATING');

          // Get price from enrollment's package (already fetched), fallback to course pricing
          let price = packageData?.price || 0;
          if (price === 0 && enrollment.package_id) {
            const { data: pkgPricing } = await supabaseAdmin
              .from('course_pricing')
              .select('price')
              .eq('id', enrollment.package_id)
              .maybeSingle();
            price = pkgPricing?.price || 0;
          }
          if (price === 0 && enrollment.course_id) {
            const { data: coursePricing } = await supabaseAdmin
              .from('course_pricing')
              .select('price')
              .eq('course_id', enrollment.course_id)
              .is('deleted_at', null)
              .limit(1)
              .maybeSingle();
            price = coursePricing?.price || 0;
          }

          // Note: Don't set package_id - it references legacy 'packages' table, not 'course_pricing'
          // Package is looked up by course_id + amount in getPendingPaymentsForTable
          const { data: forcePayment, error: forceError } = await supabaseAdmin
            .from('payments')
            .insert({
              student_id: enrollment.student_id,
              course_id: enrollment.course_id,
              amount: price,
              payment_type: 'package',
              status: 'pending',
              notes: 'Auto-created pending payment',
            })
            .select()
            .single();

          if (forceError) {
            console.error('[Session Tracking] FORCE CREATE ERROR:', forceError);
          } else {
            console.log('[Session Tracking] *** FORCE CREATED PAYMENT:', forcePayment.id, '***');
          }
        } else {
          console.log('[Session Tracking] Pending payment already exists:', existingPending[0].id);
        }
      }
    } else {
      console.log('[Session Tracking] Sessions still positive, no pending payment needed');
    }

    return { success: true, message: `Session deducted. ${newSessionsRemaining} remaining.` };
  }

  // Handle MONTHLY packages
  if (packageType === 'monthly') {
    const attendanceDateObj = new Date(attendanceDate);
    attendanceDateObj.setHours(0, 0, 0, 0);

    let periodStart = enrollment.period_start ? new Date(enrollment.period_start) : null;
    let needsNewPeriod = false;
    let shouldDeductMonth = false;

    // If no period_start, this is the first attendance - start the period
    if (!periodStart) {
      needsNewPeriod = true;
      shouldDeductMonth = true; // Deduct 1 month when starting first period
    } else {
      periodStart.setHours(0, 0, 0, 0);

      // Calculate period end (add duration months)
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1); // Each period is 1 month

      // Count sessions in current period
      const { count: sessionCount, error: countError } = await supabaseAdmin
        .from('attendance')
        .select('id', { count: 'exact', head: true })
        .eq('enrollment_id', enrollmentId)
        .in('status', ['present', 'late'])
        .gte('date', periodStart.toISOString().split('T')[0])
        .lt('date', periodEnd.toISOString().split('T')[0]);

      if (countError) {
        console.error('Error counting sessions:', countError);
      }

      const currentSessionCount = (sessionCount ?? 0) + 1; // +1 for current attendance

      // Check if attendance is after period end (period expired)
      if (attendanceDateObj >= periodEnd) {
        // Period has ended - start a new period from this attendance
        needsNewPeriod = true;
        shouldDeductMonth = true; // Deduct 1 month for new period
      } else if (currentSessionCount > 4) {
        // More than 4 sessions in the period - shorten the period
        // Start a new period from this attendance
        needsNewPeriod = true;
        shouldDeductMonth = true; // Deduct 1 month for new period
      }
    }

    if (needsNewPeriod) {
      const newPeriodStart = attendanceDate;
      // Allow negative sessions for tracking sessions used before payment
      const newSessionsRemaining = shouldDeductMonth ? currentSessions - 1 : currentSessions;

      const { error: updateError } = await supabaseAdmin
        .from('enrollments')
        .update({
          period_start: newPeriodStart,
          sessions_remaining: newSessionsRemaining,
          updated_at: new Date().toISOString(),
        })
        .eq('id', enrollmentId);

      if (updateError) {
        console.error('Error updating period_start:', updateError);
        return { success: false, message: 'Failed to update period' };
      }

      // If months depleted (0 or negative), create a pending payment
      if (newSessionsRemaining <= 0) {
        const { createEnrollmentRenewalPayment } = await import("./payments");
        await createEnrollmentRenewalPayment(enrollmentId);
      }

      return { success: true, message: `New period started from ${newPeriodStart}. ${newSessionsRemaining} months remaining.` };
    }

    return { success: true, message: 'Session tracked within current period' };
  }

  return { success: true };
}

// ============================================
// ATTENDANCE LOG DATA
// ============================================

export interface AttendanceLogRow {
  id: string;
  date: string;
  studentId: string;
  studentName: string;
  studentPhoto: string | null;
  studentLevel: number;
  branchId: string;
  branchName: string;
  courseId: string;
  courseName: string;
  packageName: string | null;
  classType: 'Physical' | 'Online' | null;
  actualStartTime: string | null;
  status: AttendanceStatus;
  lastActivity: string | null;
  instructorName: string | null;
  markedBy: string | null;
  notes: string | null;
  createdAt: string;
  enrollmentId: string;
  sessionsRemaining: number;
  dayOfWeek: string | null;
  projectPhotos: string[] | null;
  adcoin: number;
  lesson: string | null;
  mission: string | null;
  // Type to distinguish between enrollment and trial attendance
  type: 'enrollment' | 'trial';
  trialId?: string;
}

export async function getAttendanceLog(
  userEmail: string
): Promise<AttendanceLogRow[]> {
  // Import user helpers dynamically to avoid circular imports
  const { getUserBranchIdByEmail } = await import("./users");
  const userBranchId = await getUserBranchIdByEmail(userEmail);

  // Fetch enrollment attendance records
  const enrollmentQuery = supabaseAdmin
    .from('attendance')
    .select(`
      id,
      date,
      status,
      class_type,
      actual_start_time,
      actual_day,
      last_activity,
      instructor_name,
      marked_by,
      notes,
      project_photos,
      adcoin,
      lesson,
      mission,
      created_at,
      trial_id,
      enrollment:enrollments!inner(
        id,
        sessions_remaining,
        day_of_week,
        student:students!inner(
          id,
          name,
          photo,
          branch_id,
          deleted_at,
          branch:branches!inner(id, name)
        ),
        course:courses!inner(id, name),
        package:course_pricing(description)
      )
    `)
    .is('trial_id', null)
    .order('created_at', { ascending: false });

  // Fetch trial attendance records
  const trialQuery = supabaseAdmin
    .from('attendance')
    .select(`
      id,
      date,
      status,
      class_type,
      actual_start_time,
      actual_day,
      last_activity,
      instructor_name,
      marked_by,
      notes,
      project_photos,
      adcoin,
      lesson,
      mission,
      created_at,
      trial_id,
      trial:trials!inner(
        id,
        child_name,
        branch_id,
        scheduled_date,
        scheduled_time,
        branch:branches!inner(id, name),
        course:courses!inner(id, name)
      )
    `)
    .not('trial_id', 'is', null)
    .order('created_at', { ascending: false });

  const [{ data: enrollmentData, error: enrollmentError }, { data: trialData, error: trialError }] = await Promise.all([
    enrollmentQuery,
    trialQuery,
  ]);

  if (enrollmentError) {
    console.error('Error fetching enrollment attendance log:', enrollmentError);
  }
  if (trialError) {
    console.error('Error fetching trial attendance log:', trialError);
  }

  // Process enrollment attendance records
  const enrollmentRecords = (enrollmentData ?? []).filter((record) => {
    const enrollment = record.enrollment as unknown as {
      student: { branch_id: string; deleted_at: string | null };
    };
    // Filter out deleted students
    if (enrollment.student.deleted_at) return false;
    // Apply branch filter
    if (userBranchId && enrollment.student.branch_id !== userBranchId) return false;
    return true;
  }).map((record) => {
    const enrollment = record.enrollment as unknown as {
      id: string;
      sessions_remaining: number;
      day_of_week: string | null;
      student: {
        id: string;
        name: string;
        photo: string | null;
        branch_id: string;
        branch: { id: string; name: string };
      };
      course: { id: string; name: string };
      package: { description: string } | null;
    };

    return {
      id: record.id,
      date: record.date,
      studentId: enrollment.student.id,
      studentName: enrollment.student.name,
      studentPhoto: enrollment.student.photo,
      studentLevel: 1,
      branchId: enrollment.student.branch_id,
      branchName: enrollment.student.branch.name,
      courseId: enrollment.course.id,
      courseName: enrollment.course.name,
      packageName: enrollment.package?.description ?? null,
      classType: record.class_type as 'Physical' | 'Online' | null,
      actualStartTime: record.actual_start_time,
      status: record.status as AttendanceStatus,
      lastActivity: record.last_activity,
      instructorName: record.instructor_name,
      markedBy: record.marked_by,
      notes: record.notes,
      createdAt: record.created_at,
      enrollmentId: enrollment.id,
      sessionsRemaining: enrollment.sessions_remaining,
      dayOfWeek: record.actual_day ?? enrollment.day_of_week,
      projectPhotos: record.project_photos,
      adcoin: record.adcoin ?? 0,
      lesson: record.lesson,
      mission: record.mission,
      type: 'enrollment' as const,
    };
  });

  // Process trial attendance records
  const trialRecords = (trialData ?? []).filter((record) => {
    const trial = record.trial as unknown as {
      branch_id: string;
    };
    // Apply branch filter
    if (userBranchId && trial.branch_id !== userBranchId) return false;
    return true;
  }).map((record) => {
    const trial = record.trial as unknown as {
      id: string;
      child_name: string;
      branch_id: string;
      scheduled_date: string;
      scheduled_time: string;
      branch: { id: string; name: string };
      course: { id: string; name: string };
    };

    return {
      id: record.id,
      date: record.date,
      studentId: trial.id, // Use trial id as student id for trials
      studentName: trial.child_name,
      studentPhoto: null,
      studentLevel: 0,
      branchId: trial.branch_id,
      branchName: trial.branch.name,
      courseId: trial.course.id,
      courseName: trial.course.name,
      packageName: 'Trial',
      classType: record.class_type as 'Physical' | 'Online' | null,
      actualStartTime: record.actual_start_time ?? trial.scheduled_time,
      status: record.status as AttendanceStatus,
      lastActivity: record.last_activity,
      instructorName: record.instructor_name,
      markedBy: record.marked_by,
      notes: record.notes,
      createdAt: record.created_at,
      enrollmentId: `trial-${trial.id}`,
      sessionsRemaining: 0,
      dayOfWeek: record.actual_day ?? null,
      projectPhotos: record.project_photos,
      adcoin: 0,
      lesson: record.lesson,
      mission: record.mission,
      type: 'trial' as const,
      trialId: trial.id,
    };
  });

  // Combine and sort all records
  const result = [...enrollmentRecords, ...trialRecords];

  // Sort by date (latest to oldest), then by day, then by time
  result.sort((a, b) => {
    // 1. Sort by date (latest first)
    const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateCompare !== 0) return dateCompare;

    // 2. Sort by day of week
    const dayOrder: Record<string, number> = {
      'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4,
      'friday': 5, 'saturday': 6, 'sunday': 7
    };
    const dayA = dayOrder[(a.dayOfWeek || '').toLowerCase()] ?? 8;
    const dayB = dayOrder[(b.dayOfWeek || '').toLowerCase()] ?? 8;
    if (dayA !== dayB) return dayA - dayB;

    // 3. Sort by time (earliest first)
    const timeA = a.actualStartTime || '23:59';
    const timeB = b.actualStartTime || '23:59';
    return timeA.localeCompare(timeB);
  });

  return result;
}
