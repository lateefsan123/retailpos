-- Manual Approval Script for Pending Registrations
-- Run these queries in your Supabase SQL editor to approve/reject registrations

-- 1. VIEW ALL PENDING REGISTRATIONS
-- This shows you all registrations waiting for approval
SELECT 
  pr.id,
  pr.user_id,
  pr.email,
  pr.business_name,
  pr.first_name,
  pr.last_name,
  pr.business_type,
  pr.business_address,
  pr.created_at,
  pr.status
FROM public.pending_registrations pr
WHERE pr.status = 'pending'
ORDER BY pr.created_at DESC;

-- 2. VIEW DETAILED REGISTRATION INFO
-- Replace 'REGISTRATION_ID' with the actual ID from step 1
-- SELECT 
--   pr.*,
--   u.username,
--   u.active as user_active,
--   bi.name as business_name_in_business_table
-- FROM public.pending_registrations pr
-- JOIN public.users u ON pr.user_id = u.user_id
-- JOIN public.business_info bi ON u.business_id = bi.business_id
-- WHERE pr.id = 'REGISTRATION_ID';

-- 3. APPROVE A REGISTRATION
-- Replace 'REGISTRATION_ID' with the actual ID you want to approve
-- Replace 'YOUR_ADMIN_USER_ID' with your admin user ID (or use NULL)
-- UPDATE public.pending_registrations 
-- SET 
--   approved = true,
--   approved_at = now(),
--   approved_by = YOUR_ADMIN_USER_ID, -- or NULL if you don't have an admin user ID
--   status = 'approved'
-- WHERE id = 'REGISTRATION_ID';

-- 4. ACTIVATE THE USER
-- Replace 'USER_ID' with the user_id from the registration you're approving
-- UPDATE public.users 
-- SET active = true 
-- WHERE user_id = USER_ID;

-- 5. REJECT A REGISTRATION (alternative to approval)
-- Replace 'REGISTRATION_ID' with the actual ID you want to reject
-- Replace 'YOUR_ADMIN_USER_ID' with your admin user ID (or use NULL)
-- Replace 'REJECTION_REASON' with the reason for rejection
-- UPDATE public.pending_registrations 
-- SET 
--   approved = false,
--   approved_at = now(),
--   approved_by = YOUR_ADMIN_USER_ID, -- or NULL
--   rejection_reason = 'REJECTION_REASON',
--   status = 'rejected'
-- WHERE id = 'REGISTRATION_ID';

-- 6. BULK APPROVE ALL PENDING REGISTRATIONS (use with caution!)
-- This will approve ALL pending registrations at once
-- UPDATE public.pending_registrations 
-- SET 
--   approved = true,
--   approved_at = now(),
--   status = 'approved'
-- WHERE status = 'pending';

-- UPDATE public.users 
-- SET active = true 
-- WHERE user_id IN (
--   SELECT user_id FROM public.pending_registrations WHERE status = 'approved'
-- );

-- 7. CHECK APPROVAL STATUS
-- This shows you the current status of all registrations
SELECT 
  pr.id,
  pr.email,
  pr.business_name,
  pr.status,
  pr.approved,
  pr.approved_at,
  pr.rejection_reason,
  u.active as user_active
FROM public.pending_registrations pr
JOIN public.users u ON pr.user_id = u.user_id
ORDER BY pr.created_at DESC;

-- 8. CLEAN UP REJECTED REGISTRATIONS (optional)
-- This removes rejected registrations and their associated users/businesses
-- WARNING: This will permanently delete data!
-- DELETE FROM public.users 
-- WHERE user_id IN (
--   SELECT user_id FROM public.pending_registrations WHERE status = 'rejected'
-- );
-- 
-- DELETE FROM public.business_info 
-- WHERE business_id IN (
--   SELECT u.business_id FROM public.users u
--   JOIN public.pending_registrations pr ON u.user_id = pr.user_id
--   WHERE pr.status = 'rejected'
-- );
-- 
-- DELETE FROM public.pending_registrations WHERE status = 'rejected';
