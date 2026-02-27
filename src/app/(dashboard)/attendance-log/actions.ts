"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { updateAttendance, deleteAttendance } from "@/data/attendance";
import type { AttendanceStatus } from "@/db/schema";

export interface UpdateAttendanceLogData {
  status: AttendanceStatus;
  classType: "Physical" | "Online";
  actualDay: string;
  actualStartTime: string;
  instructorName: string;
  lastActivity: string;
  notes: string;
  projectPhotos: string[];
}

export async function updateAttendanceLogAction(
  attendanceId: string,
  data: UpdateAttendanceLogData
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await updateAttendance(attendanceId, {
      status: data.status,
      class_type: data.classType,
      actual_day: data.actualDay || null,
      actual_start_time: data.actualStartTime || null,
      instructor_name: data.instructorName || null,
      last_activity: data.lastActivity || null,
      notes: data.notes || null,
      project_photos: data.projectPhotos.length > 0 ? data.projectPhotos : null,
    });

    if (!result) {
      return { success: false, error: "Failed to update attendance record" };
    }

    revalidatePath("/attendance-log");
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
    const result = await deleteAttendance(attendanceId);

    if (!result) {
      return { success: false, error: "Failed to delete attendance record" };
    }

    revalidatePath("/attendance-log");
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
