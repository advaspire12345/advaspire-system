-- =============================================================================
-- G-advisor-hardening.sql  —  REVIEW ONLY (not applied)
-- =============================================================================
-- Drafted 2026-06-23 from a post-unification Supabase advisor run on the unified
-- LMS project (kbzrdsxzzqzbxqgwpsuq). Closes the 3 advisor items worth fixing
-- before the Part G cutover. NOTHING here is applied until you say so.
--
-- Investigated context (why these are safe):
--   * All app access to `trials` / `examinations` is via the service-role client
--     (`supabaseAdmin`, @/db) which BYPASSES RLS. Verified: no (public)/(parent)/
--     (student-portal) route and nothing in the Hub touches these tables via a
--     user-context (anon/authenticated) client. So the permissive policies below
--     are vestigial — dropping them leaves RLS enabled + deny-by-default for
--     anon/authenticated (same posture as the other 20 service-role-only tables),
--     while the app keeps working. This matches unification decision #15.
--   * The users/parents policies ARE load-bearing (the Hub reads them via the
--     anon-key client, so RLS applies). Part C only optimizes the per-row
--     auth.uid() call — semantics are unchanged.
--
-- Apply (after review) with: mcp Supabase apply_migration, name e.g.
--   `g_advisor_hardening`. Run it inside a transaction; re-run the advisor after.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- PART A — Close the trials / examinations exposure
--   Advisor: rls_policy_always_true (examinations ALL, trials INSERT/UPDATE).
--   Finding: `examinations` had ONE policy named "Service role full access" but
--   it targeted role {public} (includes anon!) with USING(true)/WITH CHECK(true)
--   → anon key had full CRUD. `trials` had 3 policies on {authenticated} letting
--   ANY logged-in user read/insert/update every trial across all branches.
--   Fix: drop all of them. RLS stays ENABLED → deny-by-default for the anon/
--   authenticated roles; service-role (app) is unaffected. After this, both
--   tables will show as INFO `rls_enabled_no_policy` (intended, like the others).
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Service role full access on examinations"   ON public.examinations;
DROP POLICY IF EXISTS "Allow authenticated users to insert trials" ON public.trials;
DROP POLICY IF EXISTS "Allow authenticated users to update trials" ON public.trials;
DROP POLICY IF EXISTS "Allow authenticated users to view trials"   ON public.trials;
-- (the SELECT policy wasn't flagged as always-true but is the same over-broad
--  {authenticated}-reads-everything exposure, so it's dropped too.)

-- -----------------------------------------------------------------------------
-- PART B — Pin search_path on SECURITY DEFINER (+ 1 trigger) functions
--   Advisor: function_search_path_mutable x21. A mutable search_path on a
--   SECURITY DEFINER function is a privilege-escalation vector.
--   Fix: set a FIXED search_path. Using `public` (not `''`) to match the 6
--   functions already pinned this way (app_current_*, app_staff_sees_branch,
--   get_current_student_id, sync_robotics_lesson_to_unified) and because these
--   bodies reference public objects unqualified — `SET search_path = ''` would
--   require fully-qualifying every reference first (see note at bottom).
-- -----------------------------------------------------------------------------
ALTER FUNCTION public.audit_trigger_func()                                     SET search_path = public;
ALTER FUNCTION public.can_access_branch(uuid)                                  SET search_path = public;
ALTER FUNCTION public.can_parent_view_student(uuid)                            SET search_path = public;
ALTER FUNCTION public.can_view_enrollment(uuid)                                SET search_path = public;
ALTER FUNCTION public.can_view_student(uuid)                                   SET search_path = public;
ALTER FUNCTION public.get_audit_history(text, uuid, integer)                   SET search_path = public;
ALTER FUNCTION public.get_current_parent_id()                                  SET search_path = public;
ALTER FUNCTION public.get_current_user_branch_id()                             SET search_path = public;
ALTER FUNCTION public.get_current_user_id()                                    SET search_path = public;
ALTER FUNCTION public.get_current_user_role()                                  SET search_path = public;
ALTER FUNCTION public.handle_new_auth_user()                                   SET search_path = public;
ALTER FUNCTION public.has_role_level(text)                                     SET search_path = public;
ALTER FUNCTION public.is_admin()                                               SET search_path = public;
ALTER FUNCTION public.is_branch_admin()                                        SET search_path = public;
ALTER FUNCTION public.is_instructor()                                          SET search_path = public;
ALTER FUNCTION public.is_super_admin()                                         SET search_path = public;
ALTER FUNCTION public.link_parents_to_auth()                                   SET search_path = public;
ALTER FUNCTION public.link_users_to_auth()                                     SET search_path = public;
ALTER FUNCTION public.restore_deleted(text, uuid)                              SET search_path = public;
ALTER FUNCTION public.soft_delete(text, uuid)                                  SET search_path = public;
ALTER FUNCTION public.update_shared_session_pools_updated_at()                 SET search_path = public;

-- -----------------------------------------------------------------------------
-- PART C — auth_rls_initplan on users / parents
--   Advisor: auth_rls_initplan x4. Policies call auth.uid() directly, so it is
--   re-evaluated PER ROW on scans. Fix: wrap as (select auth.uid()) so the
--   planner evaluates it once (initplan). Logic is otherwise byte-for-byte the
--   same. (The is_*()/get_current_*() helpers are STABLE SECURITY DEFINER and
--   could likewise be wrapped, but the lint only flags auth.uid().)
-- -----------------------------------------------------------------------------
-- parents
DROP POLICY IF EXISTS parents_select ON public.parents;
CREATE POLICY parents_select ON public.parents FOR SELECT TO public
  USING (
    (deleted_at IS NULL)
    AND (is_super_admin() OR (auth_id = (select auth.uid())) OR is_branch_admin())
  );

DROP POLICY IF EXISTS parents_update ON public.parents;
CREATE POLICY parents_update ON public.parents FOR UPDATE TO public
  USING ((auth_id = (select auth.uid())) OR is_branch_admin());

-- users
DROP POLICY IF EXISTS users_select ON public.users;
CREATE POLICY users_select ON public.users FOR SELECT TO public
  USING (
    (deleted_at IS NULL)
    AND (
      is_super_admin()
      OR (auth_id = (select auth.uid()))
      OR (is_branch_admin() AND (branch_id = get_current_user_branch_id()))
    )
  );

DROP POLICY IF EXISTS users_update ON public.users;
CREATE POLICY users_update ON public.users FOR UPDATE TO public
  USING (
    (auth_id = (select auth.uid()))
    OR (is_branch_admin() AND (branch_id = get_current_user_branch_id()))
    OR is_admin()
  );

COMMIT;

-- =============================================================================
-- NOT INCLUDED (deliberately deferred / out of scope for this migration):
--   * auth_leaked_password_protection — Auth dashboard toggle, not SQL. NOTE it
--     may block accounts whose password == student_id/username on next change.
--   * public_bucket_allows_listing (program-covers) — storage setting.
--   * extension_in_public (pg_trgm) — moving it risks breaking trgm indexes; low
--     value. Leave unless a later hardening pass wants a dedicated `extensions`
--     schema.
--   * Performance INFOs (unindexed_foreign_keys x73, unused_index x23,
--     duplicate_index x2, no_primary_key on role_hierarchy) — revisit AFTER the
--     soak with real query patterns; "unused" stats are unreliable on a fresh DB.
--   * multiple_permissive_policies x9 (migrated Hub tables) — functional, just
--     consolidate later.
--
-- FOLLOW-UP (stronger Part B hardening): switching the functions to
--   `SET search_path = ''` is more secure but requires schema-qualifying every
--   object reference inside each function body (e.g. public.users). Do that as a
--   separate, body-by-body pass if desired.
-- =============================================================================
