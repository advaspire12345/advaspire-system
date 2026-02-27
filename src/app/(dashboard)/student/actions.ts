"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import {
  createStudent,
  updateStudent,
  softDeleteStudent,
  createEnrollment,
  linkParentToStudent,
} from "@/data/students";
import { createParent } from "@/data/parents";
import type { StudentInsert, StudentUpdate, EnrollmentInsert, ParentInsert, Gender } from "@/db/schema";

export interface StudentFormPayload {
  // Basic Info
  name: string;
  email: string | null;
  phone: string | null;
  photoUrl: string | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  schoolName: string | null;
  coverPhotoUrl: string | null;

  // Parent Info (for creating new parent)
  parentId: string | null;
  parentName: string | null;
  parentPhone: string | null;
  parentEmail: string | null;
  parentAddress: string | null;
  parentPostcode: string | null;
  parentCity: string | null;

  // Enrollment
  branchId: string;
  courseId: string | null;
  packageId: string | null;
  packageType: "monthly" | "session" | null;
  numberOfMonths: number | null;
  numberOfSessions: number | null;
  scheduleEntries: { day: string; time: string }[];

  // Notes
  notes: string | null;
}

export async function createStudentAction(
  payload: StudentFormPayload
): Promise<{ success: boolean; error?: string; studentId?: string }> {
  try {
    // 1. Create the student
    const studentData: StudentInsert = {
      name: payload.name,
      email: payload.email || null,
      phone: payload.phone || null,
      photo: payload.photoUrl || null,
      date_of_birth: payload.dateOfBirth || null,
      gender: payload.gender || null,
      school_name: payload.schoolName || null,
      cover_photo: payload.coverPhotoUrl || null,
      branch_id: payload.branchId,
      adcoin_balance: 0,
    };

    const student = await createStudent(studentData);

    if (!student) {
      return { success: false, error: "Failed to create student record" };
    }

    // 2. Handle parent creation/linking if provided
    if (payload.parentId === "new" && payload.parentName && payload.parentEmail) {
      const parentData: ParentInsert = {
        name: payload.parentName,
        email: payload.parentEmail,
        phone: payload.parentPhone || null,
        address: payload.parentAddress || null,
        postcode: payload.parentPostcode || null,
        city: payload.parentCity || null,
      };

      const parent = await createParent(parentData);
      if (parent) {
        await linkParentToStudent(parent.id, student.id);
      }
    } else if (payload.parentId && payload.parentId !== "new") {
      await linkParentToStudent(payload.parentId, student.id);
    }

    // 3. Create enrollment if course is selected
    if (payload.courseId) {
      // Build day_of_week from schedule entries
      const days = payload.scheduleEntries.map((e) => e.day).filter(Boolean);
      const firstEntry = payload.scheduleEntries[0];

      // Calculate sessions remaining based on package type
      let sessionsRemaining = 0;
      if (payload.packageType === "session" && payload.numberOfSessions) {
        sessionsRemaining = payload.numberOfSessions;
      } else if (payload.packageType === "monthly" && payload.numberOfMonths) {
        // For monthly packages, you might want to calculate sessions based on schedule
        // For now, we'll store 0 and let the system calculate based on months
        sessionsRemaining = 0;
      }

      const enrollmentData: EnrollmentInsert = {
        student_id: student.id,
        course_id: payload.courseId,
        package_id: payload.packageId || null,
        day_of_week: days.length > 0 ? JSON.stringify(days) : null,
        start_time: firstEntry?.time || null,
        end_time: null,
        status: "active",
        sessions_remaining: sessionsRemaining,
      };

      await createEnrollment(enrollmentData);
    }

    revalidatePath("/student");
    revalidateTag("dashboard", "max");
    return { success: true, studentId: student.id };
  } catch (error) {
    console.error("Error in createStudentAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export async function updateStudentAction(
  studentId: string,
  payload: StudentFormPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: StudentUpdate = {
      name: payload.name,
      email: payload.email || null,
      phone: payload.phone || null,
      photo: payload.photoUrl || null,
      date_of_birth: payload.dateOfBirth || null,
      gender: payload.gender || null,
      school_name: payload.schoolName || null,
      cover_photo: payload.coverPhotoUrl || null,
      branch_id: payload.branchId,
    };

    const result = await updateStudent(studentId, updateData);

    if (!result) {
      return { success: false, error: "Failed to update student record" };
    }

    revalidatePath("/student");
    revalidateTag("dashboard", "max");
    return { success: true };
  } catch (error) {
    console.error("Error in updateStudentAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export async function deleteStudentAction(
  studentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await softDeleteStudent(studentId);

    if (!success) {
      return { success: false, error: "Failed to delete student record" };
    }

    revalidatePath("/student");
    revalidateTag("dashboard", "max");
    return { success: true };
  } catch (error) {
    console.error("Error in deleteStudentAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
