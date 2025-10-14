-- =====================================================
-- SUPABASE AUTHENTICATION INTEGRATION MIGRATION
-- =====================================================
-- This migration adds Supabase Auth support while maintaining
-- backward compatibility with existing custom authentication
-- Run this in your Supabase SQL Editor

-- =====================================================
-- 1. Add auth_user_id column to link with Supabase Auth
-- =====================================================
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id 
ON public.users(auth_user_id);

-- =====================================================
-- 2. Make password_hash nullable for Supabase Auth users
-- =====================================================
ALTER TABLE public.users 
ALTER COLUMN password_hash DROP NOT NULL;

-- =====================================================
-- 3. Add pin column for quick user switching (if doesn't exist)
-- =====================================================
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS pin text;

-- Create partial index for PIN lookups
CREATE INDEX IF NOT EXISTS idx_users_pin 
ON public.users(user_id, pin) 
WHERE pin IS NOT NULL;

-- =====================================================
-- 4. Add unique constraint on auth_user_id
-- =====================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_user_id_unique 
ON public.users(auth_user_id) 
WHERE auth_user_id IS NOT NULL;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check the new columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users'
AND column_name IN ('auth_user_id', 'password_hash', 'pin')
ORDER BY column_name;

-- Check indexes were created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'users'
AND indexname LIKE '%auth%' OR indexname LIKE '%pin%';

-- =====================================================
-- NOTES
-- =====================================================
-- After running this migration:
-- 1. New users will have auth_user_id populated (from Supabase Auth)
-- 2. New users will have password_hash = NULL
-- 3. Existing users will have password_hash populated
-- 4. Existing users will have auth_user_id = NULL
-- 5. Both types of users can coexist and authenticate successfully

