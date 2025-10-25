-- Add a JSONB column to store optional product variations (e.g., box, half box)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS variations jsonb;

-- Ensure existing rows have a consistent default value
UPDATE public.products
SET variations = '[]'::jsonb
WHERE variations IS NULL;

