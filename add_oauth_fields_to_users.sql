-- Add OAuth support fields to users table
-- Run this SQL in your Supabase SQL Editor

-- Add email and provider fields to users table
ALTER TABLE users 
ADD COLUMN email TEXT,
ADD COLUMN provider TEXT DEFAULT 'local';

-- Add unique constraint on email for OAuth users
ALTER TABLE users 
ADD CONSTRAINT unique_email UNIQUE (email);

-- Update existing users to have 'local' provider
UPDATE users SET provider = 'local' WHERE provider IS NULL;

-- Make password_hash nullable for OAuth users
ALTER TABLE users 
ALTER COLUMN password_hash DROP NOT NULL;

-- Add role field (rename from user_role for consistency)
ALTER TABLE users 
ADD COLUMN role TEXT;

-- Copy data from user_role to role
UPDATE users SET role = user_role;

-- Make role NOT NULL and drop old user_role column
ALTER TABLE users 
ALTER COLUMN role SET NOT NULL;

ALTER TABLE users 
DROP COLUMN user_role;

-- Create index on email for faster lookups
CREATE INDEX idx_users_email ON users(email);

-- Create index on provider for faster lookups
CREATE INDEX idx_users_provider ON users(provider);
