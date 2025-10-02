-- Add amount field to supplier visits table
ALTER TABLE public.supplier_visits
ADD COLUMN IF NOT EXISTS amount decimal(10,2);

-- Add a comment
COMMENT ON COLUMN public.supplier_visits.amount IS 'Amount associated with the supplier visit/delivery';

-- Create index for faster queries on amount
CREATE INDEX IF NOT EXISTS idx_supplier_visits_amount ON public.supplier_visits(amount);
