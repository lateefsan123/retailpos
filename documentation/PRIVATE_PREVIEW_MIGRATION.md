# Private Preview Access Gate - Database Migration

## Overview
This migration adds a `private_preview` boolean column to the `users` table to implement a site-wide access gate for new business owner signups.

## Database Changes

### 1. Add Column to Users Table
```sql
-- Add private_preview column to users table
ALTER TABLE public.users 
ADD COLUMN private_preview boolean DEFAULT true;

-- Set all existing users to have private preview access
UPDATE public.users 
SET private_preview = true 
WHERE private_preview IS NULL;
```

### 2. Migration Notes
- **Default Value**: `true` for existing users (backward compatibility)
- **New Signups**: Will be set to `false` by the application
- **Manual Approval**: Set to `true` in Supabase to grant access

## How It Works

### For New Signups
1. User signs up through the registration form
2. Account is created with `private_preview = false`
3. User cannot log in until manually approved
4. Admin sets `private_preview = true` in Supabase to grant access

### For Existing Users
- All existing users automatically have `private_preview = true`
- No disruption to current users
- Can continue using the system normally

### Access Control Logic
- Only affects users with role `'owner'` or `'admin'`
- Users with roles `'cashier'`, `'manager'`, etc. are not affected
- Internal users created through Admin page bypass this check

## Manual Approval Process
1. Go to Supabase Dashboard
2. Navigate to Table Editor → `users` table
3. Find the user who needs access
4. Set `private_preview` column to `true`
5. User can now log in successfully

## Error Messages
When a user without private preview access tries to log in:
- **Error Message**: "Your account is pending approval. Please wait for access to be granted."
- **Displayed**: Above the login form
- **Rate Limited**: Failed attempts are tracked for security

## Rollback Instructions
If you need to remove this feature:
```sql
-- Remove the private_preview column
ALTER TABLE public.users 
DROP COLUMN private_preview;
```

## Testing
1. Create a new account through signup
2. Try to log in - should see pending approval message
3. Set `private_preview = true` in Supabase
4. Try to log in again - should work successfully

