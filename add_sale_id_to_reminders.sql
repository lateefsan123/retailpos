-- Add sale_id column to reminders table to link reminders to specific sales
-- This allows automatic resolution of reminders when partial payments are completed

-- Add the sale_id column
ALTER TABLE public.reminders 
ADD COLUMN sale_id integer;

-- Add foreign key constraint to link to sales table
ALTER TABLE public.reminders 
ADD CONSTRAINT reminders_sale_id_fkey 
FOREIGN KEY (sale_id) REFERENCES public.sales(sale_id);

-- Add index for better performance when querying by sale_id
CREATE INDEX IF NOT EXISTS idx_reminders_sale_id ON public.reminders(sale_id);

-- Add comment to document the column
COMMENT ON COLUMN public.reminders.sale_id IS 'Links reminder to specific sale for automatic resolution when payment is completed';
