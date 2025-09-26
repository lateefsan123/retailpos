-- Quick Approval Helper Script
-- Copy and paste these queries one at a time in your Supabase SQL editor

-- STEP 1: See all pending registrations
SELECT 
  pr.id,
  pr.email,
  pr.business_name,
  pr.first_name || ' ' || pr.last_name as full_name,
  pr.created_at
FROM public.pending_registrations pr
WHERE pr.status = 'pending'
ORDER BY pr.created_at DESC;

-- STEP 2: Get detailed info for a specific registration
-- Copy the actual UUID from step 1 and paste it below (remove the quotes around YOUR_REGISTRATION_ID_HERE)
-- Example: WHERE pr.id = '123e4567-e89b-12d3-a456-426614174000';
SELECT 
  pr.*,
  u.username,
  u.active as user_currently_active
FROM public.pending_registrations pr
JOIN public.users u ON pr.user_id = u.user_id
WHERE pr.id = 'YOUR_REGISTRATION_ID_HERE';

-- STEP 3: Approve the registration
-- Replace 'YOUR_REGISTRATION_ID_HERE' with the ID from step 1
-- Replace 'YOUR_USER_ID_HERE' with your admin user ID (or use NULL)
UPDATE public.pending_registrations 
SET 
  approved = true,
  approved_at = now(),
  approved_by = NULL, -- Change this to your admin user ID if you have one
  status = 'approved'
WHERE id = 'YOUR_REGISTRATION_ID_HERE';

-- STEP 4: Activate the user
-- Replace 'YOUR_USER_ID_HERE' with the user_id from the registration
UPDATE public.users 
SET active = true 
WHERE user_id = YOUR_USER_ID_HERE;

-- STEP 5: Verify the approval worked
SELECT 
  pr.id,
  pr.email,
  pr.business_name,
  pr.status,
  pr.approved,
  pr.approved_at,
  u.active as user_active
FROM public.pending_registrations pr
JOIN public.users u ON pr.user_id = u.user_id
WHERE pr.id = 'YOUR_REGISTRATION_ID_HERE';
