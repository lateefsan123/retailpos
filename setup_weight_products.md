# Setup Weight Multiplier Feature

## Step 1: Add Database Fields

Run this SQL in your Supabase SQL Editor:

```sql
-- Add weight-related fields to products table
ALTER TABLE products 
ADD COLUMN weight_unit TEXT, -- e.g., 'kg', 'g', 'lb', 'oz'
ADD COLUMN price_per_unit DECIMAL(10,2), -- price per weight unit (e.g., 3.00 for €3 per kg)
ADD COLUMN is_weighted BOOLEAN DEFAULT FALSE; -- true if item is sold by weight

-- Update existing products to be non-weighted
UPDATE products 
SET is_weighted = FALSE 
WHERE is_weighted IS NULL;
```

## Step 2: Add Example Weighted Products

Run this SQL to add some test weighted products:

```sql
INSERT INTO products (product_id, name, category, price, stock_quantity, weight_unit, price_per_unit, is_weighted) VALUES
('WEIGHT-001', 'Apples', 'Fruits', 0, 100, 'kg', 2.50, true),
('WEIGHT-002', 'Bananas', 'Fruits', 0, 50, 'kg', 1.80, true),
('WEIGHT-003', 'Ground Beef', 'Meat', 0, 25, 'kg', 6.50, true),
('WEIGHT-004', 'Cheese', 'Dairy', 0, 30, 'kg', 8.00, true),
('WEIGHT-005', 'Potatoes', 'Vegetables', 0, 75, 'kg', 1.20, true);
```

## Step 3: Test the Feature

1. Go to the Sales page: http://localhost:3002/sales
2. Look for the new weighted products (Apples, Bananas, etc.)
3. Click on a weighted product - you should see a weight input modal
4. Enter a weight (e.g., 1.5 for 1.5 kg)
5. See the calculated price and add to cart

## How It Works

- **Regular products**: Show "€2.50" and add directly to cart
- **Weighted products**: Show "€2.50/kg" and open weight input modal
- **In cart**: Weighted items show "1.5 kg • €3.75"

## Converting Existing Products to Weighted

To make an existing product weighted, update it like this:

```sql
UPDATE products 
SET weight_unit = 'kg', 
    price_per_unit = 3.00, 
    is_weighted = true,
    price = 0
WHERE product_id = 'PROD001';
```
