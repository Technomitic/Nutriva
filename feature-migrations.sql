-- ============================================
-- Nutriva — Feature Migrations SQL
-- Run this in Supabase SQL Editor AFTER security-hardening.sql
-- Features: Timeline, Wishlist, Coupons, Analytics
-- ============================================

-- ══════════════════════════════════════════════
-- 1. Order Tracking Timeline (Feature 1)
-- Stores status change history with timestamps
-- ══════════════════════════════════════════════

ALTER TABLE orders ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]';

-- Backfill existing orders with their initial "Placed" timestamp
UPDATE orders
SET status_history = json_build_array(
  json_build_object('status', 'Placed', 'timestamp', created_at::text)
)
WHERE status_history = '[]'::jsonb OR status_history IS NULL;


-- ══════════════════════════════════════════════
-- 2. Wishlist / Favorites (Feature 4)
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wishlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  product_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist(user_id);

ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own wishlist" ON wishlist;
CREATE POLICY "Users manage own wishlist" ON wishlist
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ══════════════════════════════════════════════
-- 3. Coupons / Promo Codes (Feature 5)
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS coupons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  type TEXT DEFAULT 'percent' CHECK (type IN ('percent', 'flat')),
  value NUMERIC NOT NULL,
  min_order NUMERIC DEFAULT 0,
  max_discount NUMERIC DEFAULT 0,  -- 0 = unlimited cap
  max_uses INTEGER DEFAULT 0,       -- 0 = unlimited
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID REFERENCES coupons NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  order_id UUID REFERENCES orders,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(coupon_id, user_id)
);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- Everyone can read active coupons (to validate codes)
CREATE POLICY "Anyone can read active coupons" ON coupons
  FOR SELECT USING (active = true);

-- Admins can manage coupons
CREATE POLICY "Admins manage coupons" ON coupons
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Users can read own redemptions
CREATE POLICY "Users read own redemptions" ON coupon_redemptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- System inserts redemptions (via authenticated user placing order)
CREATE POLICY "Users create own redemptions" ON coupon_redemptions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Add discount columns to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount NUMERIC DEFAULT 0;

-- Seed some starter coupons
INSERT INTO coupons (code, type, value, min_order, max_discount, max_uses)
VALUES
  ('FRESH20', 'percent', 20, 500, 200, 0),
  ('WELCOME50', 'flat', 50, 200, 0, 1),
  ('MANGO100', 'flat', 100, 1000, 0, 0)
ON CONFLICT (code) DO NOTHING;


-- ══════════════════════════════════════════════
-- 4. Analytics View (Feature 9)
-- ══════════════════════════════════════════════

CREATE OR REPLACE VIEW daily_revenue AS
SELECT
  DATE(created_at) AS day,
  SUM(total) AS revenue,
  COUNT(*) AS order_count
FROM orders
WHERE status != 'Cancelled'
GROUP BY DATE(created_at)
ORDER BY day DESC
LIMIT 90;

-- Product popularity view
CREATE OR REPLACE VIEW product_popularity AS
SELECT
  item->>'product_id' AS product_id,
  item->>'name' AS product_name,
  SUM((item->>'qty')::int) AS total_qty,
  COUNT(*) AS order_count
FROM orders, jsonb_array_elements(items) AS item
WHERE status != 'Cancelled'
GROUP BY item->>'product_id', item->>'name'
ORDER BY total_qty DESC
LIMIT 20;

-- Hourly order distribution
CREATE OR REPLACE VIEW hourly_orders AS
SELECT
  EXTRACT(HOUR FROM created_at) AS hour,
  COUNT(*) AS order_count
FROM orders
WHERE status != 'Cancelled'
GROUP BY EXTRACT(HOUR FROM created_at)
ORDER BY hour;


SELECT '✅ Feature migrations applied successfully!' AS result;
