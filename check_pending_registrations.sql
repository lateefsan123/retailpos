-- Check if pending_registrations table exists and has data
-- Run this in your Supabase SQL editor

-- 1. Check if table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'pending_registrations';

-- 2. Check table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'pending_registrations'
ORDER BY ordinal_position;

-- 3. Check if there are any records
SELECT COUNT(*) as total_records FROM public.pending_registrations;

-- 4. Show all records (if any)
SELECT * FROM public.pending_registrations ORDER BY created_at DESC;

-- 5. Check users table for inactive users
SELECT user_id, username, email, active, email_verified, created_at 
FROM public.users 
WHERE active = false 
ORDER BY created_at DESC;

