import { supabaseAdmin } from "@/db";
import type {
  CourseCategory,
  CourseCategoryInsert,
  ProgramTableRow,
  ProgramFull,
} from "@/db/schema";

// Re-export constants for server-side use
export {
  LANGUAGE_OPTIONS,
  PROGRAM_TYPE_OPTIONS,
  STATUS_OPTIONS,
} from "@/lib/constants/program";

// ============================================
// CATEGORY OPERATIONS
// ============================================

export async function getAllCategories(): Promise<CourseCategory[]> {
  const { data, error } = await supabaseAdmin
    .from("course_categories")
    .select("*")
    .is("deleted_at", null)
    .order("name");

  if (error) {
    console.error("Error fetching categories:", error);
    return [];
  }

  return data ?? [];
}

export async function createCategory(categoryData: CourseCategoryInsert): Promise<CourseCategory | null> {
  const { data, error } = await supabaseAdmin
    .from("course_categories")
    .insert(categoryData)
    .select()
    .single();

  if (error) {
    console.error("Error creating category:", error);
    return null;
  }

  return data;
}

// ============================================
// PROGRAM TABLE VIEW
// ============================================

export async function getProgramsForTable(userEmail: string): Promise<ProgramTableRow[]> {
  const { getUserBranchIdByEmail } = await import("./users");
  const userBranchId = await getUserBranchIdByEmail(userEmail);

  // Fetch programs with related data
  const { data: programs, error } = await supabaseAdmin
    .from("courses")
    .select(`
      id,
      name,
      short_description,
      category_id,
      number_of_levels,
      sessions_to_level_up,
      program_type,
      status,
      cover_image_url,
      assessment_enabled,
      levelling_time_minutes,
      course_categories(name),
      course_branches(branch_id, branches(name)),
      course_sections(
        id,
        course_lessons(id)
      ),
      course_pricing(*)
    `)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching programs:", error);
    return [];
  }

  // Fetch enrolled counts
  const courseIds = programs?.map((p) => p.id) ?? [];
  const { data: enrollmentCounts } = await supabaseAdmin
    .from("enrollments")
    .select("course_id")
    .in("course_id", courseIds)
    .is("deleted_at", null);

  const enrollmentCountMap = new Map<string, number>();
  enrollmentCounts?.forEach((e) => {
    const count = enrollmentCountMap.get(e.course_id) || 0;
    enrollmentCountMap.set(e.course_id, count + 1);
  });

  return (programs ?? []).map((program: any) => {
    const branchNames = program.course_branches
      ?.map((cb: any) => cb.branches?.name)
      .filter(Boolean) ?? [];

    const lessonCount = program.course_sections?.reduce(
      (sum: number, section: any) => sum + (section.course_lessons?.length ?? 0),
      0
    ) ?? 0;

    const defaultPricing = program.course_pricing?.find((p: any) => p.is_default) ||
      program.course_pricing?.[0] || null;

    return {
      id: program.id,
      name: program.name,
      short_description: program.short_description,
      category_id: program.category_id,
      category_name: program.course_categories?.name || null,
      number_of_levels: program.number_of_levels,
      sessions_to_level_up: program.sessions_to_level_up,
      program_type: program.program_type,
      status: program.status || "active",
      cover_image_url: program.cover_image_url,
      assessment_enabled: program.assessment_enabled || false,
      levelling_time_minutes: program.levelling_time_minutes,
      enrolled_count: enrollmentCountMap.get(program.id) || 0,
      lesson_count: lessonCount,
      branch_names: branchNames,
      default_pricing: defaultPricing,
    };
  });
}

// ============================================
// PROGRAM FULL DETAILS
// ============================================

