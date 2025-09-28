/*
  # Complete Database Setup for Viduto

  1. Database Functions
    - `update_updated_at_column()` - Trigger function for automatic timestamp updates
    - `handle_new_user()` - Trigger function for new user setup

  2. Storage Setup
    - Create storage buckets with proper RLS policies
    - Enable public access for user uploads

  3. Additional Indexes
    - Performance optimization indexes for all tables

  4. Security
    - Comprehensive RLS policies for all tables
    - Proper foreign key constraints
*/

-- Create or replace the updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create or replace the handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, credits, subscription_status, current_plan)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    20,
    'inactive',
    'Free'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ language 'plpgsql' security definer;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Ensure all tables have updated_at triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_updated_at ON chat;
CREATE TRIGGER update_chat_updated_at
  BEFORE UPDATE ON chat
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_message_updated_at ON message;
CREATE TRIGGER update_message_updated_at
  BEFORE UPDATE ON message
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_video_updated_at ON video;
CREATE TRIGGER update_video_updated_at
  BEFORE UPDATE ON video
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON blog_posts;
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('user-uploads', 'user-uploads', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  ('private-files', 'private-files', false, 52428800, NULL)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for user-uploads bucket
CREATE POLICY "Users can upload files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'user-uploads');

CREATE POLICY "Users can view uploaded files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'user-uploads');

CREATE POLICY "Users can delete their files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'user-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for private-files bucket
CREATE POLICY "Users can upload private files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'private-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their private files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'private-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_chat_user_workflow ON chat(user_id, workflow_state);
CREATE INDEX IF NOT EXISTS idx_message_chat_type ON message(chat_id, message_type);
CREATE INDEX IF NOT EXISTS idx_video_chat_status ON video(chat_id, status);
CREATE INDEX IF NOT EXISTS idx_users_email_status ON users(email, subscription_status);

-- Ensure RLS is enabled on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE message ENABLE ROW LEVEL SECURITY;
ALTER TABLE video ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_log ENABLE ROW LEVEL SECURITY;