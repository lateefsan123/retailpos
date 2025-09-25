-- Fix side_business_items table column names
-- This ensures the column names match what the application expects

-- Check if stock_qty column exists and rename it to stock_quantity
DO $$
BEGIN
  -- Check if stock_qty column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'side_business_items' 
    AND column_name = 'stock_qty'
  ) THEN
    -- Rename stock_qty to stock_quantity
    ALTER TABLE side_business_items 
    RENAME COLUMN stock_qty TO stock_quantity;
    
    RAISE NOTICE 'Renamed stock_qty to stock_quantity in side_business_items table';
  END IF;
  
  -- Check if stock_quantity column exists, if not create it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'side_business_items' 
    AND column_name = 'stock_quantity'
  ) THEN
    -- Add stock_quantity column
    ALTER TABLE side_business_items 
    ADD COLUMN stock_quantity INTEGER DEFAULT 0;
    
    RAISE NOTICE 'Added stock_quantity column to side_business_items table';
  END IF;
END $$;

-- Verify the column exists and has the right properties
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'side_business_items' 
  AND column_name = 'stock_quantity';
