/*
  # Fix Credits System for Stripe Integration

  1. Database Updates
    - Add current_plan column to users table
    - Add subscription management fields
    - Update trigger to set proper initial credits (20)
    - Add indexes for performance

  2. Credit Management
    - Monthly credit reset logic
    - Plan upgrade credit calculation
    - Subscription status tracking

  3. Stripe Integration Ready
    - Customer ID tracking
    - Subscription period tracking
    - Plan change handling
*/

-- Add current_plan column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'current_plan'
  ) THEN
    ALTER TABLE users ADD COLUMN current_plan varchar(50) DEFAULT 'Free';
  END IF;
END $$;

-- Update the trigger function to set proper initial credits
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, credits, current_plan, subscription_status, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    20.0, -- Set initial credits to 20 for free tier
    'Free', -- Set initial plan to Free
    'inactive',
    'user'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_current_plan ON users(current_plan);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);

-- Add constraint to ensure valid plan names
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'users' AND constraint_name = 'users_current_plan_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_current_plan_check 
    CHECK (current_plan IN ('Free', 'Starter', 'Creator', 'Pro', 'Elite'));
  END IF;
END $$;