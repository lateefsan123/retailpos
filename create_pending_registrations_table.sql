-- Create pending_registrations table for manual approval system
-- This table will track new user registrations that need admin approval

CREATE TABLE IF NOT EXISTS public.pending_registrations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id integer NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  email text NOT NULL,
  business_name text NOT NULL,
  first_name text,
  last_name text,
  phone text,
  business_type text,
  business_description text,
  business_address text,
  business_phone text,
  currency text DEFAULT 'USD',
  website text,
  vat_number text,
  open_time text,
  close_time text,
  created_at timestamp with time zone DEFAULT now(),
  approved boolean DEFAULT false,
  approved_at timestamp with time zone,
  approved_by integer REFERENCES public.users(user_id),
  rejection_reason text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pending_registrations_user_id ON public.pending_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_registrations_email ON public.pending_registrations(email);
CREATE INDEX IF NOT EXISTS idx_pending_registrations_status ON public.pending_registrations(status);
CREATE INDEX IF NOT EXISTS idx_pending_registrations_created_at ON public.pending_registrations(created_at);

-- Add comments for documentation
COMMENT ON TABLE public.pending_registrations IS 'Tracks new user registrations awaiting admin approval';
COMMENT ON COLUMN public.pending_registrations.status IS 'Current status: pending, approved, or rejected';
COMMENT ON COLUMN public.pending_registrations.approved_by IS 'User ID of the admin who approved/rejected the registration';

-- Note: RLS is disabled for this table since the system uses custom authentication
-- Access control will be handled at the application level
-- ALTER TABLE public.pending_registrations ENABLE ROW LEVEL SECURITY;
