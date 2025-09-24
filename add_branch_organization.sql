-- Migration to add branch organization to existing tables
-- This adds branch_id to all relevant tables for proper multi-branch support

-- Add branch_id to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(branch_id);

-- Add branch_id to sales table  
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(branch_id);

-- Add branch_id to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(branch_id);

-- Add branch_id to reminders table
ALTER TABLE reminders 
ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(branch_id);

-- Add branch_id to users table (users can work at specific branches)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(branch_id);

-- Add branch_id to inventory_movements table
ALTER TABLE inventory_movements 
ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(branch_id);

-- Add branch_id to vault table
ALTER TABLE vault 
ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(branch_id);

-- Add branch_id to side_business_items table
ALTER TABLE side_business_items 
ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(branch_id);

-- Add branch_id to side_business_sales table
ALTER TABLE side_business_sales 
ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(branch_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_branch_id ON products(branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_branch_id ON sales(branch_id);
CREATE INDEX IF NOT EXISTS idx_customers_branch_id ON customers(branch_id);
CREATE INDEX IF NOT EXISTS idx_reminders_branch_id ON reminders(branch_id);
CREATE INDEX IF NOT EXISTS idx_users_branch_id ON users(branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_branch_id ON inventory_movements(branch_id);
CREATE INDEX IF NOT EXISTS idx_vault_branch_id ON vault(branch_id);
CREATE INDEX IF NOT EXISTS idx_side_business_items_branch_id ON side_business_items(branch_id);
CREATE INDEX IF NOT EXISTS idx_side_business_sales_branch_id ON side_business_sales(branch_id);

-- Create composite indexes for business_id + branch_id queries
CREATE INDEX IF NOT EXISTS idx_products_business_branch ON products(business_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_business_branch ON sales(business_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_customers_business_branch ON customers(business_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_reminders_business_branch ON reminders(business_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_users_business_branch ON users(business_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_business_branch ON inventory_movements(business_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_vault_business_branch ON vault(business_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_side_business_items_business_branch ON side_business_items(business_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_side_business_sales_business_branch ON side_business_sales(business_id, branch_id);
