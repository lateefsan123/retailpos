-- Test inserting a business to see what error we get
-- Run this in your Supabase SQL Editor

-- First, check what columns exist now
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'side_businesses'
ORDER BY ordinal_position;

-- Then try to insert a test business
INSERT INTO side_businesses (owner_id, name, description, business_type, icon) 
VALUES (1, 'Test Business', 'Test description', 'rental', 'fa-solid fa-briefcase');

-- Check if it was inserted
SELECT * FROM side_businesses WHERE name = 'Test Business';
