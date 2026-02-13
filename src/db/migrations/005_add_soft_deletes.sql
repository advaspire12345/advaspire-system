-- ============================================
-- MIGRATION 005: Add Soft Deletes
-- Adds deleted_at column to all main tables
-- ============================================

-- ============================================
-- ADD DELETED_AT TO USERS
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.users ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;

-- ============================================
-- ADD DELETED_AT TO BRANCHES
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'branches'
      AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.branches ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;

-- ============================================
-- ADD DELETED_AT TO STUDENTS
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'students'
      AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.students ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;

-- ============================================
-- ADD DELETED_AT TO PARENTS
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'parents'
      AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.parents ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;

-- ============================================
-- ADD DELETED_AT TO COURSES
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'courses'
      AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.courses ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;

-- ============================================
-- ADD DELETED_AT TO PACKAGES
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'packages'
      AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.packages ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;

-- ============================================
-- ADD DELETED_AT TO ENROLLMENTS
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'enrollments'
      AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.enrollments ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;

-- ============================================
-- ADD DELETED_AT TO ITEMS
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'items'
      AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.items ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;

-- ============================================
-- ADD DELETED_AT TO MISSIONS
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'missions'
      AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.missions ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;

-- ============================================
-- CREATE PARTIAL INDEXES FOR SOFT DELETES
-- These indexes optimize queries that filter for non-deleted records
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_not_deleted
  ON public.users(id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_branches_not_deleted
  ON public.branches(id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_students_not_deleted
  ON public.students(id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_parents_not_deleted
  ON public.parents(id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_courses_not_deleted
  ON public.courses(id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_packages_not_deleted
  ON public.packages(id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_enrollments_not_deleted
  ON public.enrollments(id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_items_not_deleted
  ON public.items(id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_missions_not_deleted
  ON public.missions(id) WHERE deleted_at IS NULL;

-- ============================================
-- SOFT DELETE HELPER FUNCTION
-- Instead of DELETE, use: SELECT soft_delete('table_name', id);
-- ============================================
CREATE OR REPLACE FUNCTION public.soft_delete(
  p_table_name TEXT,
  p_record_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  EXECUTE format(
    'UPDATE public.%I SET deleted_at = NOW() WHERE id = %L AND deleted_at IS NULL',
    p_table_name,
    p_record_id
  );
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RESTORE SOFT DELETED RECORD
-- ============================================
CREATE OR REPLACE FUNCTION public.restore_deleted(
  p_table_name TEXT,
  p_record_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  EXECUTE format(
    'UPDATE public.%I SET deleted_at = NULL WHERE id = %L AND deleted_at IS NOT NULL',
    p_table_name,
    p_record_id
  );
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
