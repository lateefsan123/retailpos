-- =====================================================
-- MULTI-TENANT POS SYSTEM MIGRATION SCRIPT
-- =====================================================
-- This script migrates from single-tenant to multi-tenant architecture
-- Run this in your Supabase SQL editor step by step
-- =====================================================

-- STEP 1: Create business_info table (if not exists)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.business_info (
  business_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL UNIQUE,
  logo_url text,
  address text NOT NULL,
  phone_number text,
  vat_number text,
  receipt_footer text DEFAULT 'Thank you for shopping with us!'::text,
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT business_info_pkey PRIMARY KEY (business_id)
);

-- Insert default business for existing data
INSERT INTO public.business_info (name, address)
SELECT 'Main Store', 'Default Address'
WHERE NOT EXISTS (SELECT 1 FROM public.business_info);

-- =====================================================
-- STEP 2: Create new tables that don't exist yet
-- =====================================================

-- Create users table (if not exists)
CREATE TABLE IF NOT EXISTS public.users (
  user_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'cashier',
  active boolean DEFAULT true,
  icon text DEFAULT 'lily'::text,
  business_id integer,
  auth_user_id uuid UNIQUE,
  CONSTRAINT users_pkey PRIMARY KEY (user_id),
  CONSTRAINT users_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_info(business_id)
);

-- Create vault table (if not exists)
CREATE TABLE IF NOT EXISTS public.vault (
  vault_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  owner_id integer,
  pin_hash text NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  business_id integer,
  CONSTRAINT vault_pkey PRIMARY KEY (vault_id),
  CONSTRAINT vault_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(user_id),
  CONSTRAINT vault_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_info(business_id)
);

-- Create vault_entries table (if not exists)
CREATE TABLE IF NOT EXISTS public.vault_entries (
  entry_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  vault_id integer,
  label text NOT NULL,
  email text NOT NULL,
  password_enc text NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  link text,
  CONSTRAINT vault_entries_pkey PRIMARY KEY (entry_id),
  CONSTRAINT vault_entries_vault_id_fkey FOREIGN KEY (vault_id) REFERENCES public.vault(vault_id)
);

-- Create inventory_movements table (if not exists)
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  movement_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  product_id text,
  quantity_change integer NOT NULL,
  movement_type text NOT NULL,
  datetime timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  reference_id integer,
  business_id integer,
  CONSTRAINT inventory_movements_pkey PRIMARY KEY (movement_id),
  CONSTRAINT inventory_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id),
  CONSTRAINT inventory_movements_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_info(business_id)
);

-- =====================================================
-- STEP 3: Handle product_id data type conversion
-- =====================================================

-- IMPORTANT: Your TypeScript code expects product_id as TEXT/string
-- but your current schema uses SERIAL (integer). We need to convert this.

-- First, let's check if we need to convert product_id from integer to text
-- This is a critical step for compatibility with your existing code

-- Add a temporary column for the conversion
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS product_id_new text;

-- Generate UUIDs for existing products if product_id_new is empty
UPDATE public.products 
SET product_id_new = 'prod_' || product_id::text
WHERE product_id_new IS NULL;

-- Update sale_items to use the new product_id format
ALTER TABLE public.sale_items 
ADD COLUMN IF NOT EXISTS product_id_new text;

UPDATE public.sale_items 
SET product_id_new = 'prod_' || product_id::text
WHERE product_id_new IS NULL AND product_id IS NOT NULL;

-- =====================================================
-- STEP 4: Add missing columns to existing tables
-- =====================================================

-- Add business_id to existing tables
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS business_id integer;

ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS business_id integer;

ALTER TABLE public.reminders 
ADD COLUMN IF NOT EXISTS business_id integer;

ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS business_id integer;

-- Add missing columns to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS tax_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_weighted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS price_per_unit numeric,
ADD COLUMN IF NOT EXISTS weight_unit text;

