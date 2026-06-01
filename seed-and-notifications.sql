-- ============================================
-- FRESH — Seed Products + Delivery Boys + Notifications Table
-- Run this in Supabase SQL Editor
-- ============================================

-- ── Products ──
INSERT INTO products (id, name, variety, origin, price, unit, image, tag, description, freshness, stock, max_stock, active)
VALUES
  ('mango', 'Organic Mango', 'Alphonso', 'Freshly Harvested · Ratnagiri, India', 349, '/kg', 'mango', 'SEASONAL PICK', 'The Alphonso mango is the king of mangoes, prized for its rich, creamy texture and intense sweetness.', 'Picked today', 120, 150, true),
  ('oranges', 'Valencia Oranges', 'Valencia', 'Picked yesterday · CA, USA', 199, '/kg', 'oranges', 'FARM FRESH', 'Valencia oranges are the quintessential juicing orange. Seedless, sweet, and bursting with sunshine.', 'Picked yesterday', 85, 100, true),
  ('bananas', 'Cavendish Bananas', 'Cavendish', 'Fresh Import · Ecuador', 79, '/dozen', 'bananas', 'IMPORTED', 'Premium Cavendish bananas imported from Ecuador. Perfectly ripened, creamy texture.', 'Fresh import', 45, 100, true),
  ('cherries', 'Rainier Cherries', 'Rainier', 'Hand-picked · Washington, USA', 899, '/500g', 'cherries', 'PREMIUM', 'Rainier cherries are exceptionally sweet with a delicate flavor.', 'Hand-picked', 12, 50, true),
  ('pineapple', 'Honeyglow Pineapple', 'Honeyglow', 'Tropical Harvest · Costa Rica', 249, '/whole', 'pineapple', 'TROPICAL', 'The Honeyglow pineapple is 35% sweeter than standard varieties.', 'Tropical harvest', 38, 60, true),
  ('apple', 'Honeycrisp Apple', 'Honeycrisp', 'Artisan Orchard · Minnesota, USA', 189, '/kg', 'apple', 'ARTISANAL', 'The Honeycrisp apple is prized for its exceptionally crisp texture.', 'Just arrived', 95, 120, true),
  ('pomegranate', 'Ruby Pomegranate', 'Bhagwa', 'Orchards · Maharashtra, India', 220, '/kg', 'pomegranate', 'SEASONAL', 'Deep ruby arils bursting with antioxidant-rich juice.', 'Farm fresh', 60, 80, true)
ON CONFLICT (id) DO UPDATE SET
  price = EXCLUDED.price,
  stock = EXCLUDED.stock,
  active = EXCLUDED.active;

-- ── Delivery Boys ──
INSERT INTO delivery_boys (id, name, phone, area, status, deliveries)
VALUES
  ('db1', 'Rahul Kumar', '9876543210', 'North Hub', 'available', 45),
  ('db2', 'Suresh Patel', '9876543211', 'South Station', 'busy', 62),
  ('db3', 'Amit Singh', '9876543212', 'East Orchard', 'available', 38),
  ('db4', 'Vijay Sharma', '9876543213', 'West Side', 'offline', 28)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  deliveries = EXCLUDED.deliveries;

-- ── Notifications Table ──
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,  -- NULL = broadcast to all users
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT DEFAULT 'system' CHECK (type IN ('order', 'promo', 'system', 'stock')),
  icon TEXT DEFAULT 'notifications',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user queries
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- RLS for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications + broadcasts
CREATE POLICY "Users read own notifications" ON notifications
  FOR SELECT USING (
    user_id = auth.uid() OR user_id IS NULL
  );

-- Users can update read status on their own notifications
CREATE POLICY "Users update own notifications" ON notifications
  FOR UPDATE USING (
    user_id = auth.uid() OR user_id IS NULL
  );

-- Admins can insert notifications (using is_admin helper from fix-rls-policies.sql)
CREATE POLICY "Admins insert notifications" ON notifications
  FOR INSERT WITH CHECK (
    is_admin()
  );

-- Enable real-time for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

SELECT 'Seed data + notifications table created successfully!' AS result;
