/*
  # Update credits_used column to support decimal values

  1. Schema Changes
    - Change `credits_used` column in `video` table from integer to numeric
    - Change `credits_charged` column in `video` table from integer to numeric
    - This allows storing decimal values like 2.5 for revisions

  2. Data Integrity
    - Uses safe ALTER COLUMN with USING clause to convert existing data
    - Preserves all existing integer values as decimal equivalents

  3. Notes
    - This change is backward compatible
    - Existing integer values will be preserved as decimal equivalents
    - Supports revision costs of 2.5 credits and other fractional amounts
*/

-- Update credits_used column to support decimal values
ALTER TABLE video 
ALTER COLUMN credits_used TYPE numeric(10,2) USING credits_used::numeric(10,2);

-- Update credits_charged column to support decimal values  
ALTER TABLE video 
ALTER COLUMN credits_charged TYPE numeric(10,2) USING credits_charged::numeric(10,2);

-- Update default values to maintain consistency
ALTER TABLE video 
ALTER COLUMN credits_used SET DEFAULT 0.0;

ALTER TABLE video 
ALTER COLUMN credits_charged SET DEFAULT 0.0;