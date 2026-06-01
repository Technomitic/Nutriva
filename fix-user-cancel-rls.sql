-- ============================================
-- Fix: Allow users to UPDATE their own orders
-- (Required for cancel order from user side)
-- Run this in Supabase SQL Editor
-- ============================================

-- Drop if exists (safe re-run)
DROP POLICY IF EXISTS "Users can update their own orders" ON orders;

-- Allow users to update their own orders
CREATE POLICY "Users can update their own orders"
ON orders FOR UPDATE
TO authenticated
USING (auth.uid() = user_id::uuid)
WITH CHECK (auth.uid() = user_id::uuid);
