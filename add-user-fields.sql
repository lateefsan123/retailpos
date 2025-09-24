-- Add missing user fields for enhanced signup
-- Run this in your Supabase SQL editor to add the missing columns

-- Add missing columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS email text UNIQUE,
ADD COLUMN IF NOT EXISTS phone text;

-- Add missing columns to business_info table for enhanced business details
ALTER TABLE public.business_info 
ADD COLUMN IF NOT EXISTS business_name text,
ADD COLUMN IF NOT EXISTS business_type text DEFAULT 'Retail Store',
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS business_hours text,
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

-- Update existing business_info records to have business_name = name
UPDATE public.business_info 
SET business_name = name 
WHERE business_name IS NULL;

-- Add comments to document the new columns
COMMENT ON COLUMN public.users.first_name IS 'User first name from signup form';
COMMENT ON COLUMN public.users.last_name IS 'User last name from signup form';
COMMENT ON COLUMN public.users.email IS 'User email address from signup form';
COMMENT ON COLUMN public.users.phone IS 'User phone number from signup form';

COMMENT ON COLUMN public.business_info.business_name IS 'Business name (duplicate of name for compatibility)';
COMMENT ON COLUMN public.business_info.business_type IS 'Type of business (Retail, Restaurant, etc.)';
COMMENT ON COLUMN public.business_info.description IS 'Business description from signup form';
COMMENT ON COLUMN public.business_info.website IS 'Business website URL';
COMMENT ON COLUMN public.business_info.business_hours IS 'Business operating hours';
COMMENT ON COLUMN public.business_info.currency IS 'Business currency preference';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);
CREATE INDEX IF NOT EXISTS idx_business_info_business_type ON public.business_info(business_type);

-- Verify the columns were added
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name IN ('users', 'business_info')
  AND column_name IN ('first_name', 'last_name', 'email', 'phone', 'business_name', 'business_type', 'description', 'website', 'business_hours', 'currency')
ORDER BY table_name, column_name;
