-- ============================================
-- MIGRATION 010: Create Performance Indexes
-- Optimizes common query patterns
-- ============================================

-- ============================================
-- USERS TABLE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_branch_id ON public.users(branch_id);
CREATE INDEX IF NOT EXISTS idx_users_branch_role ON public.users(branch_id, role);

-- ============================================
-- BRANCHES TABLE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_branches_name ON public.branches(name);

-- ============================================
-- STUDENTS TABLE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_students_name ON public.students(name);
CREATE INDEX IF NOT EXISTS idx_students_branch_id ON public.students(branch_id);
CREATE INDEX IF NOT EXISTS idx_students_adcoin_balance ON public.students(adcoin_balance DESC);
-- Composite for branch + adcoin ranking
CREATE INDEX IF NOT EXISTS idx_students_branch_adcoin
  ON public.students(branch_id, adcoin_balance DESC);

-- ============================================
-- PARENTS TABLE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_parents_email ON public.parents(email);

-- ============================================
-- PARENT_STUDENTS JUNCTION INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_parent_students_parent_id ON public.parent_students(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_students_student_id ON public.parent_students(student_id);

-- ============================================
-- COURSES TABLE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_courses_branch_id ON public.courses(branch_id);
CREATE INDEX IF NOT EXISTS idx_courses_name ON public.courses(name);

-- ============================================
-- PACKAGES TABLE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_packages_name ON public.packages(name);

-- ============================================
-- ENROLLMENTS TABLE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON public.enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON public.enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_package_id ON public.enrollments(package_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON public.enrollments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_enrolled_at ON public.enrollments(enrolled_at);
-- Composite for student + course lookups
CREATE INDEX IF NOT EXISTS idx_enrollments_student_course
  ON public.enrollments(student_id, course_id);

-- ============================================
-- ATTENDANCE TABLE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_attendance_enrollment_id ON public.attendance(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_created_at ON public.attendance(created_at);
-- Composite for enrollment + date lookups
CREATE INDEX IF NOT EXISTS idx_attendance_enrollment_date
  ON public.attendance(enrollment_id, date);

-- ============================================
-- PAYMENTS TABLE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON public.payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at);
-- Composite for student + status
CREATE INDEX IF NOT EXISTS idx_payments_student_status
  ON public.payments(student_id, status);

-- ============================================
-- ADCOIN_TRANSACTIONS TABLE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_adcoin_transactions_sender_id ON public.adcoin_transactions(sender_id);
CREATE INDEX IF NOT EXISTS idx_adcoin_transactions_receiver_id ON public.adcoin_transactions(receiver_id);
CREATE INDEX IF NOT EXISTS idx_adcoin_transactions_type ON public.adcoin_transactions(type);
CREATE INDEX IF NOT EXISTS idx_adcoin_transactions_created_at ON public.adcoin_transactions(created_at);

-- ============================================
-- ITEMS TABLE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_items_name ON public.items(name);

-- ============================================
-- MISSIONS TABLE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_missions_name ON public.missions(name);

-- ============================================
-- ANALYZE TABLES
-- Update statistics for query planner
-- ============================================
ANALYZE public.users;
ANALYZE public.branches;
ANALYZE public.students;
ANALYZE public.parents;
ANALYZE public.parent_students;
ANALYZE public.courses;
ANALYZE public.packages;
ANALYZE public.enrollments;
ANALYZE public.attendance;
ANALYZE public.payments;
ANALYZE public.adcoin_transactions;
ANALYZE public.items;
ANALYZE public.missions;
