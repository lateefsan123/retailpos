-- Fix sales table foreign key constraints
-- This removes problematic foreign key constraints that are causing 409 conflicts

-- First, let's check what constraints exist
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
  AND tc.table_name = 'sales';

-- Remove the problematic foreign key constraint for cashier_id
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_cashier_id_fkey;

-- Remove other potentially problematic foreign key constraints
ALTER TABLE sales DROP CONSTRAINT IF EXISTS fk_sales_cashier_id;
ALTER TABLE sales DROP CONSTRAINT IF EXISTS fk_sales_business_id;
ALTER TABLE sales DROP CONSTRAINT IF EXISTS fk_sales_branch_id;

-- Add the missing columns if they don't exist
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cashier_id INTEGER;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount_applied DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS partial_payment BOOLEAN DEFAULT FALSE;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS partial_amount DECIMAL(10,2);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS remaining_amount DECIMAL(10,2);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS partial_notes TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS business_id INTEGER;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS branch_id INTEGER;

-- Create indexes for better performance (without foreign key constraints)
CREATE INDEX IF NOT EXISTS idx_sales_cashier_id ON sales(cashier_id);
CREATE INDEX IF NOT EXISTS idx_sales_business_id ON sales(business_id);
CREATE INDEX IF NOT EXISTS idx_sales_branch_id ON sales(branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_datetime ON sales(datetime);
CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON sales(payment_method);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sales_business_datetime ON sales(business_id, datetime);
CREATE INDEX IF NOT EXISTS idx_sales_business_branch ON sales(business_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_cashier_datetime ON sales(cashier_id, datetime);

-- Optional: Add foreign key constraints only if the referenced tables exist and have data
-- This is commented out to prevent conflicts, but can be enabled later if needed

/*
-- Only add foreign key for business_id if business_info table exists and has data
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_info') 
     AND EXISTS (SELECT 1 FROM business_info LIMIT 1) THEN
    ALTER TABLE sales 
    ADD CONSTRAINT fk_sales_business_id 
    FOREIGN KEY (business_id) REFERENCES business_info(business_id);
  END IF;
END $$;

-- Only add foreign key for branch_id if branches table exists and has data
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'branches') 
     AND EXISTS (SELECT 1 FROM branches LIMIT 1) THEN
    ALTER TABLE sales 
    ADD CONSTRAINT fk_sales_branch_id 
    FOREIGN KEY (branch_id) REFERENCES branches(branch_id);
  END IF;
END $$;

-- NOTE: We don't add a foreign key for cashier_id because:
-- 1. The original constraint referenced shop_staff.user_id
-- 2. But users are actually stored in the users table
-- 3. To fix this properly, you would need to either:
--    a) Move all users from users table to shop_staff table, OR
--    b) Create a proper foreign key that references users.user_id instead
--    c) Leave it as is (no foreign key constraint) for flexibility
*/
