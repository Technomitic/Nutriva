-- ============================================
-- Fix: Set all products with NULL active to TRUE
-- Run this ONCE in Supabase SQL Editor (Dashboard → SQL)
-- ============================================

-- Set all NULL active values to true so the visibility toggle works cleanly
UPDATE products SET active = true WHERE active IS NULL;

-- Also enable realtime on the products table so visibility changes
-- sync to users instantly without polling
ALTER PUBLICATION supabase_realtime ADD TABLE products;

SELECT 'Done! All products with NULL active are now set to true, and realtime is enabled.' AS result;
