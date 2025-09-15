# Setup Weight Support for Sale Items

To fix the issue where weighted items still show "quantity" instead of "weight", you need to run a SQL migration to add weight columns to the `sale_items` table.

## Steps:

1. **Go to your Supabase Dashboard**
2. **Navigate to the SQL Editor**
3. **Run the following SQL migration:**

```sql
-- Add weight columns to sale_items table to support weighted products
ALTER TABLE sale_items 
ADD COLUMN weight DECIMAL(10,3), -- Weight of the item (e.g., 2.500 for 2.5kg)
ADD COLUMN calculated_price DECIMAL(10,2); -- Calculated price for weighted items (weight * price_per_unit)

-- Add comments to document the new columns
COMMENT ON COLUMN sale_items.weight IS 'Weight of the item for weighted products (e.g., 2.500 for 2.5kg)';
COMMENT ON COLUMN sale_items.calculated_price IS 'Calculated price for weighted items (weight * price_per_unit)';
```

4. **After running the migration:**
   - New weighted item sales will store the weight and calculated price
   - Existing transactions will show weight information correctly
   - The transaction detail page will display weight instead of quantity for weighted items

## What this fixes:

- ✅ Weighted items will show actual weight (e.g., "2.5kg") instead of quantity
- ✅ Price display will show price per unit (e.g., "€3.00/kg")
- ✅ Total calculation will use the stored calculated price
- ✅ Visual indicators will distinguish weighted items from regular items

## Note:

Existing transactions with weighted items will need to be re-sold to have the weight information stored properly, as the weight data wasn't being saved before this migration.
