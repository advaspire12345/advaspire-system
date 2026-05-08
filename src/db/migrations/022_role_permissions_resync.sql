-- Resync global role_permissions to match the new spec (defined in src/data/permissions.ts):
--   - super_admin: bypasses DB entirely (god-tier in code), no rows needed
--   - group_admin: oversight role with restrictions (no mark-attendance/transactions, view-only slot/payment-record/dashboard, can't delete companies)
--   - company_admin: full operational at branch level
--   - assistant_admin: junior operational, no team/payment_record/vouchers/dashboard/branches
--   - instructor: frontline, no dashboard/branches/payment-record/pending-payments/vouchers/team
--
-- The previous seed (migration 015) gave group_admin/company_admin/etc. broader access
-- than the new spec allows. Wipe their global rows and re-insert.
--
-- Per-company overrides (rows where company_id IS NOT NULL) are NOT touched.

DELETE FROM public.role_permissions
WHERE company_id IS NULL
  AND role IN ('group_admin', 'company_admin', 'assistant_admin', 'instructor');

INSERT INTO public.role_permissions (role, company_id, resource, can_view, can_create, can_edit, can_delete) VALUES
  -- group_admin: VCED per src/data/permissions.ts GROUP_ADMIN_DEFAULTS
  ('group_admin', NULL, 'dashboard',        true,  false, false, false),
  ('group_admin', NULL, 'companies',        true,  true,  true,  false),
  ('group_admin', NULL, 'branches',         true,  true,  true,  true),
  ('group_admin', NULL, 'trials',           true,  true,  true,  true),
  ('group_admin', NULL, 'students',         true,  true,  true,  true),
  ('group_admin', NULL, 'examinations',     true,  true,  true,  true),
  ('group_admin', NULL, 'programs',         true,  true,  true,  true),
  ('group_admin', NULL, 'slots',            true,  false, false, false),
  ('group_admin', NULL, 'vouchers',         true,  true,  true,  true),
  ('group_admin', NULL, 'team',             true,  true,  true,  true),
  ('group_admin', NULL, 'attendance',       false, false, false, false),
  ('group_admin', NULL, 'attendance_log',   true,  true,  true,  true),
  ('group_admin', NULL, 'payment_record',   true,  false, false, false),
  ('group_admin', NULL, 'pending_payments', true,  true,  true,  true),
  ('group_admin', NULL, 'leaderboard',      true,  true,  false, false),
  ('group_admin', NULL, 'transactions',     false, false, false, false),
  ('group_admin', NULL, 'import',           true,  true,  false, false),

  -- company_admin: VCED per COMPANY_ADMIN_DEFAULTS
  ('company_admin', NULL, 'dashboard',        true,  false, false, false),
  ('company_admin', NULL, 'companies',        true,  false, false, false),
  ('company_admin', NULL, 'branches',         true,  false, false, false),
  ('company_admin', NULL, 'trials',           true,  true,  true,  true),
  ('company_admin', NULL, 'students',         true,  true,  true,  true),
  ('company_admin', NULL, 'examinations',     true,  true,  true,  true),
  ('company_admin', NULL, 'programs',         true,  false, false, false),
  ('company_admin', NULL, 'slots',            true,  true,  true,  true),
  ('company_admin', NULL, 'vouchers',         true,  true,  true,  true),
  ('company_admin', NULL, 'team',             true,  true,  true,  true),
  ('company_admin', NULL, 'attendance',       true,  true,  true,  true),
  ('company_admin', NULL, 'attendance_log',   true,  true,  true,  true),
  ('company_admin', NULL, 'payment_record',   true,  true,  true,  true),
  ('company_admin', NULL, 'pending_payments', true,  true,  true,  true),
  ('company_admin', NULL, 'leaderboard',      true,  true,  false, false),
  ('company_admin', NULL, 'transactions',     true,  true,  false, false),
  ('company_admin', NULL, 'import',           false, false, false, false),

  -- assistant_admin: VCED per ASSISTANT_ADMIN_DEFAULTS
  ('assistant_admin', NULL, 'dashboard',        false, false, false, false),
  ('assistant_admin', NULL, 'companies',        false, false, false, false),
  ('assistant_admin', NULL, 'branches',         false, false, false, false),
  ('assistant_admin', NULL, 'trials',           true,  true,  true,  false),
  ('assistant_admin', NULL, 'students',         true,  true,  true,  false),
  ('assistant_admin', NULL, 'examinations',     true,  true,  true,  false),
  ('assistant_admin', NULL, 'programs',         true,  false, false, false),
  ('assistant_admin', NULL, 'slots',            true,  true,  true,  false),
  ('assistant_admin', NULL, 'vouchers',         false, false, false, false),
  ('assistant_admin', NULL, 'team',             false, false, false, false),
  ('assistant_admin', NULL, 'attendance',       true,  true,  true,  false),
  ('assistant_admin', NULL, 'attendance_log',   true,  false, true,  false),
  ('assistant_admin', NULL, 'payment_record',   false, false, false, false),
  ('assistant_admin', NULL, 'pending_payments', true,  true,  true,  false),
  ('assistant_admin', NULL, 'leaderboard',      true,  true,  false, false),
  ('assistant_admin', NULL, 'transactions',     true,  true,  false, false),
  ('assistant_admin', NULL, 'import',           false, false, false, false),

  -- instructor: VCED per INSTRUCTOR_DEFAULTS
  ('instructor', NULL, 'dashboard',        false, false, false, false),
  ('instructor', NULL, 'companies',        false, false, false, false),
  ('instructor', NULL, 'branches',         false, false, false, false),
  ('instructor', NULL, 'trials',           true,  false, true,  false),
  ('instructor', NULL, 'students',         true,  false, false, false),
  ('instructor', NULL, 'examinations',     true,  true,  true,  false),
  ('instructor', NULL, 'programs',         true,  false, false, false),
  ('instructor', NULL, 'slots',            true,  false, false, false),
  ('instructor', NULL, 'vouchers',         false, false, false, false),
  ('instructor', NULL, 'team',             false, false, false, false),
  ('instructor', NULL, 'attendance',       true,  true,  true,  false),
  ('instructor', NULL, 'attendance_log',   true,  false, false, false),
  ('instructor', NULL, 'payment_record',   false, false, false, false),
  ('instructor', NULL, 'pending_payments', false, false, false, false),
  ('instructor', NULL, 'leaderboard',      true,  true,  false, false),
  ('instructor', NULL, 'transactions',     true,  true,  false, false),
  ('instructor', NULL, 'import',           false, false, false, false);
