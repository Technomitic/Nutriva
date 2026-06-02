-- ============================================
-- FRESH — Supabase Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL)
-- ============================================

-- Profiles (extends Supabase Auth users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  total_orders INTEGER DEFAULT 0,
  total_spent NUMERIC DEFAULT 0,
  push_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  variety TEXT,
  origin TEXT,
  price INTEGER NOT NULL,
  unit TEXT DEFAULT '/kg',
  image TEXT,
  tag TEXT,
  description TEXT,
  freshness TEXT,
  stock INTEGER DEFAULT 100,
  max_stock INTEGER DEFAULT 150,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  customer_name TEXT NOT NULL,
  items JSONB NOT NULL,
  items_summary TEXT,
  total NUMERIC NOT NULL,
  status TEXT DEFAULT 'Placed',
  delivery_boy_id TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders ON DELETE CASCADE NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('user', 'admin', 'system')),
  text TEXT NOT NULL,
  type TEXT DEFAULT 'text',
  amount TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Advance Orders
CREATE TABLE IF NOT EXISTS advance_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  customer_name TEXT NOT NULL,
  event TEXT NOT NULL,
  date TEXT NOT NULL,
  fruits JSONB NOT NULL,
  status TEXT DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Delivery Boys
CREATE TABLE IF NOT EXISTS delivery_boys (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  area TEXT,
  status TEXT DEFAULT 'available',
  deliveries INTEGER DEFAULT 0
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE advance_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_boys ENABLE ROW LEVEL SECURITY;

-- Profiles: users read/update their own, admins read all
CREATE POLICY "Users read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Products: public read, admin write
CREATE POLICY "Public read products" ON products
  FOR SELECT USING (true);

CREATE POLICY "Admin manage products" ON products
  FOR ALL USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Orders: users see own, admins see all
CREATE POLICY "Users read own orders" ON orders
  FOR SELECT USING (
    auth.uid() = user_id OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users create orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin update orders" ON orders
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Chat: users see messages for their orders, admins see all
CREATE POLICY "Users read own chat" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders WHERE orders.id = chat_messages.order_id
        AND (orders.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role = 'admin'
        ))
    )
  );

CREATE POLICY "Users send chat" ON chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders WHERE orders.id = chat_messages.order_id
        AND (orders.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role = 'admin'
        ))
    )
  );

-- Advance Orders
CREATE POLICY "Users read own advance" ON advance_orders
  FOR SELECT USING (
    auth.uid() = user_id OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users create advance" ON advance_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin update advance" ON advance_orders
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Delivery Boys: admin only
CREATE POLICY "Admin manage delivery" ON delivery_boys
  FOR ALL USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Public read delivery" ON delivery_boys
  FOR SELECT USING (true);

-- Admin delete policies (for user management)
CREATE POLICY "Admin delete profiles" ON profiles
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admin delete orders" ON orders
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admin delete chat messages" ON chat_messages
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM orders WHERE orders.id = chat_messages.order_id
      AND EXISTS (
        SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role = 'admin'
      )
  ));

-- ============================================
-- REALTIME (enable for chat + orders)
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- ============================================
-- FUNCTION: Auto-create profile on signup
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    CASE
      WHEN NEW.email IN ('testadmin@test.com', 'admin@fresh.com', 'admin@editorialorchard.com')
      THEN 'admin'
      ELSE 'user'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- AUTO-CLEANUP: Delete chat messages 5 days after delivery
-- Runs daily at 3:00 AM IST (9:30 PM UTC previous day)
-- ============================================

CREATE OR REPLACE FUNCTION public.cleanup_delivered_chats()
RETURNS void AS $$
BEGIN
  DELETE FROM chat_messages
  WHERE order_id IN (
    SELECT id FROM orders
    WHERE status = 'Delivered'
      AND updated_at < NOW() - INTERVAL '5 days'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable pg_cron extension (already enabled on most Supabase projects)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily cleanup at 21:30 UTC (3:00 AM IST)
SELECT cron.schedule(
  'cleanup-delivered-chats',
  '30 21 * * *',
  'SELECT public.cleanup_delivered_chats()'
);
