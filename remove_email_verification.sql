-- Remove email verification tables and related data
-- Run this in your Supabase SQL editor

-- 1. Drop the email verification tokens table
DROP TABLE IF EXISTS public.email_verification_tokens CASCADE;

-- 2. Remove email verification columns from users table
ALTER TABLE public.users DROP COLUMN IF EXISTS email_verified;
ALTER TABLE public.users DROP COLUMN IF EXISTS email_verification_token;
ALTER TABLE public.users DROP COLUMN IF EXISTS verification_token_expires;

-- 3. Check what was removed
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users'
AND column_name LIKE '%email%' OR column_name LIKE '%verification%'
ORDER BY table_name, column_name;
