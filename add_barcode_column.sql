-- Add barcode column to products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS barcode text;

-- Add comment to document the column
COMMENT ON COLUMN public.products.barcode IS 'Product barcode for scanning and identification';

-- Create index on barcode for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);

-- Add unique constraint to prevent duplicate barcodes (optional - uncomment if needed)
-- ALTER TABLE public.products ADD CONSTRAINT unique_barcode UNIQUE (barcode);
