-- Remove username uniqueness constraint
-- This allows multiple users to have the same username (only emails need to be unique)

-- Check if the constraint exists and remove it
DO $$ 
BEGIN
    -- Remove unique constraint on username if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_username_key' 
        AND table_name = 'users'
    ) THEN
        ALTER TABLE public.users DROP CONSTRAINT users_username_key;
        RAISE NOTICE 'Removed username uniqueness constraint';
    ELSE
        RAISE NOTICE 'Username uniqueness constraint does not exist';
    END IF;
END $$;

-- Also ensure business name uniqueness is removed (if not already done)
DO $$ 
BEGIN
    -- Remove unique constraint on business name if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'business_info_name_key' 
        AND table_name = 'business_info'
    ) THEN
        ALTER TABLE public.business_info DROP CONSTRAINT business_info_name_key;
        RAISE NOTICE 'Removed business name uniqueness constraint';
    ELSE
        RAISE NOTICE 'Business name uniqueness constraint does not exist';
    END IF;
END $$;
