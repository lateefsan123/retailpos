-- Setup for Single Shop POS System
-- Run this in Supabase SQL Editor

-- 1. Create admin user
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
) ON CONFLICT (username) DO NOTHING;

-- 2. Create default business info (single shop) - Required since onboarding is removed
INSERT INTO public.business_info (
  name,
  address,
  phone_number,
  vat_number,
  receipt_footer,
  logo_url
) VALUES (
  'My Shop',
  '123 Main Street, City, State 12345',
  '555-0123',
  'VAT123456789',
  'Thank you for shopping with us!',
  null
) ON CONFLICT DO NOTHING;

-- 3. Verify setup
SELECT 'Users:' as table_name, count(*) as count FROM public.users
UNION ALL
SELECT 'Business Info:', count(*) FROM public.business_info;

-- 4. Show admin user
SELECT user_id, username, role, active FROM public.users WHERE username = 'admin';