-- Add missing columns to sales table
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS cashier_id integer,
ADD COLUMN IF NOT EXISTS discount_applied numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS partial_payment boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS partial_amount numeric,
ADD COLUMN IF NOT EXISTS remaining_amount numeric,
ADD COLUMN IF NOT EXISTS partial_notes text,
ADD COLUMN IF NOT EXISTS notes text;

-- Add missing columns to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS credit_balance numeric DEFAULT 0;

-- Add missing columns to sale_items table
ALTER TABLE public.sale_items 
ADD COLUMN IF NOT EXISTS weight numeric;

-- =====================================================
-- STEP 4: Update existing data to use default business
-- =====================================================

-- Get the default business_id
DO $$
DECLARE
    default_business_id integer;
BEGIN
    -- Get the first business_id (our default business)
    SELECT business_id INTO default_business_id FROM public.business_info LIMIT 1;
    
    -- Update existing data to use the default business
    UPDATE public.products SET business_id = default_business_id WHERE business_id IS NULL;
    UPDATE public.customers SET business_id = default_business_id WHERE business_id IS NULL;
    UPDATE public.reminders SET business_id = default_business_id WHERE business_id IS NULL;
    UPDATE public.sales SET business_id = default_business_id WHERE business_id IS NULL;
END $$;

-- =====================================================
-- STEP 5: Add foreign key constraints
-- =====================================================

-- Add foreign key constraints to existing tables
ALTER TABLE public.products 
ADD CONSTRAINT IF NOT EXISTS products_business_id_fkey 
FOREIGN KEY (business_id) REFERENCES public.business_info(business_id);

ALTER TABLE public.customers 
ADD CONSTRAINT IF NOT EXISTS customers_business_id_fkey 
FOREIGN KEY (business_id) REFERENCES public.business_info(business_id);

ALTER TABLE public.reminders 
ADD CONSTRAINT IF NOT EXISTS reminders_business_id_fkey 
FOREIGN KEY (business_id) REFERENCES public.business_info(business_id);

ALTER TABLE public.sales 
ADD CONSTRAINT IF NOT EXISTS sales_business_id_fkey 
FOREIGN KEY (business_id) REFERENCES public.business_info(business_id);

-- Add cashier foreign key constraint
ALTER TABLE public.sales 
ADD CONSTRAINT IF NOT EXISTS sales_cashier_id_fkey 
FOREIGN KEY (cashier_id) REFERENCES public.users(user_id);

-- Add customer foreign key constraint
ALTER TABLE public.sales 
ADD CONSTRAINT IF NOT EXISTS sales_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id);

-- =====================================================
-- STEP 6: Fix customer phone constraint for multi-tenancy
-- =====================================================

-- Remove the global unique constraint on phone_number
ALTER TABLE public.customers 
DROP CONSTRAINT IF EXISTS customers_phone_number_key;

-- Add composite unique constraint (phone + business)
ALTER TABLE public.customers 
ADD CONSTRAINT customers_phone_business_unique 
UNIQUE (phone_number, business_id);

-- =====================================================
-- STEP 7: Create performance indexes
-- =====================================================

