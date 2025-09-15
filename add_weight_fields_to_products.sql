-- Add weight-related fields to products table
-- Run this in your Supabase SQL Editor

ALTER TABLE products 
ADD COLUMN weight_unit TEXT, -- e.g., 'kg', 'g', 'lb', 'oz'
ADD COLUMN price_per_unit DECIMAL(10,2), -- price per weight unit (e.g., 3.00 for €3 per kg)
ADD COLUMN is_weighted BOOLEAN DEFAULT FALSE; -- true if item is sold by weight

-- Add some example weighted products for testing
INSERT INTO products (product_id, name, category, price, stock_quantity, weight_unit, price_per_unit, is_weighted) VALUES
('WEIGHT-001', 'Apples', 'Fruits', 0, 100, 'kg', 2.50, true),
('WEIGHT-002', 'Bananas', 'Fruits', 0, 50, 'kg', 1.80, true),
('WEIGHT-003', 'Ground Beef', 'Meat', 0, 25, 'kg', 6.50, true),
('WEIGHT-004', 'Cheese', 'Dairy', 0, 30, 'kg', 8.00, true),
('WEIGHT-005', 'Potatoes', 'Vegetables', 0, 75, 'kg', 1.20, true);

-- Update existing products to be non-weighted (if they don't have weight fields set)
UPDATE products 
SET is_weighted = FALSE 
WHERE is_weighted IS NULL;
