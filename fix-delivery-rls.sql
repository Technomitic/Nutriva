-- ============================================
-- Fresh — Fix delivery_boys + orders assignment
-- Run this in Supabase SQL Editor
-- ============================================

-- ========== DELIVERY BOYS TABLE ==========

-- Enable RLS
ALTER TABLE delivery_boys ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies first (safe re-run)
DROP POLICY IF EXISTS "Admins can manage delivery boys" ON delivery_boys;
DROP POLICY IF EXISTS "Anyone can view delivery boys" ON delivery_boys;
DROP POLICY IF EXISTS "Admins can delete delivery boys" ON delivery_boys;
DROP POLICY IF EXISTS "Admins can insert delivery boys" ON delivery_boys;
DROP POLICY IF EXISTS "Admins can update delivery boys" ON delivery_boys;
DROP POLICY IF EXISTS "Public read delivery boys" ON delivery_boys;
DROP POLICY IF EXISTS "Enable read access for all users" ON delivery_boys;

-- Recreate clean policies
CREATE POLICY "Anyone can view delivery boys"
  ON delivery_boys FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert delivery boys"
  ON delivery_boys FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update delivery boys"
  ON delivery_boys FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete delivery boys"
  ON delivery_boys FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );


-- ========== ORDERS TABLE — delivery assignment columns ==========

-- Add delivery assignment columns
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_boy_id text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_boy_name text;

-- Make sure orders RLS allows admin to update delivery_boy fields
-- Drop and recreate admin update policy for orders
DROP POLICY IF EXISTS "Admins can update orders" ON orders;
DROP POLICY IF EXISTS "Admin full access orders" ON orders;

CREATE POLICY "Admins can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
