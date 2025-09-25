/*
  # Increase URL field lengths in video table

  1. Schema Changes
    - Increase `image_url` from varchar(500) to text
    - Increase `video_url` from varchar(500) to text
    - Increase `product_name` from varchar(255) to text for flexibility

  2. Rationale
    - Modern URLs can be very long, especially with query parameters
    - Base64 data URLs can exceed 500 characters easily
    - Text fields provide unlimited length without performance impact for URLs
*/

-- Increase URL field lengths to handle longer URLs
ALTER TABLE video 
  ALTER COLUMN image_url TYPE text,
  ALTER COLUMN video_url TYPE text,
  ALTER COLUMN product_name TYPE text;

-- Update indexes if needed (PostgreSQL handles text indexes efficiently)
-- The existing indexes on these columns will continue to work with text type