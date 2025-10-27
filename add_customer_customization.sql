-- Add customer customization system
-- This allows businesses to define custom fields for customers

-- Create customer_field_definitions table
CREATE TABLE IF NOT EXISTS public.customer_field_definitions (
  field_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  business_id integer NOT NULL,
  field_name text NOT NULL,
  field_label text NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'select', 'boolean', 'email', 'phone')),
  field_options text[], -- For select fields
  is_required boolean DEFAULT false,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT fk_customer_field_definitions_business 
    FOREIGN KEY (business_id) REFERENCES public.business_info(business_id) ON DELETE CASCADE
);

-- Create customer_custom_fields table to store custom field values
CREATE TABLE IF NOT EXISTS public.customer_custom_fields (
  custom_field_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id integer NOT NULL,
  field_id integer NOT NULL,
  field_value text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT fk_customer_custom_fields_customer 
    FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON DELETE CASCADE,
  CONSTRAINT fk_customer_custom_fields_definition 
    FOREIGN KEY (field_id) REFERENCES public.customer_field_definitions(field_id) ON DELETE CASCADE,
  CONSTRAINT uk_customer_custom_fields_unique 
    UNIQUE (customer_id, field_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_field_definitions_business 
  ON public.customer_field_definitions(business_id, is_active);

CREATE INDEX IF NOT EXISTS idx_customer_custom_fields_customer 
  ON public.customer_custom_fields(customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_custom_fields_definition 
  ON public.customer_custom_fields(field_id);

-- Add comments
COMMENT ON TABLE public.customer_field_definitions IS 'Defines custom fields that businesses can add to customer profiles';
COMMENT ON TABLE public.customer_custom_fields IS 'Stores custom field values for individual customers';

COMMENT ON COLUMN public.customer_field_definitions.field_type IS 'Type of field: text, number, date, select, boolean, email, phone';
COMMENT ON COLUMN public.customer_field_definitions.field_options IS 'Array of options for select fields';
COMMENT ON COLUMN public.customer_field_definitions.display_order IS 'Order in which fields should be displayed';
COMMENT ON COLUMN public.customer_custom_fields.field_value IS 'Value of the custom field for this customer';

-- Insert some default custom fields for existing businesses
INSERT INTO public.customer_field_definitions (business_id, field_name, field_label, field_type, is_required, display_order)
SELECT 
  business_id,
  'date_of_birth',
  'Date of Birth',
  'date',
  false,
  1
FROM public.business_info
WHERE customer_portal_enabled = true;

INSERT INTO public.customer_field_definitions (business_id, field_name, field_label, field_type, is_required, display_order)
SELECT 
  business_id,
  'preferred_contact_method',
  'Preferred Contact Method',
  'select',
  false,
  2
FROM public.business_info
WHERE customer_portal_enabled = true;

-- Update the field_options for the select field
UPDATE public.customer_field_definitions 
SET field_options = ARRAY['Phone', 'Email', 'SMS', 'WhatsApp']
WHERE field_name = 'preferred_contact_method';

INSERT INTO public.customer_field_definitions (business_id, field_name, field_label, field_type, is_required, display_order)
SELECT 
  business_id,
  'newsletter_subscription',
  'Newsletter Subscription',
  'boolean',
  false,
  3
FROM public.business_info
WHERE customer_portal_enabled = true;

INSERT INTO public.customer_field_definitions (business_id, field_name, field_label, field_type, is_required, display_order)
SELECT 
  business_id,
  'notes',
  'Notes',
  'text',
  false,
  4
FROM public.business_info
WHERE customer_portal_enabled = true;
