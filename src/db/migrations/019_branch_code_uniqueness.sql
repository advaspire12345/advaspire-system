-- Branch code uniqueness:
--   * Companies: code is unique among non-deleted companies (global uniqueness).
--   * HQ + Branch: code is unique within the same parent company. The same code
--     is allowed across different companies (e.g. company A and company B can
--     each have a branch with code "001").
--
-- Pre-check before applying — fails to create the index if duplicates exist:
--   SELECT code, COUNT(*) FROM branches
--   WHERE type='company' AND deleted_at IS NULL AND code IS NOT NULL
--   GROUP BY code HAVING COUNT(*) > 1;
--
--   SELECT parent_id, code, COUNT(*) FROM branches
--   WHERE type IN ('hq','branch') AND deleted_at IS NULL AND code IS NOT NULL
--   GROUP BY parent_id, code HAVING COUNT(*) > 1;

CREATE UNIQUE INDEX IF NOT EXISTS branches_company_code_unique
  ON public.branches (code)
  WHERE type = 'company' AND deleted_at IS NULL AND code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS branches_child_code_unique
  ON public.branches (parent_id, code)
  WHERE type IN ('hq', 'branch') AND deleted_at IS NULL AND code IS NOT NULL;
