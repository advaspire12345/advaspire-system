-- 031: Branch-scoped role_permissions.
--
-- Why: company_admin needs to set permissions for assistant_admin/instructor
-- without affecting siblings under a sibling branch in the same company.
-- group_admin still controls company-wide settings; their save will wipe the
-- branch-level overrides under that company so everyone re-converges.
--
-- branch_id is nullable: NULL = company-wide (group_admin scope) OR global
-- default (when company_id is also NULL).
--
-- Resolution order at read time (in src/data/permissions.ts):
--   1. (role, company_id, branch_id) — branch override
--   2. (role, company_id, NULL)      — company-wide
--   3. (role, NULL, NULL)            — global default
--   4. Hardcoded fallback

ALTER TABLE public.role_permissions
  ADD COLUMN IF NOT EXISTS branch_id uuid NULL REFERENCES public.branches(id) ON DELETE CASCADE;

-- Replace the old uniqueness with one that includes branch_id. Postgres treats
-- NULL as distinct in UNIQUE by default, so we need NULLS NOT DISTINCT to keep
-- the constraint meaningful when branch_id (and/or company_id) is NULL.
ALTER TABLE public.role_permissions
  DROP CONSTRAINT IF EXISTS role_permissions_role_company_id_resource_key;

ALTER TABLE public.role_permissions
  ADD CONSTRAINT role_permissions_role_company_branch_resource_key
  UNIQUE NULLS NOT DISTINCT (role, company_id, branch_id, resource);

CREATE INDEX IF NOT EXISTS role_permissions_lookup_idx
  ON public.role_permissions (role, company_id, branch_id, resource);
