-- Debug Side Business Tables
-- Run these queries in your Supabase SQL Editor to diagnose the issue

-- 1. Check if the side_businesses table exists and its structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'side_businesses'
ORDER BY ordinal_position;

-- 2. Check if there are any constraints on the side_businesses table
SELECT constraint_name, constraint_type, column_name
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'side_businesses';

-- 3. Check if there are any existing side businesses
SELECT * FROM side_businesses LIMIT 5;

-- 4. Try to insert a test service business (this will show the exact error)
INSERT INTO side_businesses (owner_id, name, description, business_type, icon) 
VALUES (1, 'Test Service Business', 'Test description', 'service', 'fa-solid fa-briefcase');

-- 5. Check if the users table has the expected structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;
