-- ============================================
-- Migration: 012_add_shared_session_pools
-- Description: Add shared session pools for sibling sharing feature
-- ============================================

-- Enable uuid extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CREATE SHARED SESSION POOLS TABLE
-- ============================================
CREATE TABLE shared_session_pools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,                              -- e.g., "Smith Family - Scratch"
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  package_id UUID REFERENCES course_pricing(id) ON DELETE SET NULL,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  sessions_remaining INTEGER NOT NULL DEFAULT 0,
  period_start DATE,                      -- For monthly packages
  period_months INTEGER,                  -- Duration of each period
  parent_id UUID REFERENCES parents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Create index for common queries
CREATE INDEX idx_shared_session_pools_parent_id ON shared_session_pools(parent_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_shared_session_pools_course_id ON shared_session_pools(course_id) WHERE deleted_at IS NULL;

-- Add comment for documentation
COMMENT ON TABLE shared_session_pools IS 'Tracks pooled sessions shared between siblings in the same course';

-- ============================================
-- CREATE POOL STUDENTS JUNCTION TABLE
-- ============================================
CREATE TABLE pool_students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pool_id UUID NOT NULL REFERENCES shared_session_pools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pool_id, student_id)
);

-- Create indexes for lookups
CREATE INDEX idx_pool_students_pool_id ON pool_students(pool_id);
CREATE INDEX idx_pool_students_student_id ON pool_students(student_id);
CREATE INDEX idx_pool_students_enrollment_id ON pool_students(enrollment_id);

-- Add comment for documentation
COMMENT ON TABLE pool_students IS 'Junction table linking students to shared session pools';

-- ============================================
-- ALTER ENROLLMENTS TABLE
-- ============================================
ALTER TABLE enrollments
  ADD COLUMN pool_id UUID REFERENCES shared_session_pools(id) ON DELETE SET NULL;

-- Create index for pool lookup on enrollments
CREATE INDEX idx_enrollments_pool_id ON enrollments(pool_id) WHERE pool_id IS NOT NULL;

-- Add comment for the new column
COMMENT ON COLUMN enrollments.pool_id IS 'Reference to shared session pool if this enrollment shares sessions with siblings';

-- ============================================
-- ALTER PAYMENTS TABLE
-- ============================================
ALTER TABLE payments
  ADD COLUMN pool_id UUID REFERENCES shared_session_pools(id) ON DELETE SET NULL;

-- Create index for pool lookup on payments
CREATE INDEX idx_payments_pool_id ON payments(pool_id) WHERE pool_id IS NOT NULL;

-- Add comment for the new column
COMMENT ON COLUMN payments.pool_id IS 'Reference to shared session pool if this payment is for a shared sibling package';

-- ============================================
-- ADD TRIGGER FOR updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_shared_session_pools_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shared_session_pools_updated_at
  BEFORE UPDATE ON shared_session_pools
  FOR EACH ROW
  EXECUTE FUNCTION update_shared_session_pools_updated_at();
