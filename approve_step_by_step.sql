-- STEP-BY-STEP APPROVAL PROCESS
-- Run these queries one at a time in your Supabase SQL editor

-- STEP 1: See all pending registrations and copy the ID you want to approve
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
-- COPY the UUID from step 1 and replace the text below
-- Example: if the ID is '123e4567-e89b-12d3-a456-426614174000', then use:
-- WHERE pr.id = '123e4567-e89b-12d3-a456-426614174000';
SELECT 
  pr.*,
  u.username,
  u.active as user_currently_active
FROM public.pending_registrations pr
JOIN public.users u ON pr.user_id = u.user_id
WHERE pr.id = 'PASTE_THE_ACTUAL_UUID_HERE';

-- STEP 3: Approve the registration
-- COPY the same UUID from step 1 and replace the text below
UPDATE public.pending_registrations 
SET 
  approved = true,
  approved_at = now(),
  approved_by = NULL,
  status = 'approved'
WHERE id = 'PASTE_THE_ACTUAL_UUID_HERE';

-- STEP 4: Activate the user
-- COPY the user_id from step 2 and replace the number below
-- Example: if user_id is 123, then use: WHERE user_id = 123;
UPDATE public.users 
SET active = true 
WHERE user_id = PASTE_THE_USER_ID_HERE;

-- STEP 5: Verify the approval worked
-- COPY the same UUID from step 1 and replace the text below
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
WHERE pr.id = 'PASTE_THE_ACTUAL_UUID_HERE';

