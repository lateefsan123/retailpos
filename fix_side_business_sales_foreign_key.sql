-- Fix the incorrect foreign key constraint on side_business_sales.business_id
-- This script removes the wrong constraint and adds the correct one

-- 1. First, check what constraints currently exist
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'side_business_sales'
  AND kcu.column_name = 'business_id';

-- 2. Drop the incorrect foreign key constraint if it exists
ALTER TABLE side_business_sales DROP CONSTRAINT IF EXISTS fk_side_business_sales_business_id;

-- 3. Add the correct foreign key constraint
-- business_id in side_business_sales should reference side_businesses.business_id
ALTER TABLE side_business_sales 
ADD CONSTRAINT fk_side_business_sales_business_id 
FOREIGN KEY (business_id) REFERENCES side_businesses(business_id);

-- 4. Verify the constraint was added correctly
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'side_business_sales'
  AND kcu.column_name = 'business_id';
