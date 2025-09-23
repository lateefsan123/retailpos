-- Add last_used column to users table to track when users were last active
-- This will help with user activity tracking and session management

-- Add the last_used column with a default value of current timestamp
ALTER TABLE users 
ADD COLUMN last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create an index on last_used for better query performance
CREATE INDEX idx_users_last_used ON users(last_used);

-- Update existing users to have their last_used set to their created_at time
-- (assuming they haven't been used yet)
UPDATE users 
SET last_used = created_at 
WHERE last_used IS NULL;

-- Add a comment to document the column purpose
COMMENT ON COLUMN users.last_used IS 'Timestamp of when the user was last active in the system';

-- Optional: Create a function to automatically update last_used on login
-- This function can be called whenever a user logs in or performs an action
CREATE OR REPLACE FUNCTION update_user_last_used(user_id_param INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE users 
    SET last_used = NOW() 
    WHERE user_id = user_id_param;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION update_user_last_used(INTEGER) TO authenticated;
