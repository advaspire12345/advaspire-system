-- ============================================================
-- 030_lms_lifecycle_additions
--
-- Three independent additions wrapped into one migration:
--   1. Inactivity reminder: per-pricing window settings used by the
--      cron sweep that nudges admins when a student stops attending.
--   2. Course-switch midway: per-enrollment audit table that records
--      when an admin moves a student from one course to another while
--      carrying their remaining sessions over. The new enrollment row
--      uses status='course_switched' on the source side; status is a
--      free-form TEXT column on enrollments so no enum change needed.
--   3. Good-payer voucher: rewards a parent that pays the next
--      renewal within `good_payer_voucher_window_days` of the cycle
--      anchor (first attendance after the most recent payment).
-- ============================================================

-- 1. Inactivity reminder window config (per pricing row).
ALTER TABLE public.course_pricing
  ADD COLUMN inactivity_warning_weeks integer NULL,
  ADD COLUMN reminder_interval_days   integer NOT NULL DEFAULT 7;

-- 3. Good-payer voucher config (per pricing row) + per-enrollment cycle anchor.
ALTER TABLE public.course_pricing
  ADD COLUMN good_payer_voucher_id           uuid    NULL
    REFERENCES public.vouchers(id) ON DELETE SET NULL,
  ADD COLUMN good_payer_voucher_window_days  integer NOT NULL DEFAULT 35;

ALTER TABLE public.enrollments
  ADD COLUMN cycle_anchor_date date NULL;

-- 2. Course-switch audit trail. The source enrollment is marked
-- status='course_switched' (textual); the new enrollment is a fresh row.
CREATE TABLE public.enrollment_course_switches (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_enrollment_id  uuid NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  to_enrollment_id    uuid NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  sessions_moved      integer NOT NULL,
  actor_user_id       uuid REFERENCES public.users(id) ON DELETE SET NULL,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_course_switches_from ON public.enrollment_course_switches(from_enrollment_id);
CREATE INDEX ix_course_switches_to   ON public.enrollment_course_switches(to_enrollment_id);
