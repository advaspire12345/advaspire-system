-- ============================================
-- Add additional fields to students and parents tables
-- ============================================

-- Add new columns to students table
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other')),
ADD COLUMN IF NOT EXISTS school_name TEXT,
ADD COLUMN IF NOT EXISTS cover_photo TEXT;

-- Add new columns to parents table
ALTER TABLE public.parents
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS postcode TEXT,
ADD COLUMN IF NOT EXISTS city TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.students.date_of_birth IS 'Student date of birth';
COMMENT ON COLUMN public.students.gender IS 'Student gender: male, female, or other';
COMMENT ON COLUMN public.students.school_name IS 'Name of school the student attends';
COMMENT ON COLUMN public.students.cover_photo IS 'URL to student cover/banner image';
COMMENT ON COLUMN public.parents.address IS 'Parent full address';
COMMENT ON COLUMN public.parents.postcode IS 'Parent postal code';
COMMENT ON COLUMN public.parents.city IS 'Parent city';
