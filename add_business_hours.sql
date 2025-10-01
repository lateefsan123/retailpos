-- Add opening and closing hours to business_info table
ALTER TABLE public.business_info
ADD COLUMN IF NOT EXISTS opening_time time DEFAULT '08:00:00',
ADD COLUMN IF NOT EXISTS closing_time time DEFAULT '20:00:00';

-- Add comments
COMMENT ON COLUMN public.business_info.opening_time IS 'Daily opening time for the business';
COMMENT ON COLUMN public.business_info.closing_time IS 'Daily closing time for the business';

-- Example: Update opening hours for a specific business (optional)
-- UPDATE public.business_info SET opening_time = '09:00:00', closing_time = '18:00:00' WHERE business_id = 1;

