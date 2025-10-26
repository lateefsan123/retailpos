-- Add missing columns to customers table for customer portal authentication

-- Add password_hash column
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS password_hash text;

-- Add account_setup_complete column
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS account_setup_complete boolean DEFAULT false;

-- Add index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_customers_email 
ON public.customers(email) 
WHERE email IS NOT NULL;

-- Add index for faster phone lookups
CREATE INDEX IF NOT EXISTS idx_customers_phone 
ON public.customers(phone_number) 
WHERE phone_number IS NOT NULL;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'customers' 
AND column_name IN ('password_hash', 'account_setup_complete')
ORDER BY column_name;
