-- Add time fields to supplier_visits table
ALTER TABLE public.supplier_visits
ADD COLUMN IF NOT EXISTS start_time time,
ADD COLUMN IF NOT EXISTS end_time time;

-- Add a comment
COMMENT ON COLUMN public.supplier_visits.start_time IS 'Start time of the supplier visit';
COMMENT ON COLUMN public.supplier_visits.end_time IS 'End time of the supplier visit';

