/*
  # Add is_revision column to video table

  1. Schema Changes
    - Add `is_revision` column to `video` table
      - Type: boolean
      - Default: false
      - Not nullable

  2. Purpose
    - Track whether a video is an original creation or a revision
    - Used by the video production workflow to differentiate between initial videos and revisions
    - Enables different processing logic and credit calculations
*/

-- Add is_revision column to video table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video' AND column_name = 'is_revision'
  ) THEN
    ALTER TABLE video ADD COLUMN is_revision boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Add index for performance on is_revision queries
CREATE INDEX IF NOT EXISTS idx_video_is_revision ON video (is_revision);

-- Add comment for documentation
COMMENT ON COLUMN video.is_revision IS 'Indicates whether this video is a revision of an existing video (true) or an original creation (false)';