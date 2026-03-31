"use server";

import { revalidatePath } from "next/cache";
import {
  createProgram,
  updateProgram,
  softDeleteProgram,
  createCategory,
  type CreateProgramPayload,
} from "@/data/programs";
import { authorizeAction } from "@/data/permissions";
import type { ProgramFull } from "@/db/schema";

export interface ProgramFormPayload {
  // Basic
  name: string;
  code: string | null;
  description: string | null;
  short_description: string | null;
  category_id: string | null;
  number_of_levels: number | null;
  sessions_to_level_up: number | null;
  program_type: string | null;
  status: string;
  branch_id: string;
  cover_image_url: string | null;
  youtube_url: string | null;
  assessment_enabled: boolean;
  levelling_time_minutes: number | null;

  // Multi-select
  languages: string[];
  instructor_ids: string[];
  branch_ids: string[];

  // Info
  requirements: string[];
  outcomes: string[];
  faqs: { question: string; answer: string }[];

  // Curriculum
  sections: {
    title: string;
    description: string;
    lessons: {
      title: string;
      thumbnail_url: string | null;
      url: string | null;
      missions: {
        level: number | null;
        url_mission: string | null;
        url_answer: string | null;
      }[];
    }[];
  }[];

  // Pricing
  pricing: {
    package_type: string;
    price: number;
    duration: number;
    description: string | null;
    is_default: boolean;
  }[];

  // Slots
  slots: {
    branch_id: string;
    teacher_ids: string[];
    day: string;
    time: string;
    duration: number;
    limit_student: number;
  }[];
}

export async function createProgramAction(
  payload: ProgramFormPayload
): Promise<{ success: boolean; error?: string; programId?: string }> {
  try {
    await authorizeAction('programs', 'can_create');

    const programId = await createProgram(payload as CreateProgramPayload);

    if (!programId) {
      return { success: false, error: "Failed to create program" };
    }

    revalidatePath("/program");
    return { success: true, programId };
  } catch (error) {
    console.error("Error in createProgramAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export async function updateProgramAction(
  programId: string,
  payload: ProgramFormPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    await authorizeAction('programs', 'can_edit');

    const success = await updateProgram(programId, payload as CreateProgramPayload);

    if (!success) {
      return { success: false, error: "Failed to update program" };
    }

    revalidatePath("/program");
    return { success: true };
  } catch (error) {
    console.error("Error in updateProgramAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export async function deleteProgramAction(
  programId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await authorizeAction('programs', 'can_delete');

    const success = await softDeleteProgram(programId);

    if (!success) {
      return { success: false, error: "Failed to delete program" };
    }

    revalidatePath("/program");
    return { success: true };
  } catch (error) {
    console.error("Error in deleteProgramAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export async function createCategoryAction(
  name: string
): Promise<{ success: boolean; categoryId?: string; error?: string }> {
  try {
    await authorizeAction('programs', 'can_create');

    const category = await createCategory({ name });

    if (!category) {
      return { success: false, error: "Failed to create category" };
    }

    revalidatePath("/program");
    return { success: true, categoryId: category.id };
  } catch (error) {
    console.error("Error in createCategoryAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export async function getProgramByIdAction(
  programId: string
): Promise<{ success: boolean; data?: ProgramFull; error?: string }> {
  try {
    const { getProgramById } = await import("@/data/programs");
    const program = await getProgramById(programId);

    if (!program) {
      return { success: false, error: "Program not found" };
    }

    return { success: true, data: program };
  } catch (error) {
    console.error("Error in getProgramByIdAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export async function uploadCoverImageAction(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    await authorizeAction('programs', 'can_edit');

    const { supabaseAdmin } = await import("@/db");
    const file = formData.get("file") as File;

    if (!file) {
      return { success: false, error: "No file provided" };
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `covers/${fileName}`;

    // Convert File to ArrayBuffer then to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from("program-covers")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return { success: false, error: uploadError.message };
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("program-covers")
      .getPublicUrl(filePath);

    return { success: true, url: publicUrl };
  } catch (error) {
    console.error("Error in uploadCoverImageAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
