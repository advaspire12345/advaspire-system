-- Settle-deficit payment shape
-- ============================================================
-- payments.custom_sessions — when set (non-null), the approval routine
-- credits exactly that number of sessions to the pool/enrollment instead of
-- the package's full `duration`. Used for "settle deficit" payments where
-- the parent pays for just the negative-balance sessions (typically a
-- fraction of a normal package's price).
--
-- payment_type is already `text`, not an enum, so no type change is needed
-- to allow the new 'settle_deficit' value — the app layer enforces it.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS custom_sessions integer NULL
  CHECK (custom_sessions IS NULL OR custom_sessions > 0);
