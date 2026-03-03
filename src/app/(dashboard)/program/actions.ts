"use server";

import { revalidatePath } from "next/cache";
import {
  createProgram,
  updateProgram,
  softDeleteProgram,
  createCategory,
  type CreateProgramPayload,
} from "@/data/programs";

export interface ProgramFormPayload {
  // Basic
  name: string;
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
      description: string;
      duration_minutes: number | null;
      content_type: string | null;
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
