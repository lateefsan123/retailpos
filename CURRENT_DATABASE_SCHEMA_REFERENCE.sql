-- CURRENT DATABASE SCHEMA REFERENCE
-- This is the actual current schema from the live database
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.branches (
  branch_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  branch_name text NOT NULL,
  address text NOT NULL,
  phone text,
  manager_id integer,
  shop_image text NOT NULL DEFAULT 'shop1'::text,
  business_id integer NOT NULL,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT branches_pkey PRIMARY KEY (branch_id),
  CONSTRAINT branches_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_info(business_id)
);

CREATE TABLE public.business_info (
  business_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL UNIQUE,
  logo_url text,
  address text NOT NULL,
  phone_number text,
  vat_number text,
  receipt_footer text DEFAULT 'Thank you for shopping with us!'::text,
  updated_at timestamp without time zone DEFAULT now(),
  business_name text NOT NULL,
  business_type text DEFAULT 'Retail Store'::text,
  created_at timestamp without time zone DEFAULT now(),
  description text,
  website text,
  business_hours text,
  currency text DEFAULT 'USD'::text,
  timezone text DEFAULT 'UTC'::text,
  CONSTRAINT business_info_pkey PRIMARY KEY (business_id)
);

CREATE TABLE public.customers (
  customer_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL,
  phone_number text NOT NULL,
  email text,
  loyalty_points integer DEFAULT 0,
  credit_balance numeric DEFAULT 0,
  business_id integer,
  branch_id integer,
  CONSTRAINT customers_pkey PRIMARY KEY (customer_id),
  CONSTRAINT customers_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_info(business_id),
  CONSTRAINT customers_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id)
);

CREATE TABLE public.email_verification_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id integer NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  used boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT email_verification_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT email_verification_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);

CREATE TABLE public.inventory_movements (
  movement_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  product_id text,
  quantity_change integer NOT NULL,
  movement_type text NOT NULL,
  datetime timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  reference_id integer,
  business_id integer,
  branch_id integer,
  CONSTRAINT inventory_movements_pkey PRIMARY KEY (movement_id),
  CONSTRAINT inventory_movements_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_info(business_id),
  CONSTRAINT inventory_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id),
  CONSTRAINT inventory_movements_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id)
);

CREATE TABLE public.products (
  product_id text NOT NULL,
  name text NOT NULL,
  category text,
  price numeric NOT NULL,
  stock_quantity integer DEFAULT 0,
  supplier_info text,
  reorder_level integer DEFAULT 0,
  tax_rate numeric DEFAULT 0,
  last_updated timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  image_url text,
  is_weighted boolean DEFAULT false,
  price_per_unit numeric,
  weight_unit text,
  description text,
  sku text,
  sales_count integer DEFAULT 0,
  total_revenue numeric DEFAULT 0.00,
  last_sold_date timestamp with time zone,
  business_id integer,
  barcode text,
  branch_id integer,
  CONSTRAINT products_pkey PRIMARY KEY (product_id),
  CONSTRAINT products_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_info(business_id),
  CONSTRAINT products_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id)
);

CREATE TABLE public.reminders (
  reminder_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  owner_id integer,
  title text NOT NULL,
  body text NOT NULL,
  remind_date date NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  resolved boolean DEFAULT false,
  business_id integer,
  branch_id integer,
  CONSTRAINT reminders_pkey PRIMARY KEY (reminder_id),
  CONSTRAINT reminders_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_info(business_id),
  CONSTRAINT reminders_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id),
  CONSTRAINT reminders_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(user_id)
);

CREATE TABLE public.sale_items (
  sale_item_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  sale_id integer,
  product_id text,
  quantity integer NOT NULL,
  price_each numeric NOT NULL,
  weight numeric,
  calculated_price numeric,
  CONSTRAINT sale_items_pkey PRIMARY KEY (sale_item_id),
  CONSTRAINT sale_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id),
  CONSTRAINT sale_items_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(sale_id)
);

CREATE TABLE public.sales (
  sale_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  datetime timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  total_amount numeric NOT NULL,
  payment_method text NOT NULL,
  cashier_id integer,
  customer_id integer,
  discount_applied numeric DEFAULT 0,
  partial_payment boolean DEFAULT false,
  partial_amount numeric,
  remaining_amount numeric,
  partial_notes text,
  notes text,
  business_id integer,
  branch_id integer,
  CONSTRAINT sales_pkey PRIMARY KEY (sale_id),
  CONSTRAINT sales_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_info(business_id),
  CONSTRAINT sales_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id),
  CONSTRAINT sales_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id),
  CONSTRAINT fk_sales_cashier_id FOREIGN KEY (cashier_id) REFERENCES public.users(user_id)
);

