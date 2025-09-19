# Reminders Feature Setup

The reminders feature with checkbox functionality requires the `resolved` column to be added to your database.

## Quick Fix

**If you already have a reminders table:**
1. Go to your Supabase SQL Editor
2. Run the contents of `add_resolved_column.sql`
3. Refresh your app

**If you don't have a reminders table yet:**
1. Go to your Supabase SQL Editor  
2. Run the contents of `database-schema.sql`
3. Refresh your app

## What the Feature Does

- ✅ **Checkbox**: Click the checkbox next to any reminder title to mark it as completed
- ✅ **Visual Feedback**: Completed reminders are crossed out and dimmed
- ✅ **Filter Toggle**: Use "Show All/Hide Completed" button to focus on pending tasks
- ✅ **Database Sync**: Resolved status is saved to the database

## Troubleshooting

If the checkboxes don't work:

1. **Check the browser console** for error messages
2. **Verify the database column exists**:
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'reminders' AND column_name = 'resolved';
   ```
3. **Check if you're in offline mode** - the app will show an offline notice if the database table doesn't exist

## Database Schema

The reminders table should have these columns:
- `reminder_id` (SERIAL PRIMARY KEY)
- `owner_id` (INTEGER)
- `title` (VARCHAR)
- `body` (TEXT)
- `remind_date` (DATE)
- `resolved` (BOOLEAN DEFAULT FALSE) ← **This is the new column**
- `created_at` (TIMESTAMP)

## Files Modified

- `src/pages/Reminders.tsx` - Added checkbox UI and resolved functionality
- `src/pages/Reminders.module.css` - Added styling for resolved reminders
- `database-schema.sql` - Complete database setup
- `add_resolved_column.sql` - Just adds the resolved column to existing table
