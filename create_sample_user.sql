-- Create a sample user for login testing
-- Email: emailsample@gmail.com
-- Username: 123456 (phone number)
-- Password: alhaji

-- First, make sure we have a business
INSERT INTO public.business_info (business_name, address, phone_number, email, created_at, updated_at)
VALUES (
  'Sample Business',
  '123 Sample Street, Sample City',
  '123456',
  'admin@sample.com',
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- Create a branch for the business
INSERT INTO public.branches (business_id, branch_name, address, phone_number, manager_id, created_at, updated_at)
VALUES (
  (SELECT business_id FROM public.business_info WHERE business_name = 'Sample Business' LIMIT 1),
  'Main Branch',
  '123 Sample Street, Sample City',
  '123456',
  NULL,
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- Create the sample user with hashed password
-- Password "alhaji" hashed with bcrypt
INSERT INTO public.users (
  username,
  password_hash,
  email,
  role,
  active,
  business_id,
  icon,
  email_verified,
  private_preview,
  created_at,
  updated_at
)
VALUES (
  '123456',
  '$2b$12$DZ8QJcPYcKKf7ZUv.F16QeSqQUvTr1eprjplFEnfcQ5bmJQOpW.ES', -- bcrypt hash for "alhaji"
  'emailsample@gmail.com',
  'owner',
  true,
  (SELECT business_id FROM public.business_info WHERE business_name = 'Sample Business' LIMIT 1),
  'user',
  true,
  false,
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- Verify the user was created
SELECT 
  user_id,
  username,
  email,
  role,
  active,
  business_id
FROM public.users 
WHERE email = 'emailsample@gmail.com' OR username = '123456';