-- Business-related indexes
CREATE INDEX IF NOT EXISTS idx_products_business_id ON public.products(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_business_id ON public.customers(business_id);
CREATE INDEX IF NOT EXISTS idx_reminders_business_id ON public.reminders(business_id);
CREATE INDEX IF NOT EXISTS idx_sales_business_id ON public.sales(business_id);
CREATE INDEX IF NOT EXISTS idx_users_business_id ON public.users(business_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);

-- Existing indexes (keep these)
CREATE INDEX IF NOT EXISTS idx_reminders_owner_id ON public.reminders(owner_id);
CREATE INDEX IF NOT EXISTS idx_reminders_remind_date ON public.reminders(remind_date);
CREATE INDEX IF NOT EXISTS idx_reminders_resolved ON public.reminders(resolved);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_sales_datetime ON public.sales(datetime);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON public.sale_items(product_id);

-- =====================================================
-- STEP 8: Enable Row Level Security (RLS)
-- =====================================================

-- Enable RLS for all business-scoped tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for business isolation
-- Note: These policies will need to be updated based on your auth system
-- For now, we'll create permissive policies for development

-- Products policies
CREATE POLICY "Users can access their business products" ON public.products
  FOR ALL USING (business_id = (SELECT business_id FROM public.users WHERE user_id = auth.uid()::integer));

-- Customers policies  
CREATE POLICY "Users can access their business customers" ON public.customers
  FOR ALL USING (business_id = (SELECT business_id FROM public.users WHERE user_id = auth.uid()::integer));

-- Sales policies
CREATE POLICY "Users can access their business sales" ON public.sales
  FOR ALL USING (business_id = (SELECT business_id FROM public.users WHERE user_id = auth.uid()::integer));

-- Users policies
CREATE POLICY "Users can access their business users" ON public.users
  FOR ALL USING (business_id = (SELECT business_id FROM public.users WHERE user_id = auth.uid()::integer));

-- =====================================================
-- STEP 9: Create helper functions
-- =====================================================

-- Function to get user's business_id
CREATE OR REPLACE FUNCTION get_user_business_id(user_id_param integer)
RETURNS integer AS $$
BEGIN
  RETURN (SELECT business_id FROM public.users WHERE user_id = user_id_param);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment product sales counters (updated for new schema)
CREATE OR REPLACE FUNCTION increment_product_sales(
  product_id_param text,
  revenue_amount numeric,
  business_id_param integer
)
RETURNS void AS $$
BEGIN
  UPDATE public.products 
  SET 
    sales_count = sales_count + 1,
    total_revenue = total_revenue + revenue_amount,
    last_sold_date = NOW()
  WHERE product_id = product_id_param 
    AND business_id = business_id_param;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 10: Complete product_id conversion
-- =====================================================

-- Now we need to complete the product_id conversion from integer to text
-- This is the final step to make your database compatible with your TypeScript code

-- Drop the old integer product_id column and rename the new one
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_pkey;
ALTER TABLE public.products DROP COLUMN IF EXISTS product_id;
ALTER TABLE public.products RENAME COLUMN product_id_new TO product_id;
ALTER TABLE public.products ADD CONSTRAINT products_pkey PRIMARY KEY (product_id);

-- Update sale_items table
ALTER TABLE public.sale_items DROP CONSTRAINT IF EXISTS sale_items_product_id_fkey;
ALTER TABLE public.sale_items DROP COLUMN IF EXISTS product_id;
ALTER TABLE public.sale_items RENAME COLUMN product_id_new TO product_id;
ALTER TABLE public.sale_items ADD CONSTRAINT sale_items_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE CASCADE;

-- Update inventory_movements foreign key
ALTER TABLE public.inventory_movements DROP CONSTRAINT IF EXISTS inventory_movements_product_id_fkey;
ALTER TABLE public.inventory_movements ADD CONSTRAINT inventory_movements_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES public.products(product_id);

-- =====================================================
-- STEP 11: Verification queries
-- =====================================================

-- Verify all tables exist and have business_id columns
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name IN (
  'business_info', 'products', 'customers', 'sales', 
  'reminders', 'users', 'vault', 'vault_entries', 
  'inventory_movements'
)
AND column_name IN ('business_id', 'product_id', 'customer_id', 'sale_id')
ORDER BY table_name, ordinal_position;

-- Verify foreign key constraints
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('products', 'customers', 'sales', 'reminders', 'users')
ORDER BY tc.table_name, kcu.column_name;

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
-- Your POS system is now multi-tenant ready!
-- 
-- Next steps:
-- 1. Update your application code to handle business_id
-- 2. Test the migration with your existing data
-- 3. Consider adding more businesses via the business_info table
-- 4. Update your authentication system to work with the new user structure
-- =====================================================
