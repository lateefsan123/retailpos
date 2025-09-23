-- =====================================================
-- REMOVE BUSINESS NAME UNIQUE CONSTRAINT
-- =====================================================
-- This script removes the unique constraint on business_info.name
-- Run this in your Supabase SQL editor

-- Remove the unique constraint on the name column
ALTER TABLE business_info DROP CONSTRAINT IF EXISTS business_info_name_unique;

-- If you want to add a composite unique constraint instead
-- (e.g., unique combination of name and address)
-- ALTER TABLE business_info ADD CONSTRAINT business_info_name_address_unique UNIQUE (name, address);

-- Verify the constraint has been removed
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'business_info' AND constraint_type = 'UNIQUE';
