-- ================================================
-- Email Verification SQL Query
-- ================================================

-- Based on your current signup process, you use a pending approval system
-- Here are the SQL queries for your actual email verification workflow:

-- ================================================
-- 1. APPROVE PENDING REGISTRATION (Admin Action)
-- ================================================

-- This is what happens when an admin approves a pending registration
-- It activates the user and marks their email as verified

UPDATE public.users 
SET 
    active = true,
    email_verified = true,
    email_verification_token = NULL,
    verification_token_expires = NULL
WHERE user_id = (
    SELECT user_id 
    FROM public.pending_registrations 
    WHERE id = 'PENDING_REGISTRATION_ID_HERE'
    AND status = 'pending'
);

-- Update the pending registration status
UPDATE public.pending_registrations 
SET 
    approved = true,
    approved_at = NOW(),
    approved_by = YOUR_ADMIN_USER_ID_HERE,
    status = 'approved'
WHERE id = 'PENDING_REGISTRATION_ID_HERE'
AND status = 'pending';

-- ================================================
-- 2. DIRECT EMAIL VERIFICATION (Manual Admin Action)
-- ================================================

-- If you want to verify a user's email directly by user_id:
UPDATE public.users 
SET 
    email_verified = true,
    email_verification_token = NULL,
    verification_token_expires = NULL
WHERE user_id = YOUR_USER_ID_HERE;

-- ================================================
-- 3. QUERIES TO CHECK STATUS
-- ================================================

-- Check if a user's email is verified:
SELECT user_id, username, email, email_verified, active
FROM public.users 
WHERE user_id = YOUR_USER_ID_HERE;

-- Find all pending registrations:
SELECT 
    pr.id,
    pr.email,
    pr.business_name,
    pr.first_name,
    pr.last_name,
    pr.created_at,
    u.user_id,
    u.username,
    u.active,
    u.email_verified
FROM public.pending_registrations pr
JOIN public.users u ON pr.user_id = u.user_id
WHERE pr.status = 'pending'
ORDER BY pr.created_at DESC;

-- Find all users with unverified emails:
SELECT user_id, username, email, email_verified, active, created_at 
FROM public.users 
WHERE email_verified = false 
AND email IS NOT NULL
ORDER BY created_at DESC;

-- ================================================
-- 4. REJECT PENDING REGISTRATION (Admin Action)
-- ================================================

-- If you want to reject a pending registration:
UPDATE public.pending_registrations 
SET 
    approved = false,
    approved_at = NOW(),
    approved_by = YOUR_ADMIN_USER_ID_HERE,
    status = 'rejected',
    rejection_reason = 'REASON_FOR_REJECTION_HERE'
WHERE id = 'PENDING_REGISTRATION_ID_HERE'
AND status = 'pending';
