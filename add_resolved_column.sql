-- Add resolved column to existing reminders table
-- Run this in your Supabase SQL editor if you already have a reminders table

-- First, check if the reminders table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'reminders') THEN
        RAISE EXCEPTION 'The reminders table does not exist. Please run database-schema.sql first to create the table.';
    END IF;
END $$;

-- Add resolved column if it doesn't exist
ALTER TABLE reminders 
ADD COLUMN IF NOT EXISTS resolved BOOLEAN DEFAULT FALSE;

-- Update existing reminders to have resolved = false
UPDATE reminders 
SET resolved = FALSE 
WHERE resolved IS NULL;

-- Add a comment to document the column
COMMENT ON COLUMN reminders.resolved IS 'Indicates whether the reminder has been completed/resolved';

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'reminders' 
AND column_name = 'resolved';
