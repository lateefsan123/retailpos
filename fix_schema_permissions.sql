-- Fix schema permissions for Supabase
-- Run this in your Supabase SQL Editor

-- Grant usage on public schema to anon role
GRANT USAGE ON SCHEMA public TO anon;

-- Grant usage on public schema to authenticated role  
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant all privileges on all tables in public schema to anon role
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;

-- Grant all privileges on all tables in public schema to authenticated role
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant all privileges on all sequences in public schema to anon role
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Grant all privileges on all sequences in public schema to authenticated role
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant all privileges on all functions in public schema to anon role
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- Grant all privileges on all functions in public schema to authenticated role
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;

-- Set default privileges for future sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;

-- Set default privileges for future functions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
