-- Test if admin user exists and can be found
-- Run this in Supabase SQL Editor to verify

SELECT 
  user_id, 
  username, 
  role, 
  active, 
  icon,
  password_hash
FROM public.users 
WHERE username = 'admin' 
  AND role = 'admin' 
  AND active = true;

-- If no results, the admin user doesn't exist yet
-- Run the create_admin_user.sql script first
