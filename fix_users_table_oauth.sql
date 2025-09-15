-- Fix users table for OAuth support
-- Run this SQL in your Supabase SQL Editor

-- First, let's check what columns exist
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'users';

-- Add email field if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email') THEN
        ALTER TABLE users ADD COLUMN email TEXT;
    END IF;
END $$;

-- Add provider field if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'provider') THEN
        ALTER TABLE users ADD COLUMN provider TEXT DEFAULT 'local';
    END IF;
END $$;

-- Add role field if it doesn't exist (rename from user_role)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
        -- Check if user_role exists and copy data
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'user_role') THEN
            ALTER TABLE users ADD COLUMN role TEXT;
            UPDATE users SET role = user_role;
            ALTER TABLE users ALTER COLUMN role SET NOT NULL;
            ALTER TABLE users DROP COLUMN user_role;
        ELSE
            ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
        END IF;
    END IF;
END $$;

-- Make password_hash nullable for OAuth users
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Add unique constraint on email (only if email column exists and has data)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email') THEN
        -- Only add constraint if there are no duplicate emails
        BEGIN
            ALTER TABLE users ADD CONSTRAINT unique_email UNIQUE (email);
        EXCEPTION
            WHEN duplicate_table THEN
                -- Constraint already exists, do nothing
                NULL;
            WHEN unique_violation THEN
                -- There are duplicate emails, skip constraint
                NULL;
        END;
    END IF;
END $$;

-- Update existing users to have 'local' provider
UPDATE users SET provider = 'local' WHERE provider IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider);

-- Verify the final schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;
