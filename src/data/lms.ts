import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/db";
import type {
  Course,
  CourseWithInstructor,
  CourseWithInstructorAndLessons,
  Lesson,
  EnrollmentWithCourseProfile,
  LessonProgress,
  CourseInsert,
  LessonInsert,
  LmsEnrollmentInsert,
  LessonProgressUpdate,
} from "@/db/schema";

// Legacy LMS Enrollment type (profiles-based)
interface LmsEnrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  completed_at: string | null;
  progress: number;
}

// ============================================
// COURSE QUERIES
// ============================================

/**
 * Get a published course by slug with instructor info
 */
export async function getCourseBySlug(
  slug: string
): Promise<CourseWithInstructor | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("courses")
    .select(
      `
      *,
      instructor:profiles!instructor_id(*)
    `
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (error) {
    console.error("Error fetching course:", error);
    return null;
  }

  return data as CourseWithInstructor;
}

/**
 * Get a course with all its lessons (for enrolled users or instructors)
 * RLS will automatically filter based on enrollment status
 */
export async function getCourseWithLessons(
  courseId: string
): Promise<CourseWithInstructorAndLessons | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("courses")
    .select(
      `
      *,
      instructor:profiles!instructor_id(*),
      lessons(*)
    `
    )
    .eq("id", courseId)
    .order("position", { referencedTable: "lessons", ascending: true })
    .single();

  if (error) {
    console.error("Error fetching course with lessons:", error);
    return null;
  }

  return data as CourseWithInstructorAndLessons;
}

/**
 * Get all published courses
 */
export async function getPublishedCourses(): Promise<CourseWithInstructor[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("courses")
    .select(
      `
      *,
      instructor:profiles!instructor_id(id, full_name, avatar_url)
    `
    )
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  if (error) {
    console.error("Error fetching courses:", error);
    return [];
  }

  return data as CourseWithInstructor[];
}

/**
 * Get courses created by an instructor
 */
export async function getInstructorCourses(
  instructorId: string
): Promise<Course[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("instructor_id", instructorId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching instructor courses:", error);
    return [];
  }

  return data;
}

// ============================================
// LESSON QUERIES
// ============================================

/**
 * Get a specific lesson (RLS handles access control)
 */
export async function getLesson(lessonId: string): Promise<Lesson | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", lessonId)
    .single();

  if (error) {
    console.error("Error fetching lesson:", error);
    return null;
  }

  return data;
}

/**
 * Get preview lessons for a course (publicly accessible)
 */
export async function getPreviewLessons(courseId: string): Promise<Lesson[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("course_id", courseId)
    .eq("is_preview", true)
    .eq("is_published", true)
    .order("position", { ascending: true });

  if (error) {
    console.error("Error fetching preview lessons:", error);
    return [];
  }

  return data;
}

// ============================================
// ENROLLMENT QUERIES
// ============================================

/**
 * Check if a user is enrolled in a course
 */
export async function isUserEnrolled(
  userId: string,
  courseId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows returned
    console.error("Error checking enrollment:", error);
  }

  return !!data;
}

/**
 * Get user's enrolled courses
 */
export async function getUserEnrollments(
  userId: string
): Promise<EnrollmentWithCourseProfile[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("enrollments")
    .select(
      `
      *,
      course:courses(*)
    `
    )
    .eq("user_id", userId)
    .order("enrolled_at", { ascending: false });

  if (error) {
    console.error("Error fetching enrollments:", error);
    return [];
  }

  return data as EnrollmentWithCourseProfile[];
}

/**
 * Enroll a user in a course
 */
export async function enrollUser(
  userId: string,
  courseId: string
): Promise<LmsEnrollment | null> {
  const supabase = await createClient();

  const enrollment: LmsEnrollmentInsert = {
    user_id: userId,
    course_id: courseId,
  };

  const { data, error } = await supabase
    .from("enrollments")
    .insert(enrollment)
    .select()
    .single();

  if (error) {
    console.error("Error enrolling user:", error);
    return null;
  }

  return data;
}

// ============================================
// LESSON PROGRESS QUERIES
// ============================================

/**
 * Get user's progress for all lessons in a course
 */
export async function getCourseProgress(
  userId: string,
  courseId: string
): Promise<LessonProgress[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("lesson_progress")
    .select(
      `
      *,
      lesson:lessons!inner(course_id)
    `
    )
    .eq("user_id", userId)
    .eq("lessons.course_id", courseId);

  if (error) {
    console.error("Error fetching progress:", error);
    return [];
  }

  return data as LessonProgress[];
}

/**
 * Update lesson progress
 */
export async function updateLessonProgress(
  userId: string,
  lessonId: string,
  progress: LessonProgressUpdate
): Promise<LessonProgress | null> {
  const supabase = await createClient();

  // Upsert: insert or update on conflict
  const { data, error } = await supabase
    .from("lesson_progress")
    .upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        ...progress,
        completed_at: progress.completed ? new Date().toISOString() : null,
      },
      {
        onConflict: "user_id,lesson_id",
      }
    )
    .select()
    .single();

  if (error) {
    console.error("Error updating progress:", error);
    return null;
  }

  return data;
}

/**
 * Mark a lesson as complete
 */
export async function markLessonComplete(
  userId: string,
  lessonId: string
): Promise<boolean> {
  const result = await updateLessonProgress(userId, lessonId, {
    completed: true,
  });
  return !!result;
}

// ============================================
// INSTRUCTOR MUTATIONS (server-side with admin client)
// ============================================

/**
 * Create a new course (instructor only)
 */
export async function createCourse(
  course: CourseInsert
): Promise<Course | null> {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .insert(course)
    .select()
    .single();

  if (error) {
    console.error("Error creating course:", error);
    return null;
  }

  return data;
}

/**
 * Add a lesson to a course (instructor only)
 */
export async function createLesson(
  lesson: LessonInsert
): Promise<Lesson | null> {
  const { data, error } = await supabaseAdmin
    .from("lessons")
    .insert(lesson)
    .select()
    .single();

  if (error) {
    console.error("Error creating lesson:", error);
    return null;
  }

  return data;
}

/**
 * Publish a course
 */
export async function publishCourse(courseId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("courses")
    .update({
      is_published: true,
      published_at: new Date().toISOString(),
    })
    .eq("id", courseId);

  if (error) {
    console.error("Error publishing course:", error);
    return false;
  }

  return true;
}
