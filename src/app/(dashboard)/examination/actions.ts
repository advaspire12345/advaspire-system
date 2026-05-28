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
import { updateEnrollment } from "@/data/enrollments";
import { supabaseAdmin } from "@/db";
import { authorizeAction } from "@/data/permissions";
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
    await authorizeAction('examinations', 'can_create');

    // Check for existing active exam for this student + program + level
    let duplicateQuery = supabaseAdmin
      .from("examinations")
      .select("id")
      .eq("student_id", payload.studentId)
      .eq("exam_level", payload.examLevel)
      .is("deleted_at", null)
      .not("status", "in", "(fail,absent)");

    if (payload.enrollmentId) {
      duplicateQuery = duplicateQuery.eq("enrollment_id", payload.enrollmentId);
    }

    const { data: existingExam } = await duplicateQuery.maybeSingle();

    if (existingExam) {
      return {
        success: false,
        error: "Student already has an active examination for this program and level",
      };
    }

    // Count reattempts for this student + program + level
    let reattemptQuery = supabaseAdmin
      .from("examinations")
      .select("id", { count: "exact", head: true })
      .eq("student_id", payload.studentId)
      .eq("exam_level", payload.examLevel)
      .is("deleted_at", null);

    if (payload.enrollmentId) {
      reattemptQuery = reattemptQuery.eq("enrollment_id", payload.enrollmentId);
    }

    const { count: reattemptCount } = await reattemptQuery;

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
      await handlePassStatus(exam.id, payload.studentId);
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
    await authorizeAction('examinations', 'can_edit');

    // Get the current exam to check for status change
    const currentExam = await getExaminationById(examId);
    if (!currentExam) {
      return { success: false, error: "Examination not found" };
    }

    // Lock edits once exam is finalized (pass/fail) and 7 days have passed
    if (
      (currentExam.status === "pass" || currentExam.status === "fail") &&
      currentExam.exam_date &&
      Date.now() - new Date(currentExam.exam_date).getTime() > 7 * 24 * 60 * 60 * 1000
    ) {
      return {
        success: false,
        error: "This examination is locked — more than 1 week has passed since the exam date.",
      };
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
      await handlePassStatus(examId, currentExam.student_id);
    }

    // Handle status change to 'fail' — auto-reschedule a new exam +2 months
    // and increment the reattempt counter on the new row.
    if (
      payload.status === "fail" &&
      currentExam.status !== "fail"
    ) {
      await handleFailStatus(examId, currentExam.student_id);
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
    await authorizeAction('examinations', 'can_delete');

    const currentExam = await getExaminationById(examId);
    if (
      currentExam &&
      (currentExam.status === "pass" || currentExam.status === "fail") &&
      currentExam.exam_date &&
      Date.now() - new Date(currentExam.exam_date).getTime() > 7 * 24 * 60 * 60 * 1000
    ) {
      return {
        success: false,
        error: "This examination is locked — more than 1 week has passed since the exam date.",
      };
    }

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
 * Handle pass status - level up student enrollment and generate certificate number
 */
async function handlePassStatus(
  examId: string,
  studentId: string
): Promise<void> {
  // 1. Get the exam to find enrollment_id
  const exam = await getExaminationById(examId);
  if (!exam) {
    console.error("Exam not found for level up:", examId);
    return;
  }

  // 2. Level up the enrollment (per-program level)
  if (exam.enrollment_id) {
    const { data: enrollment } = await supabaseAdmin
      .from("enrollments")
      .select("id, level, course:courses(number_of_levels)")
      .eq("id", exam.enrollment_id)
      .single();

    if (enrollment) {
      const currentLevel = enrollment.level || 1;
      const newLevel = currentLevel + 1;
      const maxLevels = (enrollment.course as any)?.number_of_levels || 0;

      // Level up
      await updateEnrollment(exam.enrollment_id, { level: newLevel });

      // If passed the last level, mark enrollment as completed
      if (maxLevels > 0 && currentLevel >= maxLevels) {
        await updateEnrollment(exam.enrollment_id, { status: "completed" });

        // Redistribute pool sessions if this student was in a pool
        const { redistributePoolOnInactive } = await import("@/data/pools");
        await redistributePoolOnInactive(exam.enrollment_id, studentId);
      }
    }
  }

  // 3. Also update student level to the max across all enrollments
  const { data: enrollments } = await supabaseAdmin
    .from("enrollments")
    .select("level")
    .eq("student_id", studentId)
    .is("deleted_at", null);

  if (enrollments && enrollments.length > 0) {
    const maxLevel = Math.max(...enrollments.map((e) => e.level || 1));
    await updateStudent(studentId, { level: maxLevel });
  }

  // 4. Generate certificate number and save it
  const certificateNumber = await generateCertificateNumber(examId);
  await updateExamination(examId, {
    certificate_number: certificateNumber,
  });
}

/**
 * Handle fail status — auto-schedule a follow-up exam 8 weekly class
 * occurrences after the failed date, on the enrollment's schedule day so
 * the reattempt lands on a real lesson. status='scheduled', reattempt_count
 * incremented from the failed row.
 */
async function handleFailStatus(
  examId: string,
  studentId: string,
): Promise<void> {
  const failedExam = await getExaminationById(examId);
  if (!failedExam) return;

  // Pull the enrollment's schedule day so we can land the reattempt on the
  // student's actual class day instead of an arbitrary weekday.
  let scheduleDay: string | null = null;
  if (failedExam.enrollment_id) {
    const { data: enr } = await supabaseAdmin
      .from("enrollments")
      .select("day_of_week, schedule")
      .eq("id", failedExam.enrollment_id)
      .single();
    if (enr) {
      scheduleDay = enr.day_of_week ?? null;
      // day_of_week is stored as either "monday" or as JSON '["monday"]'
      // depending on the import path. Unwrap if it's the JSON shape.
      if (scheduleDay && scheduleDay.trim().startsWith("[")) {
        try {
          const parsed = JSON.parse(scheduleDay);
          scheduleDay = Array.isArray(parsed) && parsed.length > 0 ? String(parsed[0]) : null;
        } catch { /* fall through with original */ }
      }
      if (!scheduleDay && Array.isArray(enr.schedule) && enr.schedule.length > 0) {
        const first = enr.schedule[0] as { day?: string };
        scheduleDay = first?.day ?? null;
      } else if (!scheduleDay && typeof enr.schedule === "string") {
        try {
          const parsed = JSON.parse(enr.schedule);
          if (Array.isArray(parsed) && parsed.length > 0) scheduleDay = parsed[0]?.day ?? null;
        } catch { /* ignore */ }
      }
    }
  }

  const REATTEMPT_SESSIONS = 8; // weeks of preparation between fail and reattempt
  const failedDate = failedExam.exam_date ? new Date(failedExam.exam_date) : new Date();
  // Start by adding 8 weeks, then snap forward to the enrollment's schedule day.
  const reschedule = new Date(failedDate);
  reschedule.setDate(reschedule.getDate() + REATTEMPT_SESSIONS * 7);
  if (scheduleDay) {
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const targetIdx = dayNames.indexOf(scheduleDay.toLowerCase());
    if (targetIdx >= 0) {
      const currentIdx = reschedule.getDay();
      let daysAhead = targetIdx - currentIdx;
      if (daysAhead < 0) daysAhead += 7;
      reschedule.setDate(reschedule.getDate() + daysAhead);
    }
  }
  const rescheduleDate = reschedule.toISOString().split("T")[0];

  // Insert a fresh exam row representing the next attempt
  const { error } = await supabaseAdmin
    .from("examinations")
    .insert({
      student_id: studentId,
      enrollment_id: failedExam.enrollment_id,
      exam_name: failedExam.exam_name,
      exam_level: failedExam.exam_level,
      exam_date: rescheduleDate,
      status: "scheduled",
      reattempt_count: (failedExam.reattempt_count ?? 0) + 1,
      examiner_id: failedExam.examiner_id,
    });

  if (error) {
    console.error("[Exam Fail] Failed to insert reattempt row:", error);
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
    await authorizeAction('examinations', 'can_edit');

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
