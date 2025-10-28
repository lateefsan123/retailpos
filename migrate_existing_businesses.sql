-- Data migration script for existing businesses
-- Clears any existing subdomains - businesses must set their own

-- Clear any existing subdomains - let businesses choose their own
UPDATE business_info 
SET subdomain = NULL;
