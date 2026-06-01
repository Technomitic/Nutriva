-- ============================================
-- Fix RLS policies for the 'orders' table
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Enable RLS (if not already)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 2. Allow authenticated users to INSERT their own orders
CREATE POLICY "Users can place their own orders"
ON orders FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id::uuid);

-- 3. Allow users to SELECT their own orders
CREATE POLICY "Users can view their own orders"
ON orders FOR SELECT
TO authenticated
USING (auth.uid() = user_id::uuid);

-- 4. Allow admins to view ALL orders
CREATE POLICY "Admins can view all orders"
ON orders FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id::uuid = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- 5. Allow admins to update any order (for status changes)
CREATE POLICY "Admins can update all orders"
ON orders FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id::uuid = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- ============================================
-- Also fix 'chat_messages' table RLS if needed
-- ============================================

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to INSERT chat messages
CREATE POLICY "Users can send chat messages"
ON chat_messages FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to read chat messages for their own orders
CREATE POLICY "Users can read their order chats"
ON chat_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = chat_messages.order_id 
    AND (orders.user_id::uuid = auth.uid() 
         OR EXISTS (
           SELECT 1 FROM profiles 
           WHERE profiles.id::uuid = auth.uid() 
           AND profiles.role = 'admin'
         ))
  )
);
