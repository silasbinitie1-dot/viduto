/*
  # Add video production tracking fields

  1. New Tables
    - No new tables, updating existing ones

  2. Changes to existing tables
    - `video` table: Add production tracking fields
    - `chat` table: Add active video tracking
    - `users` table: Ensure credits field exists

  3. Security
    - Maintain existing RLS policies
*/

-- Add fields to video table for production tracking
DO $$
BEGIN
  -- Add video production fields if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video' AND column_name = 'processing_started_at'
  ) THEN
    ALTER TABLE video ADD COLUMN processing_started_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video' AND column_name = 'processing_completed_at'
  ) THEN
    ALTER TABLE video ADD COLUMN processing_completed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video' AND column_name = 'processing_time_seconds'
  ) THEN
    ALTER TABLE video ADD COLUMN processing_time_seconds integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video' AND column_name = 'is_revision'
  ) THEN
    ALTER TABLE video ADD COLUMN is_revision boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video' AND column_name = 'error_message'
  ) THEN
    ALTER TABLE video ADD COLUMN error_message text;
  END IF;
END $$;

-- Add fields to chat table for active video tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat' AND column_name = 'active_video_id'
  ) THEN
    ALTER TABLE chat ADD COLUMN active_video_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat' AND column_name = 'production_started_at'
  ) THEN
    ALTER TABLE chat ADD COLUMN production_started_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat' AND column_name = 'last_video_url'
  ) THEN
    ALTER TABLE chat ADD COLUMN last_video_url text;
  END IF;
END $$;

-- Ensure users table has credits field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'credits'
  ) THEN
    ALTER TABLE users ADD COLUMN credits integer DEFAULT 20;
  END IF;
END $$;

-- Create system_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on system_log
ALTER TABLE system_log ENABLE ROW LEVEL SECURITY;

-- Create policy for system_log
CREATE POLICY "Users can read own system logs"
  ON system_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policy for service role to insert system logs
CREATE POLICY "Service role can insert system logs"
  ON system_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);