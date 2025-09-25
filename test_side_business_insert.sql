-- Test script to manually test side business item and sale creation
-- This will help identify exactly where the 409 conflict is occurring

-- 1. First, let's see what side business items exist
SELECT 
    item_id,
    business_id,
    name,
    price,
    parent_shop_id,
    branch_id
FROM side_business_items 
ORDER BY item_id DESC 
LIMIT 10;

-- 2. Let's see what side businesses exist
SELECT 
    business_id,
    name,
    parent_shop_id,
    branch_id
FROM side_businesses 
ORDER BY business_id DESC 
LIMIT 10;

-- 3. Test creating a side business item (simulating the Quick Service scenario)
-- Replace the values with actual data from your system
DO $$
DECLARE
    new_item_id INTEGER;
    test_business_id INTEGER;
    test_parent_shop_id INTEGER;
    test_branch_id INTEGER;
BEGIN
    -- Get a valid business_id and parent_shop_id from existing data
    SELECT business_id, parent_shop_id, branch_id 
    INTO test_business_id, test_parent_shop_id, test_branch_id
    FROM side_businesses 
    LIMIT 1;
    
    IF test_business_id IS NOT NULL THEN
        BEGIN
            -- Try to insert a new side business item
            INSERT INTO side_business_items (
                business_id,
                parent_shop_id,
                name,
                price,
                stock_quantity,
                notes,
                branch_id
            ) VALUES (
                test_business_id,
                test_parent_shop_id,
                'Test Item for Debug',
                25.00,
                NULL,
                'Created via Quick Service',
                test_branch_id
            ) RETURNING item_id INTO new_item_id;
            
            RAISE NOTICE 'Successfully created side business item with ID: %', new_item_id;
            
            -- Now try to create a side business sale
            INSERT INTO side_business_sales (
                item_id,
                quantity,
                price_each,
                total_amount,
                payment_method,
                date_time,
                business_id,
                parent_shop_id,
                branch_id
            ) VALUES (
                new_item_id,
                1,
                25.00,
                25.00,
                'cash',
                NOW(),
                test_business_id,
                test_parent_shop_id,
                test_branch_id
            );
            
            RAISE NOTICE 'Successfully created side business sale';
            
            -- Clean up test data
            DELETE FROM side_business_sales WHERE item_id = new_item_id;
            DELETE FROM side_business_items WHERE item_id = new_item_id;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error occurred: %', SQLERRM;
            RAISE NOTICE 'Error detail: %', SQLSTATE;
        END;
    ELSE
        RAISE NOTICE 'No side businesses found - cannot run test';
    END IF;
END $$;
