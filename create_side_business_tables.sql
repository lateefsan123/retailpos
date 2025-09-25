-- Create side business tables for the POS system
-- Run this in your Supabase SQL editor to create the missing side business tables

-- Create side_businesses table
CREATE TABLE IF NOT EXISTS side_businesses (
  business_id SERIAL PRIMARY KEY,
  owner_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  business_type VARCHAR(100),
  image_url TEXT,
  parent_shop_id INTEGER NOT NULL,
  branch_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create side_business_items table
CREATE TABLE IF NOT EXISTS side_business_items (
  item_id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES side_businesses(business_id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  stock_quantity INTEGER DEFAULT 0,
  reorder_level INTEGER DEFAULT 10,
  image_url TEXT,
  sku TEXT,
  parent_shop_id INTEGER NOT NULL,
  branch_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create side_business_sales table
CREATE TABLE IF NOT EXISTS side_business_sales (
  sale_id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES side_business_items(item_id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  price_each DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  date_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  customer_id INTEGER,
  parent_shop_id INTEGER NOT NULL,
  branch_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraints for branch_id (if branches table exists)
-- These will only be added if the branches table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'branches') THEN
    -- Add foreign key constraints for branch_id
    ALTER TABLE side_businesses 
    ADD CONSTRAINT fk_side_businesses_branch_id 
    FOREIGN KEY (branch_id) REFERENCES branches(branch_id);
    
    ALTER TABLE side_business_items 
    ADD CONSTRAINT fk_side_business_items_branch_id 
    FOREIGN KEY (branch_id) REFERENCES branches(branch_id);
    
    ALTER TABLE side_business_sales 
    ADD CONSTRAINT fk_side_business_sales_branch_id 
    FOREIGN KEY (branch_id) REFERENCES branches(branch_id);
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_side_businesses_parent_shop_id ON side_businesses(parent_shop_id);
CREATE INDEX IF NOT EXISTS idx_side_businesses_branch_id ON side_businesses(branch_id);
CREATE INDEX IF NOT EXISTS idx_side_business_items_business_id ON side_business_items(business_id);
CREATE INDEX IF NOT EXISTS idx_side_business_items_parent_shop_id ON side_business_items(parent_shop_id);
CREATE INDEX IF NOT EXISTS idx_side_business_items_branch_id ON side_business_items(branch_id);
CREATE INDEX IF NOT EXISTS idx_side_business_sales_item_id ON side_business_sales(item_id);
CREATE INDEX IF NOT EXISTS idx_side_business_sales_parent_shop_id ON side_business_sales(parent_shop_id);
CREATE INDEX IF NOT EXISTS idx_side_business_sales_branch_id ON side_business_sales(branch_id);
CREATE INDEX IF NOT EXISTS idx_side_business_sales_date_time ON side_business_sales(date_time);

-- Add comments to document the tables
COMMENT ON TABLE side_businesses IS 'Side businesses that operate within a main shop';
COMMENT ON TABLE side_business_items IS 'Items/products sold by side businesses';
COMMENT ON TABLE side_business_sales IS 'Sales transactions for side business items';

-- Enable Row Level Security (RLS) for multi-tenant support
ALTER TABLE side_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE side_business_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE side_business_sales ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for side_businesses
CREATE POLICY "Users can view side businesses from their shop" ON side_businesses
  FOR SELECT USING (parent_shop_id IN (
    SELECT business_id FROM users WHERE user_id = auth.uid()::integer
  ));

CREATE POLICY "Users can insert side businesses for their shop" ON side_businesses
  FOR INSERT WITH CHECK (parent_shop_id IN (
    SELECT business_id FROM users WHERE user_id = auth.uid()::integer
  ));

CREATE POLICY "Users can update side businesses from their shop" ON side_businesses
  FOR UPDATE USING (parent_shop_id IN (
    SELECT business_id FROM users WHERE user_id = auth.uid()::integer
  ));

CREATE POLICY "Users can delete side businesses from their shop" ON side_businesses
  FOR DELETE USING (parent_shop_id IN (
    SELECT business_id FROM users WHERE user_id = auth.uid()::integer
  ));

-- Create RLS policies for side_business_items
CREATE POLICY "Users can view side business items from their shop" ON side_business_items
  FOR SELECT USING (parent_shop_id IN (
    SELECT business_id FROM users WHERE user_id = auth.uid()::integer
  ));

CREATE POLICY "Users can insert side business items for their shop" ON side_business_items
  FOR INSERT WITH CHECK (parent_shop_id IN (
    SELECT business_id FROM users WHERE user_id = auth.uid()::integer
  ));

CREATE POLICY "Users can update side business items from their shop" ON side_business_items
  FOR UPDATE USING (parent_shop_id IN (
    SELECT business_id FROM users WHERE user_id = auth.uid()::integer
  ));

CREATE POLICY "Users can delete side business items from their shop" ON side_business_items
  FOR DELETE USING (parent_shop_id IN (
    SELECT business_id FROM users WHERE user_id = auth.uid()::integer
  ));

-- Create RLS policies for side_business_sales
CREATE POLICY "Users can view side business sales from their shop" ON side_business_sales
  FOR SELECT USING (parent_shop_id IN (
    SELECT business_id FROM users WHERE user_id = auth.uid()::integer
  ));

CREATE POLICY "Users can insert side business sales for their shop" ON side_business_sales
  FOR INSERT WITH CHECK (parent_shop_id IN (
    SELECT business_id FROM users WHERE user_id = auth.uid()::integer
  ));

CREATE POLICY "Users can update side business sales from their shop" ON side_business_sales
  FOR UPDATE USING (parent_shop_id IN (
    SELECT business_id FROM users WHERE user_id = auth.uid()::integer
  ));

CREATE POLICY "Users can delete side business sales from their shop" ON side_business_sales
  FOR DELETE USING (parent_shop_id IN (
    SELECT business_id FROM users WHERE user_id = auth.uid()::integer
  ));
