-- ============================================
-- MIGRATION 003: RLS Helper Functions
-- Must be created BEFORE RLS policies
-- ============================================

-- ============================================
-- GET CURRENT USER'S APP USER ID
-- ============================================
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS UUID AS $$
  SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- GET CURRENT USER'S BRANCH ID
-- ============================================
CREATE OR REPLACE FUNCTION public.get_current_user_branch_id()
RETURNS UUID AS $$
  SELECT branch_id FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- GET CURRENT USER'S ROLE
-- ============================================
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- CHECK IF CURRENT USER IS SUPER ADMIN
-- ============================================
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid() AND role = 'super_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- CHECK IF CURRENT USER IS ADMIN OR SUPER ADMIN
-- ============================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid() AND role IN ('super_admin', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- CHECK IF CURRENT USER IS BRANCH ADMIN
-- ============================================
CREATE OR REPLACE FUNCTION public.is_branch_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid() AND role IN ('super_admin', 'admin', 'branch_admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- CHECK IF CURRENT USER IS INSTRUCTOR
-- ============================================
CREATE OR REPLACE FUNCTION public.is_instructor()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid() AND role IN ('super_admin', 'admin', 'branch_admin', 'instructor')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- CHECK IF USER CAN ACCESS A SPECIFIC BRANCH
-- Super admins can access all branches
-- Others can only access their assigned branch
-- ============================================
CREATE OR REPLACE FUNCTION public.can_access_branch(p_branch_id UUID)
RETURNS BOOLEAN AS $$
  SELECT
    public.is_super_admin()
    OR public.get_current_user_branch_id() = p_branch_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- CHECK IF PARENT CAN VIEW A SPECIFIC STUDENT
-- ============================================
CREATE OR REPLACE FUNCTION public.can_parent_view_student(p_student_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.parent_students ps
    JOIN public.parents p ON p.id = ps.parent_id
    WHERE ps.student_id = p_student_id
      AND p.auth_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- CHECK IF USER CAN VIEW STUDENT
-- Admins see all, branch staff see branch students, parents see children
-- ============================================
CREATE OR REPLACE FUNCTION public.can_view_student(p_student_id UUID)
RETURNS BOOLEAN AS $$
  SELECT
    -- Super admins see all
    public.is_super_admin()
    -- Branch staff can see students in their branch
    OR EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = p_student_id
        AND public.can_access_branch(s.branch_id)
        AND public.is_instructor()
    )
    -- Parents can see their children
    OR public.can_parent_view_student(p_student_id);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- GET STUDENT ID FOR CURRENT USER (if they are a student)
-- Note: Returns NULL if students table doesn't link to users
-- This can be updated once user_id column is added to students
-- ============================================
CREATE OR REPLACE FUNCTION public.get_current_student_id()
RETURNS UUID AS $$
  -- Check if students table has user_id column, if not return null
  SELECT s.id
  FROM public.students s
  WHERE s.email = (SELECT email FROM public.users WHERE auth_id = auth.uid() LIMIT 1)
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- GET PARENT ID FOR CURRENT USER (if they are a parent)
-- ============================================
CREATE OR REPLACE FUNCTION public.get_current_parent_id()
RETURNS UUID AS $$
  SELECT id FROM public.parents WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- CHECK IF USER IS ASSOCIATED WITH AN ENROLLMENT
-- (Either as the student, or as a parent of the student)
-- ============================================
CREATE OR REPLACE FUNCTION public.can_view_enrollment(p_enrollment_id UUID)
RETURNS BOOLEAN AS $$
  SELECT
    -- Super admins see all
    public.is_super_admin()
    -- Branch staff can see enrollments in their branch
    OR EXISTS (
      SELECT 1 FROM public.enrollments e
      JOIN public.students s ON s.id = e.student_id
      WHERE e.id = p_enrollment_id
        AND public.can_access_branch(s.branch_id)
        AND public.is_instructor()
    )
    -- The student themselves
    OR EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.id = p_enrollment_id
        AND e.student_id = public.get_current_student_id()
    )
    -- Parents can see their children's enrollments
    OR EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.id = p_enrollment_id
        AND public.can_parent_view_student(e.student_id)
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
