/*
  # Create Storage Buckets for File Uploads

  1. Storage Setup
    - Create `public-files` bucket for user uploads
    - Create `private-files` bucket for sensitive files
  
  2. Security
    - Enable RLS on storage objects
    - Add policies for authenticated users
*/

-- Create public files bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public-files',
  'public-files',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create private files bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'private-files',
  'private-files',
  false,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy for public files - anyone can read, authenticated users can upload
CREATE POLICY "Public files are publicly accessible"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'public-files');

CREATE POLICY "Authenticated users can upload public files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'public-files');

CREATE POLICY "Users can update their own public files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'public-files' AND auth.uid()::text = owner);

CREATE POLICY "Users can delete their own public files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'public-files' AND auth.uid()::text = owner);

-- Policy for private files - only authenticated users can access their own files
CREATE POLICY "Users can access their own private files"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'private-files' AND auth.uid()::text = owner)
  WITH CHECK (bucket_id = 'private-files' AND auth.uid()::text = owner);