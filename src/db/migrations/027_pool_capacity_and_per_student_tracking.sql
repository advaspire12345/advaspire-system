-- Pool capacity + per-student session tracking
-- ============================================================
-- 1. course_pricing.max_students_per_pool — how many students ONE package
--    can cover. 1 = non-shareable (today's behaviour). 2+ = shareable.
-- 2. pool_students.sessions_remaining — per-student count inside a pool,
--    replacing the previous shared-bucket display formula. Backfilled
--    from the existing pool's `sessions_remaining` split evenly across
--    current members so live pools keep their state.
-- 3. shared_session_pools.current_window_pricing_id + window_started_at —
--    pool-level completion/expiry tracking. `window_started_at` is set on
--    the first attendance after the latest package credit; if NULL the
--    window is "armed" but not yet ticking.

ALTER TABLE public.course_pricing
  ADD COLUMN IF NOT EXISTS max_students_per_pool integer NOT NULL DEFAULT 1
  CHECK (max_students_per_pool BETWEEN 1 AND 10);

ALTER TABLE public.pool_students
  ADD COLUMN IF NOT EXISTS sessions_remaining integer NOT NULL DEFAULT 0;

ALTER TABLE public.shared_session_pools
  ADD COLUMN IF NOT EXISTS current_window_pricing_id uuid NULL
    REFERENCES public.course_pricing(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS window_started_at date NULL;

-- Backfill: split each live pool's bucket evenly across its members so the
-- new per-student counts add up to the same total. Remainder goes to the
-- oldest member by joined_at (the original primary).
UPDATE public.pool_students ps
SET sessions_remaining = sub.share + sub.remainder_bonus
FROM (
  SELECT
    ps.id,
    floor(p.sessions_remaining::numeric / NULLIF(member_count, 0))::int AS share,
    CASE
      WHEN ps.joined_at = (
        SELECT MIN(joined_at) FROM public.pool_students WHERE pool_id = ps.pool_id
      )
      THEN (p.sessions_remaining - floor(p.sessions_remaining::numeric / NULLIF(member_count, 0))::int * member_count)::int
      ELSE 0
    END AS remainder_bonus
  FROM public.pool_students ps
  JOIN public.shared_session_pools p ON p.id = ps.pool_id
  JOIN LATERAL (
    SELECT COUNT(*) AS member_count FROM public.pool_students WHERE pool_id = ps.pool_id
  ) mc ON true
) sub
WHERE ps.id = sub.id;

-- Hot-path index for the renewal trigger ("any pool member at 2 sessions").
CREATE INDEX IF NOT EXISTS ix_pool_students_pool_sessions
  ON public.pool_students (pool_id, sessions_remaining);
