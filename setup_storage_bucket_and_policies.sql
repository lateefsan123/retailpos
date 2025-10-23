-- Setup Storage Bucket and RLS Policies for Multi-Tenant POS System
-- Run this in your Supabase SQL Editor (requires service_role permissions)

-- 1. Create the products storage bucket (if it doesn't exist)
-- Insert directly into storage.buckets table
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'products',
    'products', 
    true,  -- Make it public so images can be accessed
    5242880,  -- 5MB file size limit
    ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp']  -- Only allow image types
)
ON CONFLICT (id) DO NOTHING;  -- Don't error if bucket already exists

-- 2. Create helper function to check if user belongs to business/branch
-- This function checks if the authenticated user (auth.uid()) exists in the users table
-- with the specified business_id and branch_id
CREATE OR REPLACE FUNCTION public.is_user_in_business_branch(
    p_business_id bigint,
    p_branch_id bigint
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.users
        WHERE auth_user_id = auth.uid()
          AND business_id = p_business_id
          AND (branch_id = p_branch_id OR branch_id IS NULL)
          AND active = true
    );
$$;

-- 3. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "products_read" ON storage.objects;
DROP POLICY IF EXISTS "products_insert" ON storage.objects;
DROP POLICY IF EXISTS "products_update" ON storage.objects;
DROP POLICY IF EXISTS "products_delete" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to view files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete files" ON storage.objects;

-- 4. Create RLS policies for the products bucket
-- These policies ensure users can only access files from their own business/branch

-- SELECT policy: Allow users to read files from their business/branch
CREATE POLICY "products_read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'products'
    AND public.is_user_in_business_branch(
        split_part(name, '/', 2)::bigint,  -- business_id from path: products/{business_id}/{branch_id}/...
        split_part(name, '/', 3)::bigint   -- branch_id from path: products/{business_id}/{branch_id}/...
    )
);

-- INSERT policy: Allow users to upload files to their business/branch
CREATE POLICY "products_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'products'
    AND public.is_user_in_business_branch(
        split_part(name, '/', 2)::bigint,  -- business_id from path
        split_part(name, '/', 3)::bigint   -- branch_id from path
    )
);

-- UPDATE policy: Allow users to update files in their business/branch
CREATE POLICY "products_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'products'
    AND public.is_user_in_business_branch(
        split_part(name, '/', 2)::bigint,  -- business_id from path
        split_part(name, '/', 3)::bigint   -- branch_id from path
    )
)
WITH CHECK (
    bucket_id = 'products'
    AND public.is_user_in_business_branch(
        split_part(name, '/', 2)::bigint,  -- business_id from path
        split_part(name, '/', 3)::bigint   -- branch_id from path
    )
);

-- DELETE policy: Allow users to delete files from their business/branch
CREATE POLICY "products_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'products'
    AND public.is_user_in_business_branch(
        split_part(name, '/', 2)::bigint,  -- business_id from path
        split_part(name, '/', 3)::bigint   -- branch_id from path
    )
);

-- 5. Verify the setup
-- Check that the bucket exists
SELECT 
    name as bucket_name,
    public as is_public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE name = 'products';

-- Check that the policies were created
SELECT 
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE 'products_%'
ORDER BY policyname;

-- Test the helper function (this will only work if you're authenticated)
-- SELECT public.is_user_in_business_branch(1, 1) as test_result;
