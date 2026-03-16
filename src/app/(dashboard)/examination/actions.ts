"use server";

import { revalidatePath } from "next/cache";
import {
  createExamination,
  updateExamination,
  softDeleteExamination,
  getExaminationById,
  generateCertificateNumber,
} from "@/data/examinations";
import { updateStudent } from "@/data/students";
import { supabaseAdmin } from "@/db";
import type { ExaminationStatus } from "@/db/schema";

export interface ExaminationFormPayload {
  studentId: string;
  enrollmentId: string | null;
  examName: string;
  examLevel: number;
  examDate: string;
  examinerId: string | null;
  mark: number | null;
  notes: string | null;
  status: ExaminationStatus;
}

/**
 * Create a new examination record
 */
export async function createExaminationAction(
  payload: ExaminationFormPayload
): Promise<{ success: boolean; error?: string; examId?: string }> {
  try {
    // Check for existing active exam for this student at this level
    const { data: existingExam } = await supabaseAdmin
      .from("examinations")
      .select("id")
      .eq("student_id", payload.studentId)
      .eq("exam_level", payload.examLevel)
      .is("deleted_at", null)
      .not("status", "in", '("fail", "absent")')
      .maybeSingle();

    if (existingExam) {
      return {
        success: false,
        error: "Student already has an active examination for this level",
      };
    }

    // Count reattempts for this student and level
    const { count: reattemptCount } = await supabaseAdmin
      .from("examinations")
      .select("id", { count: "exact", head: true })
      .eq("student_id", payload.studentId)
      .eq("exam_level", payload.examLevel)
      .is("deleted_at", null);

    const exam = await createExamination({
      student_id: payload.studentId,
      enrollment_id: payload.enrollmentId,
      exam_name: payload.examName,
      exam_level: payload.examLevel,
      exam_date: payload.examDate,
      examiner_id: payload.examinerId,
      mark: payload.mark,
      notes: payload.notes,
      status: payload.status,
      reattempt_count: reattemptCount || 0,
    });

    if (!exam) {
      return { success: false, error: "Failed to create examination record" };
    }

    // If status is 'pass', handle level up and certificate generation
    if (payload.status === "pass") {
      await handlePassStatus(exam.id, payload.studentId, payload.examLevel);
    }

    revalidatePath("/examination");
    revalidatePath("/student");
    return { success: true, examId: exam.id };
  } catch (error) {
    console.error("Error in createExaminationAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Update an existing examination record
 */
export async function updateExaminationAction(
  examId: string,
  payload: Partial<ExaminationFormPayload>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the current exam to check for status change
    const currentExam = await getExaminationById(examId);
    if (!currentExam) {
      return { success: false, error: "Examination not found" };
    }

    const updateData: Record<string, unknown> = {};
    if (payload.examName !== undefined) updateData.exam_name = payload.examName;
    if (payload.examLevel !== undefined) updateData.exam_level = payload.examLevel;
    if (payload.examDate !== undefined) updateData.exam_date = payload.examDate;
    if (payload.examinerId !== undefined) updateData.examiner_id = payload.examinerId;
    if (payload.mark !== undefined) updateData.mark = payload.mark;
    if (payload.notes !== undefined) updateData.notes = payload.notes;
    if (payload.status !== undefined) updateData.status = payload.status;

    const updatedExam = await updateExamination(examId, updateData);

    if (!updatedExam) {
      return { success: false, error: "Failed to update examination record" };
    }

    // Handle status change to 'pass'
    if (
      payload.status === "pass" &&
      currentExam.status !== "pass"
    ) {
      await handlePassStatus(
        examId,
        currentExam.student_id,
        payload.examLevel ?? currentExam.exam_level
      );
    }

    revalidatePath("/examination");
    revalidatePath("/student");
    return { success: true };
  } catch (error) {
    console.error("Error in updateExaminationAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Delete an examination record
 */
export async function deleteExaminationAction(
  examId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await softDeleteExamination(examId);

    if (!success) {
      return { success: false, error: "Failed to delete examination record" };
    }

    revalidatePath("/examination");
    return { success: true };
  } catch (error) {
    console.error("Error in deleteExaminationAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Handle pass status - level up student and generate certificate
 */
async function handlePassStatus(
  examId: string,
  studentId: string,
  examLevel: number
): Promise<void> {
  // 1. Get student and course info
  const { data: student } = await supabaseAdmin
    .from("students")
    .select(`
      id,
      level,
      name,
      enrollments!inner(
        course:courses(
          id,
          name,
          number_of_levels
        )
      )
    `)
    .eq("id", studentId)
    .is("deleted_at", null)
    .single();

  if (!student) {
    console.error("Student not found for level up:", studentId);
    return;
  }

  const enrollment = (student.enrollments as any)?.[0];
  const course = enrollment?.course;
  const maxLevels = course?.number_of_levels || 10;
  const currentLevel = student.level || 1;

  // 2. Level up the student (only if examLevel matches current level + 1 and not at max)
  if (examLevel === currentLevel + 1 && currentLevel < maxLevels) {
    await updateStudent(studentId, { level: examLevel });
  } else if (examLevel === currentLevel && currentLevel < maxLevels) {
    // If exam was for current level, level them up
    await updateStudent(studentId, { level: currentLevel + 1 });
  }

  // 3. Generate certificate number
  const certificateNumber = await generateCertificateNumber();

  // 4. Trigger certificate generation
  try {
    // Call the certificate generation API
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/certificate/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        examId,
        studentId,
        studentName: student.name,
        courseName: course?.name || "Course",
        examLevel,
        certificateNumber,
      }),
    });

    if (response.ok) {
      const { certificateUrl } = await response.json();
      // Update exam with certificate info
      await updateExamination(examId, {
        certificate_number: certificateNumber,
        certificate_url: certificateUrl,
      });
    } else {
      console.error("Certificate generation failed:", await response.text());
      // Still save the certificate number even if generation failed
      await updateExamination(examId, {
        certificate_number: certificateNumber,
      });
    }
  } catch (error) {
    console.error("Error generating certificate:", error);
    // Save certificate number anyway
    await updateExamination(examId, {
      certificate_number: certificateNumber,
    });
  }
}

/**
 * Upload a certificate file
 */
export async function uploadCertificateAction(
  examId: string,
  certificateUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const updated = await updateExamination(examId, {
      certificate_url: certificateUrl,
    });

    if (!updated) {
      return { success: false, error: "Failed to update certificate URL" };
    }

    revalidatePath("/examination");
    return { success: true };
  } catch (error) {
    console.error("Error in uploadCertificateAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
