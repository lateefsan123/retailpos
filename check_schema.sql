-- Check current users table schema
-- Run this first to see what columns exist

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Also check if there are any existing users and their structure
SELECT * FROM users LIMIT 1;
