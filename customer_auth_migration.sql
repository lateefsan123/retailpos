-- Add email and password columns to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS password_hash text,
ADD COLUMN IF NOT EXISTS account_setup_complete boolean DEFAULT false;

-- Create indexes for login lookups
CREATE INDEX IF NOT EXISTS idx_customers_email 
ON public.customers(email) WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_account_setup 
ON public.customers(phone_number, account_setup_complete);

-- Add unique constraint on email
ALTER TABLE public.customers 
ADD CONSTRAINT customers_email_unique UNIQUE (email);

-- Add comments
COMMENT ON COLUMN public.customers.email IS 'Customer email address for login';
COMMENT ON COLUMN public.customers.password_hash IS 'Hashed password for customer authentication';
COMMENT ON COLUMN public.customers.account_setup_complete IS 'Whether customer has completed initial account setup';
