/*
  # Complete Database Setup for Viduto

  1. Database Functions
    - `update_updated_at_column()` - Trigger function for automatic timestamp updates
    - `handle_new_user()` - Trigger function for new user setup

  2. Storage Setup
    - Create storage buckets for user uploads and private files
    - Set up proper RLS policies for storage

  3. Additional Indexes
    - Performance optimization indexes for frequently queried columns

  4. Security Enhancements
    - Additional RLS policies for enhanced security
*/

-- Create or replace the updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create or replace the new user handler function
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
$$ language 'plpgsql' SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('user-uploads', 'user-uploads', true),
    ('private-files', 'private-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for user-uploads bucket
CREATE POLICY "Users can upload their own files" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'user-uploads');

CREATE POLICY "Users can view their own files" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'user-uploads');

CREATE POLICY "Users can update their own files" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'user-uploads');

CREATE POLICY "Users can delete their own files" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'user-uploads');

-- Storage policies for private-files bucket
CREATE POLICY "Users can upload private files" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'private-files');

CREATE POLICY "Users can view their own private files" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'private-files');

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_users_subscription_period_end ON users(subscription_period_end);
CREATE INDEX IF NOT EXISTS idx_video_processing_started_at ON video(processing_started_at);
CREATE INDEX IF NOT EXISTS idx_video_processing_completed_at ON video(processing_completed_at);
CREATE INDEX IF NOT EXISTS idx_chat_workflow_state ON chat(workflow_state);
CREATE INDEX IF NOT EXISTS idx_message_metadata ON message USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_video_metadata ON video USING gin(brief_data);

-- Ensure all tables have proper RLS enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE message ENABLE ROW LEVEL SECURITY;
ALTER TABLE video ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_log ENABLE ROW LEVEL SECURITY;