-- =====================================================
-- COMPREHENSIVE INDEXING FOR POS SYSTEM
-- =====================================================
-- This file creates indexes to optimize query performance
-- Run this after all tables are created

-- =====================================================
-- BRANCHES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_branches_business_id ON public.branches(business_id);
CREATE INDEX IF NOT EXISTS idx_branches_manager_id ON public.branches(manager_id);
CREATE INDEX IF NOT EXISTS idx_branches_active ON public.branches(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_branches_business_active ON public.branches(business_id, active);

-- =====================================================
-- CUSTOMERS
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_customers_business_id ON public.customers(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_branch_id ON public.customers(branch_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone_number);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_name_search ON public.customers USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_customers_business_branch ON public.customers(business_id, branch_id);

-- =====================================================
-- PRODUCTS
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_products_business_id ON public.products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_branch_id ON public.products(branch_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON public.products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_name_search ON public.products USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_products_business_category ON public.products(business_id, category);
CREATE INDEX IF NOT EXISTS idx_products_business_stock ON public.products(business_id, stock_quantity);
CREATE INDEX IF NOT EXISTS idx_products_last_updated ON public.products(last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_products_sales_count ON public.products(sales_count DESC);

-- =====================================================
-- SALES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_sales_business_id ON public.sales(business_id);
CREATE INDEX IF NOT EXISTS idx_sales_branch_id ON public.sales(branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_cashier_id ON public.sales(cashier_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_datetime ON public.sales(datetime DESC);
CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON public.sales(payment_method);
CREATE INDEX IF NOT EXISTS idx_sales_partial_payment ON public.sales(partial_payment) WHERE partial_payment = true;
CREATE INDEX IF NOT EXISTS idx_sales_business_datetime ON public.sales(business_id, datetime DESC);
CREATE INDEX IF NOT EXISTS idx_sales_business_branch_datetime ON public.sales(business_id, branch_id, datetime DESC);
CREATE INDEX IF NOT EXISTS idx_sales_cashier_datetime ON public.sales(cashier_id, datetime DESC);
-- Removed: Date range partial index (CURRENT_DATE is not immutable)
-- Use regular composite index instead
-- CREATE INDEX IF NOT EXISTS idx_sales_date_range ON public.sales(business_id, datetime) WHERE datetime >= CURRENT_DATE - INTERVAL '30 days';

-- =====================================================
-- SALE_ITEMS
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON public.sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_sale ON public.sale_items(product_id, sale_id);

-- =====================================================
-- INVENTORY_MOVEMENTS
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_business_id ON public.inventory_movements(business_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_branch_id ON public.inventory_movements(branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_datetime ON public.inventory_movements(datetime DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON public.inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_datetime ON public.inventory_movements(product_id, datetime DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_business_datetime ON public.inventory_movements(business_id, datetime DESC);

-- =====================================================
-- SUPPLIERS
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_suppliers_business_id ON public.suppliers(business_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_branch_id ON public.suppliers(branch_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON public.suppliers(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_suppliers_name_search ON public.suppliers USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_suppliers_business_active ON public.suppliers(business_id, active);
CREATE INDEX IF NOT EXISTS idx_suppliers_email ON public.suppliers(email);
CREATE INDEX IF NOT EXISTS idx_suppliers_phone ON public.suppliers(phone);

-- =====================================================
-- SUPPLIER_VISITS
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_supplier_visits_supplier_id ON public.supplier_visits(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_visits_business_id ON public.supplier_visits(business_id);
CREATE INDEX IF NOT EXISTS idx_supplier_visits_branch_id ON public.supplier_visits(branch_id);
CREATE INDEX IF NOT EXISTS idx_supplier_visits_date ON public.supplier_visits(visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_visits_type ON public.supplier_visits(visit_type);
CREATE INDEX IF NOT EXISTS idx_supplier_visits_business_date ON public.supplier_visits(business_id, visit_date DESC);
-- Removed: Date range partial index (CURRENT_DATE is not immutable)
-- Use regular composite index instead
-- CREATE INDEX IF NOT EXISTS idx_supplier_visits_date_range ON public.supplier_visits(business_id, visit_date) WHERE visit_date >= CURRENT_DATE - INTERVAL '30 days';
CREATE INDEX IF NOT EXISTS idx_supplier_visits_created_by ON public.supplier_visits(created_by);

-- =====================================================
-- PURCHASE_ORDERS
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_business_id ON public.purchase_orders(business_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_branch_id ON public.purchase_orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_date ON public.purchase_orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_expected_date ON public.purchase_orders(expected_date);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_by ON public.purchase_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_business_status ON public.purchase_orders(business_id, status);

-- =====================================================
-- PURCHASE_ORDER_ITEMS
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po_id ON public.purchase_order_items(po_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product_id ON public.purchase_order_items(product_id);

-- =====================================================
-- REFUNDS
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_refunds_original_sale_id ON public.refunds(original_sale_id);
CREATE INDEX IF NOT EXISTS idx_refunds_sale_item_id ON public.refunds(sale_item_id);
CREATE INDEX IF NOT EXISTS idx_refunds_business_id ON public.refunds(business_id);
CREATE INDEX IF NOT EXISTS idx_refunds_branch_id ON public.refunds(branch_id);
CREATE INDEX IF NOT EXISTS idx_refunds_customer_id ON public.refunds(customer_id);
CREATE INDEX IF NOT EXISTS idx_refunds_cashier_id ON public.refunds(cashier_id);
CREATE INDEX IF NOT EXISTS idx_refunds_created_at ON public.refunds(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_refunds_business_date ON public.refunds(business_id, created_at DESC);

-- =====================================================
-- REMINDERS
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_reminders_owner_id ON public.reminders(owner_id);
CREATE INDEX IF NOT EXISTS idx_reminders_business_id ON public.reminders(business_id);
CREATE INDEX IF NOT EXISTS idx_reminders_branch_id ON public.reminders(branch_id);
CREATE INDEX IF NOT EXISTS idx_reminders_sale_id ON public.reminders(sale_id);
CREATE INDEX IF NOT EXISTS idx_reminders_remind_date ON public.reminders(remind_date);
CREATE INDEX IF NOT EXISTS idx_reminders_resolved ON public.reminders(resolved) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_reminders_business_unresolved ON public.reminders(business_id, remind_date) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_reminders_owner_unresolved ON public.reminders(owner_id, remind_date) WHERE resolved = false;

-- =====================================================
-- USERS
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_users_business_id ON public.users(business_id);
CREATE INDEX IF NOT EXISTS idx_users_branch_id ON public.users(branch_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON public.users(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_users_business_active ON public.users(business_id, active);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON public.users(email_verified);
CREATE INDEX IF NOT EXISTS idx_users_last_used ON public.users(last_used DESC);

-- =====================================================
-- SIDE_BUSINESSES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_side_businesses_owner_id ON public.side_businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_side_businesses_parent_shop_id ON public.side_businesses(parent_shop_id);
CREATE INDEX IF NOT EXISTS idx_side_businesses_branch_id ON public.side_businesses(branch_id);
CREATE INDEX IF NOT EXISTS idx_side_businesses_business_type ON public.side_businesses(business_type);

-- =====================================================
-- SIDE_BUSINESS_ITEMS
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_side_business_items_business_id ON public.side_business_items(business_id);
CREATE INDEX IF NOT EXISTS idx_side_business_items_parent_shop_id ON public.side_business_items(parent_shop_id);
CREATE INDEX IF NOT EXISTS idx_side_business_items_branch_id ON public.side_business_items(branch_id);
CREATE INDEX IF NOT EXISTS idx_side_business_items_name_search ON public.side_business_items USING gin(to_tsvector('english', name));

-- =====================================================
-- SIDE_BUSINESS_SALES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_side_business_sales_business_id ON public.side_business_sales(business_id);
CREATE INDEX IF NOT EXISTS idx_side_business_sales_item_id ON public.side_business_sales(item_id);
CREATE INDEX IF NOT EXISTS idx_side_business_sales_parent_shop_id ON public.side_business_sales(parent_shop_id);
CREATE INDEX IF NOT EXISTS idx_side_business_sales_branch_id ON public.side_business_sales(branch_id);
CREATE INDEX IF NOT EXISTS idx_side_business_sales_date_time ON public.side_business_sales(date_time DESC);
CREATE INDEX IF NOT EXISTS idx_side_business_sales_payment_method ON public.side_business_sales(payment_method);

-- =====================================================
-- SHOP_STAFF
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_shop_staff_business_id ON public.shop_staff(business_id);
CREATE INDEX IF NOT EXISTS idx_shop_staff_active ON public.shop_staff(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_shop_staff_role ON public.shop_staff(role);
CREATE INDEX IF NOT EXISTS idx_shop_staff_employee_id ON public.shop_staff(employee_id);
CREATE INDEX IF NOT EXISTS idx_shop_staff_email ON public.shop_staff(email);

-- =====================================================
-- VAULT
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_vault_owner_id ON public.vault(owner_id);
CREATE INDEX IF NOT EXISTS idx_vault_business_id ON public.vault(business_id);
CREATE INDEX IF NOT EXISTS idx_vault_branch_id ON public.vault(branch_id);

-- =====================================================
-- VAULT_ENTRIES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_vault_entries_vault_id ON public.vault_entries(vault_id);
CREATE INDEX IF NOT EXISTS idx_vault_entries_label_search ON public.vault_entries USING gin(to_tsvector('english', label));

-- =====================================================
-- EMAIL_VERIFICATION_TOKENS
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON public.email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON public.email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires ON public.email_verification_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_used ON public.email_verification_tokens(used) WHERE used = false;

-- =====================================================
-- PENDING_REGISTRATIONS
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_pending_registrations_user_id ON public.pending_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_registrations_email ON public.pending_registrations(email);
CREATE INDEX IF NOT EXISTS idx_pending_registrations_status ON public.pending_registrations(status);
CREATE INDEX IF NOT EXISTS idx_pending_registrations_approved ON public.pending_registrations(approved);
CREATE INDEX IF NOT EXISTS idx_pending_registrations_created_at ON public.pending_registrations(created_at DESC);

-- =====================================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- =====================================================

-- Sales reporting queries (business + date range)
CREATE INDEX IF NOT EXISTS idx_sales_reporting ON public.sales(business_id, branch_id, datetime DESC, payment_method);

-- Product inventory queries
CREATE INDEX IF NOT EXISTS idx_products_inventory ON public.products(business_id, branch_id, stock_quantity, reorder_level) WHERE stock_quantity <= reorder_level;

-- Customer lookup queries
CREATE INDEX IF NOT EXISTS idx_customers_lookup ON public.customers(business_id, phone_number, name);

-- Active suppliers by business
CREATE INDEX IF NOT EXISTS idx_suppliers_active_list ON public.suppliers(business_id, active, name) WHERE active = true;

-- Recent sales for dashboard (removed WHERE clause - CURRENT_DATE is not immutable)
CREATE INDEX IF NOT EXISTS idx_sales_dashboard ON public.sales(business_id, datetime DESC);

-- =====================================================
-- PERFORMANCE NOTES
-- =====================================================
-- 1. All foreign keys are now indexed for faster JOINs
-- 2. Partial indexes used for common WHERE conditions (active=true, resolved=false)
-- 3. GIN indexes for full-text search on names and labels
-- 4. Composite indexes for frequent multi-column queries
-- 5. DESC indexes on datetime columns for recent data queries
-- 6. Date range partial indexes for common time-based queries

-- =====================================================
-- ANALYZE TABLES
-- =====================================================
-- Run ANALYZE to update statistics after creating indexes
ANALYZE public.branches;
ANALYZE public.business_info;
ANALYZE public.customers;
ANALYZE public.products;
ANALYZE public.sales;
ANALYZE public.sale_items;
ANALYZE public.inventory_movements;
ANALYZE public.suppliers;
ANALYZE public.supplier_visits;
ANALYZE public.purchase_orders;
ANALYZE public.purchase_order_items;
ANALYZE public.refunds;
ANALYZE public.reminders;
ANALYZE public.users;
ANALYZE public.side_businesses;
ANALYZE public.side_business_items;
ANALYZE public.side_business_sales;
ANALYZE public.shop_staff;
ANALYZE public.vault;
ANALYZE public.vault_entries;
ANALYZE public.email_verification_tokens;
ANALYZE public.pending_registrations;

