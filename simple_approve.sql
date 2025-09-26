-- SIMPLE APPROVAL PROCESS
-- Just run these queries one at a time

-- 1. First, see what's pending (copy the ID you want to approve)
SELECT 
  id,
  email,
  business_name,
  created_at
FROM public.pending_registrations 
WHERE status = 'pending'
ORDER BY created_at DESC;

-- 2. Approve a registration (replace the UUID with the one from step 1)
-- Example: if the ID is 'abc123-def456-ghi789', use that instead of 'REPLACE_WITH_ACTUAL_ID'
UPDATE public.pending_registrations 
SET 
  approved = true,
  approved_at = now(),
  status = 'approved'
WHERE id = 'REPLACE_WITH_ACTUAL_ID';

-- 3. Get the user_id for the registration you just approved
SELECT user_id 
FROM public.pending_registrations 
WHERE id = 'REPLACE_WITH_ACTUAL_ID';

-- 4. Activate the user (replace the number with the user_id from step 3)
UPDATE public.users 
SET active = true 
WHERE user_id = REPLACE_WITH_USER_ID_NUMBER;

-- 5. Check that it worked
SELECT 
  pr.email,
  pr.business_name,
  pr.status,
  u.active
FROM public.pending_registrations pr
JOIN public.users u ON pr.user_id = u.user_id
WHERE pr.id = 'REPLACE_WITH_ACTUAL_ID';
