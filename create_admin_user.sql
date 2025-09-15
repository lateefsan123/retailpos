-- Create admin user with credentials: admin / admin123
-- Run this in your Supabase SQL Editor

INSERT INTO public.users (
  username,
  password_hash,
  role,
  active,
  icon
) VALUES (
  'admin',
  '-969161597',  -- Hashed version of 'admin123'
  'admin',
  true,
  'lily'
);

-- Verify the user was created
SELECT user_id, username, role, active, icon FROM public.users WHERE username = 'admin';
