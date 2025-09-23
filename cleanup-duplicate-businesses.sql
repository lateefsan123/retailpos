-- =====================================================
-- CLEANUP DUPLICATE BUSINESS NAMES
-- =====================================================
-- This script helps clean up duplicate business names in your database
-- Run this in your Supabase SQL editor

-- First, let's see what duplicate business names exist
SELECT name, COUNT(*) as count
FROM business_info
GROUP BY name
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Option 1: Delete duplicate businesses (keeping the oldest one)
-- WARNING: This will delete businesses and all their associated data
-- Make sure to backup your data first!

WITH duplicates AS (
  SELECT business_id, name,
         ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC) as rn
  FROM business_info
)
DELETE FROM business_info
WHERE business_id IN (
  SELECT business_id FROM duplicates WHERE rn > 1
);

-- Option 2: Update duplicate business names to make them unique
-- This is safer as it doesn't delete data
WITH duplicates AS (
  SELECT business_id, name,
         ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC) as rn
  FROM business_info
)
UPDATE business_info
SET name = name || ' (' || (SELECT rn FROM duplicates WHERE duplicates.business_id = business_info.business_id) || ')'
WHERE business_id IN (
  SELECT business_id FROM duplicates WHERE rn > 1
);

-- Option 3: If you want to keep only one business and delete the rest
-- Replace 'Your Business Name' with the actual business name you want to keep
DELETE FROM business_info
WHERE name = 'Your Business Name'
AND business_id NOT IN (
  SELECT MIN(business_id) FROM business_info WHERE name = 'Your Business Name'
);

-- After cleanup, verify no duplicates remain
SELECT name, COUNT(*) as count
FROM business_info
GROUP BY name
HAVING COUNT(*) > 1;
