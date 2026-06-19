-- =============================================================================
-- B4 (partial) — Close the anon-key hole: ENABLE RLS on the 18 exposed tables
-- =============================================================================
-- Target: LMS project advaspire-system (kbzrdsxzzqzbxqgwpsuq).
-- STATUS: reviewed-safe, but apply on a Supabase BRANCH first (B2), verify, then prod.
--
-- WHY SAFE (verified 2026-06-18):
--   The app reads/writes ALL of these tables via `supabaseAdmin` (service-role),
--   which BYPASSES RLS — confirmed across src/data/*.ts, src/app/api/*, and the
--   public register page + slot/voucher/register routes. The browser/anon client
--   (@/lib/supabase/client) is used only for auth/session, never to query these.
--   => Enabling RLS (even with no policies) does NOT break the app; it only blocks
--      direct anon-key access, which is the exposure the advisor flagged.
--
-- These tables currently have 0 policies. "RLS on + no policy" = service-role only,
-- which equals today's effective access. Proper tenant/role policies come in the
-- FULL B4 pass (instructor sees own branch, etc.) — track separately.
-- =============================================================================

BEGIN;

ALTER TABLE public.adcoin_topup_requests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_branches             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_slot_teachers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_slots               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_roles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollment_course_switches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_occurrences          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_students              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_hierarchy             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_reschedules        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_transfers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_session_pools       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers                   ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Rollback if needed (per table): ALTER TABLE public.<t> DISABLE ROW LEVEL SECURITY;
--
-- Post-apply smoke test (must still pass — all run via service-role):
--   * Public register page loads branch + slots.
--   * Dashboard slot page CRUD.
--   * Voucher create/list, pending payments, notifications.
--   * Attendance mark (touches pools/session tables).
-- If anything 403s, a path is using the anon client on that table — add a policy
-- instead of disabling RLS again.
