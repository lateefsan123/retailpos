-- Simple OAuth migration for users table
-- Run this step by step in your Supabase SQL Editor

-- Step 1: Add email column
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;

-- Step 2: Add provider column
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'local';

-- Step 3: Add role column (rename from user_role)
DO $$ 
BEGIN
    -- Check if role column doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
        -- Check if user_role exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'user_role') THEN
            -- Add role column
            ALTER TABLE users ADD COLUMN role TEXT;
            -- Copy data from user_role to role
            UPDATE users SET role = user_role;
            -- Make role NOT NULL
            ALTER TABLE users ALTER COLUMN role SET NOT NULL;
            -- Drop old user_role column
            ALTER TABLE users DROP COLUMN user_role;
        ELSE
            -- Add role column with default
            ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
        END IF;
    END IF;
END $$;

-- Step 4: Make password_hash nullable for OAuth users
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Step 5: Update existing users to have 'local' provider
UPDATE users SET provider = 'local' WHERE provider IS NULL;

-- Step 6: Create indexes (ignore errors if they already exist)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider);

-- Step 7: Verify the final schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;
