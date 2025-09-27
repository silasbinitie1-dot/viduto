/*
  # Update user credits to support decimal values

  1. Schema Changes
    - Change `users.credits` from `integer` to `numeric(10,2)`
    - This allows storing decimal credit values like 347.5 for revisions
    - Preserves all existing integer values by converting them to decimal equivalents

  2. Data Safety
    - Uses safe ALTER COLUMN with USING clause to convert existing data
    - All existing integer credits will be preserved as decimal equivalents
    - No data loss during migration

  3. Benefits
    - Supports 2.5 credit deductions for revisions
    - Enables more flexible credit pricing models
    - Maintains backward compatibility with existing workflows
*/

-- Update the credits column to support decimal values
ALTER TABLE users 
ALTER COLUMN credits TYPE numeric(10,2) USING credits::numeric(10,2);

-- Update the default value to be decimal-compatible
ALTER TABLE users 
ALTER COLUMN credits SET DEFAULT 0.0;