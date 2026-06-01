-- ============================================
-- FRESH — Fix Infinite Recursion in RLS Policies
-- Run this in Supabase SQL Editor (Dashboard → SQL)
-- This REPLACES the broken policies with fixed ones
-- ============================================

-- ══════════════════════════════════════════════
-- Step 1: Drop ALL existing policies that cause recursion
-- ══════════════════════════════════════════════

DROP POLICY IF EXISTS "Users read own profile" ON profiles;
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON profiles;
DROP POLICY IF EXISTS "Public read products" ON products;
DROP POLICY IF EXISTS "Admin manage products" ON products;
DROP POLICY IF EXISTS "Users read own orders" ON orders;
DROP POLICY IF EXISTS "Users create orders" ON orders;
DROP POLICY IF EXISTS "Admin update orders" ON orders;
DROP POLICY IF EXISTS "Users read own chat" ON chat_messages;
DROP POLICY IF EXISTS "Users send chat" ON chat_messages;
DROP POLICY IF EXISTS "Users read own advance" ON advance_orders;
DROP POLICY IF EXISTS "Users create advance" ON advance_orders;
DROP POLICY IF EXISTS "Admin update advance" ON advance_orders;
DROP POLICY IF EXISTS "Admin manage delivery" ON delivery_boys;
DROP POLICY IF EXISTS "Public read delivery" ON delivery_boys;

-- ══════════════════════════════════════════════
-- Step 2: Create a SECURITY DEFINER helper to check admin role
-- This avoids the infinite recursion by bypassing RLS
-- ══════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ══════════════════════════════════════════════
-- Step 3: Recreate all policies using the helper
-- ══════════════════════════════════════════════

-- ── Profiles ──
-- Users can read their own profile, admins can read all
CREATE POLICY "Users read own profile" ON profiles
  FOR SELECT USING (
    auth.uid() = id OR public.is_admin()
  );

CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ── Products ──
CREATE POLICY "Public read products" ON products
  FOR SELECT USING (true);

CREATE POLICY "Admin manage products" ON products
  FOR ALL USING (public.is_admin());

-- ── Orders ──
CREATE POLICY "Users read own orders" ON orders
  FOR SELECT USING (
    auth.uid() = user_id OR public.is_admin()
  );

CREATE POLICY "Users create orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin update orders" ON orders
  FOR UPDATE USING (public.is_admin());

-- ── Chat Messages ──
CREATE POLICY "Users read own chat" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders WHERE orders.id = chat_messages.order_id
        AND (orders.user_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "Users send chat" ON chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders WHERE orders.id = chat_messages.order_id
        AND (orders.user_id = auth.uid() OR public.is_admin())
    )
  );

-- ── Advance Orders ──
CREATE POLICY "Users read own advance" ON advance_orders
  FOR SELECT USING (
    auth.uid() = user_id OR public.is_admin()
  );

CREATE POLICY "Users create advance" ON advance_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin update advance" ON advance_orders
  FOR UPDATE USING (public.is_admin());

-- ── Delivery Boys ──
CREATE POLICY "Public read delivery" ON delivery_boys
  FOR SELECT USING (true);

CREATE POLICY "Admin manage delivery" ON delivery_boys
  FOR ALL USING (public.is_admin());
