-- Disable RLS for custom authentication system
-- Run this in your Supabase SQL Editor

-- Disable RLS on all tables to allow anonymous access
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_info DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.side_businesses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.side_business_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.side_business_sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items DISABLE ROW LEVEL SECURITY;

-- Note: This allows full access to all data. 
-- For production, you should implement proper RLS policies for your custom auth system.
