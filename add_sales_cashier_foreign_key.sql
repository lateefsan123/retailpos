-- Add foreign key constraint between sales.cashier_id and users.user_id
-- This will allow proper joins between sales and users tables

-- First, check if the constraint already exists
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'sales'
  AND kcu.column_name = 'cashier_id';

-- Add the foreign key constraint if it doesn't exist
ALTER TABLE sales 
ADD CONSTRAINT fk_sales_cashier_id 
FOREIGN KEY (cashier_id) REFERENCES users(user_id);

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_sales_cashier_id ON sales(cashier_id);

-- Note: This will allow the sales table to properly join with users table
-- for queries like: SELECT * FROM sales JOIN users ON sales.cashier_id = users.user_id
