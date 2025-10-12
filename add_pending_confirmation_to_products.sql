-- Add pending_confirmation column to products table
-- This column tracks products added from Product Database that need confirmation

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS pending_confirmation BOOLEAN DEFAULT false;

-- Add index for faster queries on pending products
CREATE INDEX IF NOT EXISTS idx_products_pending_confirmation 
ON products(business_id, pending_confirmation) 
WHERE pending_confirmation = true;

-- Add comment to document the column
COMMENT ON COLUMN products.pending_confirmation IS 'True if product was added from Product Database and needs confirmation with price/stock details';

-- Update existing products to have pending_confirmation = false
UPDATE products 
SET pending_confirmation = false 
WHERE pending_confirmation IS NULL;

