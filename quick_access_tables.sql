-- Quick Access RLS Policies and Indexes
-- Run this SQL in your Supabase SQL editor
-- Note: The tables already exist, we just need to add RLS policies and indexes

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_quick_access_user_business ON product_quick_access(user_id, business_id);
CREATE INDEX IF NOT EXISTS idx_product_quick_access_product ON product_quick_access(product_id);
CREATE INDEX IF NOT EXISTS idx_side_business_quick_access_user_business ON side_business_quick_access(user_id, business_id);
CREATE INDEX IF NOT EXISTS idx_side_business_quick_access_item ON side_business_quick_access(item_id);

-- Enable Row Level Security (if not already enabled)
ALTER TABLE product_quick_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE side_business_quick_access ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own quick access products" ON product_quick_access;
DROP POLICY IF EXISTS "Users can insert their own quick access products" ON product_quick_access;
DROP POLICY IF EXISTS "Users can delete their own quick access products" ON product_quick_access;
DROP POLICY IF EXISTS "Users can view their own quick access side business items" ON side_business_quick_access;
DROP POLICY IF EXISTS "Users can insert their own quick access side business items" ON side_business_quick_access;
DROP POLICY IF EXISTS "Users can delete their own quick access side business items" ON side_business_quick_access;

-- RLS Policies for product_quick_access
CREATE POLICY "Users can view their own quick access products" ON product_quick_access
    FOR SELECT USING (user_id IN (
        SELECT user_id FROM users WHERE auth_user_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own quick access products" ON product_quick_access
    FOR INSERT WITH CHECK (user_id IN (
        SELECT user_id FROM users WHERE auth_user_id = auth.uid()
    ));

CREATE POLICY "Users can delete their own quick access products" ON product_quick_access
    FOR DELETE USING (user_id IN (
        SELECT user_id FROM users WHERE auth_user_id = auth.uid()
    ));

-- RLS Policies for side_business_quick_access
CREATE POLICY "Users can view their own quick access side business items" ON side_business_quick_access
    FOR SELECT USING (user_id IN (
        SELECT user_id FROM users WHERE auth_user_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own quick access side business items" ON side_business_quick_access
    FOR INSERT WITH CHECK (user_id IN (
        SELECT user_id FROM users WHERE auth_user_id = auth.uid()
    ));

CREATE POLICY "Users can delete their own quick access side business items" ON side_business_quick_access
    FOR DELETE USING (user_id IN (
        SELECT user_id FROM users WHERE auth_user_id = auth.uid()
    ));
