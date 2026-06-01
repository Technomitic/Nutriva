-- ============================================
-- Fix: Ensure admin can manage products (update, delete, insert)
-- Run this in Supabase SQL Editor
-- ============================================

-- Recreate the admin manage policy to ensure it covers UPDATE
DROP POLICY IF EXISTS "Admin manage products" ON products;

CREATE POLICY "Admin manage products" ON products
FOR ALL USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Also ensure the is_admin() function exists
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
