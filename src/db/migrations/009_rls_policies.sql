-- ============================================
-- MIGRATION 009: RLS Policies
-- Row Level Security policies for all tables
-- ============================================

-- ============================================
-- USERS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "users_select" ON public.users;
DROP POLICY IF EXISTS "users_insert" ON public.users;
DROP POLICY IF EXISTS "users_update" ON public.users;
DROP POLICY IF EXISTS "users_delete" ON public.users;

-- SELECT: Super admins see all, others see own branch + own record
CREATE POLICY "users_select" ON public.users
FOR SELECT USING (
  deleted_at IS NULL AND (
    public.is_super_admin()
    OR auth_id = auth.uid()
    OR (public.is_branch_admin() AND branch_id = public.get_current_user_branch_id())
  )
);

-- INSERT: Only admins can create users
CREATE POLICY "users_insert" ON public.users
FOR INSERT WITH CHECK (public.is_admin());

-- UPDATE: Own record OR branch_admin for same branch
CREATE POLICY "users_update" ON public.users
FOR UPDATE USING (
  auth_id = auth.uid()
  OR (public.is_branch_admin() AND branch_id = public.get_current_user_branch_id())
  OR public.is_admin()
);

-- DELETE: Only admins
CREATE POLICY "users_delete" ON public.users
FOR DELETE USING (public.is_admin());

-- ============================================
-- BRANCHES TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "branches_select" ON public.branches;
DROP POLICY IF EXISTS "branches_insert" ON public.branches;
DROP POLICY IF EXISTS "branches_update" ON public.branches;
DROP POLICY IF EXISTS "branches_delete" ON public.branches;

-- SELECT: Super admins see all, others see own branch
CREATE POLICY "branches_select" ON public.branches
FOR SELECT USING (
  deleted_at IS NULL AND (
    public.is_super_admin()
    OR id = public.get_current_user_branch_id()
  )
);

-- INSERT: Only super admins
CREATE POLICY "branches_insert" ON public.branches
FOR INSERT WITH CHECK (public.is_super_admin());

-- UPDATE: Super admin or branch_admin for own branch
CREATE POLICY "branches_update" ON public.branches
FOR UPDATE USING (
  public.is_super_admin()
  OR (public.is_branch_admin() AND id = public.get_current_user_branch_id())
);

-- DELETE: Only super admins
CREATE POLICY "branches_delete" ON public.branches
FOR DELETE USING (public.is_super_admin());

-- ============================================
-- STUDENTS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "students_select" ON public.students;
DROP POLICY IF EXISTS "students_insert" ON public.students;
DROP POLICY IF EXISTS "students_update" ON public.students;
DROP POLICY IF EXISTS "students_delete" ON public.students;

-- SELECT: Branch-scoped + parent access + own record
CREATE POLICY "students_select" ON public.students
FOR SELECT USING (
  deleted_at IS NULL AND (
    public.is_super_admin()
    OR (public.is_instructor() AND branch_id = public.get_current_user_branch_id())
    OR public.can_parent_view_student(id)
    OR id = public.get_current_student_id()
  )
);

-- INSERT: Branch admins can add students
CREATE POLICY "students_insert" ON public.students
FOR INSERT WITH CHECK (
  public.is_super_admin()
  OR (public.is_branch_admin() AND branch_id = public.get_current_user_branch_id())
);

-- UPDATE: Branch staff
CREATE POLICY "students_update" ON public.students
FOR UPDATE USING (
  public.is_super_admin()
  OR (public.is_branch_admin() AND branch_id = public.get_current_user_branch_id())
);

-- DELETE: Branch admins
CREATE POLICY "students_delete" ON public.students
FOR DELETE USING (
  public.is_super_admin()
  OR (public.is_branch_admin() AND branch_id = public.get_current_user_branch_id())
);

-- ============================================
-- PARENTS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "parents_select" ON public.parents;
DROP POLICY IF EXISTS "parents_insert" ON public.parents;
DROP POLICY IF EXISTS "parents_update" ON public.parents;
DROP POLICY IF EXISTS "parents_delete" ON public.parents;

-- SELECT: Own record OR branch staff
CREATE POLICY "parents_select" ON public.parents
FOR SELECT USING (
  deleted_at IS NULL AND (
    public.is_super_admin()
    OR auth_id = auth.uid()
    OR public.is_branch_admin()
  )
);

-- INSERT: Branch admins
CREATE POLICY "parents_insert" ON public.parents
FOR INSERT WITH CHECK (public.is_branch_admin());

-- UPDATE: Own record OR branch admin
CREATE POLICY "parents_update" ON public.parents
FOR UPDATE USING (
  auth_id = auth.uid()
  OR public.is_branch_admin()
);

