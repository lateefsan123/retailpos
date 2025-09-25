-- Check Row Level Security policies for side_business_sales table
-- RLS policies can sometimes cause 409 conflicts if they're not properly configured

-- 1. Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'side_business_sales';

-- 2. Check existing RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'side_business_sales';

-- 3. Check if the user has the right permissions
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'side_business_sales';

-- 4. Test a simple insert to see what error we get
-- This will help identify the exact constraint violation
DO $$
DECLARE
    test_item_id INTEGER;
    test_business_id INTEGER;
    test_parent_shop_id INTEGER;
BEGIN
    -- Get a valid item_id from side_business_items
    SELECT item_id INTO test_item_id 
    FROM side_business_items 
    LIMIT 1;
    
    -- Get a valid business_id
    SELECT business_id INTO test_business_id 
    FROM side_businesses 
    LIMIT 1;
    
    -- Get a valid parent_shop_id
    SELECT parent_shop_id INTO test_parent_shop_id 
    FROM side_business_items 
    LIMIT 1;
    
    IF test_item_id IS NOT NULL AND test_business_id IS NOT NULL AND test_parent_shop_id IS NOT NULL THEN
        BEGIN
            INSERT INTO side_business_sales (
                item_id,
                quantity,
                price_each,
                total_amount,
                payment_method,
                business_id,
                parent_shop_id,
                branch_id
            ) VALUES (
                test_item_id,
                1,
                10.00,
                10.00,
                'cash',
                test_business_id,
                test_parent_shop_id,
                NULL
            );
            
            RAISE NOTICE 'Test insert successful';
            
            -- Clean up the test record
            DELETE FROM side_business_sales 
            WHERE item_id = test_item_id 
              AND quantity = 1 
              AND total_amount = 10.00;
              
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Test insert failed: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'Cannot run test - missing required data';
    END IF;
END $$;
