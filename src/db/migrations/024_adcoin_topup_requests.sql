-- Marketplace: company_admin requests adcoin top-ups; super_admin approves.
-- A separate table from adcoin_transactions because the request lifecycle is
-- pending → approved/rejected (with a receipt photo). Approved requests result
-- in an adcoin_transactions row inserted by the approval action.

CREATE TABLE IF NOT EXISTS public.adcoin_topup_requests (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id    uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  branch_id       uuid        REFERENCES public.branches(id) ON DELETE SET NULL,
  adcoin_amount   integer     NOT NULL CHECK (adcoin_amount > 0),
  rm_amount       numeric(10,2) NOT NULL CHECK (rm_amount > 0),
  receipt_url     text,
  status          text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','approved','rejected')),
  reviewed_by     uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at     timestamptz,
  approved_transaction_id uuid REFERENCES public.adcoin_transactions(id) ON DELETE SET NULL,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS adcoin_topup_requests_status_idx
  ON public.adcoin_topup_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS adcoin_topup_requests_requester_idx
  ON public.adcoin_topup_requests (requester_id, created_at DESC);

CREATE INDEX IF NOT EXISTS adcoin_topup_requests_branch_idx
  ON public.adcoin_topup_requests (branch_id, created_at DESC);
