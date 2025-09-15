-- Custom RLS policies for custom authentication system
-- Run this in your Supabase SQL Editor

-- First, drop existing policies that depend on auth.uid()
DROP POLICY IF EXISTS "Users can view own business users" ON public.users;
DROP POLICY IF EXISTS "Users can insert own business users" ON public.users;
DROP POLICY IF EXISTS "Users can update own business users" ON public.users;

DROP POLICY IF EXISTS "Users can view own sales" ON public.sales;
DROP POLICY IF EXISTS "Users can insert own sales" ON public.sales;
DROP POLICY IF EXISTS "Users can update own sales" ON public.sales;

DROP POLICY IF EXISTS "Users can view own reminders" ON public.reminders;
DROP POLICY IF EXISTS "Users can insert own reminders" ON public.reminders;
DROP POLICY IF EXISTS "Users can update own reminders" ON public.reminders;
DROP POLICY IF EXISTS "Users can delete own reminders" ON public.reminders;

DROP POLICY IF EXISTS "Users can view own vault" ON public.vault;
DROP POLICY IF EXISTS "Users can insert own vault" ON public.vault;
DROP POLICY IF EXISTS "Users can update own vault" ON public.vault;

DROP POLICY IF EXISTS "Users can view own vault entries" ON public.vault_entries;
DROP POLICY IF EXISTS "Users can insert own vault entries" ON public.vault_entries;
DROP POLICY IF EXISTS "Users can update own vault entries" ON public.vault_entries;
DROP POLICY IF EXISTS "Users can delete own vault entries" ON public.vault_entries;

DROP POLICY IF EXISTS "Users can view own side businesses" ON public.side_businesses;
DROP POLICY IF EXISTS "Users can insert own side businesses" ON public.side_businesses;
DROP POLICY IF EXISTS "Users can update own side businesses" ON public.side_businesses;
DROP POLICY IF EXISTS "Users can delete own side businesses" ON public.side_businesses;

DROP POLICY IF EXISTS "Users can view own side business items" ON public.side_business_items;
DROP POLICY IF EXISTS "Users can insert own side business items" ON public.side_business_items;
DROP POLICY IF EXISTS "Users can update own side business items" ON public.side_business_items;
DROP POLICY IF EXISTS "Users can delete own side business items" ON public.side_business_items;

DROP POLICY IF EXISTS "Users can view own side business sales" ON public.side_business_sales;
DROP POLICY IF EXISTS "Users can insert own side business sales" ON public.side_business_sales;
DROP POLICY IF EXISTS "Users can update own side business sales" ON public.side_business_sales;
DROP POLICY IF EXISTS "Users can delete own side business sales" ON public.side_business_sales;

DROP POLICY IF EXISTS "Users can view own sale items" ON public.sale_items;
DROP POLICY IF EXISTS "Users can insert own sale items" ON public.sale_items;
DROP POLICY IF EXISTS "Users can update own sale items" ON public.sale_items;
DROP POLICY IF EXISTS "Users can delete own sale items" ON public.sale_items;

-- Create new policies that allow anonymous access (for custom auth system)
-- Users table - allow all operations for authenticated users
CREATE POLICY "Allow all operations on users" ON public.users
  FOR ALL USING (true) WITH CHECK (true);

-- Sales table - allow all operations
CREATE POLICY "Allow all operations on sales" ON public.sales
  FOR ALL USING (true) WITH CHECK (true);

-- Products table - allow all operations
CREATE POLICY "Allow all operations on products" ON public.products
  FOR ALL USING (true) WITH CHECK (true);

-- Customers table - allow all operations
CREATE POLICY "Allow all operations on customers" ON public.customers
  FOR ALL USING (true) WITH CHECK (true);

-- Reminders table - allow all operations
CREATE POLICY "Allow all operations on reminders" ON public.reminders
  FOR ALL USING (true) WITH CHECK (true);

-- Business info table - allow all operations
CREATE POLICY "Allow all operations on business_info" ON public.business_info
  FOR ALL USING (true) WITH CHECK (true);

-- Vault table - allow all operations
CREATE POLICY "Allow all operations on vault" ON public.vault
  FOR ALL USING (true) WITH CHECK (true);

-- Vault entries table - allow all operations
CREATE POLICY "Allow all operations on vault_entries" ON public.vault_entries
  FOR ALL USING (true) WITH CHECK (true);

-- Side businesses table - allow all operations
CREATE POLICY "Allow all operations on side_businesses" ON public.side_businesses
  FOR ALL USING (true) WITH CHECK (true);

-- Side business items table - allow all operations
CREATE POLICY "Allow all operations on side_business_items" ON public.side_business_items
  FOR ALL USING (true) WITH CHECK (true);

-- Side business sales table - allow all operations
CREATE POLICY "Allow all operations on side_business_sales" ON public.side_business_sales
  FOR ALL USING (true) WITH CHECK (true);

-- Inventory movements table - allow all operations
CREATE POLICY "Allow all operations on inventory_movements" ON public.inventory_movements
  FOR ALL USING (true) WITH CHECK (true);

-- Sale items table - allow all operations
CREATE POLICY "Allow all operations on sale_items" ON public.sale_items
  FOR ALL USING (true) WITH CHECK (true);

-- Note: These policies allow full access to all data for any request.
-- In a production environment, you should implement more restrictive policies
-- based on your custom authentication system's user context.
