-- Migration: Add code field to courses table
-- This field stores a short code/identifier for each program (e.g., "SCR" for Scratch)

-- Add code column to courses table
ALTER TABLE courses ADD COLUMN IF NOT EXISTS code VARCHAR(20);

-- Create index for quick lookups by code
CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(code);
