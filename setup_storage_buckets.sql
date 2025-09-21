-- Setup Storage Buckets for Business Assets
-- Run this in your Supabase SQL editor

-- Create storage bucket for business assets (logos, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-assets',
  'business-assets',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
);

-- Create storage policies for business assets
CREATE POLICY "Users can upload their business assets" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'business-assets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their business assets" ON storage.objects
FOR SELECT USING (
  bucket_id = 'business-assets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their business assets" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'business-assets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their business assets" ON storage.objects
FOR DELETE USING (
  bucket_id = 'business-assets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Alternative: Allow public access to business logos (if you want logos to be publicly accessible)
-- Uncomment the following if you want public access to business logos:

/*
CREATE POLICY "Public can view business logos" ON storage.objects
FOR SELECT USING (bucket_id = 'business-assets');
*/

-- Verify the bucket was created
SELECT * FROM storage.buckets WHERE id = 'business-assets';
