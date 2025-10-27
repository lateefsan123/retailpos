-- Voucher Redemption System Database Migration
-- Created for TillPoint POS System

-- 1. Create Vouchers Management Table
CREATE TABLE IF NOT EXISTS public.vouchers (
  voucher_id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES public.business_info(business_id) ON DELETE CASCADE,
  branch_id INTEGER REFERENCES public.branches(branch_id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  points_cost INTEGER NOT NULL CHECK (points_cost > 0),
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Customer Vouchers Table
CREATE TABLE IF NOT EXISTS public.customer_vouchers (
  customer_voucher_id SERIAL PRIMARY KEY,
  voucher_id INTEGER NOT NULL REFERENCES public.vouchers(voucher_id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES public.customers(customer_id) ON DELETE CASCADE,
  voucher_code TEXT UNIQUE NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  is_used BOOLEAN DEFAULT false,
  used_by_user_id INTEGER REFERENCES public.users(user_id) ON DELETE SET NULL,
  sale_id INTEGER REFERENCES public.sales(sale_id) ON DELETE SET NULL
);

-- 3. Create Database Function for Redemption
CREATE OR REPLACE FUNCTION public.redeem_voucher(
  p_customer_id INTEGER,
  p_voucher_id INTEGER,
  p_voucher_code TEXT,
  p_points_cost INTEGER
) RETURNS public.customer_vouchers AS $$
DECLARE
  v_current_points INTEGER;
  v_customer_voucher public.customer_vouchers;
BEGIN
  -- Check if customer has enough points
  SELECT loyalty_points INTO v_current_points 
  FROM public.customers 
  WHERE customer_id = p_customer_id;
  
  IF v_current_points IS NULL THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;
  
  IF v_current_points < p_points_cost THEN
    RAISE EXCEPTION 'Insufficient points. Customer has % points, but % points are required.', v_current_points, p_points_cost;
  END IF;
  
  -- Deduct points
  UPDATE public.customers 
  SET loyalty_points = loyalty_points - p_points_cost 
  WHERE customer_id = p_customer_id;
  
  -- Create customer voucher
  INSERT INTO public.customer_vouchers (voucher_id, customer_id, voucher_code)
  VALUES (p_voucher_id, p_customer_id, p_voucher_code)
  RETURNING * INTO v_customer_voucher;
  
  RETURN v_customer_voucher;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_vouchers_business_id ON public.vouchers(business_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_branch_id ON public.vouchers(branch_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_is_active ON public.vouchers(is_active);
CREATE INDEX IF NOT EXISTS idx_customer_vouchers_customer_id ON public.customer_vouchers(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_vouchers_voucher_code ON public.customer_vouchers(voucher_code);
CREATE INDEX IF NOT EXISTS idx_customer_vouchers_is_used ON public.customer_vouchers(is_used);

-- 5. Add Comments
COMMENT ON TABLE public.vouchers IS 'Voucher templates that can be redeemed with loyalty points';
COMMENT ON TABLE public.customer_vouchers IS 'Individual vouchers redeemed by customers';
COMMENT ON FUNCTION public.redeem_voucher IS 'Deducts points from customer and creates a customer voucher';
