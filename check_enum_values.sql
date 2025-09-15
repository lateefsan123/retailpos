-- Check what enum values are available for user_role
-- Run this in your Supabase SQL Editor

-- Check the enum type definition
SELECT 
    t.typname as enum_name,
    e.enumlabel as enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'user_role'
ORDER BY e.enumsortorder;

-- Also check what values are currently in the users table
SELECT DISTINCT user_role FROM users;
