-- ============================================
-- 014: Add Examinations Table
-- ============================================
-- This migration creates the examinations table to track student exams,
-- eligibility, and automatic level progression on pass.

-- Create examination status enum type
DO $$ BEGIN
    CREATE TYPE examination_status AS ENUM (
        'eligible',
        'scheduled',
        'in_progress',
        'pass',
        'fail',
        'absent'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create examinations table
CREATE TABLE IF NOT EXISTS examinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Student and enrollment references
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    enrollment_id UUID REFERENCES enrollments(id) ON DELETE SET NULL,

    -- Exam details
    exam_name TEXT NOT NULL,
    exam_level INTEGER NOT NULL DEFAULT 1,
    reattempt_count INTEGER NOT NULL DEFAULT 0,

    -- Results
    mark INTEGER CHECK (mark IS NULL OR (mark >= 0 AND mark <= 100)),
    notes TEXT,

    -- Examiner
    examiner_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Scheduling
    exam_date DATE NOT NULL,

    -- Certificate
    certificate_url TEXT,
    certificate_number TEXT,

    -- Status
    status TEXT NOT NULL DEFAULT 'eligible' CHECK (
        status IN ('eligible', 'scheduled', 'in_progress', 'pass', 'fail', 'absent')
    ),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_examinations_student_id ON examinations(student_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_examinations_enrollment_id ON examinations(enrollment_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_examinations_examiner_id ON examinations(examiner_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_examinations_status ON examinations(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_examinations_exam_date ON examinations(exam_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_examinations_certificate_number ON examinations(certificate_number) WHERE certificate_number IS NOT NULL;

-- Create sequence for certificate numbers
CREATE SEQUENCE IF NOT EXISTS certificate_number_seq START 1;

-- Function to generate certificate number
CREATE OR REPLACE FUNCTION generate_certificate_number()
RETURNS TEXT AS $$
DECLARE
    current_year TEXT;
    next_val INTEGER;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    next_val := nextval('certificate_number_seq');
    RETURN 'CERT-' || current_year || '-' || LPAD(next_val::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_examinations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS examinations_updated_at ON examinations;
CREATE TRIGGER examinations_updated_at
    BEFORE UPDATE ON examinations
    FOR EACH ROW
    EXECUTE FUNCTION update_examinations_updated_at();

-- Enable RLS
ALTER TABLE examinations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Super admins and admins can see all examinations
CREATE POLICY "examinations_select_admin" ON examinations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_id = auth.uid()
            AND users.role IN ('super_admin', 'admin')
            AND users.deleted_at IS NULL
        )
    );

-- Branch admins and instructors can see examinations for their branch
CREATE POLICY "examinations_select_branch" ON examinations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN students s ON s.id = examinations.student_id
            WHERE u.auth_id = auth.uid()
            AND u.role IN ('branch_admin', 'instructor')
            AND u.branch_id = s.branch_id
            AND u.deleted_at IS NULL
        )
    );

-- Insert policy for staff
CREATE POLICY "examinations_insert" ON examinations
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_id = auth.uid()
            AND users.role IN ('super_admin', 'admin', 'branch_admin', 'instructor')
            AND users.deleted_at IS NULL
        )
    );

-- Update policy for staff
CREATE POLICY "examinations_update" ON examinations
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_id = auth.uid()
            AND users.role IN ('super_admin', 'admin', 'branch_admin', 'instructor')
            AND users.deleted_at IS NULL
        )
    );

-- Delete policy for admins only
CREATE POLICY "examinations_delete" ON examinations
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_id = auth.uid()
            AND users.role IN ('super_admin', 'admin')
            AND users.deleted_at IS NULL
        )
    );

-- Grant permissions
GRANT ALL ON examinations TO authenticated;
GRANT USAGE, SELECT ON certificate_number_seq TO authenticated;

-- Comment on table
COMMENT ON TABLE examinations IS 'Tracks student examinations, eligibility, results, and certificates';
COMMENT ON COLUMN examinations.exam_level IS 'The level being tested (1-indexed)';
COMMENT ON COLUMN examinations.reattempt_count IS 'Number of times this exam has been retaken';
COMMENT ON COLUMN examinations.mark IS 'Score from 0-100';
COMMENT ON COLUMN examinations.certificate_number IS 'Unique certificate number in format CERT-YYYY-XXXXX';
