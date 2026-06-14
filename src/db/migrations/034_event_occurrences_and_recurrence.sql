-- 034: Multi-occurrence + recurring events.
--
-- Why: a "Saturday Robotics Workshop x 4 weeks" is one event with four dated
-- occurrences. Today the events table stores a single (date, start_time,
-- end_time) and can't model that. Two new shapes are layered on top of the
-- existing columns:
--
--   1. event_occurrences (junction) — for "Specific dates" mode where the
--      event happens on N distinct calendar dates. One row per occurrence,
--      sorted by sort_order.
--   2. Recurrence columns on events itself — for the "Recurring (open-ended)"
--      and "Recurring (bounded)" modes where the event fires on every matching
--      weekday, optionally within a [start_date, end_date] window.
--
-- The pre-existing date / end_date / start_time / end_time columns stay as
-- denormalised shadows of the FIRST occurrence (specific-dates mode) or the
-- recurring window's start (recurring modes). 52+ read sites consume those
-- columns today; keeping them backward-compatible lets the migration land
-- without a huge ripple. A later round can drop them once every read goes
-- through the new helpers.

-- A. Specific-date occurrences.
CREATE TABLE IF NOT EXISTS public.event_occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  date date NOT NULL,
  start_time time NULL,
  end_time time NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS event_occurrences_event_id_idx
  ON public.event_occurrences(event_id, sort_order);
CREATE INDEX IF NOT EXISTS event_occurrences_date_idx
  ON public.event_occurrences(date);

-- B. Recurrence fields on events itself.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_recurring boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_bounded   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurring_days text[] NULL,
  ADD COLUMN IF NOT EXISTS recurring_start_date date NULL,
  ADD COLUMN IF NOT EXISTS recurring_end_date date NULL,
  ADD COLUMN IF NOT EXISTS recurring_start_time time NULL,
  ADD COLUMN IF NOT EXISTS recurring_end_time time NULL;

-- C. Backfill — each existing event becomes a single-specific-date event
-- (mode 1, 1 occurrence). Multi-day spans where end_date > date are kept as
-- one occurrence with the original date — multi-day consecutive ranges
-- weren't a configurable mode, so we don't expand them into per-day rows.
INSERT INTO public.event_occurrences (event_id, date, start_time, end_time, sort_order)
SELECT id, date, start_time, end_time, 0
FROM public.events
WHERE deleted_at IS NULL
  AND date IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.event_occurrences eo WHERE eo.event_id = public.events.id
  );
