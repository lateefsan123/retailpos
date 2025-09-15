-- Fix User Isolation Issues
-- Run this in your Supabase SQL editor to properly isolate user data

-- First, let's drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own products" ON public.products;
DROP POLICY IF EXISTS "Users can insert own products" ON public.products;
DROP POLICY IF EXISTS "Users can update own products" ON public.products;

DROP POLICY IF EXISTS "Users can view own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can insert own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can update own customers" ON public.customers;

DROP POLICY IF EXISTS "Users can view own business info" ON public.business_info;
DROP POLICY IF EXISTS "Users can insert own business info" ON public.business_info;
DROP POLICY IF EXISTS "Users can update own business info" ON public.business_info;

DROP POLICY IF EXISTS "Users can view own inventory movements" ON public.inventory_movements;
DROP POLICY IF EXISTS "Users can insert own inventory movements" ON public.inventory_movements;

-- Now create proper user-isolated policies

-- Products table policies (user-specific)
CREATE POLICY "Users can view own products" ON public.products
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own products" ON public.products
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own products" ON public.products
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own products" ON public.products
  FOR DELETE USING (auth.uid() = owner_id);

-- Customers table policies (user-specific)
CREATE POLICY "Users can view own customers" ON public.customers
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own customers" ON public.customers
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own customers" ON public.customers
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own customers" ON public.customers
  FOR DELETE USING (auth.uid() = owner_id);

-- Business info table policies (user-specific)
CREATE POLICY "Users can view own business info" ON public.business_info
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own business info" ON public.business_info
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own business info" ON public.business_info
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own business info" ON public.business_info
  FOR DELETE USING (auth.uid() = owner_id);

-- Inventory movements table policies (user-specific)
CREATE POLICY "Users can view own inventory movements" ON public.inventory_movements
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own inventory movements" ON public.inventory_movements
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own inventory movements" ON public.inventory_movements
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own inventory movements" ON public.inventory_movements
  FOR DELETE USING (auth.uid() = owner_id);

-- Add owner_id column to tables that don't have it (if they don't exist)
-- Products table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'owner_id') THEN
        ALTER TABLE public.products ADD COLUMN owner_id uuid REFERENCES auth.users(id);
    END IF;
END $$;

-- Customers table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'customers' AND column_name = 'owner_id') THEN
        ALTER TABLE public.customers ADD COLUMN owner_id uuid REFERENCES auth.users(id);
    END IF;
END $$;

-- Business info table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'business_info' AND column_name = 'owner_id') THEN
        ALTER TABLE public.business_info ADD COLUMN owner_id uuid REFERENCES auth.users(id);
    END IF;
END $$;

-- Inventory movements table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'inventory_movements' AND column_name = 'owner_id') THEN
        ALTER TABLE public.inventory_movements ADD COLUMN owner_id uuid REFERENCES auth.users(id);
    END IF;
END $$;

-- Update existing records to have owner_id (set to first user for existing data)
-- This is a one-time migration - you may want to customize this based on your needs
UPDATE public.products SET owner_id = (SELECT id FROM auth.users LIMIT 1) WHERE owner_id IS NULL;
UPDATE public.customers SET owner_id = (SELECT id FROM auth.users LIMIT 1) WHERE owner_id IS NULL;
UPDATE public.business_info SET owner_id = (SELECT id FROM auth.users LIMIT 1) WHERE owner_id IS NULL;
UPDATE public.inventory_movements SET owner_id = (SELECT id FROM auth.users LIMIT 1) WHERE owner_id IS NULL;

-- Make owner_id NOT NULL after setting values
ALTER TABLE public.products ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.customers ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.business_info ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.inventory_movements ALTER COLUMN owner_id SET NOT NULL;
