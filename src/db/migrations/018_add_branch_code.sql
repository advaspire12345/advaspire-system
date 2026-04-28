-- Add code column to branches table
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS code TEXT DEFAULT NULL;
