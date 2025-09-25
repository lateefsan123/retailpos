-- Fix side_businesses table foreign key constraint
-- The current constraint references shop_staff.user_id but users are in the users table

-- First, check what constraints exist
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'side_businesses'
  AND kcu.column_name = 'owner_id';

-- Drop the existing foreign key constraint
ALTER TABLE side_businesses DROP CONSTRAINT IF EXISTS side_businesses_owner_id_fkey;

-- Add the correct foreign key constraint that references users.user_id
ALTER TABLE side_businesses 
ADD CONSTRAINT side_businesses_owner_id_fkey 
FOREIGN KEY (owner_id) REFERENCES users(user_id);

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_side_businesses_owner_id ON side_businesses(owner_id);

-- Note: This will allow the side_businesses table to properly reference users from the users table
-- instead of trying to reference the non-existent shop_staff table
