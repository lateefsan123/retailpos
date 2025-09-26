# Manual Approval System Setup Guide

This guide explains how to set up the manual approval system for user registrations in your POS system.

## Overview

The manual approval system allows you to:
1. Receive new user registrations in a pending state
2. Review registration details before approval
3. Approve or reject registrations manually
4. Control access to the system based on approval status

## Setup Steps

### 1. Create the Pending Registrations Table

Run the SQL file `create_pending_registrations_table.sql` in your Supabase SQL editor:

```sql
-- This creates the pending_registrations table to track new registrations
-- Run this first
```

### 2. Add RLS Policies (Optional but Recommended)

Run the SQL file `add_approval_rls_policies.sql` in your Supabase SQL editor:

```sql
-- This adds Row Level Security policies to gate access for approved users only
-- This ensures unapproved users cannot access system data
```

### 3. Test the Setup

Run the SQL file `test_approval_flow.sql` to verify everything is working:

```sql
-- This tests the approval flow and checks if policies are working
```

## How It Works

### Registration Flow

1. **User Signs Up**: When a user completes the signup form, the system:
   - Creates the business and user records
   - Sets the user as `active: false` (inactive)
   - Creates a record in `pending_registrations` table with status `pending`
   - Shows a "pending approval" message to the user

2. **Admin Review**: Administrators can:
   - View all pending registrations in the Admin panel
   - Click "Pending Registrations" button to see the list
   - View detailed information about each registration
   - Approve or reject registrations

3. **Approval Process**: When an admin approves:
   - User's `active` status is set to `true`
   - Pending registration status is updated to `approved`
   - User can now log in and access the system

4. **Rejection Process**: When an admin rejects:
   - Pending registration status is updated to `rejected`
   - Rejection reason is recorded
   - User remains inactive and cannot access the system

### Access Control

With RLS policies enabled:
- Only approved users can view and modify system data
- Unapproved users cannot access products, sales, customers, etc.
- The system automatically checks approval status for all data access

## Admin Interface

### Accessing Pending Registrations

1. Log in as an admin user
2. Go to the Admin panel
3. Click the "Pending Registrations" button
4. View the list of pending registrations

### Approving/Rejecting Registrations

1. Click "View Details" on any pending registration
2. Review the business and contact information
3. For approval: Click "Approve" button
4. For rejection: Enter a reason and click "Reject" button

## Database Schema

### pending_registrations Table

```sql
CREATE TABLE public.pending_registrations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id integer NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  email text NOT NULL,
  business_name text NOT NULL,
  first_name text,
  last_name text,
  phone text,
  business_type text,
  business_description text,
  business_address text,
  business_phone text,
  currency text DEFAULT 'USD',
  website text,
  vat_number text,
  open_time text,
  close_time text,
  created_at timestamp with time zone DEFAULT now(),
  approved boolean DEFAULT false,
  approved_at timestamp with time zone,
  approved_by integer REFERENCES public.users(user_id),
  rejection_reason text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'))
);
```

## Security Considerations

1. **RLS Policies**: The RLS policies ensure that only approved users can access system data
2. **Admin Access**: Only users with Admin role can approve/reject registrations
3. **Data Isolation**: Each business's data is isolated by business_id
4. **Audit Trail**: All approvals/rejections are logged with timestamps and admin user IDs

## Troubleshooting

### Common Issues

1. **"Cannot cast type uuid to integer"**: This error occurs if you try to use Supabase Auth with integer user IDs. The current setup uses custom authentication, so RLS policies are simplified.

2. **Users can't access data after approval**: Check if RLS policies are enabled and the `is_user_approved` function is working correctly.

3. **Pending registrations not showing**: Ensure the `pending_registrations` table exists and has data.

### Testing

Use the `test_approval_flow.sql` file to verify:
- Pending registrations table exists
- RLS policies are enabled
- Approval function works correctly
- Data access is properly gated

## Migration from Existing System

If you have existing users, they will be treated as approved by default since they won't have entries in the `pending_registrations` table. The `is_user_approved` function handles this case.

## Customization

You can customize the approval flow by:
- Modifying the `PendingRegistrations` component
- Adding email notifications for approvals/rejections
- Creating custom approval workflows
- Adding additional validation rules

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify database tables and policies are set up correctly
3. Test with the provided SQL scripts
4. Check Supabase logs for any database errors

