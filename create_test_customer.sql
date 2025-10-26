-- Create a test customer for the customer portal
-- This script creates a customer that can be used to test the new authentication flow

-- First, make sure we have a business and branch
INSERT INTO public.business_info (business_name, address, phone_number, email, created_at, updated_at)
VALUES (
  'Test Store',
  '123 Main Street, Test City, TC 12345',
  '+1-555-0123',
  'test@store.com',
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- Get the business_id (assuming it's 1, or get the latest one)
-- Create a branch for the business
INSERT INTO public.branches (business_id, branch_name, address, phone_number, manager_id, created_at, updated_at)
VALUES (
  (SELECT business_id FROM public.business_info WHERE business_name = 'Test Store' LIMIT 1),
  'Main Branch',
  '123 Main Street, Test City, TC 12345',
  '+1-555-0123',
  NULL,
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- Create a test customer (first-time customer - no email/password set)
INSERT INTO public.customers (
  business_id,
  branch_id,
  name,
  phone_number,
  loyalty_points,
  gender,
  created_at,
  updated_at,
  account_setup_complete
)
VALUES (
  (SELECT business_id FROM public.business_info WHERE business_name = 'Test Store' LIMIT 1),
  (SELECT branch_id FROM public.branches WHERE branch_name = 'Main Branch' LIMIT 1),
  'Test Customer',
  '+1-555-9999',
  100,
  'male',
  NOW(),
  NOW(),
  false
) ON CONFLICT DO NOTHING;

-- Create a test customer with completed account setup
INSERT INTO public.customers (
  business_id,
  branch_id,
  name,
  phone_number,
  email,
  password_hash,
  loyalty_points,
  gender,
  created_at,
  updated_at,
  account_setup_complete
)
VALUES (
  (SELECT business_id FROM public.business_info WHERE business_name = 'Test Store' LIMIT 1),
  (SELECT branch_id FROM public.branches WHERE branch_name = 'Main Branch' LIMIT 1),
  'John Demo',
  '+1-555-8888',
  'john.demo@test.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: "password"
  250,
  'male',
  NOW(),
  NOW(),
  true
) ON CONFLICT DO NOTHING;

-- Create another test customer with completed account setup
INSERT INTO public.customers (
  business_id,
  branch_id,
  name,
  phone_number,
  email,
  password_hash,
  loyalty_points,
  gender,
  created_at,
  updated_at,
  account_setup_complete
)
VALUES (
  (SELECT business_id FROM public.business_info WHERE business_name = 'Test Store' LIMIT 1),
  (SELECT branch_id FROM public.branches WHERE branch_name = 'Main Branch' LIMIT 1),
  'Sarah Demo',
  '+1-555-7777',
  'sarah.demo@test.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: "password"
  150,
  'female',
  NOW(),
  NOW(),
  true
) ON CONFLICT DO NOTHING;

-- Verify the customers were created
SELECT 
  customer_id,
  name,
  phone_number,
  email,
  account_setup_complete,
  loyalty_points,
  branch_id
FROM public.customers 
WHERE name IN ('Test Customer', 'John Demo', 'Sarah Demo')
ORDER BY customer_id;
