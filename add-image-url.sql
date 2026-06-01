-- Add image_url column to products table
-- Run this in Supabase SQL Editor

ALTER TABLE products
ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';

-- Create a storage bucket for product images
-- Go to Supabase Dashboard > Storage > Create New Bucket:
--   Name: product-images
--   Public: YES (toggle on)
--   File size limit: 5MB
--   Allowed MIME types: image/png, image/jpeg, image/webp, image/gif

-- Then add this RLS policy for the bucket (run in SQL Editor):

-- Allow authenticated users to upload
CREATE POLICY "Admin can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

-- Allow public read access
CREATE POLICY "Public can view product images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Allow authenticated users to update/delete
CREATE POLICY "Admin can update product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images');

CREATE POLICY "Admin can delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');
