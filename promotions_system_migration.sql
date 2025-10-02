-- =====================================================
-- PROMOTIONS & DISCOUNTS SYSTEM
-- =====================================================
-- This migration creates tables for managing promotional campaigns

-- =====================================================
-- 1. PROMOTIONS TABLE
-- =====================================================
CREATE TABLE public.promotions (
  promotion_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  business_id integer NOT NULL,
  branch_id integer,
  name text NOT NULL,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  active boolean DEFAULT true,
  applies_to text NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all', 'specific')),
  min_purchase_amount numeric DEFAULT 0,
  max_discount_amount numeric,
  usage_limit integer,
  usage_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  created_by integer,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT promotions_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_info(business_id),
  CONSTRAINT promotions_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id),
  CONSTRAINT promotions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id),
  CONSTRAINT promotions_dates_check CHECK (end_date > start_date)
);

-- =====================================================
-- 2. PROMOTION_PRODUCTS TABLE
-- =====================================================
-- Links specific products to promotions (when applies_to = 'specific')
CREATE TABLE public.promotion_products (
  promo_product_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  promotion_id integer NOT NULL,
  product_id text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT promotion_products_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(promotion_id) ON DELETE CASCADE,
  CONSTRAINT promotion_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE CASCADE,
  CONSTRAINT promotion_products_unique UNIQUE (promotion_id, product_id)
);

-- =====================================================
-- 3. PROMOTION_APPLICATIONS TABLE
-- =====================================================
-- Tracks which promotions were applied to which sale items
CREATE TABLE public.promotion_applications (
  application_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  promotion_id integer NOT NULL,
  sale_id integer NOT NULL,
  sale_item_id integer,
  discount_amount numeric NOT NULL,
  applied_at timestamp with time zone DEFAULT now(),
  CONSTRAINT promotion_applications_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(promotion_id),
  CONSTRAINT promotion_applications_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(sale_id),
  CONSTRAINT promotion_applications_sale_item_id_fkey FOREIGN KEY (sale_item_id) REFERENCES public.sale_items(sale_item_id)
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_promotions_business_id ON public.promotions(business_id);
CREATE INDEX idx_promotions_branch_id ON public.promotions(branch_id);
CREATE INDEX idx_promotions_active ON public.promotions(active) WHERE active = true;
CREATE INDEX idx_promotions_dates ON public.promotions(start_date, end_date);
CREATE INDEX idx_promotions_active_dates ON public.promotions(business_id, active, start_date, end_date) WHERE active = true;

CREATE INDEX idx_promotion_products_promotion_id ON public.promotion_products(promotion_id);
CREATE INDEX idx_promotion_products_product_id ON public.promotion_products(product_id);

CREATE INDEX idx_promotion_applications_promotion_id ON public.promotion_applications(promotion_id);
CREATE INDEX idx_promotion_applications_sale_id ON public.promotion_applications(sale_id);
CREATE INDEX idx_promotion_applications_date ON public.promotion_applications(applied_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_applications ENABLE ROW LEVEL SECURITY;

-- Simplified RLS policies for authenticated users
CREATE POLICY "Enable all access for authenticated users"
  ON public.promotions
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all access for authenticated users"
  ON public.promotion_products
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all access for authenticated users"
  ON public.promotion_applications
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.promotions IS 'Stores promotional campaigns and discount rules';
COMMENT ON TABLE public.promotion_products IS 'Links specific products to promotions';
COMMENT ON TABLE public.promotion_applications IS 'Tracks promotion usage for reporting and analytics';
