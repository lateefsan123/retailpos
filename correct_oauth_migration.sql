-- Correct OAuth migration for your actual schema
-- Your schema already has Supabase Auth integration via profiles table

-- Step 1: Add email and provider to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'local';

-- Step 2: Make password_hash nullable for OAuth users
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Step 3: Update existing users to have 'local' provider
UPDATE users SET provider = 'local' WHERE provider IS NULL;

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider);

-- Step 5: Verify the final schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Step 6: Check what role enum values exist
SELECT unnest(enum_range(NULL::user_role)) as role_values;
