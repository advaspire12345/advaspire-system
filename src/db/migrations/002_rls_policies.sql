-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Users can view any profile (for displaying instructor info, etc.)
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (TRUE);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================
-- COURSES POLICIES
-- ============================================

-- Anyone can view published courses
CREATE POLICY "Published courses are viewable by everyone"
  ON public.courses FOR SELECT
  USING (is_published = TRUE);

-- Instructors can view their own unpublished courses
CREATE POLICY "Instructors can view own courses"
  ON public.courses FOR SELECT
  USING (instructor_id = auth.uid());

-- Instructors can create courses
CREATE POLICY "Instructors can create courses"
  ON public.courses FOR INSERT
  WITH CHECK (
    instructor_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('instructor', 'admin')
    )
  );

-- Instructors can update their own courses
CREATE POLICY "Instructors can update own courses"
  ON public.courses FOR UPDATE
  USING (instructor_id = auth.uid())
  WITH CHECK (instructor_id = auth.uid());

-- Instructors can delete their own courses
CREATE POLICY "Instructors can delete own courses"
  ON public.courses FOR DELETE
  USING (instructor_id = auth.uid());

-- ============================================
-- LESSONS POLICIES
-- ============================================

-- Preview lessons are viewable by everyone (for published courses)
CREATE POLICY "Preview lessons are viewable by everyone"
  ON public.lessons FOR SELECT
  USING (
    is_preview = TRUE AND
    is_published = TRUE AND
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = lessons.course_id AND courses.is_published = TRUE
    )
  );

-- Enrolled users can view all published lessons in their enrolled courses
CREATE POLICY "Enrolled users can view course lessons"
  ON public.lessons FOR SELECT
  USING (
    is_published = TRUE AND
    EXISTS (
      SELECT 1 FROM public.enrollments
      WHERE enrollments.course_id = lessons.course_id
        AND enrollments.user_id = auth.uid()
    )
  );

-- Instructors can view all lessons in their own courses
CREATE POLICY "Instructors can view own course lessons"
  ON public.lessons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = lessons.course_id
        AND courses.instructor_id = auth.uid()
    )
  );

-- Instructors can create lessons in their own courses
CREATE POLICY "Instructors can create lessons"
  ON public.lessons FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_id
        AND courses.instructor_id = auth.uid()
    )
  );

-- Instructors can update lessons in their own courses
CREATE POLICY "Instructors can update own lessons"
  ON public.lessons FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = lessons.course_id
        AND courses.instructor_id = auth.uid()
    )
  );

-- Instructors can delete lessons in their own courses
CREATE POLICY "Instructors can delete own lessons"
  ON public.lessons FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = lessons.course_id
        AND courses.instructor_id = auth.uid()
    )
  );

-- ============================================
-- ENROLLMENTS POLICIES
-- ============================================

-- Users can view their own enrollments
CREATE POLICY "Users can view own enrollments"
  ON public.enrollments FOR SELECT
  USING (user_id = auth.uid());

-- Instructors can view enrollments for their courses
CREATE POLICY "Instructors can view course enrollments"
  ON public.enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = enrollments.course_id
        AND courses.instructor_id = auth.uid()
    )
  );

-- Users can enroll themselves in published courses
CREATE POLICY "Users can enroll in published courses"
  ON public.enrollments FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_id AND courses.is_published = TRUE
    )
  );

-- Users can update their own enrollment (for progress tracking)
CREATE POLICY "Users can update own enrollment"
  ON public.enrollments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can unenroll themselves
CREATE POLICY "Users can delete own enrollment"
  ON public.enrollments FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- LESSON PROGRESS POLICIES
-- ============================================

-- Users can view their own progress
CREATE POLICY "Users can view own lesson progress"
  ON public.lesson_progress FOR SELECT
  USING (user_id = auth.uid());

-- Users can create their own progress records
CREATE POLICY "Users can create own lesson progress"
  ON public.lesson_progress FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.enrollments e ON e.course_id = l.course_id
      WHERE l.id = lesson_id AND e.user_id = auth.uid()
    )
  );

-- Users can update their own progress
CREATE POLICY "Users can update own lesson progress"
  ON public.lesson_progress FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- HELPER FUNCTION: Check if user is enrolled
-- ============================================
CREATE OR REPLACE FUNCTION public.is_enrolled(p_course_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE course_id = p_course_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- HELPER FUNCTION: Check if user is course instructor
-- ============================================
CREATE OR REPLACE FUNCTION public.is_course_instructor(p_course_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.courses
    WHERE id = p_course_id AND instructor_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
