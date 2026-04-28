-- Add photo and cover_photo columns to parents table
ALTER TABLE public.parents ADD COLUMN IF NOT EXISTS photo TEXT DEFAULT NULL;
ALTER TABLE public.parents ADD COLUMN IF NOT EXISTS cover_photo TEXT DEFAULT NULL;