export async function getProgramById(programId: string): Promise<ProgramFull | null> {
  // Fetch main course data
  const { data: course, error } = await supabaseAdmin
    .from("courses")
    .select(`
      *,
      course_categories(*),
      course_languages(language),
      course_instructors(user_id, users(*)),
      course_branches(branch_id, branches(*)),
      course_requirements(*),
      course_outcomes(*),
      course_faqs(*),
      course_sections(
        *,
        course_lessons(*)
      ),
      course_pricing(*)
    `)
    .eq("id", programId)
    .is("deleted_at", null)
    .single();

  if (error) {
    console.error("Error fetching program:", error);
    return null;
  }

  if (!course) return null;

  // Transform data to ProgramFull
  const programFull: ProgramFull = {
    ...course,
    category: course.course_categories || null,
    languages: course.course_languages?.map((cl: any) => cl.language) ?? [],
    instructors: course.course_instructors?.map((ci: any) => ci.users).filter(Boolean) ?? [],
    branches: course.course_branches?.map((cb: any) => cb.branches).filter(Boolean) ?? [],
    requirements: (course.course_requirements ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
    outcomes: (course.course_outcomes ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
    faqs: (course.course_faqs ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
    sections: (course.course_sections ?? [])
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((section: any) => ({
        ...section,
        lessons: (section.course_lessons ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
      })),
    pricing: (course.course_pricing ?? []).filter((p: any) => !p.deleted_at),
  };

  return programFull;
}

// ============================================
// PROGRAM CREATE
// ============================================

export interface CreateProgramPayload {
  // Basic
  name: string;
  description: string | null;
  short_description: string | null;
  category_id: string | null;
  number_of_levels: number | null;
  sessions_to_level_up: number | null;
  program_type: string | null;
  status: string;
  branch_id: string; // Primary branch for legacy compatibility
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
}

export async function createProgram(payload: CreateProgramPayload): Promise<string | null> {
  // 1. Create the course
  const { data: course, error: courseError } = await supabaseAdmin
    .from("courses")
    .insert({
      name: payload.name,
      description: payload.description,
      short_description: payload.short_description,
      category_id: payload.category_id,
      number_of_levels: payload.number_of_levels,
      sessions_to_level_up: payload.sessions_to_level_up,
      program_type: payload.program_type,
      status: payload.status || "active",
      branch_id: payload.branch_id,
      cover_image_url: payload.cover_image_url,
      youtube_url: payload.youtube_url,
      assessment_enabled: payload.assessment_enabled,
      levelling_time_minutes: payload.levelling_time_minutes,
    })
    .select("id")
    .single();

  if (courseError || !course) {
    console.error("Error creating course:", courseError);
    return null;
  }

  const courseId = course.id;

  // 2. Insert languages
  if (payload.languages.length > 0) {
    const languageInserts = payload.languages.map((language) => ({
      course_id: courseId,
      language,
    }));
    await supabaseAdmin.from("course_languages").insert(languageInserts);
  }

  // 3. Insert instructors
  if (payload.instructor_ids.length > 0) {
    const instructorInserts = payload.instructor_ids.map((user_id) => ({
      course_id: courseId,
      user_id,
    }));
    await supabaseAdmin.from("course_instructors").insert(instructorInserts);
  }

  // 4. Insert branches
  if (payload.branch_ids.length > 0) {
    const branchInserts = payload.branch_ids.map((branch_id) => ({
      course_id: courseId,
      branch_id,
    }));
    await supabaseAdmin.from("course_branches").insert(branchInserts);
  }

  // 5. Insert requirements
  if (payload.requirements.length > 0) {
    const requirementInserts = payload.requirements
      .filter((r) => r.trim())
      .map((requirement, index) => ({
        course_id: courseId,
        requirement,
        sort_order: index,
      }));
    if (requirementInserts.length > 0) {
      await supabaseAdmin.from("course_requirements").insert(requirementInserts);
    }
  }

  // 6. Insert outcomes
  if (payload.outcomes.length > 0) {
    const outcomeInserts = payload.outcomes
      .filter((o) => o.trim())
      .map((outcome, index) => ({
        course_id: courseId,
        outcome,
        sort_order: index,
      }));
    if (outcomeInserts.length > 0) {
      await supabaseAdmin.from("course_outcomes").insert(outcomeInserts);
    }
  }

  // 7. Insert FAQs
  if (payload.faqs.length > 0) {
    const faqInserts = payload.faqs
      .filter((f) => f.question.trim() && f.answer.trim())
      .map((faq, index) => ({
        course_id: courseId,
        question: faq.question,
        answer: faq.answer,
        sort_order: index,
      }));
    if (faqInserts.length > 0) {
      await supabaseAdmin.from("course_faqs").insert(faqInserts);
    }
  }

  // 8. Insert sections and lessons
  for (let sectionIndex = 0; sectionIndex < payload.sections.length; sectionIndex++) {
    const section = payload.sections[sectionIndex];
    if (!section.title.trim()) continue;

    const { data: sectionData, error: sectionError } = await supabaseAdmin
      .from("course_sections")
      .insert({
        course_id: courseId,
        title: section.title,
        description: section.description || null,
        sort_order: sectionIndex,
      })
      .select("id")
      .single();

    if (sectionError || !sectionData) continue;

    // Insert lessons for this section
    if (section.lessons.length > 0) {
      const lessonInserts = section.lessons
        .filter((l) => l.title.trim())
        .map((lesson, lessonIndex) => ({
          section_id: sectionData.id,
          title: lesson.title,
          description: lesson.description || null,
          duration_minutes: lesson.duration_minutes,
          content_type: lesson.content_type,
          sort_order: lessonIndex,
        }));
      if (lessonInserts.length > 0) {
        await supabaseAdmin.from("course_lessons").insert(lessonInserts);
      }
    }
  }

  // 9. Insert pricing
  if (payload.pricing.length > 0) {
    const pricingInserts = payload.pricing.map((p) => ({
      course_id: courseId,
      package_type: p.package_type,
      price: p.price,
      duration: p.duration,
      description: p.description,
      is_default: p.is_default,
    }));
    await supabaseAdmin.from("course_pricing").insert(pricingInserts);
  }

  return courseId;
}

// ============================================
// PROGRAM UPDATE
// ============================================

export async function updateProgram(
  programId: string,
  payload: CreateProgramPayload
): Promise<boolean> {
  // 1. Update main course
  const { error: courseError } = await supabaseAdmin
    .from("courses")
    .update({
      name: payload.name,
      description: payload.description,
      short_description: payload.short_description,
      category_id: payload.category_id,
      number_of_levels: payload.number_of_levels,
      sessions_to_level_up: payload.sessions_to_level_up,
      program_type: payload.program_type,
      status: payload.status,
      branch_id: payload.branch_id,
      cover_image_url: payload.cover_image_url,
      youtube_url: payload.youtube_url,
      assessment_enabled: payload.assessment_enabled,
      levelling_time_minutes: payload.levelling_time_minutes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", programId);

  if (courseError) {
    console.error("Error updating course:", courseError);
    return false;
  }

  // 2. Replace languages
  await supabaseAdmin.from("course_languages").delete().eq("course_id", programId);
  if (payload.languages.length > 0) {
    await supabaseAdmin.from("course_languages").insert(
      payload.languages.map((language) => ({ course_id: programId, language }))
    );
  }

  // 3. Replace instructors
  await supabaseAdmin.from("course_instructors").delete().eq("course_id", programId);
  if (payload.instructor_ids.length > 0) {
    await supabaseAdmin.from("course_instructors").insert(
      payload.instructor_ids.map((user_id) => ({ course_id: programId, user_id }))
    );
  }

  // 4. Replace branches
  await supabaseAdmin.from("course_branches").delete().eq("course_id", programId);
  if (payload.branch_ids.length > 0) {
    await supabaseAdmin.from("course_branches").insert(
      payload.branch_ids.map((branch_id) => ({ course_id: programId, branch_id }))
    );
  }

  // 5. Replace requirements
  await supabaseAdmin.from("course_requirements").delete().eq("course_id", programId);
  const validRequirements = payload.requirements.filter((r) => r.trim());
  if (validRequirements.length > 0) {
    await supabaseAdmin.from("course_requirements").insert(
      validRequirements.map((requirement, index) => ({
        course_id: programId,
        requirement,
        sort_order: index,
      }))
    );
  }

  // 6. Replace outcomes
  await supabaseAdmin.from("course_outcomes").delete().eq("course_id", programId);
  const validOutcomes = payload.outcomes.filter((o) => o.trim());
  if (validOutcomes.length > 0) {
    await supabaseAdmin.from("course_outcomes").insert(
      validOutcomes.map((outcome, index) => ({
        course_id: programId,
        outcome,
        sort_order: index,
      }))
    );
  }

  // 7. Replace FAQs
  await supabaseAdmin.from("course_faqs").delete().eq("course_id", programId);
  const validFaqs = payload.faqs.filter((f) => f.question.trim() && f.answer.trim());
  if (validFaqs.length > 0) {
    await supabaseAdmin.from("course_faqs").insert(
      validFaqs.map((faq, index) => ({
        course_id: programId,
        question: faq.question,
        answer: faq.answer,
        sort_order: index,
      }))
    );
  }

  // 8. Replace sections and lessons
  // First, get existing sections to delete their lessons
  const { data: existingSections } = await supabaseAdmin
    .from("course_sections")
    .select("id")
    .eq("course_id", programId);

  if (existingSections) {
    for (const section of existingSections) {
      await supabaseAdmin.from("course_lessons").delete().eq("section_id", section.id);
    }
  }
  await supabaseAdmin.from("course_sections").delete().eq("course_id", programId);

  // Insert new sections and lessons
  for (let sectionIndex = 0; sectionIndex < payload.sections.length; sectionIndex++) {
    const section = payload.sections[sectionIndex];
    if (!section.title.trim()) continue;

    const { data: sectionData } = await supabaseAdmin
      .from("course_sections")
      .insert({
        course_id: programId,
        title: section.title,
        description: section.description || null,
        sort_order: sectionIndex,
      })
      .select("id")
      .single();

    if (sectionData && section.lessons.length > 0) {
      const validLessons = section.lessons.filter((l) => l.title.trim());
      if (validLessons.length > 0) {
        await supabaseAdmin.from("course_lessons").insert(
          validLessons.map((lesson, lessonIndex) => ({
            section_id: sectionData.id,
            title: lesson.title,
            description: lesson.description || null,
            duration_minutes: lesson.duration_minutes,
            content_type: lesson.content_type,
            sort_order: lessonIndex,
          }))
        );
      }
    }
  }

  // 9. Replace pricing (soft delete old, insert new)
  await supabaseAdmin
    .from("course_pricing")
    .update({ deleted_at: new Date().toISOString() })
    .eq("course_id", programId)
    .is("deleted_at", null);

  if (payload.pricing.length > 0) {
    await supabaseAdmin.from("course_pricing").insert(
      payload.pricing.map((p) => ({
        course_id: programId,
        package_type: p.package_type,
        price: p.price,
        duration: p.duration,
        description: p.description,
        is_default: p.is_default,
      }))
    );
  }

  return true;
}

// ============================================
// PROGRAM DELETE
// ============================================

export async function softDeleteProgram(programId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("courses")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", programId);

  if (error) {
    console.error("Error deleting program:", error);
    return false;
  }

  return true;
}

// ============================================
// HELPER QUERIES
// ============================================

export async function getInstructors(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, name")
    .eq("role", "instructor")
    .is("deleted_at", null)
    .order("name");

  if (error) {
    console.error("Error fetching instructors:", error);
    return [];
  }

  return data ?? [];
}
