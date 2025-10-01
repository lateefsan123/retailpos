-- ================================================
-- Supplier Visits/Deliveries Tracking System
-- ================================================

-- Table to track when suppliers visit/deliver
CREATE TABLE IF NOT EXISTS public.supplier_visits (
  visit_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  supplier_id integer NOT NULL,
  business_id integer NOT NULL,
  branch_id integer,
  visit_date date NOT NULL,
  visit_type text DEFAULT 'delivery' CHECK (visit_type IN ('delivery', 'meeting', 'inspection', 'other')),
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by integer,
  CONSTRAINT supplier_visits_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(supplier_id),
  CONSTRAINT supplier_visits_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_info(business_id),
  CONSTRAINT supplier_visits_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id),
  CONSTRAINT supplier_visits_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id)
);

-- Index for faster queries by date range
CREATE INDEX IF NOT EXISTS idx_supplier_visits_date ON public.supplier_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_supplier_visits_supplier ON public.supplier_visits(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_visits_business ON public.supplier_visits(business_id, branch_id);

-- RLS Policies (Simplified - your app handles business_id filtering in queries)
ALTER TABLE public.supplier_visits ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to do everything (business logic in app layer)
CREATE POLICY "Enable all access for authenticated users"
  ON public.supplier_visits
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Comments
COMMENT ON TABLE public.supplier_visits IS 'Tracks supplier visits, deliveries, and meetings';
COMMENT ON COLUMN public.supplier_visits.visit_type IS 'Type of visit: delivery, meeting, inspection, or other';

