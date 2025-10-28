-- Setup All Payment Gateways for Testing
-- This script creates payment gateway entries for all supported types

-- First, let's check what business_id exists
SELECT business_id, name FROM business_info LIMIT 5;

-- Insert Stripe gateway configuration
INSERT INTO payment_gateways (
  business_id,
  gateway_type,
  is_enabled,
  publishable_key,
  test_mode,
  created_at,
  updated_at
) VALUES (
  1, -- Replace with your actual business_id
  'stripe',
  true,
  'pk_test_51SG9SwHG79wvEQ9cXgXYUFJVPECWhJNG17SIOSPZWKZXUtJOcGi0LXebzZ51dK4UP9iCB8SQSaQPgRniRaiGCOHs00GfKcoZMD', -- Your Stripe test publishable key
  true,
  now(),
  now()
) ON CONFLICT (business_id, gateway_type) 
DO UPDATE SET
  is_enabled = true,
  publishable_key = EXCLUDED.publishable_key,
  test_mode = true,
  updated_at = now();

-- Insert Revolut gateway configuration
INSERT INTO payment_gateways (
  business_id,
  gateway_type,
  is_enabled,
  test_mode,
  created_at,
  updated_at
) VALUES (
  1, -- Replace with your actual business_id
  'revolut',
  true,
  true,
  now(),
  now()
) ON CONFLICT (business_id, gateway_type) 
DO UPDATE SET
  is_enabled = true,
  test_mode = true,
  updated_at = now();

-- Insert PayPal gateway configuration
INSERT INTO payment_gateways (
  business_id,
  gateway_type,
  is_enabled,
  test_mode,
  created_at,
  updated_at
) VALUES (
  1, -- Replace with your actual business_id
  'paypal',
  true,
  true,
  now(),
  now()
) ON CONFLICT (business_id, gateway_type) 
DO UPDATE SET
  is_enabled = true,
  test_mode = true,
  updated_at = now();

-- Insert Square gateway configuration
INSERT INTO payment_gateways (
  business_id,
  gateway_type,
  is_enabled,
  test_mode,
  created_at,
  updated_at
) VALUES (
  1, -- Replace with your actual business_id
  'square',
  true,
  true,
  now(),
  now()
) ON CONFLICT (business_id, gateway_type) 
DO UPDATE SET
  is_enabled = true,
  test_mode = true,
  updated_at = now();

-- Verify all gateway insertions
SELECT 
  gateway_id,
  business_id,
  gateway_type,
  is_enabled,
  publishable_key,
  test_mode,
  created_at
FROM payment_gateways 
WHERE business_id = 1 -- Replace with your actual business_id
ORDER BY gateway_type;
