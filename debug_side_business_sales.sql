-- Debug script to identify issues with side_business_sales table
-- Run this in your Supabase SQL editor to diagnose the 409 Conflict error

-- 1. Check the current table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'side_business_sales' 
ORDER BY ordinal_position;

-- 2. Check existing constraints
SELECT 
    tc.constraint_name, 
    tc.constraint_type,
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
WHERE tc.table_name = 'side_business_sales'
ORDER BY tc.constraint_type, tc.constraint_name;

-- 3. Check if required tables exist
SELECT 
    table_name,
    CASE WHEN table_name IN ('side_business_items', 'business_info', 'branches') 
         THEN 'EXISTS' 
         ELSE 'MISSING' 
    END as status
FROM information_schema.tables 
WHERE table_name IN ('side_business_items', 'business_info', 'branches')
   OR table_schema = 'public' AND table_name LIKE '%side%';

-- 4. Check sample data in side_business_items
SELECT 
    item_id, 
    business_id, 
    name, 
    parent_shop_id, 
    branch_id,
    created_at
FROM side_business_items 
ORDER BY created_at DESC 
LIMIT 5;

-- 5. Check if there are any unique constraints or indexes that might cause conflicts
SELECT 
    indexname, 
    indexdef
FROM pg_indexes 
WHERE tablename = 'side_business_sales';

-- 6. Check recent side_business_sales entries
SELECT 
    sale_id,
    item_id,
    quantity,
    total_amount,
    payment_method,
    business_id,
    parent_shop_id,
    branch_id,
    date_time
FROM side_business_sales 
ORDER BY date_time DESC 
LIMIT 5;
