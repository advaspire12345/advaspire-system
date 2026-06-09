-- Cross-parent session transfers
-- ============================================================
-- Admin creates the transfer (from-student, to-student, sessions). No price,
-- no admin approval. The sender's parent approves first, then the receiver's
-- parent accepts. Only after both → status='executed' and balances move.
--
-- Statuses:
--   pending_sender   — created, waiting for sender's parent to approve
--   pending_receiver — sender approved, waiting for receiver's parent to accept
--   executed         — both approved, sessions moved
--   cancelled        — either party rejected, no balance change

CREATE TABLE IF NOT EXISTS public.session_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_student_id uuid NOT NULL REFERENCES public.students(id),
  to_student_id uuid NOT NULL REFERENCES public.students(id),
  course_id uuid NOT NULL REFERENCES public.courses(id),
  sessions integer NOT NULL CHECK (sessions > 0),
  status text NOT NULL
    CHECK (status IN ('pending_sender','pending_receiver','executed','cancelled')),
  sender_approved_at timestamptz,
  receiver_accepted_at timestamptz,
  executed_at timestamptz,
  cancelled_by_role text CHECK (cancelled_by_role IN ('sender','receiver','admin') OR cancelled_by_role IS NULL),
  cancelled_at timestamptz,
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

CREATE INDEX IF NOT EXISTS ix_session_transfers_status_dates
  ON public.session_transfers (status, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_session_transfers_from_student
  ON public.session_transfers (from_student_id, status);
CREATE INDEX IF NOT EXISTS ix_session_transfers_to_student
  ON public.session_transfers (to_student_id, status);
