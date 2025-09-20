# Multi-Tenant POS System Migration Guide

This guide will help you safely migrate your POS system from single-tenant to multi-tenant architecture.

## ⚠️ IMPORTANT: Backup Your Database First!

**Before running any migration, create a full backup of your Supabase database!**

## Migration Steps

### Step 1: Run the Complete Migration Script

1. Open your Supabase SQL Editor
2. Copy and paste the entire contents of `migration-to-multitenant.sql`
3. Run the script

### Step 2: Verify the Migration

After running the migration, verify everything worked:

```sql
-- Check that business_info table was created
SELECT * FROM business_info;

-- Check that all tables have business_id columns
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE column_name = 'business_id' 
ORDER BY table_name;

-- Check that product_id is now TEXT
SELECT data_type 
FROM information_schema.columns 
WHERE table_name = 'products' AND column_name = 'product_id';
```

### Step 3: Update Your Application Code

The migration script handles the database changes, but you'll need to update your application code to handle the new multi-tenant structure.

## What the Migration Does

1. **Creates `business_info` table** - Central table for business/store information
2. **Creates new tables** - `users`, `vault`, `vault_entries`, `inventory_movements`
3. **Adds `business_id` columns** - To all existing tables for multi-tenancy
4. **Converts `product_id`** - From integer (SERIAL) to text (UUID format)
5. **Adds new columns** - Tax rates, weighted products, partial payments, etc.
6. **Creates indexes** - For performance optimization
7. **Sets up RLS** - Row Level Security for data isolation
8. **Creates helper functions** - For business operations

## Key Changes

### Database Schema Changes
- All tables now have `business_id` for multi-tenancy
- `product_id` changed from integer to text (UUID format)
- Added support for weighted products, tax rates, partial payments
- Added vault system for password management
- Added inventory movement tracking

### Data Migration
- Existing data is assigned to a default business
- Product IDs are converted to text format (e.g., `prod_1`, `prod_2`)
- All relationships are preserved

## Post-Migration Tasks

1. **Test your application** - Make sure everything still works
2. **Update TypeScript interfaces** - Add business_id to your types
3. **Update queries** - Add business_id filtering to all queries
4. **Test multi-tenant features** - Create additional businesses and test isolation

## Troubleshooting

### If the migration fails:
1. Check the error message in Supabase SQL Editor
2. Make sure you have the necessary permissions
3. Verify your current schema matches what the migration expects

### Common issues:
- **Foreign key constraint errors**: Make sure all referenced tables exist
- **Permission errors**: Ensure your user has ALTER TABLE permissions
- **Data type errors**: Check that existing data is compatible with new constraints

## Rollback Plan

If you need to rollback:
1. Restore from your database backup
2. Or manually remove the new columns and tables
3. Contact support if you need help with rollback

## Next Steps

After successful migration:
1. Update your application code to handle business_id
2. Test all functionality
3. Consider adding more businesses
4. Update your authentication system
5. Train users on new multi-tenant features
