-- Drop and recreate vouchers table cleanly
DROP TABLE IF EXISTS public.vouchers CASCADE;

CREATE TABLE public.vouchers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL,
  expiry_type TEXT NOT NULL DEFAULT 'date' CHECK (expiry_type IN ('monthly', 'date')),
  expiry_months INTEGER DEFAULT NULL,
  expiry_date DATE DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX idx_vouchers_code ON public.vouchers(code) WHERE deleted_at IS NULL;

-- Add voucher_id to course_pricing (optional link)
ALTER TABLE public.course_pricing ADD COLUMN IF NOT EXISTS voucher_id UUID REFERENCES public.vouchers(id) DEFAULT NULL;
