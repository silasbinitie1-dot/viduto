/*
  # Fix chat title length constraint

  1. Changes
    - Increase `title` column length from 255 to 500 characters
    - This allows for longer, more descriptive chat titles without truncation

  2. Security
    - No RLS changes needed as existing policies remain valid
*/

-- Increase the title column length to accommodate longer descriptions
ALTER TABLE chat ALTER COLUMN title TYPE character varying(500);