-- DELETE: Branch admins
CREATE POLICY "parents_delete" ON public.parents
FOR DELETE USING (public.is_branch_admin());

-- ============================================
-- PARENT_STUDENTS JUNCTION TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "parent_students_select" ON public.parent_students;
DROP POLICY IF EXISTS "parent_students_insert" ON public.parent_students;
DROP POLICY IF EXISTS "parent_students_delete" ON public.parent_students;

-- SELECT: Parents see own, admins see all
CREATE POLICY "parent_students_select" ON public.parent_students
FOR SELECT USING (
  public.is_branch_admin()
  OR parent_id = public.get_current_parent_id()
);

-- INSERT: Branch admins
CREATE POLICY "parent_students_insert" ON public.parent_students
FOR INSERT WITH CHECK (public.is_branch_admin());

-- DELETE: Branch admins
CREATE POLICY "parent_students_delete" ON public.parent_students
FOR DELETE USING (public.is_branch_admin());

-- ============================================
-- COURSES TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "courses_select" ON public.courses;
DROP POLICY IF EXISTS "courses_insert" ON public.courses;
DROP POLICY IF EXISTS "courses_update" ON public.courses;
DROP POLICY IF EXISTS "courses_delete" ON public.courses;

-- SELECT: Everyone can view courses (for enrollment options)
CREATE POLICY "courses_select" ON public.courses
FOR SELECT USING (deleted_at IS NULL);

-- INSERT: Branch admins
CREATE POLICY "courses_insert" ON public.courses
FOR INSERT WITH CHECK (
  public.is_super_admin() OR public.is_branch_admin()
);

-- UPDATE: Branch admins
CREATE POLICY "courses_update" ON public.courses
FOR UPDATE USING (
  public.is_super_admin() OR public.is_branch_admin()
);

-- DELETE: Branch admins
CREATE POLICY "courses_delete" ON public.courses
FOR DELETE USING (
  public.is_super_admin() OR public.is_branch_admin()
);

-- ============================================
-- PACKAGES TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "packages_select" ON public.packages;
DROP POLICY IF EXISTS "packages_insert" ON public.packages;
DROP POLICY IF EXISTS "packages_update" ON public.packages;
DROP POLICY IF EXISTS "packages_delete" ON public.packages;

-- SELECT: Everyone can view packages
CREATE POLICY "packages_select" ON public.packages
FOR SELECT USING (deleted_at IS NULL);

-- INSERT/UPDATE/DELETE: Only admins
CREATE POLICY "packages_insert" ON public.packages
FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "packages_update" ON public.packages
FOR UPDATE USING (public.is_admin());

CREATE POLICY "packages_delete" ON public.packages
FOR DELETE USING (public.is_admin());

-- ============================================
-- ENROLLMENTS TABLE POLICIES
-- Uses student_id (references students table)
-- ============================================
DROP POLICY IF EXISTS "enrollments_select" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_insert" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_update" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_delete" ON public.enrollments;

-- SELECT: Instructors see branch students, students see own, parents see children
CREATE POLICY "enrollments_select" ON public.enrollments
FOR SELECT USING (
  deleted_at IS NULL AND (
    public.is_super_admin()
    OR public.is_instructor()
    OR student_id = public.get_current_student_id()
    OR public.can_parent_view_student(student_id)
  )
);

-- INSERT: Instructors
CREATE POLICY "enrollments_insert" ON public.enrollments
FOR INSERT WITH CHECK (
  public.is_super_admin() OR public.is_instructor()
);

-- UPDATE: Instructors
CREATE POLICY "enrollments_update" ON public.enrollments
FOR UPDATE USING (
  public.is_super_admin() OR public.is_instructor()
);

-- DELETE: Admins only
CREATE POLICY "enrollments_delete" ON public.enrollments
FOR DELETE USING (
  public.is_super_admin() OR public.is_branch_admin()
);

-- ============================================
-- ATTENDANCE TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "attendance_select" ON public.attendance;
DROP POLICY IF EXISTS "attendance_insert" ON public.attendance;
DROP POLICY IF EXISTS "attendance_update" ON public.attendance;
DROP POLICY IF EXISTS "attendance_delete" ON public.attendance;

-- SELECT: Instructors see all, students see own via enrollment
CREATE POLICY "attendance_select" ON public.attendance
FOR SELECT USING (
  public.is_super_admin()
  OR public.is_instructor()
  OR EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.id = enrollment_id
    AND (e.student_id = public.get_current_student_id() OR public.can_parent_view_student(e.student_id))
  )
);

