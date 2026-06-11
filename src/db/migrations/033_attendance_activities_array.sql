-- 033: Attendance now stores a flexible array of activities per row.
--
-- Why: a student often completes two — sometimes five — lesson/mission pairs
-- in one session. Today the modal forces the teacher to pick one. The cleanest
-- model is a single jsonb array on the attendance row (mirrors the existing
-- course_lessons.missions precedent), replacing the legacy paired columns so
-- there's exactly one source of truth.
--
-- Shape: [{ "lesson": string, "mission": string }, ...]
-- First element is the "primary" activity for the session — UI orders the
-- array; the exam-handoff check fires when any element's lesson === "Exam".

ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS activities jsonb NULL;

-- Backfill: each existing row's (lesson, mission) becomes a 1-element array.
-- Empty pairs (both NULL) stay NULL on activities so the row reads as "no
-- activity recorded" — matches the existing semantics.
UPDATE public.attendance
SET activities = jsonb_build_array(
  jsonb_build_object('lesson', coalesce(lesson, ''), 'mission', coalesce(mission, ''))
)
WHERE activities IS NULL
  AND (lesson IS NOT NULL OR mission IS NOT NULL);

ALTER TABLE public.attendance
  DROP COLUMN IF EXISTS lesson,
  DROP COLUMN IF EXISTS mission;
