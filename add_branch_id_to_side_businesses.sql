-- Add missing branch_id column to side_businesses table
-- Run this in your Supabase SQL editor to fix the side business loading error

-- Add branch_id column to side_businesses table
ALTER TABLE public.side_businesses 
ADD COLUMN IF NOT EXISTS branch_id integer;

-- Add foreign key constraint for branch_id
ALTER TABLE public.side_businesses 
ADD CONSTRAINT fk_side_businesses_branch_id 
FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_side_businesses_branch_id ON public.side_businesses(branch_id);

-- Add comment to document the column
COMMENT ON COLUMN public.side_businesses.branch_id IS 'Branch ID for multi-branch support';
