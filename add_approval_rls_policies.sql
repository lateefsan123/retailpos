-- Add RLS policies to gate access for approved users only
-- This ensures that only users with approved registrations can access the system

-- First, let's add a helper function to check if a user is approved
-- This function will be used in RLS policies
CREATE OR REPLACE FUNCTION public.is_user_approved(user_id_param integer)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.pending_registrations pr
    WHERE pr.user_id = user_id_param
    AND pr.approved = true
    AND pr.status = 'approved'
  ) OR NOT EXISTS (
    -- If no pending registration exists, assume legacy user is approved
    SELECT 1 
    FROM public.pending_registrations pr
    WHERE pr.user_id = user_id_param
  );
$$;

-- Enable RLS on key tables that should be protected
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
-- Only approved users can view user data
CREATE POLICY "Approved users can view users" ON public.users
  FOR SELECT USING (
    public.is_user_approved(user_id)
  );

-- Only approved users can update their own data
CREATE POLICY "Approved users can update own data" ON public.users
  FOR UPDATE USING (
    public.is_user_approved(user_id)
  );

-- Create policies for business_info table
-- Only approved users can view business info
CREATE POLICY "Approved users can view business info" ON public.business_info
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.business_id = business_info.business_id
      AND public.is_user_approved(u.user_id)
    )
  );

-- Only approved users can update business info
CREATE POLICY "Approved users can update business info" ON public.business_info
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.business_id = business_info.business_id
      AND public.is_user_approved(u.user_id)
    )
  );

-- Create policies for products table
-- Only approved users can view products
CREATE POLICY "Approved users can view products" ON public.products
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.business_id = products.business_id
      AND public.is_user_approved(u.user_id)
    )
  );

-- Only approved users can manage products
CREATE POLICY "Approved users can manage products" ON public.products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.business_id = products.business_id
      AND public.is_user_approved(u.user_id)
    )
  );

-- Create policies for sales table
-- Only approved users can view sales
CREATE POLICY "Approved users can view sales" ON public.sales
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.business_id = sales.business_id
      AND public.is_user_approved(u.user_id)
    )
  );

-- Only approved users can create sales
CREATE POLICY "Approved users can create sales" ON public.sales
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.business_id = sales.business_id
      AND public.is_user_approved(u.user_id)
    )
  );

-- Create policies for customers table
-- Only approved users can view customers
CREATE POLICY "Approved users can view customers" ON public.customers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.business_id = customers.business_id
      AND public.is_user_approved(u.user_id)
    )
  );

-- Only approved users can manage customers
CREATE POLICY "Approved users can manage customers" ON public.customers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.business_id = customers.business_id
      AND public.is_user_approved(u.user_id)
    )
  );

-- Create policies for branches table
-- Only approved users can view branches
CREATE POLICY "Approved users can view branches" ON public.branches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.business_id = branches.business_id
      AND public.is_user_approved(u.user_id)
    )
  );

-- Only approved users can manage branches
CREATE POLICY "Approved users can manage branches" ON public.branches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.business_id = branches.business_id
      AND public.is_user_approved(u.user_id)
    )
  );

-- Allow system to insert new users and businesses (for registration)
CREATE POLICY "Allow user registration" ON public.users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow business registration" ON public.business_info
  FOR INSERT WITH CHECK (true);

-- Allow system to insert new branches during registration
CREATE POLICY "Allow branch creation during registration" ON public.branches
  FOR INSERT WITH CHECK (true);

-- Add comments for documentation
COMMENT ON FUNCTION public.is_user_approved(integer) IS 'Checks if a user has been approved through the pending_registrations table';

