-- ============================================
-- FRESH — Bulk Deals + Festival Packs + Advance Orders tables
-- Run this in Supabase SQL Editor
-- ============================================

-- ── Bulk Deals ──
CREATE TABLE IF NOT EXISTS bulk_deals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  image TEXT DEFAULT '',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bulk_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id TEXT REFERENCES bulk_deals(id) ON DELETE CASCADE,
  qty TEXT NOT NULL,
  price INTEGER NOT NULL,
  original INTEGER NOT NULL,
  save TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0
);

-- ── Festival Packs ──
CREATE TABLE IF NOT EXISTS festival_packs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price INTEGER NOT NULL,
  original INTEGER NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS festival_pack_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id TEXT REFERENCES festival_packs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  qty TEXT NOT NULL
);

-- ── Advance Orders ──
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_advance BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_date DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_slot TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS advance_notes TEXT DEFAULT '';

-- ── Seed Bulk Deals ──
INSERT INTO bulk_deals (id, name, description, image) VALUES
  ('banana-bulk', 'Banana Bulk Pack', 'Premium Cavendish bananas in bulk', 'bananas'),
  ('mango-bulk', 'Alphonso Mango Crate', 'King of mangoes from Ratnagiri', 'mango'),
  ('orange-bulk', 'Valencia Orange Box', 'Sweet juicing oranges', 'oranges')
ON CONFLICT (id) DO NOTHING;

INSERT INTO bulk_tiers (deal_id, qty, price, original, save, sort_order) VALUES
  ('banana-bulk', '5 dozen', 350, 395, '11%', 0),
  ('banana-bulk', '10 dozen', 650, 790, '18%', 1),
  ('mango-bulk', '5 kg', 1599, 1745, '8%', 0),
  ('mango-bulk', '10 kg', 2999, 3490, '14%', 1),
  ('orange-bulk', '5 kg', 899, 995, '10%', 0),
  ('orange-bulk', '12 kg', 1999, 2388, '16%', 1);

-- ── Seed Festival Packs ──
INSERT INTO festival_packs (id, name, description, price, original) VALUES
  ('puja-pack', 'Puja Fruit Pack', 'Complete fruit offering for pooja', 1299, 1650),
  ('party-pack', 'Party Fruit Platter', 'Premium assorted fruits for celebrations', 2999, 3850)
ON CONFLICT (id) DO NOTHING;

INSERT INTO festival_pack_items (pack_id, name, qty) VALUES
  ('puja-pack', 'Banana', '5 dozen'),
  ('puja-pack', 'Apple', '2 kg'),
  ('puja-pack', 'Pomegranate', '2 kg'),
  ('party-pack', 'Mango', '3 kg'),
  ('party-pack', 'Pineapple', '3 whole'),
  ('party-pack', 'Cherries', '1 kg'),
  ('party-pack', 'Oranges', '3 kg');

-- RLS
ALTER TABLE bulk_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE festival_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE festival_pack_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read bulk_deals" ON bulk_deals FOR SELECT USING (true);
CREATE POLICY "Public read bulk_tiers" ON bulk_tiers FOR SELECT USING (true);
CREATE POLICY "Public read festival_packs" ON festival_packs FOR SELECT USING (true);
CREATE POLICY "Public read festival_pack_items" ON festival_pack_items FOR SELECT USING (true);
CREATE POLICY "Admin manage bulk_deals" ON bulk_deals FOR ALL USING (is_admin());
CREATE POLICY "Admin manage bulk_tiers" ON bulk_tiers FOR ALL USING (is_admin());
CREATE POLICY "Admin manage festival_packs" ON festival_packs FOR ALL USING (is_admin());
CREATE POLICY "Admin manage festival_pack_items" ON festival_pack_items FOR ALL USING (is_admin());

SELECT 'Bulk deals, festival packs, and advance order columns created!' AS result;
