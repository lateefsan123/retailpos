-- Add image_url column to existing suppliers table
ALTER TABLE public.suppliers
ADD COLUMN IF NOT EXISTS image_url text;

-- Optional: Add a comment to document the column
COMMENT ON COLUMN public.suppliers.image_url IS 'Optional URL/path to supplier logo or image';

