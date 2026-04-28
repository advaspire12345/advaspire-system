-- ============================================
-- MIGRATION 015: Role Rename, Permission System Overhaul & Custom Roles
-- ============================================

-- ============================================
-- STEP 1: Rename existing roles in users table
-- ============================================
-- Drop old constraint first
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS valid_user_role;

-- Rename role values
UPDATE public.users SET role = 'group_admin' WHERE role = 'admin';
UPDATE public.users SET role = 'company_admin' WHERE role = 'branch_admin';

-- Re-create constraint with new role names + assistant_admin
ALTER TABLE public.users
ADD CONSTRAINT valid_user_role CHECK (
  role IN ('super_admin', 'group_admin', 'company_admin', 'assistant_admin', 'instructor', 'student', 'parent')
);

-- ============================================
-- STEP 2: Create role_permissions table
-- Stores per-role permissions, optionally scoped to a company
-- company_id NULL = global default for this role
-- ============================================
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL,
  company_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  resource TEXT NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT false,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, company_id, resource)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_company
  ON public.role_permissions(role, company_id);

-- ============================================
-- STEP 3: Create custom_roles table
-- Each company can have up to 2 custom roles
-- ============================================
CREATE TABLE IF NOT EXISTS public.custom_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.users(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_roles_company_name
  ON public.custom_roles(company_id, name) WHERE deleted_at IS NULL;

-- ============================================
-- STEP 4: Add custom_role_id to users table
-- ============================================
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS custom_role_id UUID REFERENCES public.custom_roles(id) DEFAULT NULL;

-- ============================================
-- STEP 5: Seed global default role_permissions
-- These are the fallback defaults (company_id = NULL)
-- ============================================

-- Helper: Insert default permissions for a role
-- group_admin: full access (like old admin)
INSERT INTO public.role_permissions (role, company_id, resource, can_view, can_create, can_edit, can_delete)
VALUES
  ('group_admin', NULL, 'dashboard',        true, true, true, true),
  ('group_admin', NULL, 'companies',        true, false, false, false),
  ('group_admin', NULL, 'branches',         true, true, true, true),
  ('group_admin', NULL, 'trials',           true, true, true, true),
  ('group_admin', NULL, 'students',         true, true, true, true),
  ('group_admin', NULL, 'examinations',     true, true, true, true),
  ('group_admin', NULL, 'programs',         true, true, true, true),
  ('group_admin', NULL, 'team',             true, true, true, true),
  ('group_admin', NULL, 'attendance',       true, true, true, true),
  ('group_admin', NULL, 'attendance_log',   true, true, true, true),
  ('group_admin', NULL, 'payment_record',   true, true, true, true),
  ('group_admin', NULL, 'pending_payments', true, true, true, true),
  ('group_admin', NULL, 'leaderboard',      true, true, true, true),
  ('group_admin', NULL, 'transactions',     true, true, true, true)
ON CONFLICT (role, company_id, resource) DO NOTHING;

-- company_admin: like old branch_admin
INSERT INTO public.role_permissions (role, company_id, resource, can_view, can_create, can_edit, can_delete)
VALUES
  ('company_admin', NULL, 'dashboard',        true, false, false, false),
  ('company_admin', NULL, 'companies',        true, false, false, false),
  ('company_admin', NULL, 'branches',         true, false, false, false),
  ('company_admin', NULL, 'trials',           true, true, true, true),
  ('company_admin', NULL, 'students',         true, true, true, true),
  ('company_admin', NULL, 'examinations',     true, true, true, true),
  ('company_admin', NULL, 'programs',         true, false, false, false),
  ('company_admin', NULL, 'team',             true, true, true, false),
  ('company_admin', NULL, 'attendance',       true, true, true, false),
  ('company_admin', NULL, 'attendance_log',   true, false, true, false),
  ('company_admin', NULL, 'payment_record',   true, false, true, false),
  ('company_admin', NULL, 'pending_payments', true, true, true, false),
  ('company_admin', NULL, 'leaderboard',      true, false, false, false),
  ('company_admin', NULL, 'transactions',     true, true, false, false)
ON CONFLICT (role, company_id, resource) DO NOTHING;

-- assistant_admin: like company_admin but no team, no delete
INSERT INTO public.role_permissions (role, company_id, resource, can_view, can_create, can_edit, can_delete)
VALUES
  ('assistant_admin', NULL, 'dashboard',        true, false, false, false),
  ('assistant_admin', NULL, 'companies',        true, false, false, false),
  ('assistant_admin', NULL, 'branches',         true, false, false, false),
  ('assistant_admin', NULL, 'trials',           true, true, true, false),
  ('assistant_admin', NULL, 'students',         true, true, true, false),
  ('assistant_admin', NULL, 'examinations',     true, true, true, false),
  ('assistant_admin', NULL, 'programs',         true, false, false, false),
  ('assistant_admin', NULL, 'team',             false, false, false, false),
  ('assistant_admin', NULL, 'attendance',       true, true, true, false),
  ('assistant_admin', NULL, 'attendance_log',   true, false, true, false),
  ('assistant_admin', NULL, 'payment_record',   true, false, true, false),
  ('assistant_admin', NULL, 'pending_payments', true, true, true, false),
  ('assistant_admin', NULL, 'leaderboard',      true, false, false, false),
  ('assistant_admin', NULL, 'transactions',     true, true, false, false)
ON CONFLICT (role, company_id, resource) DO NOTHING;

-- instructor: limited access
INSERT INTO public.role_permissions (role, company_id, resource, can_view, can_create, can_edit, can_delete)
VALUES
  ('instructor', NULL, 'dashboard',        true, false, false, false),
  ('instructor', NULL, 'companies',        false, false, false, false),
  ('instructor', NULL, 'branches',         false, false, false, false),
  ('instructor', NULL, 'trials',           true, true, true, false),
  ('instructor', NULL, 'students',         true, false, false, false),
  ('instructor', NULL, 'examinations',     true, true, true, false),
  ('instructor', NULL, 'programs',         true, false, false, false),
  ('instructor', NULL, 'team',             false, false, false, false),
  ('instructor', NULL, 'attendance',       true, true, true, false),
  ('instructor', NULL, 'attendance_log',   true, false, false, false),
  ('instructor', NULL, 'payment_record',   false, false, false, false),
  ('instructor', NULL, 'pending_payments', false, false, false, false),
  ('instructor', NULL, 'leaderboard',      true, false, false, false),
  ('instructor', NULL, 'transactions',     true, true, false, false)
ON CONFLICT (role, company_id, resource) DO NOTHING;

-- ============================================
-- STEP 6: Update DB helper functions with new role names
-- ============================================

-- is_admin: now checks for group_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid() AND role IN ('super_admin', 'group_admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- is_branch_admin: now checks for company_admin (keep function name for RLS compatibility)
CREATE OR REPLACE FUNCTION public.is_branch_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid() AND role IN ('super_admin', 'group_admin', 'company_admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- is_instructor: include assistant_admin
CREATE OR REPLACE FUNCTION public.is_instructor()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid() AND role IN ('super_admin', 'group_admin', 'company_admin', 'assistant_admin', 'instructor')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
