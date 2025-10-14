-- =====================================================
-- CLEAR DATABASE - DELETE ALL DATA
-- =====================================================
-- ⚠️ WARNING: This will delete ALL data from your database!
-- ⚠️ This cannot be undone!
-- ⚠️ Make sure you have a backup if needed!
-- =====================================================

-- Disable triggers temporarily for faster deletion
SET session_replication_role = replica;

-- Delete data from all tables in correct order (respecting foreign keys)
-- Using TRUNCATE CASCADE is the fastest and safest way

TRUNCATE TABLE 
  public.promotion_applications,
  public.promotion_products,
  public.promotions,
  public.purchase_order_items,
  public.purchase_orders,
  public.refunds,
  public.sale_items,
  public.sales,
  public.loyalty_redemptions,
  public.loyalty_prizes,
  public.inventory_movements,
  public.products,
  public.supplier_visits,
  public.suppliers,
  public.side_business_sales,
  public.side_business_items,
  public.side_businesses,
  public.reminders,
  public.customers,
  public.vault_entries,
  public.vault,
  public.email_verification_tokens,
  public.pending_registrations,
  public.shop_staff,
  public.users,
  public.branches,
  public.business_info
RESTART IDENTITY CASCADE;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- =====================================================
-- VERIFY DELETION
-- =====================================================

-- Check row counts (should all be 0)
SELECT 
  'business_info' as table_name, COUNT(*) as row_count FROM public.business_info
UNION ALL
SELECT 'branches', COUNT(*) FROM public.branches
UNION ALL
SELECT 'users', COUNT(*) FROM public.users
UNION ALL
SELECT 'customers', COUNT(*) FROM public.customers
UNION ALL
SELECT 'products', COUNT(*) FROM public.products
UNION ALL
SELECT 'sales', COUNT(*) FROM public.sales
UNION ALL
SELECT 'sale_items', COUNT(*) FROM public.sale_items
UNION ALL
SELECT 'suppliers', COUNT(*) FROM public.suppliers
UNION ALL
SELECT 'pending_registrations', COUNT(*) FROM public.pending_registrations
ORDER BY table_name;

-- =====================================================
-- CLEAN UP SUPABASE AUTH USERS (Optional)
-- =====================================================
-- Note: You may need admin privileges to run this
-- Uncomment the following section if you want to delete Supabase Auth users too

/*
-- Delete all users from Supabase Auth
-- This requires superuser access or you can do it manually in Supabase Dashboard
-- Go to: Authentication → Users → Select all → Delete

-- If you have access to auth schema:
-- DELETE FROM auth.users;
-- DELETE FROM auth.identities;
-- DELETE FROM auth.sessions;
-- DELETE FROM auth.refresh_tokens;
*/

-- =====================================================
-- ALTERNATIVE: Delete from Supabase Dashboard
-- =====================================================
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to: Authentication → Users
-- 3. Select all users and delete them
-- 4. This ensures auth.users table is also cleared

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT '✅ Database cleared successfully!' as status,
       'All data has been deleted and identity sequences reset.' as message,
       '⚠️ Remember to clear Supabase Auth users from the dashboard if needed.' as reminder;

