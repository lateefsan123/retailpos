# How to Clear Your Database

## ⚠️ IMPORTANT WARNING

**This will DELETE ALL DATA from your database!**
- All businesses, users, products, sales, customers - everything!
- This action CANNOT be undone!
- Make sure you have a backup if you need one!

## Method 1: Using the SQL Script (Recommended)

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase Dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run the Clear Script
1. Open the file `clear_database.sql` from your project
2. Copy all the contents
3. Paste into the SQL Editor
4. Click **Run** or press `Ctrl+Enter`

### Step 3: Verify Deletion
- The script will show a table with row counts
- All counts should be `0`
- You'll see a success message at the bottom

### Step 4: Clear Supabase Auth Users
Since the script can't delete Supabase Auth users directly, you need to:

1. Go to **Authentication** → **Users** in Supabase Dashboard
2. Select all users (if any)
3. Click **Delete**
4. Confirm deletion

## Method 2: Manual Deletion (If Script Fails)

If the TRUNCATE script fails due to permissions, run these DELETE statements instead:

```sql
-- Delete in order (respecting foreign keys)
DELETE FROM public.promotion_applications;
DELETE FROM public.promotion_products;
DELETE FROM public.promotions;
DELETE FROM public.purchase_order_items;
DELETE FROM public.purchase_orders;
DELETE FROM public.refunds;
DELETE FROM public.sale_items;
DELETE FROM public.sales;
DELETE FROM public.loyalty_redemptions;
DELETE FROM public.loyalty_prizes;
DELETE FROM public.inventory_movements;
DELETE FROM public.products;
DELETE FROM public.supplier_visits;
DELETE FROM public.suppliers;
DELETE FROM public.side_business_sales;
DELETE FROM public.side_business_items;
DELETE FROM public.side_businesses;
DELETE FROM public.reminders;
DELETE FROM public.customers;
DELETE FROM public.vault_entries;
DELETE FROM public.vault;
DELETE FROM public.email_verification_tokens;
DELETE FROM public.pending_registrations;
DELETE FROM public.shop_staff;
DELETE FROM public.users;
DELETE FROM public.branches;
DELETE FROM public.business_info;

-- Reset auto-increment sequences
ALTER SEQUENCE business_info_business_id_seq RESTART WITH 1;
ALTER SEQUENCE branches_branch_id_seq RESTART WITH 1;
ALTER SEQUENCE users_user_id_seq RESTART WITH 1;
ALTER SEQUENCE customers_customer_id_seq RESTART WITH 1;
ALTER SEQUENCE products_product_id_seq RESTART WITH 1;
ALTER SEQUENCE sales_sale_id_seq RESTART WITH 1;
-- (Add other sequences as needed)
```

## Method 3: Using Supabase Dashboard (Slowest but Safest)

For each table:
1. Go to **Table Editor** in Supabase Dashboard
2. Select a table
3. Click on the **...** menu
4. Choose **Truncate table**
5. Confirm

**Order matters!** Start with tables that have no dependencies (like `promotion_applications`) and work backwards to `business_info`.

## After Clearing

### What's Reset:
✅ All data is deleted
✅ Auto-increment IDs start from 1 again
✅ Table structure is preserved
✅ Indexes and constraints remain intact

### What's NOT Reset:
❌ Supabase Auth users (must delete manually from dashboard)
❌ Storage files (if you have any)
❌ Edge functions or other Supabase services

## Testing After Clear

To make sure everything is cleared:

```sql
-- Check all tables are empty
SELECT 
  schemaname,
  tablename,
  (
    SELECT COUNT(*) 
    FROM (SELECT 1 FROM pg_catalog.pg_class WHERE relname = tablename LIMIT 1) x
  ) as row_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

## Ready to Start Fresh?

After clearing the database:

1. ✅ Run the Supabase Auth migration: `supabase_auth_migration.sql`
2. ✅ Sign up with a new owner account
3. ✅ Test login functionality
4. ✅ Test user creation and switching

## Need to Restore?

If you have a backup:
1. Go to **Database** → **Backups** in Supabase Dashboard
2. Choose a backup point
3. Click **Restore**

---

**Questions before proceeding?**
- Do you have any important data you want to keep?
- Have you tested your backup/restore process?
- Are you sure you want to proceed?

If yes to all, go ahead and run `clear_database.sql`! 🚀

