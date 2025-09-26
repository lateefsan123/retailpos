-- JUST ACTIVATE USERS - Super Simple!

-- 1. See all inactive users
SELECT 
  u.user_id,
  u.username,
  u.email,
  u.active,
  bi.name as business_name
FROM public.users u
LEFT JOIN public.business_info bi ON u.business_id = bi.business_id
WHERE u.active = false
ORDER BY u.created_at DESC;

-- 2. Activate a specific user (replace 123 with the actual user_id)
UPDATE public.users 
SET active = true 
WHERE user_id = 123;

-- 3. Activate ALL inactive users at once (use with caution!)
UPDATE public.users 
SET active = true 
WHERE active = false;

-- 4. Check that it worked
SELECT 
  u.user_id,
  u.username,
  u.email,
  u.active,
  bi.name as business_name
FROM public.users u
LEFT JOIN public.business_info bi ON u.business_id = bi.business_id
WHERE u.user_id = 123; -- replace with the user_id you activated
