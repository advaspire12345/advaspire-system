-- ============================================
-- MIGRATION 007: Expand User Roles
-- Adds constraint for 6 role types
-- ============================================

-- ============================================
-- DROP OLD ROLE CONSTRAINT IF EXISTS
-- ============================================
DO $$
BEGIN
  -- Try to drop old constraint (may have different names)
  ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
  ALTER TABLE public.users DROP CONSTRAINT IF EXISTS valid_role;
  ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_valid_role;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- ============================================
-- MIGRATE EXISTING ROLES TO NEW VALUES
-- Map old role names to new role names
-- ============================================
UPDATE public.users SET role = 'instructor' WHERE role = 'teacher';
UPDATE public.users SET role = 'admin' WHERE role = 'administrator';
UPDATE public.users SET role = 'student' WHERE role NOT IN ('super_admin', 'admin', 'branch_admin', 'instructor', 'student', 'parent');

-- ============================================
-- ADD NEW ROLE CONSTRAINT WITH 6 ROLES
-- ============================================
ALTER TABLE public.users
ADD CONSTRAINT valid_user_role CHECK (
  role IN ('super_admin', 'admin', 'branch_admin', 'instructor', 'student', 'parent')
);

-- ============================================
-- CREATE ROLE HIERARCHY VIEW
-- Useful for understanding role permissions
-- ============================================
CREATE OR REPLACE VIEW public.role_hierarchy AS
SELECT
  role,
  level,
  description,
  can_manage_branches,
  can_manage_users,
  can_manage_students,
  can_view_all_data,
  can_mark_attendance,
  can_manage_adcoins
FROM (VALUES
  ('super_admin', 1, 'Full system access, all branches', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
  ('admin', 2, 'System-wide admin, all branches', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
  ('branch_admin', 3, 'Manages specific branch', FALSE, TRUE, TRUE, TRUE, TRUE, TRUE),
  ('instructor', 4, 'Teaches at branch, marks attendance', FALSE, FALSE, TRUE, FALSE, TRUE, TRUE),
  ('student', 5, 'Enrolled in programs', FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
  ('parent', 6, 'Views children progress', FALSE, FALSE, FALSE, FALSE, FALSE, FALSE)
) AS t(role, level, description, can_manage_branches, can_manage_users, can_manage_students, can_view_all_data, can_mark_attendance, can_manage_adcoins);

-- ============================================
-- HELPER: Check if current user has minimum role level
-- ============================================
CREATE OR REPLACE FUNCTION public.has_role_level(p_min_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  current_role TEXT;
  current_level INTEGER;
  min_level INTEGER;
BEGIN
  -- Get current user's role
  SELECT role INTO current_role
  FROM public.users
  WHERE auth_id = auth.uid();

  IF current_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get role levels
  SELECT level INTO current_level
  FROM (VALUES
    ('super_admin', 1),
    ('admin', 2),
    ('branch_admin', 3),
    ('instructor', 4),
    ('student', 5),
    ('parent', 6)
  ) AS t(role, level)
  WHERE t.role = current_role;

  SELECT level INTO min_level
  FROM (VALUES
    ('super_admin', 1),
    ('admin', 2),
    ('branch_admin', 3),
    ('instructor', 4),
    ('student', 5),
    ('parent', 6)
  ) AS t(role, level)
  WHERE t.role = p_min_role;

  RETURN current_level <= min_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- MIGRATE EXISTING ROLES
-- Map old roles to new roles
-- ============================================
-- Uncomment if you have existing data with old role names:
-- UPDATE public.users SET role = 'instructor' WHERE role = 'teacher';
-- UPDATE public.users SET role = 'admin' WHERE role = 'administrator';
