-- ================================================
-- Supplier Management System Migration
-- ================================================

-- ================================================
-- Supplier Management
-- ================================================
CREATE TABLE public.suppliers (
  supplier_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  business_id integer NOT NULL,
  branch_id integer,
  name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  address text,
  notes text,
  image_url text,
  created_at timestamptz DEFAULT now(),
  active boolean DEFAULT true,
  CONSTRAINT suppliers_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_info(business_id),
  CONSTRAINT suppliers_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id)
);

-- ================================================
-- Supplier ↔ Products Link
-- (products already have supplier_info as text — replace that with supplier_id FK)
-- ================================================
ALTER TABLE public.products
  ADD COLUMN supplier_id integer,
  ADD CONSTRAINT products_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(supplier_id);

-- ================================================
-- Purchase Orders
-- ================================================
CREATE TABLE public.purchase_orders (
  po_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  supplier_id integer NOT NULL,
  business_id integer NOT NULL,
  branch_id integer,
  order_date timestamptz DEFAULT now(),
  expected_date date,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'cancelled')),
  total_amount numeric DEFAULT 0,
  created_by integer, -- user who created the PO
  notes text,
  CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(supplier_id),
  CONSTRAINT purchase_orders_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_info(business_id),
  CONSTRAINT purchase_orders_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id),
  CONSTRAINT purchase_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id)
);

-- ================================================
-- Purchase Order Items
-- ================================================
CREATE TABLE public.purchase_order_items (
  poi_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  po_id integer NOT NULL,
  product_id text NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  received_quantity integer DEFAULT 0,
  CONSTRAINT purchase_order_items_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(po_id),
  CONSTRAINT purchase_order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id)
);

-- ================================================
-- Indexes for Performance
-- ================================================
CREATE INDEX idx_suppliers_business_id ON public.suppliers(business_id);
CREATE INDEX idx_suppliers_branch_id ON public.suppliers(branch_id);
CREATE INDEX idx_suppliers_active ON public.suppliers(active);
CREATE INDEX idx_products_supplier_id ON public.products(supplier_id);
CREATE INDEX idx_purchase_orders_supplier_id ON public.purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_business_id ON public.purchase_orders(business_id);
CREATE INDEX idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX idx_purchase_order_items_po_id ON public.purchase_order_items(po_id);
CREATE INDEX idx_purchase_order_items_product_id ON public.purchase_order_items(product_id);

-- ================================================
-- RLS Policies (Row Level Security)
-- ================================================
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Suppliers policies
CREATE POLICY "Users can view suppliers for their business" ON public.suppliers
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM public.business_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert suppliers for their business" ON public.suppliers
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT business_id FROM public.business_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update suppliers for their business" ON public.suppliers
  FOR UPDATE USING (
    business_id IN (
      SELECT business_id FROM public.business_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete suppliers for their business" ON public.suppliers
  FOR DELETE USING (
    business_id IN (
      SELECT business_id FROM public.business_users 
      WHERE user_id = auth.uid()
    )
  );

-- Purchase Orders policies
CREATE POLICY "Users can view purchase orders for their business" ON public.purchase_orders
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM public.business_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert purchase orders for their business" ON public.purchase_orders
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT business_id FROM public.business_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update purchase orders for their business" ON public.purchase_orders
  FOR UPDATE USING (
    business_id IN (
      SELECT business_id FROM public.business_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete purchase orders for their business" ON public.purchase_orders
  FOR DELETE USING (
    business_id IN (
      SELECT business_id FROM public.business_users 
      WHERE user_id = auth.uid()
    )
  );

-- Purchase Order Items policies
CREATE POLICY "Users can view purchase order items for their business" ON public.purchase_order_items
  FOR SELECT USING (
    po_id IN (
      SELECT po_id FROM public.purchase_orders 
      WHERE business_id IN (
        SELECT business_id FROM public.business_users 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert purchase order items for their business" ON public.purchase_order_items
  FOR INSERT WITH CHECK (
    po_id IN (
      SELECT po_id FROM public.purchase_orders 
      WHERE business_id IN (
        SELECT business_id FROM public.business_users 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update purchase order items for their business" ON public.purchase_order_items
  FOR UPDATE USING (
    po_id IN (
      SELECT po_id FROM public.purchase_orders 
      WHERE business_id IN (
        SELECT business_id FROM public.business_users 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete purchase order items for their business" ON public.purchase_order_items
  FOR DELETE USING (
    po_id IN (
      SELECT po_id FROM public.purchase_orders 
      WHERE business_id IN (
        SELECT business_id FROM public.business_users 
        WHERE user_id = auth.uid()
      )
    )
  );

-- ================================================
-- Comments for Documentation
-- ================================================
COMMENT ON TABLE public.suppliers IS 'Stores supplier information for businesses';
COMMENT ON TABLE public.purchase_orders IS 'Tracks purchase orders to suppliers';
COMMENT ON TABLE public.purchase_order_items IS 'Individual items within purchase orders';

COMMENT ON COLUMN public.suppliers.supplier_id IS 'Unique identifier for supplier';
COMMENT ON COLUMN public.suppliers.business_id IS 'Business this supplier belongs to';
COMMENT ON COLUMN public.suppliers.branch_id IS 'Branch this supplier belongs to (optional)';
COMMENT ON COLUMN public.suppliers.name IS 'Supplier company name';
COMMENT ON COLUMN public.suppliers.contact_name IS 'Primary contact person name';
COMMENT ON COLUMN public.suppliers.email IS 'Supplier email address';
COMMENT ON COLUMN public.suppliers.phone IS 'Supplier phone number';
COMMENT ON COLUMN public.suppliers.address IS 'Supplier physical address';
COMMENT ON COLUMN public.suppliers.notes IS 'Additional notes about the supplier';
COMMENT ON COLUMN public.suppliers.active IS 'Whether supplier is currently active';

COMMENT ON COLUMN public.purchase_orders.po_id IS 'Unique identifier for purchase order';
COMMENT ON COLUMN public.purchase_orders.supplier_id IS 'Supplier this order is placed with';
COMMENT ON COLUMN public.purchase_orders.business_id IS 'Business placing the order';
COMMENT ON COLUMN public.purchase_orders.branch_id IS 'Branch placing the order (optional)';
COMMENT ON COLUMN public.purchase_orders.order_date IS 'Date the order was placed';
COMMENT ON COLUMN public.purchase_orders.expected_date IS 'Expected delivery date';
COMMENT ON COLUMN public.purchase_orders.status IS 'Order status: pending, received, cancelled';
COMMENT ON COLUMN public.purchase_orders.total_amount IS 'Total amount of the purchase order';
COMMENT ON COLUMN public.purchase_orders.created_by IS 'User who created this order';
COMMENT ON COLUMN public.purchase_orders.notes IS 'Additional notes about the order';

COMMENT ON COLUMN public.purchase_order_items.poi_id IS 'Unique identifier for purchase order item';
COMMENT ON COLUMN public.purchase_order_items.po_id IS 'Purchase order this item belongs to';
COMMENT ON COLUMN public.purchase_order_items.product_id IS 'Product being ordered';
COMMENT ON COLUMN public.purchase_order_items.quantity IS 'Quantity ordered';
COMMENT ON COLUMN public.purchase_order_items.unit_price IS 'Price per unit';
COMMENT ON COLUMN public.purchase_order_items.received_quantity IS 'Quantity actually received';
