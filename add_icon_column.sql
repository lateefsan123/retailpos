-- Add missing icon column to users table
-- Run this in your Supabase SQL editor

-- Add icon column to users table if it doesn't exist
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS icon text DEFAULT 'lily'::text;

-- Update existing users to have a default icon if they don't have one
UPDATE public.users 
SET icon = 'lily' 
WHERE icon IS NULL;

-- Add comment to document the column
COMMENT ON COLUMN public.users.icon IS 'User avatar icon name for UI display';

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;
