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
  console.log('Creating attendance with data:', JSON.stringify(attendanceData, null, 2));

  const { data, error } = await supabaseAdmin
    .from('attendance')
    .insert(attendanceData)
    .select()
    .single();

  if (error) {
    console.error('Error creating attendance:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return null;
  }

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
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('attendance')
    .select('id, status')
    .eq('enrollment_id', enrollmentId)
    .eq('date', date)
    .single();

  if (existingError && existingError.code !== 'PGRST116') {
    console.error('Error checking existing attendance:', existingError);
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
  };

  console.log('Prepared attendance data:', attendanceData);

  if (existing) {
    console.log('Updating existing attendance:', existing.id, 'previous status:', existing.status);
    // Update existing - remove enrollment_id and date as they're not in update type
    const { enrollment_id: _, date: __, ...updateData } = attendanceData;
    const attendance = await updateAttendance(existing.id, updateData);
    return { attendance, isNew: false, previousStatus: existing.status as AttendanceStatus };
  }

  console.log('Creating new attendance');
  // Create new
  const attendance = await createAttendance(attendanceData);
  return { attendance, isNew: true, previousStatus: null };
}

export async function deleteAttendance(attendanceId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('attendance')
    .delete()
    .eq('id', attendanceId);

  if (error) {
    console.error('Error deleting attendance:', error);
    return false;
  }

  return true;
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
    course:courses!inner(name),
    package:course_pricing(description),
    attendance(id, date, status, class_type, actual_day, actual_start_time, instructor_name, last_activity, project_photos, notes, adcoin)
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
    const courseData = enrollment.course as unknown as { name: string };
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

    // Find attendance for current week
    const currentWeekAttendance = attendanceRecords.find(a => {
      const dateStr = a.date.includes('T') ? a.date.split('T')[0] : a.date;
      return dateStr >= mondayStr && dateStr <= sundayStr;
    });

    // Check if attendance is "complete" (has classType AND instructorName filled)
    const isAttendanceComplete = currentWeekAttendance &&
      currentWeekAttendance.class_type &&
      currentWeekAttendance.instructor_name;

    // If attendance is complete, skip all slots for this enrollment
    if (isAttendanceComplete) {
      continue;
    }

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

      result.push({
        id: `${enrollment.id}-slot-${i}-${slotDateStr}`,
        enrollmentId: enrollment.id,
        studentId: studentData.id,
        studentName: studentData.name,
        studentPhoto: studentData.photo,
        branchId: studentData.branch_id,
        branchName: studentData.branch.name,
        courseName: courseData.name,
        packageName: pkgData?.description ?? null,
        dayOfWeek: enrollment.day_of_week,
        slotDay: slotDay,
        slotTime: slotTime,
        startTime: enrollment.start_time,
        endTime: enrollment.end_time,
        lastAttendanceDate: lastAttendance?.date ?? null,
        lastAttendanceStatus: lastAttendance?.status ?? null,
        sessionsRemaining: enrollment.sessions_remaining,
        type: 'enrollment',
        // Include existing attendance data if partially filled
        existingAttendance: currentWeekAttendance ? {
          id: currentWeekAttendance.id,
          date: currentWeekAttendance.date,
          status: currentWeekAttendance.status,
          classType: currentWeekAttendance.class_type,
          actualDay: currentWeekAttendance.actual_day,
          actualStartTime: currentWeekAttendance.actual_start_time,
          instructorName: currentWeekAttendance.instructor_name,
          lastActivity: currentWeekAttendance.last_activity,
          projectPhotos: currentWeekAttendance.project_photos,
          notes: currentWeekAttendance.notes,
          adcoin: currentWeekAttendance.adcoin ?? 0,
        } : null,
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
      course:courses(name)
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
      const courseData = trial.course as unknown as { name: string } | null;

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
        courseName: courseData?.name ?? 'Trial Class',
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
  // Get enrollment with package info
  const { data: enrollment, error: enrollmentError } = await supabaseAdmin
    .from('enrollments')
    .select(`
      id,
      sessions_remaining,
      period_start,
      package:course_pricing(id, package_type, duration)
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
  } | null;

  if (!packageData) {
    return { success: true, message: 'No package assigned' };
  }

  // Get current sessions (can be negative if used before payment)
  const currentSessions = enrollment.sessions_remaining ?? 0;

  const packageType = packageData.package_type;
  const duration = packageData.duration;

  // Handle SESSION packages - simply deduct (allow negative for tracking)
  if (packageType === 'session') {
    const newSessionsRemaining = currentSessions - 1;

    const { error: updateError } = await supabaseAdmin
      .from('enrollments')
      .update({
        sessions_remaining: newSessionsRemaining,
        updated_at: new Date().toISOString(),
      })
      .eq('id', enrollmentId);

    if (updateError) {
      console.error('Error updating sessions_remaining:', updateError);
      return { success: false, message: 'Failed to update sessions' };
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
        course:courses!inner(name),
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
      created_at,
      trial_id,
      trial:trials!inner(
        id,
        child_name,
        branch_id,
        scheduled_date,
        scheduled_time,
        branch:branches!inner(id, name),
        course:courses!inner(name)
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
      course: { name: string };
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
      course: { name: string };
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
