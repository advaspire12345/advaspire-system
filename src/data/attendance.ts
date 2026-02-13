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
        package:packages(*)
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
        package:packages(*)
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
        package:packages(*)
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
        package:packages(*)
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
}

export async function markAttendance(
  enrollmentId: string,
  date: string,
  status: AttendanceStatus,
  markedBy?: string,
  notes?: string,
  data?: MarkAttendanceData
): Promise<Attendance | null> {
  console.log('markAttendance called with:', { enrollmentId, date, status, markedBy, notes, data });

  // Check if attendance already exists for this enrollment and date
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('attendance')
    .select('id')
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
  };

  console.log('Prepared attendance data:', attendanceData);

  if (existing) {
    console.log('Updating existing attendance:', existing.id);
    // Update existing - remove enrollment_id and date as they're not in update type
    const { enrollment_id: _, date: __, ...updateData } = attendanceData;
    return updateAttendance(existing.id, updateData);
  }

  console.log('Creating new attendance');
  // Create new
  return createAttendance(attendanceData);
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
  startTime: string | null;
  endTime: string | null;
  lastAttendanceDate: string | null;
  lastAttendanceStatus: AttendanceStatus | null;
  sessionsRemaining: number;
}

export async function getEnrollmentsForAttendance(
  userEmail: string
): Promise<AttendanceTableRow[]> {
  // Import user helpers dynamically to avoid circular imports
  const { getUserBranchIdByEmail } = await import("./users");
  const userBranchId = await getUserBranchIdByEmail(userEmail);

  let query = supabaseAdmin
    .from('enrollments')
    .select(`
      id,
      student_id,
      day_of_week,
      start_time,
      end_time,
      sessions_remaining,
      student:students!inner(
        id,
        name,
        photo,
        branch_id,
        branch:branches!inner(id, name)
      ),
      course:courses!inner(name),
      package:packages(name),
      attendance(date, status)
    `)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (userBranchId) {
    query = query.eq('students.branch_id', userBranchId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching enrollments for attendance:', error);
    return [];
  }

  return (data ?? []).map((enrollment) => {
    // Supabase returns nested relations - handle type coercion safely
    const studentData = enrollment.student as unknown as {
      id: string;
      name: string;
      photo: string | null;
      branch_id: string;
      branch: { id: string; name: string };
    };
    const courseData = enrollment.course as unknown as { name: string };
    const pkgData = enrollment.package as unknown as { name: string } | null;
    const attendanceRecords = (enrollment.attendance as unknown as { date: string; status: AttendanceStatus }[]) ?? [];

    // Get most recent attendance
    const sortedAttendance = [...attendanceRecords].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const lastAttendance = sortedAttendance[0] ?? null;

    return {
      id: enrollment.id,
      enrollmentId: enrollment.id,
      studentId: studentData.id,
      studentName: studentData.name,
      studentPhoto: studentData.photo,
      branchId: studentData.branch_id,
      branchName: studentData.branch.name,
      courseName: courseData.name,
      packageName: pkgData?.name ?? null,
      dayOfWeek: enrollment.day_of_week,
      startTime: enrollment.start_time,
      endTime: enrollment.end_time,
      lastAttendanceDate: lastAttendance?.date ?? null,
      lastAttendanceStatus: lastAttendance?.status ?? null,
      sessionsRemaining: enrollment.sessions_remaining,
    };
  });
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
      package:packages(id, name)
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
    const pkgData = enrollment.package as unknown as { id: string; name: string } | null;

    return {
      enrollmentId: enrollment.id,
      courseId: courseData.id,
      courseName: courseData.name,
      packageId: pkgData?.id ?? null,
      packageName: pkgData?.name ?? null,
      dayOfWeek: enrollment.day_of_week,
      startTime: enrollment.start_time,
      endTime: enrollment.end_time,
      sessionsRemaining: enrollment.sessions_remaining ?? 0,
    };
  });
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
    if (result) {
      successCount++;
    }
  }

  return successCount;
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
}

export async function getAttendanceLog(
  userEmail: string
): Promise<AttendanceLogRow[]> {
  // Import user helpers dynamically to avoid circular imports
  const { getUserBranchIdByEmail } = await import("./users");
  const userBranchId = await getUserBranchIdByEmail(userEmail);

  let query = supabaseAdmin
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
      created_at,
      enrollment:enrollments!inner(
        id,
        sessions_remaining,
        day_of_week,
        student:students!inner(
          id,
          name,
          photo,
          branch_id,
          branch:branches!inner(id, name)
        ),
        course:courses!inner(name),
        package:packages(name)
      )
    `)
    .order('created_at', { ascending: false });

  if (userBranchId) {
    query = query.eq('enrollments.students.branch_id', userBranchId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching attendance log:', error);
    return [];
  }

  return (data ?? []).map((record) => {
    // Supabase returns nested relations - handle type coercion safely
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
      package: { name: string } | null;
    };

    return {
      id: record.id,
      date: record.date,
      studentId: enrollment.student.id,
      studentName: enrollment.student.name,
      studentPhoto: enrollment.student.photo,
      studentLevel: 1, // Placeholder - level would come from a separate system
      branchId: enrollment.student.branch_id,
      branchName: enrollment.student.branch.name,
      courseName: enrollment.course.name,
      packageName: enrollment.package?.name ?? null,
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
    };
  });
}
