-- Marketplace invoice — add columns to store the frozen invoice snapshot
-- generated at approval time. Same snapshot pattern as `payments.invoice_snapshot`.
--
-- The snapshot is rendered client-side via ReceiptPreviewModal; no PDF file
-- is stored. The snapshot freezes branch info / amounts / date so the invoice
-- never changes if branch details are edited later.

ALTER TABLE public.adcoin_topup_requests
  ADD COLUMN IF NOT EXISTS invoice_number text,
  ADD COLUMN IF NOT EXISTS invoice_snapshot jsonb;
