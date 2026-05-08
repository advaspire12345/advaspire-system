-- Branch area (city) uniqueness:
--   * Companies: city is unique among non-deleted companies (case-insensitive).
--   * HQ + Branch: city is unique within the same parent company (case-insensitive).
--
-- Rationale: the city/area name is what differentiates branches in the UI.
-- Allowing duplicates would mix up rows in tables and reports.
--
-- Pre-check before applying:
--   SELECT lower(city), COUNT(*) FROM branches
--   WHERE type='company' AND deleted_at IS NULL AND city IS NOT NULL
--   GROUP BY lower(city) HAVING COUNT(*) > 1;
--
--   SELECT parent_id, lower(city), COUNT(*) FROM branches
--   WHERE type IN ('hq','branch') AND deleted_at IS NULL AND city IS NOT NULL
--   GROUP BY parent_id, lower(city) HAVING COUNT(*) > 1;

CREATE UNIQUE INDEX IF NOT EXISTS branches_company_city_unique
  ON public.branches (lower(city))
  WHERE type = 'company' AND deleted_at IS NULL AND city IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS branches_child_city_unique
  ON public.branches (parent_id, lower(city))
  WHERE type IN ('hq', 'branch') AND deleted_at IS NULL AND city IS NOT NULL;
