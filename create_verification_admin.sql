-- ================================================
-- Create Verification Admin Account
-- ================================================

-- First, create a business for the verification admin
INSERT INTO public.business_info (
    name,
    business_name,
    business_type,
    description,
    address,
    phone_number,
    currency,
    created_at
) VALUES (
    'User Verification System',
    'User Verification System',
    'Admin Service',
    'Dedicated system for verifying new user registrations',
    'System Address',
    '000-000-0000',
    'USD',
    NOW()
);

-- Get the business_id for the verification admin
-- (You'll need to replace BUSINESS_ID_HERE with the actual ID from the insert above)

-- Create the verification admin user
INSERT INTO public.users (
    username,
    password_hash,
    email,
    full_name,
    role,
    active,
    business_id,
    email_verified,
    created_at
) VALUES (
    'verification_admin',
    '611828369', -- Hashed password for 'Isunas123.'
    'lateefsanusi67@gmail.com',
    'Verification Admin',
    'admin',
    true,
    (SELECT business_id FROM public.business_info WHERE name = 'User Verification System'),
    true,
    NOW()
);

-- ================================================
-- Alternative: Direct insert with known business_id
-- ================================================

-- If you already have a business_id, use this instead:
-- INSERT INTO public.users (
--     username,
--     password_hash,
--     email,
--     full_name,
--     role,
--     active,
--     business_id,
--     email_verified,
--     created_at
-- ) VALUES (
--     'verification_admin',
--     '611828369',
--     'lateefsanusi67@gmail.com',
--     'Verification Admin',
--     'admin',
--     true,
--     YOUR_BUSINESS_ID_HERE,
--     true,
--     NOW()
-- );

-- ================================================
-- Verify the account was created
-- ================================================

-- Check if the verification admin was created successfully
SELECT 
    u.user_id,
    u.username,
    u.email,
    u.full_name,
    u.role,
    u.active,
    u.email_verified,
    b.name as business_name
FROM public.users u
JOIN public.business_info b ON u.business_id = b.business_id
WHERE u.email = 'lateefsanusi67@gmail.com';
