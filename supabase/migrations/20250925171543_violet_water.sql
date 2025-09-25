/*
  # Add user_id column to video table

  1. New Columns
    - `user_id` (uuid) - References the user who created the video
  
  2. Security
    - Add foreign key constraint to users table
    - Update existing RLS policies to use user_id for access control
  
  3. Data Migration
    - Populate existing records with user_id from related chat records
*/

-- Add user_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE video ADD COLUMN user_id uuid;
  END IF;
END $$;

-- Populate existing video records with user_id from their associated chats
UPDATE video 
SET user_id = chat.user_id 
FROM chat 
WHERE video.chat_id = chat.id 
AND video.user_id IS NULL;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'video_user_id_fkey' 
    AND table_name = 'video'
  ) THEN
    ALTER TABLE video 
    ADD CONSTRAINT video_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_video_user_id ON video(user_id);

-- Update RLS policies to use user_id directly instead of joining through chat
DROP POLICY IF EXISTS "video_select_creator_only" ON video;
DROP POLICY IF EXISTS "video_insert_creator_only" ON video;
DROP POLICY IF EXISTS "video_update_creator_only" ON video;
DROP POLICY IF EXISTS "video_delete_creator_only" ON video;

-- Create new RLS policies using user_id directly
CREATE POLICY "video_select_user_only"
  ON video
  FOR SELECT
  TO public
  USING (user_id::text = uid()::text);

CREATE POLICY "video_insert_user_only"
  ON video
  FOR INSERT
  TO public
  WITH CHECK (user_id::text = uid()::text);

CREATE POLICY "video_update_user_only"
  ON video
  FOR UPDATE
  TO public
  USING (user_id::text = uid()::text)
  WITH CHECK (user_id::text = uid()::text);

CREATE POLICY "video_delete_user_only"
  ON video
  FOR DELETE
  TO public
  USING (user_id::text = uid()::text);