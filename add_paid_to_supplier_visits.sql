-- Add paid status to supplier visits table
ALTER TABLE public.supplier_visits
ADD COLUMN IF NOT EXISTS paid boolean DEFAULT false;

-- Add a comment
COMMENT ON COLUMN public.supplier_visits.paid IS 'Whether the supplier visit/delivery has been paid for';

-- Create index for faster queries on paid status
CREATE INDEX IF NOT EXISTS idx_supplier_visits_paid ON public.supplier_visits(paid);
