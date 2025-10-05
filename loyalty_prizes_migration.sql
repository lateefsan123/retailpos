-- =====================================================
-- LOYALTY PRIZES SYSTEM
-- =====================================================
-- This migration creates tables for managing loyalty prizes
-- where customers can redeem points for products from inventory

-- =====================================================
-- 1. LOYALTY_PRIZES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.loyalty_prizes (
  prize_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  business_id integer NOT NULL,
  branch_id integer,
  product_id text NOT NULL,
  points_required integer NOT NULL CHECK (points_required > 0),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  created_by integer,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT loyalty_prizes_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_info(business_id),
  CONSTRAINT loyalty_prizes_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id),
  CONSTRAINT loyalty_prizes_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id),
  CONSTRAINT loyalty_prizes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id)
);

-- =====================================================
-- 2. LOYALTY_REDEMPTIONS TABLE
-- =====================================================
-- Tracks when customers redeem points for prizes
CREATE TABLE IF NOT EXISTS public.loyalty_redemptions (
  redemption_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id integer NOT NULL,
  prize_id integer NOT NULL,
  points_used integer NOT NULL CHECK (points_used > 0),
  quantity integer DEFAULT 1 CHECK (quantity > 0),
  redeemed_at timestamp with time zone DEFAULT now(),
  redeemed_by integer,
  business_id integer NOT NULL,
  branch_id integer,
  notes text,
  CONSTRAINT loyalty_redemptions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id),
  CONSTRAINT loyalty_redemptions_prize_id_fkey FOREIGN KEY (prize_id) REFERENCES public.loyalty_prizes(prize_id),
  CONSTRAINT loyalty_redemptions_redeemed_by_fkey FOREIGN KEY (redeemed_by) REFERENCES public.users(user_id),
  CONSTRAINT loyalty_redemptions_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_info(business_id),
  CONSTRAINT loyalty_redemptions_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_loyalty_prizes_business ON public.loyalty_prizes(business_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_prizes_product ON public.loyalty_prizes(product_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_prizes_active ON public.loyalty_prizes(is_active);
CREATE INDEX IF NOT EXISTS idx_loyalty_prizes_points ON public.loyalty_prizes(points_required);

CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_customer ON public.loyalty_redemptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_prize ON public.loyalty_redemptions(prize_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_business ON public.loyalty_redemptions(business_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_date ON public.loyalty_redemptions(redeemed_at);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.loyalty_prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_redemptions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to do everything (business logic in app layer)
CREATE POLICY "Enable all access for authenticated users on loyalty_prizes"
  ON public.loyalty_prizes
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all access for authenticated users on loyalty_redemptions"
  ON public.loyalty_redemptions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.loyalty_prizes IS 'Defines products that can be redeemed with loyalty points';
COMMENT ON COLUMN public.loyalty_prizes.points_required IS 'Number of loyalty points required to redeem this prize';
COMMENT ON COLUMN public.loyalty_prizes.is_active IS 'Whether this prize is currently available for redemption';

COMMENT ON TABLE public.loyalty_redemptions IS 'Tracks customer redemptions of loyalty points for prizes';
COMMENT ON COLUMN public.loyalty_redemptions.points_used IS 'Number of points deducted from customer account';
COMMENT ON COLUMN public.loyalty_redemptions.quantity IS 'Number of items redeemed (default 1)';