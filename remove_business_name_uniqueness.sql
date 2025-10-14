-- Remove business name uniqueness constraint
-- This allows multiple businesses to have the same name (common in real-world scenarios)

-- Drop the unique constraint on business_info.name
ALTER TABLE public.business_info DROP CONSTRAINT IF EXISTS business_info_name_key;

-- Optional: Add a comment to document the change
COMMENT ON TABLE public.business_info IS 'Business information table - business names are no longer required to be unique to support franchises and multiple locations with the same name';
