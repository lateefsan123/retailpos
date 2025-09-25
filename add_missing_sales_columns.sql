-- Add missing columns to sales table
-- This migration adds all the columns that the application code expects

-- Add cashier_id column
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS cashier_id INTEGER;

-- Add discount_applied column
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS discount_applied DECIMAL(10,2) DEFAULT 0.00;

-- Add partial_payment column
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS partial_payment BOOLEAN DEFAULT FALSE;

-- Add partial_amount column
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS partial_amount DECIMAL(10,2);

-- Add remaining_amount column
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS remaining_amount DECIMAL(10,2);

-- Add partial_notes column
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS partial_notes TEXT;

-- Add notes column
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add business_id column (multi-tenant support)
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS business_id INTEGER;

-- Add branch_id column (if not already added by branch organization)
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS branch_id INTEGER;

-- Add foreign key constraints (if the referenced tables exist)
DO $$
BEGIN
  -- Add foreign key for cashier_id to users table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    ALTER TABLE sales 
    ADD CONSTRAINT IF NOT EXISTS fk_sales_cashier_id 
    FOREIGN KEY (cashier_id) REFERENCES users(user_id);
  END IF;

  -- Add foreign key for business_id to business_info table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_info') THEN
    ALTER TABLE sales 
    ADD CONSTRAINT IF NOT EXISTS fk_sales_business_id 
    FOREIGN KEY (business_id) REFERENCES business_info(business_id);
  END IF;

  -- Add foreign key for branch_id to branches table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'branches') THEN
    ALTER TABLE sales 
    ADD CONSTRAINT IF NOT EXISTS fk_sales_branch_id 
    FOREIGN KEY (branch_id) REFERENCES branches(branch_id);
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sales_cashier_id ON sales(cashier_id);
CREATE INDEX IF NOT EXISTS idx_sales_business_id ON sales(business_id);
CREATE INDEX IF NOT EXISTS idx_sales_branch_id ON sales(branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_datetime ON sales(datetime);
CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON sales(payment_method);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sales_business_datetime ON sales(business_id, datetime);
CREATE INDEX IF NOT EXISTS idx_sales_business_branch ON sales(business_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_cashier_datetime ON sales(cashier_id, datetime);
