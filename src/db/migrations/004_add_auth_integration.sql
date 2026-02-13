-- ============================================
-- MIGRATION 004: Auth Integration
-- Adds auth_id column to link with Supabase Auth
-- ============================================

-- ============================================
-- ADD AUTH_ID TO USERS TABLE
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'auth_id'
  ) THEN
    ALTER TABLE public.users
    ADD COLUMN auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

    CREATE INDEX idx_users_auth_id ON public.users(auth_id);
  END IF;
END $$;

-- ============================================
-- ADD AUTH_ID TO PARENTS TABLE
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'parents'
      AND column_name = 'auth_id'
  ) THEN
    ALTER TABLE public.parents
    ADD COLUMN auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

    CREATE INDEX idx_parents_auth_id ON public.parents(auth_id);
  END IF;
END $$;

-- ============================================
-- TRIGGER: Auto-create user on auth.users signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Default role is 'student', but can be set in metadata
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');

  -- Validate role
  IF user_role NOT IN ('super_admin', 'admin', 'branch_admin', 'instructor', 'student', 'parent') THEN
    user_role := 'student';
  END IF;

  -- Insert into users table
  INSERT INTO public.users (
    auth_id,
    email,
    name,
    role
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'New User'),
    user_role
  )
  ON CONFLICT (auth_id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created_for_users ON auth.users;
CREATE TRIGGER on_auth_user_created_for_users
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ============================================
-- HELPER: Link existing users to auth accounts by email
-- Run this after migration to populate auth_id for existing users
-- ============================================
CREATE OR REPLACE FUNCTION public.link_users_to_auth()
RETURNS INTEGER AS $$
DECLARE
  linked_count INTEGER := 0;
BEGIN
  UPDATE public.users u
  SET auth_id = a.id
  FROM auth.users a
  WHERE u.email = a.email
    AND u.auth_id IS NULL;

  GET DIAGNOSTICS linked_count = ROW_COUNT;
  RETURN linked_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HELPER: Link existing parents to auth accounts by email
-- ============================================
CREATE OR REPLACE FUNCTION public.link_parents_to_auth()
RETURNS INTEGER AS $$
DECLARE
  linked_count INTEGER := 0;
BEGIN
  UPDATE public.parents p
  SET auth_id = a.id
  FROM auth.users a
  WHERE p.email = a.email
    AND p.auth_id IS NULL;

  GET DIAGNOSTICS linked_count = ROW_COUNT;
  RETURN linked_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optionally run linking functions (comment out if not needed)
-- SELECT public.link_users_to_auth();
-- SELECT public.link_parents_to_auth();
