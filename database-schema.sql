-- Complete database schema for the POS system
-- Run this in your Supabase SQL editor to set up all required tables

-- Create reminders table with resolved column
CREATE TABLE IF NOT EXISTS reminders (
  reminder_id SERIAL PRIMARY KEY,
  owner_id INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  remind_date DATE NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create products table (if not exists)
CREATE TABLE IF NOT EXISTS products (
  product_id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  price DECIMAL(10,2) NOT NULL,
  stock_quantity INTEGER DEFAULT 0,
  reorder_level INTEGER DEFAULT 10,
  supplier_info TEXT,
  image_url TEXT,
  description TEXT,
  sku TEXT,
  sales_count INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0.00,
  last_sold_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sales table (if not exists)
CREATE TABLE IF NOT EXISTS sales (
  sale_id SERIAL PRIMARY KEY,
  datetime TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  customer_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sale_items table (if not exists)
CREATE TABLE IF NOT EXISTS sale_items (
  sale_item_id SERIAL PRIMARY KEY,
  sale_id INTEGER REFERENCES sales(sale_id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(product_id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  price_each DECIMAL(10,2) NOT NULL,
  calculated_price DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create customers table (if not exists)
CREATE TABLE IF NOT EXISTS customers (
  customer_id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  loyalty_points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add resolved column to existing reminders table if it doesn't exist
ALTER TABLE reminders 
ADD COLUMN IF NOT EXISTS resolved BOOLEAN DEFAULT FALSE;

-- Update existing reminders to have resolved = false
UPDATE reminders 
SET resolved = FALSE 
WHERE resolved IS NULL;

-- Add comments to document the columns
COMMENT ON COLUMN reminders.resolved IS 'Indicates whether the reminder has been completed/resolved';
COMMENT ON TABLE reminders IS 'Stores user reminders with completion status';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reminders_owner_id ON reminders(owner_id);
CREATE INDEX IF NOT EXISTS idx_reminders_remind_date ON reminders(remind_date);
CREATE INDEX IF NOT EXISTS idx_reminders_resolved ON reminders(resolved);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_sales_datetime ON sales(datetime);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);

-- Enable Row Level Security (RLS) for reminders table
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Create policy for reminders (users can only see their own reminders)
CREATE POLICY "Users can view their own reminders" ON reminders
  FOR SELECT USING (owner_id = auth.uid()::integer);

CREATE POLICY "Users can insert their own reminders" ON reminders
  FOR INSERT WITH CHECK (owner_id = auth.uid()::integer);

CREATE POLICY "Users can update their own reminders" ON reminders
  FOR UPDATE USING (owner_id = auth.uid()::integer);

CREATE POLICY "Users can delete their own reminders" ON reminders
  FOR DELETE USING (owner_id = auth.uid()::integer);

-- Verify the tables were created
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name IN ('reminders', 'products', 'sales', 'sale_items', 'customers')
ORDER BY table_name, ordinal_position;
