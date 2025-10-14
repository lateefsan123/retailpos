-- =====================================================
-- SECURE PIN MIGRATION
-- =====================================================
-- This migration secures PIN storage by adding bcrypt hashing
-- Run this in your Supabase SQL Editor

-- =====================================================
-- 1. Add pin_hash column for secure PIN storage
-- =====================================================
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS pin_hash text;

-- =====================================================
-- 2. Create index for pin_hash lookups (partial index)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_users_pin_hash 
ON public.users(user_id, pin_hash) 
WHERE pin_hash IS NOT NULL;

-- =====================================================
-- 3. Add comment explaining the column
-- =====================================================
COMMENT ON COLUMN public.users.pin_hash IS 'Bcrypt hash of user PIN for secure authentication';

-- =====================================================
-- IMPORTANT: Migration Notes
-- =====================================================
-- After running this migration:
-- 1. The 'pin' column (plaintext) still exists for backward compatibility
-- 2. New PINs will be stored in 'pin_hash' using bcrypt
-- 3. Existing plaintext PINs will be migrated on first use
-- 4. Once all PINs are migrated, you can optionally drop the 'pin' column

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users'
AND column_name IN ('pin', 'pin_hash')
ORDER BY column_name;

-- =====================================================
-- Check how many users have PINs set
-- =====================================================
SELECT 
  COUNT(*) FILTER (WHERE pin IS NOT NULL) as users_with_plaintext_pin,
  COUNT(*) FILTER (WHERE pin_hash IS NOT NULL) as users_with_hashed_pin,
  COUNT(*) as total_users
FROM public.users;

