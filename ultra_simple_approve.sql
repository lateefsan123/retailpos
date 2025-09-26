-- ULTRA SIMPLE APPROVAL - Just copy and paste!

-- STEP 1: See what's pending
SELECT 
  id,
  email,
  business_name,
  created_at
FROM public.pending_registrations 
WHERE status = 'pending'
ORDER BY created_at DESC;

-- STEP 2: Copy the ID from above and paste it here (remove the quotes around PASTE_ID_HERE)
-- Example: if the ID is abc123-def456-ghi789, then use: WHERE id = 'abc123-def456-ghi789';
SELECT user_id 
FROM public.pending_registrations 
WHERE id = 'PASTE_ID_HERE';

-- STEP 3: Approve the registration (use the same ID from step 1)
UPDATE public.pending_registrations 
SET 
  approved = true,
  approved_at = now(),
  status = 'approved'
WHERE id = 'PASTE_ID_HERE';

-- STEP 4: Activate the user (use the user_id number from step 2)
UPDATE public.users 
SET active = true 
WHERE user_id = PASTE_USER_ID_HERE;

