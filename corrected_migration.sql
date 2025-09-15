-- Corrected OAuth migration - checks existing schema first
-- Run this in your Supabase SQL Editor

-- First, let's see what columns actually exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Step 1: Add email column
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;

-- Step 2: Add provider column  
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'local';

-- Step 3: Add role column
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT;

-- Step 4: Check what role column exists and copy data
DO $$ 
BEGIN
    -- Check if user_role exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'user_role') THEN
        UPDATE users SET role = user_role WHERE user_role IS NOT NULL AND role IS NULL;
        RAISE NOTICE 'Copied data from user_role to role';
    -- Check if role already exists with data
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
        -- Check if role column has data
        IF EXISTS (SELECT 1 FROM users WHERE role IS NOT NULL LIMIT 1) THEN
            RAISE NOTICE 'Role column already has data';
        ELSE
            -- Set default role for existing users
            UPDATE users SET role = 'user' WHERE role IS NULL;
            RAISE NOTICE 'Set default role for existing users';
        END IF;
    END IF;
END $$;

-- Step 5: Make role NOT NULL
ALTER TABLE users ALTER COLUMN role SET NOT NULL;

-- Step 6: Drop old user_role column (only if it exists and we've copied the data)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'user_role') THEN
        ALTER TABLE users DROP COLUMN user_role;
        RAISE NOTICE 'Dropped user_role column';
    END IF;
END $$;

-- Step 7: Make password_hash nullable
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Step 8: Update existing users
UPDATE users SET provider = 'local' WHERE provider IS NULL;

-- Step 9: Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider);

-- Step 10: Verify final schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;
