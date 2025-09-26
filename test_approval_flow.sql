-- Test script to verify the approval flow works correctly
-- Run this after setting up the pending_registrations table and RLS policies

-- 1. Check if pending_registrations table exists and has data
SELECT 'Pending Registrations Table Check' as test_name;
SELECT COUNT(*) as pending_count FROM public.pending_registrations WHERE status = 'pending';

-- 2. Check if the is_user_approved function works
SELECT 'User Approval Function Check' as test_name;
SELECT 
  u.user_id,
  u.username,
  u.active,
  public.is_user_approved(u.user_id) as is_approved
FROM public.users u
LIMIT 5;

-- 3. Check if RLS policies are enabled
SELECT 'RLS Policies Check' as test_name;
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'business_info', 'products', 'sales', 'customers', 'branches')
ORDER BY tablename;

-- 4. Check if policies exist
SELECT 'RLS Policies Existence Check' as test_name;
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'business_info', 'products', 'sales', 'customers', 'branches')
ORDER BY tablename, policyname;

-- 5. Test data access for approved vs unapproved users
-- This would need to be run with different user contexts in a real test
SELECT 'Data Access Test (Run with different user contexts)' as test_name;
SELECT 'Note: This test requires running queries with different user authentication contexts' as note;
