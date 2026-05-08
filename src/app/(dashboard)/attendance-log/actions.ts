"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { deleteAttendance } from "@/data/attendance";
import { authorizeAction } from "@/data/permissions";
import { supabaseAdmin } from "@/db";

export interface UpdateAttendanceLogData {
  studentName: string;
}

export async function updateAttendanceLogAction(
  attendanceId: string,
  data: UpdateAttendanceLogData
): Promise<{ success: boolean; error?: string }> {
  try {
    await authorizeAction('attendance_log', 'can_edit');

    const trimmedName = data.studentName?.trim();
    if (!trimmedName) {
      return { success: false, error: "Student name cannot be empty" };
    }

    // Attendance history is immutable except for the student's name.
    // Look up the attendance row → student_id, then rename the student.
    const { data: attendance, error: lookupError } = await supabaseAdmin
      .from("attendance")
      .select("id, enrollment:enrollments(student_id)")
      .eq("id", attendanceId)
      .maybeSingle();

    if (lookupError || !attendance) {
      return { success: false, error: "Attendance record not found" };
    }

    const studentId = (attendance.enrollment as unknown as { student_id: string } | null)?.student_id;
    if (!studentId) {
      return { success: false, error: "Could not resolve student for this attendance record" };
    }

    const { error: renameError } = await supabaseAdmin
      .from("students")
      .update({ name: trimmedName })
      .eq("id", studentId);

    if (renameError) {
      return { success: false, error: renameError.message };
    }

    revalidatePath("/attendance-log");
    revalidatePath("/student");
    revalidateTag("dashboard", "max");
    return { success: true };
  } catch (error) {
    console.error("Error updating attendance:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export async function deleteAttendanceLogAction(
  attendanceId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await authorizeAction('attendance_log', 'can_delete');

    const result = await deleteAttendance(attendanceId);

    if (!result) {
      return { success: false, error: "Failed to delete attendance record" };
    }

    // Revalidate all affected pages
    revalidatePath("/attendance-log");
    revalidatePath("/attendance");
    revalidatePath("/pending-payments");
    revalidatePath("/student");
    revalidateTag("dashboard", "max");
    return { success: true };
  } catch (error) {
    console.error("Error deleting attendance:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
