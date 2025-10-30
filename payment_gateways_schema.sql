-- Payment Gateway Integration Schema
-- This schema adds payment gateway support to the existing POS system

-- Create payment_gateways table for storing gateway configurations
CREATE TABLE public.payment_gateways (
  gateway_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  business_id integer NOT NULL,
  branch_id integer,
  gateway_type text NOT NULL CHECK (gateway_type = ANY (ARRAY['stripe'::text, 'revolut'::text, 'paypal'::text, 'square'::text])),
  is_enabled boolean DEFAULT false,
  api_key_encrypted text,
  secret_key_encrypted text,
  publishable_key text,
  webhook_secret text,
  test_mode boolean DEFAULT true,
  configuration jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payment_gateways_pkey PRIMARY KEY (gateway_id),
  CONSTRAINT payment_gateways_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_info(business_id),
  CONSTRAINT payment_gateways_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id),
  CONSTRAINT unique_gateway_per_business UNIQUE (business_id, gateway_type)
);

-- Update sales table to track payment gateway information
ALTER TABLE public.sales 
  ADD COLUMN payment_gateway text,
  ADD COLUMN payment_transaction_id text,
  ADD COLUMN payment_status text DEFAULT 'completed' 
    CHECK (payment_status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'refunded'::text])),
  ADD COLUMN payment_intent_id text,
  ADD COLUMN payment_metadata jsonb;

-- Update customer_shopping_lists for click & collect payments
ALTER TABLE public.customer_shopping_lists
  ADD COLUMN payment_status text,
  ADD COLUMN payment_transaction_id text,
  ADD COLUMN order_total numeric,
  ADD COLUMN paid_at timestamp with time zone;

-- Create index for better performance
CREATE INDEX idx_payment_gateways_business_id ON public.payment_gateways(business_id);
CREATE INDEX idx_sales_payment_transaction_id ON public.sales(payment_transaction_id);
CREATE INDEX idx_customer_shopping_lists_payment_status ON public.customer_shopping_lists(payment_status);


