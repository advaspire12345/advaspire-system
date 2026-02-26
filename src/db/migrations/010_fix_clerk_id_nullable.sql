-- ============================================
-- MIGRATION 010: Remove legacy Clerk authentication
-- Drops clerk_id columns and old trigger since we use Supabase Auth directly
-- ============================================

-- Drop clerk_id column from users table
ALTER TABLE public.users
DROP COLUMN IF EXISTS clerk_id;

-- Drop clerk_id column from parents table
ALTER TABLE public.parents
DROP COLUMN IF EXISTS clerk_id;

-- Drop the old trigger that calls handle_new_user() which referenced clerk_id
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the old function that referenced clerk_id
DROP FUNCTION IF EXISTS public.handle_new_user();
