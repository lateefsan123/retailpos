-- Add customer portal enabled setting to business_info table
-- This allows stores to enable/disable the customer portal feature

ALTER TABLE public.business_info 
ADD COLUMN customer_portal_enabled boolean DEFAULT false;

-- Add comment to explain the column
COMMENT ON COLUMN public.business_info.customer_portal_enabled IS 'Controls whether this business has access to the customer portal feature';

-- Update existing businesses to have customer portal disabled by default
-- (This is already handled by the DEFAULT false above, but being explicit)
UPDATE public.business_info 
SET customer_portal_enabled = false 
WHERE customer_portal_enabled IS NULL;