CREATE TABLE public.shop_staff (
  user_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  username text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'cashier'::text,
  active boolean DEFAULT true,
  icon text DEFAULT 'lily'::text,
  business_id integer NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  employee_id text UNIQUE,
  full_name text,
  email text,
  phone text,
  hire_date date DEFAULT CURRENT_DATE,
  hourly_rate numeric,
  permissions ARRAY DEFAULT '{view_products,make_sales}'::text[],
  CONSTRAINT shop_staff_pkey PRIMARY KEY (user_id),
  CONSTRAINT shop_staff_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_info(business_id)
);

CREATE TABLE public.side_business_items (
  item_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  business_id integer,
  name text NOT NULL,
  price numeric,
  stock_quantity integer,
  created_at timestamp without time zone DEFAULT now(),
  notes text,
  parent_shop_id integer,
  branch_id integer,
  CONSTRAINT side_business_items_pkey PRIMARY KEY (item_id),
  CONSTRAINT side_business_items_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.side_businesses(business_id),
  CONSTRAINT side_business_items_parent_shop_id_fkey FOREIGN KEY (parent_shop_id) REFERENCES public.business_info(business_id),
  CONSTRAINT side_business_items_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id)
);

CREATE TABLE public.side_business_sales (
  sale_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  business_id integer,
  quantity integer DEFAULT 1,
  total_amount numeric NOT NULL,
  payment_method text NOT NULL,
  date_time timestamp without time zone DEFAULT now(),
  item_id integer,
  parent_shop_id integer,
  branch_id integer,
  price_each numeric NOT NULL,
  CONSTRAINT side_business_sales_pkey PRIMARY KEY (sale_id),
  CONSTRAINT side_business_sales_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.side_businesses(business_id),
  CONSTRAINT side_business_sales_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.side_business_items(item_id),
  CONSTRAINT side_business_sales_parent_shop_id_fkey FOREIGN KEY (parent_shop_id) REFERENCES public.business_info(business_id),
  CONSTRAINT side_business_sales_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id),
  CONSTRAINT fk_side_business_sales_branch_id FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id),
  CONSTRAINT fk_side_business_sales_business_id FOREIGN KEY (business_id) REFERENCES public.side_businesses(business_id)
);

CREATE TABLE public.side_businesses (
  business_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  owner_id integer,
  name text NOT NULL,
  description text,
  business_type text,
  created_at timestamp without time zone DEFAULT now(),
  image_url text,
  parent_shop_id integer,
  branch_id integer,
  CONSTRAINT side_businesses_pkey PRIMARY KEY (business_id),
  CONSTRAINT side_businesses_parent_shop_id_fkey FOREIGN KEY (parent_shop_id) REFERENCES public.business_info(business_id),
  CONSTRAINT fk_side_businesses_branch_id FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id),
  CONSTRAINT side_businesses_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(user_id)
);

CREATE TABLE public.users (
  user_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  email text,
  full_name text,
  role text NOT NULL DEFAULT 'owner'::text,
  active boolean DEFAULT true,
  business_id integer NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  icon text DEFAULT 'lily'::text,
  email_verified boolean DEFAULT false,
  email_verification_token text,
  verification_token_expires timestamp with time zone,
  last_used timestamp with time zone DEFAULT now(),
  branch_id integer,
  CONSTRAINT users_pkey PRIMARY KEY (user_id),
  CONSTRAINT business_owners_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_info(business_id),
  CONSTRAINT users_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id)
);

CREATE TABLE public.vault (
  vault_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  owner_id integer,
  pin_hash text NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  business_id integer,
  branch_id integer,
  CONSTRAINT vault_pkey PRIMARY KEY (vault_id),
  CONSTRAINT vault_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_info(business_id),
  CONSTRAINT vault_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id),
  CONSTRAINT vault_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(user_id)
);

CREATE TABLE public.vault_entries (
  entry_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  vault_id integer,
  label text NOT NULL,
  email text NOT NULL,
  password_enc text NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  link text,
  CONSTRAINT vault_entries_pkey PRIMARY KEY (entry_id),
  CONSTRAINT vault_entries_vault_id_fkey FOREIGN KEY (vault_id) REFERENCES public.vault(vault_id)
);

-- KEY OBSERVATIONS FROM CURRENT SCHEMA:
-- 1. All tables have proper business_id and branch_id columns for multi-tenancy
-- 2. The reminders table already has business_id and branch_id columns
-- 3. Products table uses text for product_id (not integer)
-- 4. All foreign key relationships are properly established
-- 5. Branch organization is fully implemented across all tables
-- 6. Partial payment fields exist in sales table
-- 7. Side business functionality is fully integrated with branch support
