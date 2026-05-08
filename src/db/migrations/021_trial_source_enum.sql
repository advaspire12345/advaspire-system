-- Trial source values overhaul:
--   Remove: phone, online, social_media (kept renderable in UI as "(legacy)" labels)
--   Add:    website, facebook, google, tiktok, xhs, youtube, instagram
--
-- The `source` column on `trials` is currently TEXT (no Postgres ENUM constraint).
-- If it ever becomes an enum, this migration adds the new values defensively.
-- Existing legacy rows are NOT auto-converted — they keep their old source value
-- and the UI labels them with a "(legacy)" suffix until manually edited.
--
-- Pre-check: how many rows still use legacy values?
--   SELECT source, COUNT(*) FROM trials
--   WHERE source IN ('phone','online','social_media')
--   GROUP BY source;

DO $$
BEGIN
  -- Only act if `trial_source` is defined as a Postgres ENUM (not TEXT)
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trial_source') THEN
    BEGIN ALTER TYPE trial_source ADD VALUE IF NOT EXISTS 'website';   EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE trial_source ADD VALUE IF NOT EXISTS 'facebook';  EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE trial_source ADD VALUE IF NOT EXISTS 'google';    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE trial_source ADD VALUE IF NOT EXISTS 'tiktok';    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE trial_source ADD VALUE IF NOT EXISTS 'xhs';       EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE trial_source ADD VALUE IF NOT EXISTS 'youtube';   EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE trial_source ADD VALUE IF NOT EXISTS 'instagram'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END$$;
