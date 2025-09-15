# Fix Weighted Items Display Issue

## Current Problem:
- Weighted items show €0.00 price instead of calculated price
- Weighted items can't be edited (which is correct, but price should display properly)

## Root Cause:
The `sale_items` table doesn't have `weight` and `calculated_price` columns yet, so the weight data isn't being stored when items are sold.

## Solution Steps:

### 1. Run Database Migration (CRITICAL)
Execute this SQL in your Supabase dashboard:

```sql
ALTER TABLE sale_items 
ADD COLUMN weight DECIMAL(10,3),
ADD COLUMN calculated_price DECIMAL(10,2);
```

### 2. Test with New Sales
After the migration:
- Create a new sale with a weighted item (like "ila")
- The weight and calculated price will be stored
- Transaction detail page will show correct price

### 3. Debug Information
I've added console logging to help debug. Check browser console for:
```
Weighted item data: {
  name: "ila",
  weight: 2.5,
  weight_unit: "kg", 
  price_per_unit: 3.00,
  calculated_price: 7.50,
  price_each: 0.00
}
```

## Expected Results After Migration:

**Before (broken):**
- Price: €0.00
- Quantity: 1
- Total: €0.00

**After (fixed):**
- Weight: 2.5kg ⚖️
- Price: €3.00/kg
- Total: €7.50
- Orange background with scale emoji
- "Weighted items cannot be edited after sale" message

## Important Notes:
- Existing transactions won't show weight until you run the migration
- New sales after migration will work correctly
- Weighted items are intentionally non-editable (this is correct behavior)
