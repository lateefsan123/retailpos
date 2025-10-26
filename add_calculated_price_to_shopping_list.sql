-- Add calculated_price column to customer_shopping_lists table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'customer_shopping_lists' 
                 AND column_name = 'calculated_price') THEN
    ALTER TABLE public.customer_shopping_lists ADD COLUMN calculated_price NUMERIC(10, 2);
  END IF;
END $$;
