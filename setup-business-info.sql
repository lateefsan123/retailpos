-- Quick setup script for business_info table
-- Run this in your Supabase SQL Editor if the business_info table doesn't exist or is empty

-- Create business_info table if it doesn't exist
CREATE TABLE IF NOT EXISTS business_info (
    business_id     SERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    logo_url        TEXT,
    address         TEXT,
    phone_number    TEXT,
    vat_number      TEXT,
    receipt_footer  TEXT,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert or update business info
INSERT INTO business_info (name, logo_url, address, phone_number, vat_number, receipt_footer) 
VALUES ('LandM Store', '/images/backgrounds/logo1.png', 'Unit 2 Glenmore Park, Dundalk, Co. Louth', '087 797 0412', 'IE1234567A', 'Thank you for shopping with us! LandM Store - Your Local African Food Store')
ON CONFLICT (business_id) DO UPDATE SET
    name = EXCLUDED.name,
    logo_url = EXCLUDED.logo_url,
    address = EXCLUDED.address,
    phone_number = EXCLUDED.phone_number,
    vat_number = EXCLUDED.vat_number,
    receipt_footer = EXCLUDED.receipt_footer,
    updated_at = CURRENT_TIMESTAMP;

-- Verify the data was inserted
SELECT * FROM business_info;
