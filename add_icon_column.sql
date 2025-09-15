-- Add icon column to users table
-- Run this SQL command in your Supabase SQL Editor

ALTER TABLE users ADD COLUMN icon TEXT DEFAULT 'lily';

-- Update existing users to have default icons
UPDATE users SET icon = 'lily' WHERE icon IS NULL;
