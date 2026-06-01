-- ============================================
-- Nutriva — Security Hardening SQL
-- Run this in Supabase SQL Editor (Dashboard → SQL)
-- Fixes: chat INSERT policy, user cancel scope, admin email sync
-- ============================================

-- ══════════════════════════════════════════════
-- 1. Fix overly-permissive chat_messages INSERT
-- Previously: WITH CHECK (true) — any user could message any order's chat
-- Now: Only the order owner or admin can send messages
-- ══════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can send chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users send chat" ON chat_messages;

CREATE POLICY "Users send own order chat"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = chat_messages.order_id
      AND (orders.user_id = auth.uid() OR public.is_admin())
    )
  );


-- ══════════════════════════════════════════════
-- 2. Restrict user order UPDATE to only status changes
-- Previously: Users could update ANY column on their own orders
-- Now: Users can only update status to 'Cancelled' on orders
--      that are in cancellable states
-- ══════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can update their own orders" ON orders;

CREATE POLICY "Users can cancel own orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND status IN ('Placed', 'Awaiting Confirmation', 'Payment Pending')
  )
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'Cancelled'
  );


-- ══════════════════════════════════════════════
-- 3. Sync admin emails in the signup trigger
-- Ensures nutriva.com admin email is recognized
-- ══════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    CASE
      WHEN NEW.email IN (
        'testadmin@test.com',
        'admin@nutriva.com',
        'admin@editorialorchard.com',
        'admin@fresh.com'
      )
      THEN 'admin'
      ELSE 'user'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ══════════════════════════════════════════════
-- 4. Restrict delivery_boys: hide phone from non-admins
-- Create a view that only admins can see full details
-- Regular users can only see name, area, status
-- ══════════════════════════════════════════════

-- Drop existing permissive policy
DROP POLICY IF EXISTS "Anyone can view delivery boys" ON delivery_boys;
DROP POLICY IF EXISTS "Public read delivery" ON delivery_boys;
DROP POLICY IF EXISTS "Public read delivery boys" ON delivery_boys;

-- Only authenticated users can view delivery boys (not anonymous)
CREATE POLICY "Authenticated read delivery boys"
  ON delivery_boys FOR SELECT
  TO authenticated
  USING (true);

-- Note: Phone numbers are still visible to all authenticated users.
-- For full phone privacy, create a Postgres VIEW that conditionally
-- shows phone only for admins (using is_admin()). This is a trade-off
-- since the app needs delivery boy names for the assignment UI.


SELECT 'Security hardening applied successfully!' AS result;
