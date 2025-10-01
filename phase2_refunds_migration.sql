-- Phase 2: Add inventory restocking columns to refunds table
-- Run this SQL script to add the new columns for inventory management

-- Add quantity_refunded column
ALTER TABLE public.refunds 
ADD COLUMN IF NOT EXISTS quantity_refunded numeric;

-- Add restock column (default true for backward compatibility)
ALTER TABLE public.refunds 
ADD COLUMN IF NOT EXISTS restock boolean DEFAULT true NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.refunds.quantity_refunded IS 'Quantity of the item being refunded';
COMMENT ON COLUMN public.refunds.restock IS 'Whether this refunded item should be restocked back to inventory';

-- Create index for performance on restock queries
CREATE INDEX IF NOT EXISTS idx_refunds_restock ON public.refunds(restock) WHERE restock = true;

-- Create index for performance on quantity queries
CREATE INDEX IF NOT EXISTS idx_refunds_quantity ON public.refunds(quantity_refunded) WHERE quantity_refunded IS NOT NULL;

-- Add check constraint to ensure quantity_refunded is positive when provided
ALTER TABLE public.refunds 
ADD CONSTRAINT IF NOT EXISTS refunds_quantity_positive 
CHECK (quantity_refunded IS NULL OR quantity_refunded > 0);

-- Update existing refunds to have restock = true (since they were created before this feature)
UPDATE public.refunds 
SET restock = true 
WHERE restock IS NULL;
