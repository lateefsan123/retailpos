-- Add PIN column to users table
-- Run this in your Supabase SQL editor

-- Add pin column to users table if it doesn't exist
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS pin VARCHAR(6);

-- Add comment to document the column
COMMENT ON COLUMN public.users.pin IS 'User PIN for quick authentication (4-6 digits)';

-- Create index for PIN lookups (optional, for performance)
CREATE INDEX IF NOT EXISTS idx_users_pin ON public.users(pin);

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
AND column_name = 'pin';

-- Show current users table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;
