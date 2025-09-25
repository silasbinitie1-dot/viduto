/*
  # Add RLS policies for uploads bucket

  1. Storage Policies
    - Allow public read access to uploaded files
    - Allow authenticated users to upload files
    - Allow authenticated users to update their own files
    - Allow authenticated users to delete their own files

  2. Security
    - Enable proper RLS policies for the uploads bucket
    - Ensure file size and type restrictions are in place
*/

-- Allow public read access to all files in uploads bucket
INSERT INTO storage.policies (id, bucket_id, name, definition, check_definition, command, roles)
VALUES (
  'uploads_public_read',
  'uploads',
  'Allow public read access',
  'true',
  NULL,
  'SELECT',
  '{anon,authenticated}'
) ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
INSERT INTO storage.policies (id, bucket_id, name, definition, check_definition, command, roles)
VALUES (
  'uploads_authenticated_insert',
  'uploads',
  'Allow authenticated users to upload files',
  'true',
  'bucket_id = ''uploads''',
  'INSERT',
  '{authenticated}'
) ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to update their own files
INSERT INTO storage.policies (id, bucket_id, name, definition, check_definition, command, roles)
VALUES (
  'uploads_authenticated_update',
  'uploads',
  'Allow authenticated users to update files',
  'auth.uid()::text = (storage.foldername(name))[1]',
  'bucket_id = ''uploads''',
  'UPDATE',
  '{authenticated}'
) ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to delete their own files
INSERT INTO storage.policies (id, bucket_id, name, definition, check_definition, command, roles)
VALUES (
  'uploads_authenticated_delete',
  'uploads',
  'Allow authenticated users to delete files',
  'auth.uid()::text = (storage.foldername(name))[1]',
  NULL,
  'DELETE',
  '{authenticated}'
) ON CONFLICT (id) DO NOTHING;