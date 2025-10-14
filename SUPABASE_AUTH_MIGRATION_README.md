# Supabase Authentication Integration - Migration Guide

## Overview

This migration integrates Supabase Authentication into the POS system while maintaining backward compatibility with existing users who use custom password hashing.

## Changes Made

### 1. Database Schema (`supabase_auth_migration.sql`)

**New columns added to `users` table:**
- `auth_user_id` (UUID) - Links to Supabase Auth users
- `pin` (text) - For quick user switching within business

**Modified columns:**
- `password_hash` - Now nullable (NULL for Supabase Auth users, populated for legacy users)

**New indexes:**
- `idx_users_auth_user_id` - For efficient auth_user_id lookups
- `idx_users_pin` - For PIN-based user switching
- `idx_users_auth_user_id_unique` - Ensures one-to-one relationship

### 2. Authentication Context (`src/contexts/AuthContext.tsx`)

**Updated functions:**

#### `register()` function:
- Now creates a Supabase Auth user first using `supabase.auth.signUp()`
- Links the auth user ID to the users table record
- Sets `password_hash` to NULL for new users
- Maintains existing business and branch creation logic

#### `login()` function:
- Attempts Supabase Auth login first using `supabase.auth.signInWithPassword()`
- Falls back to legacy password hash authentication for existing users
- Properly handles both auth types seamlessly

#### `loadUserProfile()` function:
- Now accepts an optional `isAuthId` parameter
- Can load users by either `user_id` (legacy) or `auth_user_id` (Supabase)
- Called correctly from session management hooks

#### `switchUser()` function:
- Unchanged - continues to support PIN and password-based switching
- Works with both legacy and Supabase Auth users

### 3. Utility Functions (`src/utils/auth.ts`)

- Added deprecation notices to `hashPassword()` and `hashPasswordAlternative()`
- Functions maintained for backward compatibility with legacy users

### 4. Type Definitions (`src/types/multitenant.ts`)

- User interface already includes `auth_user_id?: string` field
- No changes needed

## Migration Steps

### Step 1: Run Database Migration

1. Log into your Supabase Dashboard
2. Go to SQL Editor
3. Open the `supabase_auth_migration.sql` file
4. Run the migration script
5. Verify the changes by running the verification queries at the end

### Step 2: Verify Supabase Auth Configuration

1. Go to Authentication → Providers in Supabase Dashboard
2. Ensure **Email** provider is enabled ✅
3. Configure email settings:
   - **Email Confirmation**: Disabled (for faster onboarding) or enabled with templates
   - **Minimum Password Length**: 6 characters (or your preference)
4. Add your site URLs under URL Configuration:
   - **Site URL**: Your production URL
   - **Redirect URLs**: Add your app URLs (e.g., `http://localhost:5173`, production URL)

### Step 3: Deploy Code Changes

1. The code changes are already in place
2. Test locally first (see Testing section below)
3. Deploy to production once verified

## How It Works

### New User Registration Flow

1. User fills out the registration form with email, password, and business details
2. System creates a Supabase Auth user with email/password
3. System creates business_info record
4. System creates default branch
5. System creates users table record with:
   - `auth_user_id` = Supabase Auth user ID (for login page)
   - `password_hash` = Hashed password (for select-user page)
   - Other user details
6. User is now registered and can log in using Supabase Auth OR password on select-user page

### New User Login Flow

1. User enters email and password
2. System attempts Supabase Auth login
3. If successful, loads user profile from users table using `auth_user_id`
4. Session is managed by Supabase Auth automatically
5. User is logged in

### Legacy User Login Flow

1. User enters email and password
2. System attempts Supabase Auth login (fails because no Supabase Auth account)
3. System falls back to legacy authentication
4. Queries users table by email
5. Hashes provided password and compares with stored `password_hash`
6. If match, user is logged in using legacy auth
7. Session is managed locally (localStorage)

### User Switching

- **PIN-based**: Works for all users (quick switching)
- **Password-based**: Works for all users (owner and staff) with `password_hash`
- Both Supabase Auth users and regular users can switch using their password

## Testing Checklist

### Before Testing
- [ ] Database migration completed successfully
- [ ] Supabase Email Auth is enabled
- [ ] Code deployed to test environment

### Test New User Registration
- [ ] Fill out registration form with all required fields
- [ ] Submit form
- [ ] Check Supabase Dashboard → Authentication → Users (should see new user)
- [ ] Check users table in database (should have auth_user_id populated, password_hash = NULL)
- [ ] Check business_info table (should have new business)
- [ ] Check branches table (should have default branch)
- [ ] Verify redirect to login or user selection page

### Test New User Login
- [ ] Go to login page
- [ ] Enter registered email and password
- [ ] Submit form
- [ ] Should successfully log in
- [ ] Check localStorage for pos_user data
- [ ] Navigate to dashboard (should show correct business data)
- [ ] Refresh page (session should persist)
- [ ] Log out and log back in (should work)

### Test Legacy User Login (if applicable)
- [ ] Try logging in with an existing legacy user
- [ ] Should successfully log in using fallback auth
- [ ] Verify user data loads correctly
- [ ] Check that all features work normally

### Test User Switching
- [ ] Log in as owner
- [ ] Create a new user with PIN
- [ ] Try switching to new user using PIN
- [ ] Should successfully switch users
- [ ] Verify correct user context is loaded

### Test Error Handling
- [ ] Try registering with duplicate email (should show error)
- [ ] Try registering with duplicate username (should show error)
- [ ] Try registering with duplicate business name (should show error)
- [ ] Try logging in with wrong password (should show error)
- [ ] Try logging in with non-existent email (should show error)
- [ ] Try registering with weak password if Supabase has minimum requirements

## Rollback Plan

If you need to rollback the changes:

### Rollback Database Changes
```sql
-- Remove new columns
ALTER TABLE public.users DROP COLUMN IF EXISTS auth_user_id;
ALTER TABLE public.users DROP COLUMN IF EXISTS pin;

-- Make password_hash required again (only if no users have NULL password_hash)
ALTER TABLE public.users ALTER COLUMN password_hash SET NOT NULL;

-- Drop indexes
DROP INDEX IF EXISTS idx_users_auth_user_id;
DROP INDEX IF EXISTS idx_users_pin;
DROP INDEX IF EXISTS idx_users_auth_user_id_unique;
```

### Rollback Code Changes
- Revert the `AuthContext.tsx` file to previous version
- Revert the `auth.ts` file to previous version
- Redeploy

## Backward Compatibility

✅ **Existing users can continue to log in** using their current credentials
✅ **All existing features continue to work** as before
✅ **New users get improved security** with Supabase Auth
✅ **Gradual migration path** - no forced migration required

## Future Enhancements

1. **Link Legacy Users to Supabase Auth**
   - Add "Upgrade Account" feature
   - Require password reset to create Supabase Auth account
   - Link existing user record to new auth_user_id

2. **Email Verification**
   - Enable email confirmation in Supabase
   - Add email verification flow to registration

3. **Password Reset**
   - Implement password reset using Supabase Auth
   - Send password reset emails

4. **Social Auth**
   - Add Google/Facebook/etc. login options
   - Link social accounts to user records

## Support

If you encounter any issues:

1. Check Supabase Dashboard → Authentication → Logs for auth errors
2. Check browser console for client-side errors
3. Check database logs for query errors
4. Review this README for troubleshooting steps

## Notes

- **Email is now required** for registration (needed for Supabase Auth)
- **Supabase manages sessions** automatically (token refresh, expiry, etc.)
- **Legacy users don't need to do anything** - their auth continues to work
- **User switching** is designed for within-business switching, not cross-business

