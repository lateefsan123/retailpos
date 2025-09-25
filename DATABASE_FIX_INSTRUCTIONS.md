# Database Fix Instructions

## Problem
You're getting foreign key constraint errors when trying to add side businesses because the database schema references a `shop_staff` table that doesn't exist, but your users are stored in the `users` table.

## Solution
Run the SQL script to fix the foreign key constraints.

## Steps to Fix

### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `fix_all_shop_staff_foreign_keys.sql`
4. Click "Run" to execute the script

### Option 2: Using psql command line
```bash
psql -h your-db-host -U your-username -d your-database -f fix_all_shop_staff_foreign_keys.sql
```

### Option 3: Using any PostgreSQL client
Open the `fix_all_shop_staff_foreign_keys.sql` file and execute it in your preferred PostgreSQL client.

## What the Script Does
1. Drops incorrect foreign key constraints that reference `shop_staff.user_id`
2. Creates new foreign key constraints that properly reference `users.user_id`
3. Adds performance indexes
4. Verifies the changes

## Tables Fixed
- `side_businesses` - Fixes side business creation
- `reminders` - Fixes reminder creation
- `vault` - Fixes vault entry creation

## After Running the Script
- You'll be able to add side businesses without errors
- All user-related operations will work correctly
- The system will properly reference users from the `users` table

## Verification
After running the script, you should see output showing the new foreign key constraints that reference `users.user_id` instead of `shop_staff.user_id`.