-- INSERT: Instructors
CREATE POLICY "attendance_insert" ON public.attendance
FOR INSERT WITH CHECK (
  public.is_super_admin() OR public.is_instructor()
);

-- UPDATE: Instructors
CREATE POLICY "attendance_update" ON public.attendance
FOR UPDATE USING (
  public.is_super_admin() OR public.is_instructor()
);

-- DELETE: Branch admins
CREATE POLICY "attendance_delete" ON public.attendance
FOR DELETE USING (
  public.is_super_admin() OR public.is_branch_admin()
);

-- ============================================
-- PAYMENTS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "payments_select" ON public.payments;
DROP POLICY IF EXISTS "payments_insert" ON public.payments;
DROP POLICY IF EXISTS "payments_update" ON public.payments;
DROP POLICY IF EXISTS "payments_delete" ON public.payments;

-- SELECT: Admins see all, students/parents see own
CREATE POLICY "payments_select" ON public.payments
FOR SELECT USING (
  public.is_super_admin()
  OR public.is_branch_admin()
  OR student_id = public.get_current_student_id()
  OR public.can_parent_view_student(student_id)
);

-- INSERT: Branch admins
CREATE POLICY "payments_insert" ON public.payments
FOR INSERT WITH CHECK (
  public.is_super_admin() OR public.is_branch_admin()
);

-- UPDATE: Branch admins
CREATE POLICY "payments_update" ON public.payments
FOR UPDATE USING (
  public.is_super_admin() OR public.is_branch_admin()
);

-- DELETE: Admin only
CREATE POLICY "payments_delete" ON public.payments
FOR DELETE USING (public.is_admin());

-- ============================================
-- ADCOIN_TRANSACTIONS TABLE POLICIES
-- Uses sender_id and receiver_id (both reference students)
-- ============================================
DROP POLICY IF EXISTS "adcoin_transactions_select" ON public.adcoin_transactions;
DROP POLICY IF EXISTS "adcoin_transactions_insert" ON public.adcoin_transactions;
DROP POLICY IF EXISTS "adcoin_transactions_update" ON public.adcoin_transactions;
DROP POLICY IF EXISTS "adcoin_transactions_delete" ON public.adcoin_transactions;

-- SELECT: Instructors see all, students/parents see own (sender or receiver)
CREATE POLICY "adcoin_transactions_select" ON public.adcoin_transactions
FOR SELECT USING (
  public.is_super_admin()
  OR public.is_instructor()
  OR sender_id = public.get_current_student_id()
  OR receiver_id = public.get_current_student_id()
  OR public.can_parent_view_student(sender_id)
  OR public.can_parent_view_student(receiver_id)
);

-- INSERT: Instructors
CREATE POLICY "adcoin_transactions_insert" ON public.adcoin_transactions
FOR INSERT WITH CHECK (
  public.is_super_admin() OR public.is_instructor()
);

-- UPDATE: Branch admins only
CREATE POLICY "adcoin_transactions_update" ON public.adcoin_transactions
FOR UPDATE USING (
  public.is_super_admin() OR public.is_branch_admin()
);

-- DELETE: Admin only
CREATE POLICY "adcoin_transactions_delete" ON public.adcoin_transactions
FOR DELETE USING (public.is_admin());

-- ============================================
-- ITEMS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "items_select" ON public.items;
DROP POLICY IF EXISTS "items_insert" ON public.items;
DROP POLICY IF EXISTS "items_update" ON public.items;
DROP POLICY IF EXISTS "items_delete" ON public.items;

-- SELECT: Everyone can view items
CREATE POLICY "items_select" ON public.items
FOR SELECT USING (deleted_at IS NULL);

-- INSERT/UPDATE/DELETE: Only admins
CREATE POLICY "items_insert" ON public.items
FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "items_update" ON public.items
FOR UPDATE USING (public.is_admin());

CREATE POLICY "items_delete" ON public.items
FOR DELETE USING (public.is_admin());

-- ============================================
-- MISSIONS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "missions_select" ON public.missions;
DROP POLICY IF EXISTS "missions_insert" ON public.missions;
DROP POLICY IF EXISTS "missions_update" ON public.missions;
DROP POLICY IF EXISTS "missions_delete" ON public.missions;

-- SELECT: Everyone can view missions
CREATE POLICY "missions_select" ON public.missions
FOR SELECT USING (deleted_at IS NULL);

-- INSERT/UPDATE/DELETE: Only admins
CREATE POLICY "missions_insert" ON public.missions
FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "missions_update" ON public.missions
FOR UPDATE USING (public.is_admin());

CREATE POLICY "missions_delete" ON public.missions
FOR DELETE USING (public.is_admin());
