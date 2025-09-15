-- Add partial payment fields to sales table
-- Run this in your Supabase SQL Editor

ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS partial_payment BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS partial_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS remaining_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS partial_notes TEXT;

-- Update existing records to have default values
UPDATE sales 
SET partial_payment = FALSE,
    partial_amount = 0,
    remaining_amount = 0
WHERE partial_payment IS NULL;

-- Add index for partial payment queries
CREATE INDEX IF NOT EXISTS idx_sales_partial_payment ON sales(partial_payment);
