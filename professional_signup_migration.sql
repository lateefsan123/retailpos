-- Professional Signup System Migration
-- Run this in your Supabase SQL editor to add email support and enhanced business fields

-- =====================================================
-- STEP 1: Add email and verification fields to users table
-- =====================================================

-- Add email column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS email text UNIQUE;

-- Add email verification fields
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS email_verification_token text;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS verification_token_expires timestamp with time zone;

-- Add created_at and updated_at timestamps if they don't exist
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- =====================================================
-- STEP 2: Enhance business_info table with professional fields
-- =====================================================

-- Add business type field
ALTER TABLE public.business_info 
ADD COLUMN IF NOT EXISTS business_type text DEFAULT 'Retail Store';

-- Add business description
ALTER TABLE public.business_info 
ADD COLUMN IF NOT EXISTS description text;

-- Add website field
ALTER TABLE public.business_info 
ADD COLUMN IF NOT EXISTS website text;

-- Add business hours
ALTER TABLE public.business_info 
ADD COLUMN IF NOT EXISTS business_hours text;

-- Add currency preference
ALTER TABLE public.business_info 
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD';

-- Add timezone
ALTER TABLE public.business_info 
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'UTC';

-- Add created_at timestamp if it doesn't exist
ALTER TABLE public.business_info 
ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

-- =====================================================
-- STEP 3: Create email verification tokens table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id integer NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  used boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON public.email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON public.email_verification_tokens(user_id);

-- =====================================================
-- STEP 4: Add comments for documentation
-- =====================================================

COMMENT ON COLUMN public.users.email IS 'User email address for authentication and notifications';
COMMENT ON COLUMN public.users.email_verified IS 'Whether the user has verified their email address';
COMMENT ON COLUMN public.users.email_verification_token IS 'Token for email verification';
COMMENT ON COLUMN public.users.verification_token_expires IS 'Expiration time for verification token';

COMMENT ON COLUMN public.business_info.business_type IS 'Type of business (Retail Store, Restaurant, Service, etc.)';
COMMENT ON COLUMN public.business_info.description IS 'Business description';
COMMENT ON COLUMN public.business_info.website IS 'Business website URL';
COMMENT ON COLUMN public.business_info.business_hours IS 'Business operating hours';
COMMENT ON COLUMN public.business_info.currency IS 'Default currency for transactions';
COMMENT ON COLUMN public.business_info.timezone IS 'Business timezone';

-- =====================================================
-- STEP 5: Update existing records
-- =====================================================

-- Update existing users to have email_verified = true (for existing users)
UPDATE public.users 
SET email_verified = true 
WHERE email_verified IS NULL;

-- Update existing business_info records with default values
UPDATE public.business_info 
SET business_type = 'Retail Store' 
WHERE business_type IS NULL;

UPDATE public.business_info 
SET currency = 'USD' 
WHERE currency IS NULL;

UPDATE public.business_info 
SET timezone = 'UTC' 
WHERE timezone IS NULL;

-- =====================================================
-- STEP 6: Verify the changes
-- =====================================================

-- Check users table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check business_info table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'business_info' 
AND table_schema = 'public'
ORDER BY ordinal_position;
