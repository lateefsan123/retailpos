-- Create the increment_product_sales function that's missing
-- This function updates product sales count and revenue when items are sold

CREATE OR REPLACE FUNCTION increment_product_sales(
  product_id_param INTEGER,
  revenue_amount DECIMAL(10,2),
  business_id_param INTEGER
)
RETURNS VOID AS $$
BEGIN
  -- Update the product's sales count and total revenue
  UPDATE products 
  SET 
    sales_count = COALESCE(sales_count, 0) + 1,
    total_revenue = COALESCE(total_revenue, 0) + revenue_amount,
    last_sold_date = NOW(),
    updated_at = NOW()
  WHERE 
    product_id = product_id_param 
    AND business_id = business_id_param;
    
  -- If no rows were updated, it means the product doesn't exist or business_id doesn't match
  -- This is not necessarily an error, so we don't raise an exception
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_product_sales(INTEGER, DECIMAL(10,2), INTEGER) TO authenticated;

-- Add a comment to document the function
COMMENT ON FUNCTION increment_product_sales(INTEGER, DECIMAL(10,2), INTEGER) IS 'Increments product sales count and revenue when items are sold';
