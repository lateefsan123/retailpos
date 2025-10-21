# Signup Page Fix - Setup Guide

## Issues Fixed

### 1. **Admin API Calls from Client-Side (CRITICAL)**
The signup process was attempting to use `supabase.auth.admin.deleteUser()` which requires service role privileges. These admin API calls cannot be executed from client-side browser code and were causing the registration to fail.

**Fixed in:** `src/contexts/AuthContext.tsx`
- Removed admin API cleanup calls (lines 452 and 509)
- Added comments explaining that cleanup requires server-side code

### 2. **Test Connection Functionality Removed**
- Removed test Supabase connection button and functionality from signup page
- Deleted `src/utils/testSupabase.ts` and `src/utils/simpleSupabaseTest.ts` files
- Removed all console.log statements from `src/lib/supabaseClient.ts`

## Required Setup

### **Create `.env` File**
You need to create a `.env` file in the project root with your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**Where to find these values:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to Settings → API
4. Copy the "Project URL" → use as `VITE_SUPABASE_URL`
5. Copy the "anon/public" key → use as `VITE_SUPABASE_ANON_KEY`

**Example:**
```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0MDAwMDAwMCwiZXhwIjoxOTU1NTc2MDAwfQ.example-signature-here
```

## Testing the Fix

1. **Create the `.env` file** with your Supabase credentials
2. **Restart the dev server:**
   ```bash
   npm run dev
   ```
3. **Navigate to the signup page**
4. **Fill in the signup form** with valid information
5. **Submit the form**

### Expected Behavior:
- You should be redirected to the email verification step (Step 4)
- A verification email should be sent to the provided email address
- No console errors should appear in the browser developer tools

## Signup Flow Overview

The registration process now works as follows:

1. **Collect user information** (Steps 1-3)
2. **Submit form** - Creates:
   - Supabase Auth user (for authentication)
   - Business record in `business_info` table
   - Default branch in `branches` table
   - User record in `users` table (linked to auth user)
3. **Email verification** (Step 4)
   - User receives verification email
   - Must click verification link
   - Account is activated immediately (no admin approval needed for new auth flow)

## Troubleshooting

### "Missing Supabase environment variables" Error
- You need to create the `.env` file with your Supabase credentials
- Make sure the file is in the project root (same directory as `package.json`)
- Restart the dev server after creating the file

### "Failed to create account" Error
- Check that your Supabase project has email authentication enabled
- Verify that the database tables exist (run migration SQL if needed)
- Check browser console for specific error messages

### Database Migration Required
If you get errors about missing tables or columns, you may need to run the migration SQL:
- Open your Supabase project dashboard
- Go to SQL Editor
- Run the contents of `supabase_auth_migration.sql`

## Additional Notes

- Check browser console for specific error messages to diagnose configuration issues
- Both desktop (`/signup`) and mobile (`/signup-mobile`) signup pages have been updated
- Password hashing for user switching is maintained for backward compatibility with existing users

