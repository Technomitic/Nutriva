-- Add hero and editor's pick flags to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_hero BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_editors_pick BOOLEAN DEFAULT FALSE;

-- Set defaults based on current hardcoded values
UPDATE products SET is_hero = TRUE WHERE id = 'mango';
UPDATE products SET is_editors_pick = TRUE WHERE id = 'apple';

SELECT 'Done! Mango = hero, Apple = editors pick' AS result;
