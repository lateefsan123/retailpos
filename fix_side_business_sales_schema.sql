-- Fix side_business_sales table schema to match application expectations
-- This migration adds missing columns and ensures the schema is correct

-- Add payment_method column if it doesn't exist
ALTER TABLE side_business_sales 
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);

-- Add business_id column if it doesn't exist (for multi-tenant support)
ALTER TABLE side_business_sales 
ADD COLUMN IF NOT EXISTS business_id INTEGER;

-- Add price_each column if it doesn't exist (required field)
ALTER TABLE side_business_sales 
ADD COLUMN IF NOT EXISTS price_each DECIMAL(10,2);

-- Update existing records to have price_each calculated from total_amount / quantity
UPDATE side_business_sales 
SET price_each = CASE 
  WHEN quantity > 0 THEN total_amount / quantity 
  ELSE 0 
END
WHERE price_each IS NULL;

-- Make price_each NOT NULL after updating existing records
ALTER TABLE side_business_sales 
ALTER COLUMN price_each SET NOT NULL;

-- Add foreign key constraints if the referenced tables exist
DO $$
BEGIN
  -- Add foreign key for business_id to side_businesses table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'side_businesses') THEN
    -- Check if constraint already exists before adding
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'fk_side_business_sales_business_id' 
      AND table_name = 'side_business_sales'
    ) THEN
      ALTER TABLE side_business_sales 
      ADD CONSTRAINT fk_side_business_sales_business_id 
      FOREIGN KEY (business_id) REFERENCES side_businesses(business_id);
    END IF;
  END IF;

  -- Add foreign key for branch_id to branches table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'branches') THEN
    -- Check if constraint already exists before adding
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'fk_side_business_sales_branch_id' 
      AND table_name = 'side_business_sales'
    ) THEN
      ALTER TABLE side_business_sales 
      ADD CONSTRAINT fk_side_business_sales_branch_id 
      FOREIGN KEY (branch_id) REFERENCES branches(branch_id);
    END IF;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_side_business_sales_payment_method ON side_business_sales(payment_method);
CREATE INDEX IF NOT EXISTS idx_side_business_sales_business_id ON side_business_sales(business_id);

-- Update the table comment
COMMENT ON TABLE side_business_sales IS 'Sales transactions for side business items with payment method and business tracking';
