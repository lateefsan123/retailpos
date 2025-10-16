-- =====================================================
-- ADD PRODUCT ASSIGNMENT TO TASKS MIGRATION
-- =====================================================
-- Adds ability to assign products to tasks for better
-- inventory management and product-specific task tracking
-- =====================================================

-- Add product_id column to reminders table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reminders' AND column_name = 'product_id') THEN
        ALTER TABLE public.reminders ADD COLUMN product_id TEXT;
    END IF;
END $$;

-- Add foreign key constraint to products table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'reminders_product_id_fkey'
    ) THEN
        ALTER TABLE public.reminders 
        ADD CONSTRAINT reminders_product_id_fkey 
        FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_reminders_product_id ON reminders(product_id);

-- Add comment to document the new field
COMMENT ON COLUMN reminders.product_id IS 'Optional product assignment for task-related reminders';
