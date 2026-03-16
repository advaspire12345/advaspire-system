-- Add lesson and mission fields to attendance table
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS lesson TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS mission TEXT;

-- Add comment for documentation
COMMENT ON COLUMN attendance.lesson IS 'Lesson title from curriculum or "Competition"';
COMMENT ON COLUMN attendance.mission IS 'Mission from curriculum or "Preparation"/"Showcase" for competitions';
