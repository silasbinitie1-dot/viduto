/*
  # Add missing user fields for Stripe integration

  1. New Columns
    - `stripe_subscription_id` (text) - Links user to their Stripe subscription
    - `stripe_subscription_schedule_id` (text) - Links user to their Stripe subscription schedule
    - `last_webhook_update` (timestamptz) - Tracks last webhook update time
    - `webhook_processed` (boolean) - Indicates if webhook was processed

  2. Indexes
    - Add indexes for new Stripe fields for better query performance

  3. Security
    - No RLS changes needed as these are internal fields
*/

-- Add missing Stripe integration fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'stripe_subscription_id'
  ) THEN
    ALTER TABLE users ADD COLUMN stripe_subscription_id text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'stripe_subscription_schedule_id'
  ) THEN
    ALTER TABLE users ADD COLUMN stripe_subscription_schedule_id text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_webhook_update'
  ) THEN
    ALTER TABLE users ADD COLUMN last_webhook_update timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'webhook_processed'
  ) THEN
    ALTER TABLE users ADD COLUMN webhook_processed boolean DEFAULT false;
  END IF;
END $$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription_id ON users(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription_schedule_id ON users(stripe_subscription_schedule_id);
CREATE INDEX IF NOT EXISTS idx_users_last_webhook_update ON users(last_webhook_update);
CREATE INDEX IF NOT EXISTS idx_users_webhook_processed ON users(webhook_processed);