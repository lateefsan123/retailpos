-- Add subdomain field to business_info table for customer portal subdomain support
-- This enables each business to have their own subdomain like shopname.tillpoint.net

ALTER TABLE business_info 
ADD COLUMN subdomain VARCHAR(50) UNIQUE;

CREATE INDEX idx_business_subdomain ON business_info(subdomain);

COMMENT ON COLUMN business_info.subdomain IS 'Unique subdomain for customer portal access (e.g., "shopname" for shopname.tillpoint.net)';
