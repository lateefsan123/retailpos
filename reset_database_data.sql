-- Complete Database Reset Script
-- This will delete ALL data from all tables in your POS system
-- WARNING: This is irreversible! Make sure you have backups if needed.

-- Disable foreign key checks temporarily to avoid constraint issues
SET session_replication_role = replica;

-- Delete data from all tables (in reverse dependency order)
-- Start with child tables that reference other tables

-- Delete sale items first (references sales and products)
DELETE FROM sale_items;

-- Delete sales (references customers)
DELETE FROM sales;

-- Delete inventory movements
DELETE FROM inventory_movements;

-- Delete vault transactions
DELETE FROM vault;

-- Delete side business sales
DELETE FROM side_business_sales;

-- Delete side business items
DELETE FROM side_business_items;

-- Delete products
DELETE FROM products;

-- Delete customers
DELETE FROM customers;

-- Delete reminders
DELETE FROM reminders;

-- Delete branches
DELETE FROM branches;

-- Delete email verification tokens
DELETE FROM email_verification_tokens;

-- Delete users (this will cascade to business_info due to foreign key)
DELETE FROM users;

-- Delete business info
DELETE FROM business_info;

-- Re-enable foreign key checks
SET session_replication_role = DEFAULT;

-- Reset auto-increment sequences to start from 1
-- This ensures new records start with ID 1

-- Reset sequences for all tables
ALTER SEQUENCE IF EXISTS reminders_reminder_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS products_product_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS sales_sale_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS sale_items_sale_item_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS customers_customer_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS branches_branch_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS users_user_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS business_info_business_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS email_verification_tokens_token_id_seq RESTART WITH 1;

-- If you have other tables with sequences, add them here:
-- ALTER SEQUENCE IF EXISTS inventory_movements_movement_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS vault_transaction_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS side_business_items_item_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS side_business_sales_sale_id_seq RESTART WITH 1;

-- Verify the reset was successful
SELECT 
    schemaname,
    tablename,
    n_tup_ins as "Rows"
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Show message
SELECT 'Database reset completed successfully! All data has been deleted and sequences reset.' as status;
