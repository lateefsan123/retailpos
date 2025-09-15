-- Supabase Auth Setup for POS System
-- Run this in your Supabase SQL editor

-- Create storage bucket for business assets (logos, etc.)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('business-assets', 'business-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for business assets
CREATE POLICY "Users can upload their own business assets" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'business-assets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own business assets" ON storage.objects
FOR SELECT USING (
  bucket_id = 'business-assets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own business assets" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'business-assets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own business assets" ON storage.objects
FOR DELETE USING (
  bucket_id = 'business-assets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (new.id, 'owner')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to manually create profile and user (for debugging)
CREATE OR REPLACE FUNCTION public.create_user_profile(user_id uuid)
RETURNS void AS $$
BEGIN
  -- Create profile if it doesn't exist
  INSERT INTO public.profiles (id, role)
  VALUES (user_id, 'owner')
  ON CONFLICT (id) DO NOTHING;
  
  -- Create user if it doesn't exist
  INSERT INTO public.users (username, role, active, icon, owner_id)
  VALUES ('user', 'owner', true, 'lily', user_id)
  ON CONFLICT (owner_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Row Level Security (RLS) on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Policy to allow users to update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Enable RLS on other tables and create policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.side_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.side_business_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.side_business_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view own business users" ON public.users
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own business users" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own business users" ON public.users
  FOR UPDATE USING (auth.uid() = owner_id);

-- Sales table policies
CREATE POLICY "Users can view own sales" ON public.sales
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.user_id = sales.cashier_id 
      AND users.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own sales" ON public.sales
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.user_id = sales.cashier_id 
      AND users.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own sales" ON public.sales
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.user_id = sales.cashier_id 
      AND users.owner_id = auth.uid()
    )
  );

-- Products table policies
CREATE POLICY "Users can view own products" ON public.products
  FOR SELECT USING (true); -- Products are shared for now, can be made owner-specific later

CREATE POLICY "Users can insert own products" ON public.products
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own products" ON public.products
  FOR UPDATE USING (true);

-- Customers table policies
CREATE POLICY "Users can view own customers" ON public.customers
  FOR SELECT USING (true); -- Customers are shared for now

CREATE POLICY "Users can insert own customers" ON public.customers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own customers" ON public.customers
  FOR UPDATE USING (true);

-- Reminders table policies
CREATE POLICY "Users can view own reminders" ON public.reminders
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own reminders" ON public.reminders
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own reminders" ON public.reminders
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own reminders" ON public.reminders
  FOR DELETE USING (auth.uid() = owner_id);

-- Business info table policies
CREATE POLICY "Users can view own business info" ON public.business_info
  FOR SELECT USING (true); -- Business info is shared for now

CREATE POLICY "Users can insert own business info" ON public.business_info
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own business info" ON public.business_info
  FOR UPDATE USING (true);

-- Vault table policies
CREATE POLICY "Users can view own vault" ON public.vault
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own vault" ON public.vault
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own vault" ON public.vault
  FOR UPDATE USING (auth.uid() = owner_id);

-- Vault entries table policies
CREATE POLICY "Users can view own vault entries" ON public.vault_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.vault 
      WHERE vault.vault_id = vault_entries.vault_id 
      AND vault.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own vault entries" ON public.vault_entries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vault 
      WHERE vault.vault_id = vault_entries.vault_id 
      AND vault.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own vault entries" ON public.vault_entries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.vault 
      WHERE vault.vault_id = vault_entries.vault_id 
      AND vault.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own vault entries" ON public.vault_entries
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.vault 
      WHERE vault.vault_id = vault_entries.vault_id 
      AND vault.owner_id = auth.uid()
    )
  );

-- Side businesses table policies
CREATE POLICY "Users can view own side businesses" ON public.side_businesses
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own side businesses" ON public.side_businesses
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own side businesses" ON public.side_businesses
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own side businesses" ON public.side_businesses
  FOR DELETE USING (auth.uid() = owner_id);

-- Side business items table policies
CREATE POLICY "Users can view own side business items" ON public.side_business_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.side_businesses 
      WHERE side_businesses.business_id = side_business_items.business_id 
      AND side_businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own side business items" ON public.side_business_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.side_businesses 
      WHERE side_businesses.business_id = side_business_items.business_id 
      AND side_businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own side business items" ON public.side_business_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.side_businesses 
      WHERE side_businesses.business_id = side_business_items.business_id 
      AND side_businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own side business items" ON public.side_business_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.side_businesses 
      WHERE side_businesses.business_id = side_business_items.business_id 
      AND side_businesses.owner_id = auth.uid()
    )
  );

-- Side business sales table policies
CREATE POLICY "Users can view own side business sales" ON public.side_business_sales
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.side_businesses 
      WHERE side_businesses.business_id = side_business_sales.business_id 
      AND side_businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own side business sales" ON public.side_business_sales
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.side_businesses 
      WHERE side_businesses.business_id = side_business_sales.business_id 
      AND side_businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own side business sales" ON public.side_business_sales
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.side_businesses 
      WHERE side_businesses.business_id = side_business_sales.business_id 
      AND side_businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own side business sales" ON public.side_business_sales
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.side_businesses 
      WHERE side_businesses.business_id = side_business_sales.business_id 
      AND side_businesses.owner_id = auth.uid()
    )
  );

-- Inventory movements table policies
CREATE POLICY "Users can view own inventory movements" ON public.inventory_movements
  FOR SELECT USING (true); -- Inventory movements are shared for now

CREATE POLICY "Users can insert own inventory movements" ON public.inventory_movements
  FOR INSERT WITH CHECK (true);

-- Sale items table policies
CREATE POLICY "Users can view own sale items" ON public.sale_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sales 
      JOIN public.users ON users.user_id = sales.cashier_id
      WHERE sales.sale_id = sale_items.sale_id 
      AND users.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own sale items" ON public.sale_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sales 
      JOIN public.users ON users.user_id = sales.cashier_id
      WHERE sales.sale_id = sale_items.sale_id 
      AND users.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own sale items" ON public.sale_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.sales 
      JOIN public.users ON users.user_id = sales.cashier_id
      WHERE sales.sale_id = sale_items.sale_id 
      AND users.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own sale items" ON public.sale_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.sales 
      JOIN public.users ON users.user_id = sales.cashier_id
      WHERE sales.sale_id = sale_items.sale_id 
      AND users.owner_id = auth.uid()
    )
  );
