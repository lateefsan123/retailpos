-- Fix all foreign key constraints that incorrectly reference shop_staff instead of users
-- This addresses the issue where users are stored in the 'users' table but foreign keys reference 'shop_staff'

-- 1. Fix side_businesses table
ALTER TABLE side_businesses DROP CONSTRAINT IF EXISTS side_businesses_owner_id_fkey;
ALTER TABLE side_businesses 
ADD CONSTRAINT side_businesses_owner_id_fkey 
FOREIGN KEY (owner_id) REFERENCES users(user_id);

-- 2. Fix reminders table
ALTER TABLE reminders DROP CONSTRAINT IF EXISTS reminders_owner_id_fkey;
ALTER TABLE reminders 
ADD CONSTRAINT reminders_owner_id_fkey 
FOREIGN KEY (owner_id) REFERENCES users(user_id);

-- 3. Fix vault table
ALTER TABLE vault DROP CONSTRAINT IF EXISTS vault_owner_id_fkey;
ALTER TABLE vault 
ADD CONSTRAINT vault_owner_id_fkey 
FOREIGN KEY (owner_id) REFERENCES users(user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_side_businesses_owner_id ON side_businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_reminders_owner_id ON reminders(owner_id);
CREATE INDEX IF NOT EXISTS idx_vault_owner_id ON vault(owner_id);

-- Verify the changes
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
  AND tc.table_name IN ('side_businesses', 'reminders', 'vault')
  AND kcu.column_name = 'owner_id'
ORDER BY tc.table_name;

-- Note: This fixes the foreign key constraint errors that occur when trying to:
-- - Add side businesses (side_businesses.owner_id)
-- - Create reminders (reminders.owner_id) 
-- - Create vault entries (vault.owner_id)
-- All these now properly reference users.user_id instead of the non-existent shop_staff.user_id
