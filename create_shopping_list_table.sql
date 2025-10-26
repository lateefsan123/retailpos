-- Create customer_shopping_lists table
CREATE TABLE IF NOT EXISTS public.customer_shopping_lists (
  list_item_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  text TEXT NOT NULL,
  product_id TEXT,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  business_id INTEGER NOT NULL,
  CONSTRAINT customer_shopping_lists_customer_id_fkey 
    FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON DELETE CASCADE,
  CONSTRAINT customer_shopping_lists_product_id_fkey 
    FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE SET NULL,
  CONSTRAINT customer_shopping_lists_business_id_fkey 
    FOREIGN KEY (business_id) REFERENCES public.business_info(business_id) ON DELETE CASCADE
);

-- Add quantity and weight columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'customer_shopping_lists' 
                 AND column_name = 'quantity') THEN
    ALTER TABLE public.customer_shopping_lists ADD COLUMN quantity INTEGER DEFAULT 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'customer_shopping_lists' 
                 AND column_name = 'weight') THEN
    ALTER TABLE public.customer_shopping_lists ADD COLUMN weight NUMERIC(10, 2);
  END IF;
END $$;

-- Create indexes for better query performance (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_customer_shopping_lists_customer_id ON public.customer_shopping_lists(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_shopping_lists_product_id ON public.customer_shopping_lists(product_id);
CREATE INDEX IF NOT EXISTS idx_customer_shopping_lists_business_id ON public.customer_shopping_lists(business_id);
CREATE INDEX IF NOT EXISTS idx_customer_shopping_lists_completed ON public.customer_shopping_lists(completed);
CREATE INDEX IF NOT EXISTS idx_customer_shopping_lists_created_at ON public.customer_shopping_lists(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.customer_shopping_lists ENABLE ROW LEVEL SECURITY;

-- Create policy for customers to manage their own shopping lists (drop first if exists)
DROP POLICY IF EXISTS "Customers can manage their own shopping lists" ON public.customer_shopping_lists;
CREATE POLICY "Customers can manage their own shopping lists"
ON public.customer_shopping_lists
FOR ALL
USING (true);
