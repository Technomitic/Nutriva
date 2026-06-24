-- Support Tickets & Messages
-- Run this in Supabase SQL Editor

-- 1. Support Tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_name TEXT,
  topic TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Users can see their own tickets
CREATE POLICY "Users see own tickets" ON support_tickets
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create tickets
CREATE POLICY "Users create tickets" ON support_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can see and manage all tickets
CREATE POLICY "Admins full access tickets" ON support_tickets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Users can update their own tickets (for timestamp updates)
CREATE POLICY "Users update own tickets" ON support_tickets
  FOR UPDATE USING (auth.uid() = user_id);

-- 2. Support Messages
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read messages (for simplicity)
CREATE POLICY "Read support messages" ON support_messages
  FOR SELECT USING (true);

-- Anyone authenticated can insert messages
CREATE POLICY "Insert support messages" ON support_messages
  FOR INSERT WITH CHECK (true);

-- 3. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;

-- 4. Auto-delete resolved tickets after 48 hours
-- Enable pg_cron extension (already enabled on most Supabase projects)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cleanup every hour
SELECT cron.schedule(
  'cleanup-resolved-support-tickets',
  '0 * * * *',  -- every hour
  $$DELETE FROM support_tickets WHERE status = 'resolved' AND updated_at < now() - interval '48 hours'$$
);
