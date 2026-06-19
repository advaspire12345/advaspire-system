"use server";

import { revalidatePath } from "next/cache";
import { authorizeAction } from "@/data/permissions";
import { getUser } from "@/lib/supabase/server";
import { getUserByEmail } from "@/data/users";
import { supabaseAdmin } from "@/db";

type ProgressField = "learnt" | "mission1" | "mission2" | "mission3" | "challenge" | "homework";
const FIELDS: ProgressField[] = ["learnt", "mission1", "mission2", "mission3", "challenge", "homework"];

async function callerId(): Promise<string | null> {
  const u = await getUser();
  if (!u?.email) return null;
  const dbUser = await getUserByEmail(u.email);
  return dbUser?.id ?? null;
}

async function studentBranch(studentId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("students")
    .select("branch_id")
    .eq("id", studentId)
    .single();
  return data?.branch_id ?? null;
}

/** Toggle one progress checkbox (learnt / mission1-3 / challenge / homework). */
export async function toggleLessonProgressField(
  studentId: string,
  lessonCoordinate: string,
  field: ProgressField,
  checked: boolean,
): Promise<{ success: boolean; error?: string }> {
  try {
    await authorizeAction("student_progress", "can_edit");
    if (!FIELDS.includes(field)) return { success: false, error: "Invalid field" };
    const uid = await callerId();
    const branchId = await studentBranch(studentId);
    const now = new Date().toISOString();
    const patch: Record<string, string | null> = {
      student_id: studentId,
      branch_id: branchId,
      lesson_coordinate: lessonCoordinate,
      [`${field}_status`]: checked ? "approved" : "not_done",
      [`${field}_ticked_at`]: checked ? now : null,
      [`${field}_approved_by`]: checked ? uid : null,
      [`${field}_approved_at`]: checked ? now : null,
    };
    const { error } = await supabaseAdmin
      .from("lesson_progress")
      .upsert(patch, { onConflict: "student_id,lesson_coordinate" });
    if (error) return { success: false, error: error.message };
    revalidatePath("/student-progress");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

/**
 * Batch-save pending checkbox toggles and remark edits in one round-trip.
 * Authorizes once, applies the same upsert logic as the per-field actions,
 * and revalidates once at the end.
 */
export async function saveProgressBatch(payload: {
  checks: {
    studentId: string;
    lessonCoordinate: string;
    field: ProgressField;
    checked: boolean;
  }[];
  remarks: { studentId: string; lessonCoordinate: string; note: string }[];
}): Promise<{ success: boolean; error?: string }> {
  try {
    await authorizeAction("student_progress", "can_edit");
    const uid = await callerId();
    const now = new Date().toISOString();

    // Cache branch lookups so we don't re-query per item for the same student.
    const branchCache = new Map<string, string | null>();
    const branchFor = async (studentId: string): Promise<string | null> => {
      if (branchCache.has(studentId)) return branchCache.get(studentId) ?? null;
      const b = await studentBranch(studentId);
      branchCache.set(studentId, b);
      return b;
    };

    // ── Checkbox toggles ──
    for (const c of payload.checks) {
      if (!FIELDS.includes(c.field)) {
        return { success: false, error: "Invalid field" };
      }
      const branchId = await branchFor(c.studentId);
      const patch: Record<string, string | null> = {
        student_id: c.studentId,
        branch_id: branchId,
        lesson_coordinate: c.lessonCoordinate,
        [`${c.field}_status`]: c.checked ? "approved" : "not_done",
        [`${c.field}_ticked_at`]: c.checked ? now : null,
        [`${c.field}_approved_by`]: c.checked ? uid : null,
        [`${c.field}_approved_at`]: c.checked ? now : null,
      };
      const { error } = await supabaseAdmin
        .from("lesson_progress")
        .upsert(patch, { onConflict: "student_id,lesson_coordinate" });
      if (error) return { success: false, error: error.message };
    }

    // ── Remark edits ──
    for (const r of payload.remarks) {
      const branchId = await branchFor(r.studentId);
      const { error } = await supabaseAdmin.from("lesson_remarks").upsert(
        {
          student_id: r.studentId,
          branch_id: branchId,
          lesson_coordinate: r.lessonCoordinate,
          note: r.note,
          updated_by: uid,
        },
        { onConflict: "student_id,lesson_coordinate" },
      );
      if (error) return { success: false, error: error.message };
    }

    revalidatePath("/student-progress");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

/** Save the per-lesson Remark text (robotics courses). */
export async function saveLessonRemark(
  studentId: string,
  lessonCoordinate: string,
  note: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await authorizeAction("student_progress", "can_edit");
    const uid = await callerId();
    const branchId = await studentBranch(studentId);
    const { error } = await supabaseAdmin.from("lesson_remarks").upsert(
      { student_id: studentId, branch_id: branchId, lesson_coordinate: lessonCoordinate, note, updated_by: uid },
      { onConflict: "student_id,lesson_coordinate" },
    );
    if (error) return { success: false, error: error.message };
    revalidatePath("/student-progress");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

/** Upload a per-lesson image to the `student-uploads` bucket and save its URL. */
export async function uploadLessonImage(
  formData: FormData,
): Promise<{ success: boolean; error?: string; url?: string }> {
  try {
    await authorizeAction("student_progress", "can_edit");
    const studentId = String(formData.get("studentId") ?? "");
    const lessonCoordinate = String(formData.get("lessonCoordinate") ?? "");
    const file = formData.get("file") as File | null;
    if (!studentId || !lessonCoordinate || !file || file.size === 0) {
      return { success: false, error: "Missing image" };
    }
    const uid = await callerId();
    const branchId = await studentBranch(studentId);
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `${studentId}/${lessonCoordinate}-${Date.now()}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: upErr } = await supabaseAdmin.storage
      .from("student-uploads")
      .upload(path, bytes, { contentType: file.type || "image/png", upsert: true });
    if (upErr) return { success: false, error: upErr.message };

    const url = supabaseAdmin.storage.from("student-uploads").getPublicUrl(path).data.publicUrl;
    const { error } = await supabaseAdmin.from("lesson_uploads").upsert(
      {
        student_id: studentId,
        branch_id: branchId,
        lesson_coordinate: lessonCoordinate,
        image_path: url,
        updated_by: uid,
      },
      { onConflict: "student_id,lesson_coordinate" },
    );
    if (error) return { success: false, error: error.message };
    revalidatePath("/student-progress");
    return { success: true, url };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

/** Save the per-lesson Upload link fields (project + video URLs). */
export async function saveLessonUploadLinks(
  studentId: string,
  lessonCoordinate: string,
  projectUrl: string,
  videoUrl: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await authorizeAction("student_progress", "can_edit");
    const uid = await callerId();
    const branchId = await studentBranch(studentId);
    const { error } = await supabaseAdmin.from("lesson_uploads").upsert(
      {
        student_id: studentId,
        branch_id: branchId,
        lesson_coordinate: lessonCoordinate,
        project_url: projectUrl || null,
        video_url: videoUrl || null,
        updated_by: uid,
      },
      { onConflict: "student_id,lesson_coordinate" },
    );
    if (error) return { success: false, error: error.message };
    revalidatePath("/student-progress");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

/** Save the per-lesson Upload as a project/file link (robotics courses). */
export async function saveLessonUpload(
  studentId: string,
  lessonCoordinate: string,
  projectUrl: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await authorizeAction("student_progress", "can_edit");
    const uid = await callerId();
    const branchId = await studentBranch(studentId);
    const { error } = await supabaseAdmin.from("lesson_uploads").upsert(
      {
        student_id: studentId,
        branch_id: branchId,
        lesson_coordinate: lessonCoordinate,
        project_url: projectUrl || null,
        updated_by: uid,
      },
      { onConflict: "student_id,lesson_coordinate" },
    );
    if (error) return { success: false, error: error.message };
    revalidatePath("/student-progress");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
