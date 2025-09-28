/*
  # Fix User Registration System

  1. Database Functions
    - Create function to handle new user registration
    - Set up trigger to automatically create user profile after auth signup

  2. User Profile Creation
    - Automatically create user in `users` table after Supabase auth signup
    - Set correct initial credits (20 instead of 500)
    - Set proper defaults for new users

  3. Security
    - Ensure RLS policies work correctly for new users
    - Handle edge cases for user creation
*/

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    full_name,
    credits,
    subscription_status,
    role,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    20.0, -- Set initial credits to 20
    'inactive',
    'user',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile after signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update existing users who might have been created without proper profile
DO $$
BEGIN
  -- Insert missing user profiles for existing auth users
  INSERT INTO public.users (
    id,
    email,
    full_name,
    credits,
    subscription_status,
    role,
    created_at,
    updated_at
  )
  SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', au.email),
    20.0,
    'inactive',
    'user',
    au.created_at,
    NOW()
  FROM auth.users au
  LEFT JOIN public.users pu ON au.id = pu.id
  WHERE pu.id IS NULL
  ON CONFLICT (id) DO NOTHING;
END $$;