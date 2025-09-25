/*
  # Create storage bucket for file uploads

  1. Storage Setup
    - Create `public-files` bucket for user uploads
    - Set up proper RLS policies for public access
    - Configure bucket for public file access

  2. Security
    - Enable RLS on storage.objects
    - Add policy for public read access
    - Add policy for authenticated users to upload files

  3. Bucket Configuration
    - Public bucket for user-uploaded images
    - Allows common image formats (PNG, JPG, JPEG, WEBP)
    - Maximum file size of 10MB
*/

-- Create the public-files bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public-files',
  'public-files', 
  true,
  10485760, -- 10MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy to allow public read access to files in public-files bucket
CREATE POLICY "Public read access for public-files bucket"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'public-files');

-- Policy to allow authenticated users to upload files to public-files bucket
CREATE POLICY "Authenticated users can upload to public-files bucket"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'public-files');

-- Policy to allow authenticated users to update their own files
CREATE POLICY "Authenticated users can update their own files in public-files bucket"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'public-files')
  WITH CHECK (bucket_id = 'public-files');

-- Policy to allow authenticated users to delete their own files
CREATE POLICY "Authenticated users can delete their own files in public-files bucket"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'public-files');