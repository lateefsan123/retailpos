-- Add missing columns to products table
-- Run this SQL in your Supabase SQL Editor

-- Add description column
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add sku column  
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS sku TEXT;

-- Add sales tracking columns
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS sales_count INTEGER DEFAULT 0;

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS total_revenue DECIMAL(10,2) DEFAULT 0.00;

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS last_sold_date TIMESTAMP WITH TIME ZONE;

-- Set default reorder_level to 10 for products table
ALTER TABLE products 
ALTER COLUMN reorder_level SET DEFAULT 10;

-- Update existing products that have NULL or 0 reorder_level to 10
UPDATE products 
SET reorder_level = 10 
WHERE reorder_level IS NULL OR reorder_level = 0;

-- Initialize sales_count and total_revenue for existing products based on sale_items
UPDATE products 
SET sales_count = (
  SELECT COUNT(*) 
  FROM sale_items 
  WHERE sale_items.product_id = products.product_id
),
total_revenue = (
  SELECT COALESCE(SUM(
    CASE 
      WHEN sale_items.calculated_price IS NOT NULL THEN sale_items.calculated_price
      ELSE sale_items.price_each * sale_items.quantity
    END
  ), 0)
  FROM sale_items 
  WHERE sale_items.product_id = products.product_id
),
last_sold_date = (
  SELECT MAX(sales.datetime)
  FROM sale_items 
  JOIN sales ON sale_items.sale_id = sales.sale_id
  WHERE sale_items.product_id = products.product_id
)
WHERE EXISTS (
  SELECT 1 FROM sale_items WHERE sale_items.product_id = products.product_id
);

-- Create function to increment product sales counters
CREATE OR REPLACE FUNCTION increment_product_sales(
  product_id_param TEXT,
  revenue_amount DECIMAL(10,2)
)
RETURNS VOID AS $$
BEGIN
  UPDATE products 
  SET 
    sales_count = sales_count + 1,
    total_revenue = total_revenue + revenue_amount,
    last_sold_date = NOW()
  WHERE product_id = product_id_param;
END;
$$ LANGUAGE plpgsql;

-- Verify the columns were added and default is set
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name IN ('description', 'sku', 'reorder_level', 'sales_count', 'total_revenue', 'last_sold_date')
ORDER BY column_name;
