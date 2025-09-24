-- Create branches table for the POS system
-- Run this in your Supabase SQL editor

-- First, drop the table if it exists to start fresh
DROP TABLE IF EXISTS public.branches CASCADE;

CREATE TABLE public.branches (
  branch_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  branch_name text NOT NULL,
  address text NOT NULL,
  phone text,
  manager_id integer,
  shop_image text NOT NULL DEFAULT 'shop1',
  business_id integer NOT NULL,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT branches_pkey PRIMARY KEY (branch_id),
  CONSTRAINT branches_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_info(business_id) ON DELETE CASCADE
);

-- Add the manager foreign key constraint separately (optional, can be null)
-- Only add this if you want to enforce manager relationships
-- ALTER TABLE public.branches 
-- ADD CONSTRAINT branches_manager_id_fkey 
-- FOREIGN KEY (manager_id) REFERENCES public.shop_staff(user_id) ON DELETE SET NULL;

-- Add comments to document the columns
COMMENT ON TABLE public.branches IS 'Stores branch/location information for businesses';
COMMENT ON COLUMN public.branches.branch_name IS 'Name of the branch/location';
COMMENT ON COLUMN public.branches.address IS 'Full address of the branch';
COMMENT ON COLUMN public.branches.phone IS 'Phone number of the branch (optional)';
COMMENT ON COLUMN public.branches.manager_id IS 'ID of the manager assigned to this branch (optional)';
COMMENT ON COLUMN public.branches.shop_image IS 'Shop image identifier (shop1, shop2, shop3, shop4)';
COMMENT ON COLUMN public.branches.business_id IS 'ID of the business this branch belongs to';
COMMENT ON COLUMN public.branches.active IS 'Whether the branch is active or not';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_branches_business_id ON public.branches(business_id);
CREATE INDEX IF NOT EXISTS idx_branches_manager_id ON public.branches(manager_id);
CREATE INDEX IF NOT EXISTS idx_branches_active ON public.branches(active);

-- Enable Row Level Security (RLS) for branches table
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- Create policies for branches (allow all operations for now)
CREATE POLICY "Allow all operations on branches" ON public.branches
  FOR ALL USING (true) WITH CHECK (true);

-- Verify the table was created
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'branches' 
ORDER BY ordinal_position;
