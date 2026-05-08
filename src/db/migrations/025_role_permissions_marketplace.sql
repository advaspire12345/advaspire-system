-- Add the new `marketplace` permission resource to existing role_permissions
-- rows for the 4 non-super-admin roles. Without this, the live DB rows from
-- migration 022 (which predated marketplace) silently override the hardcoded
-- defaults and the Marketplace sidebar tab is hidden.
--
-- super_admin bypasses DB resolution (god-tier), so no row needed for it.

INSERT INTO public.role_permissions (role, company_id, resource, can_view, can_create, can_edit, can_delete) VALUES
  ('group_admin',     NULL, 'marketplace', true,  false, false, false),
  ('company_admin',   NULL, 'marketplace', true,  true,  false, false),
  ('assistant_admin', NULL, 'marketplace', false, false, false, false),
  ('instructor',      NULL, 'marketplace', false, false, false, false)
ON CONFLICT (role, company_id, resource) DO UPDATE SET
  can_view   = EXCLUDED.can_view,
  can_create = EXCLUDED.can_create,
  can_edit   = EXCLUDED.can_edit,
  can_delete = EXCLUDED.can_delete;
