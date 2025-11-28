-- ============================================
-- Add Colors to Existing Categories
-- ============================================
-- This script adds default colors to categories for better visual distinction
-- in the admin dashboard.
--
-- To run this on Cloudflare D1:
-- 1. Go to Cloudflare Dashboard > Workers & Pages > D1
-- 2. Select your database
-- 3. Open the Console tab
-- 4. Copy and paste this SQL script
-- 5. Click "Execute"

BEGIN TRANSACTION;

-- Update categories with color based on their names
-- Baby & Kids categories
UPDATE categories SET color = 'pink'
WHERE (LOWER(name) LIKE '%baby%' OR LOWER(name) LIKE '%bayi%')
AND color IS NULL;

UPDATE categories SET color = 'cyan'
WHERE LOWER(name) LIKE '%bottle%'
AND color IS NULL;

-- Electronics & Toys
UPDATE categories SET color = 'orange'
WHERE LOWER(name) LIKE '%baterai%'
AND color IS NULL;

UPDATE categories SET color = 'purple'
WHERE (LOWER(name) LIKE '%toy%' OR LOWER(name) LIKE '%mainan%' OR LOWER(name) LIKE '%plastic%')
AND color IS NULL;

UPDATE categories SET color = 'blue'
WHERE (LOWER(name) LIKE '%elektronik%' OR LOWER(name) LIKE '%gadget%')
AND color IS NULL;

-- Food & Beverage
UPDATE categories SET color = 'green'
WHERE (LOWER(name) LIKE '%food%' OR LOWER(name) LIKE '%makanan%' OR LOWER(name) LIKE '%bubur%')
AND color IS NULL;

UPDATE categories SET color = 'teal'
WHERE (LOWER(name) LIKE '%beverage%' OR LOWER(name) LIKE '%minuman%')
AND color IS NULL;

-- Other common categories
UPDATE categories SET color = 'red'
WHERE (LOWER(name) LIKE '%clothing%' OR LOWER(name) LIKE '%fashion%' OR LOWER(name) LIKE '%pakaian%')
AND color IS NULL;

UPDATE categories SET color = 'orange'
WHERE (LOWER(name) LIKE '%book%' OR LOWER(name) LIKE '%buku%')
AND color IS NULL;

UPDATE categories SET color = 'indigo'
WHERE (LOWER(name) LIKE '%accessor%')
AND color IS NULL;

UPDATE categories SET color = 'yellow'
WHERE (LOWER(name) LIKE '%sport%' OR LOWER(name) LIKE '%olahraga%')
AND color IS NULL;

UPDATE categories SET color = 'pink'
WHERE (LOWER(name) LIKE '%beauty%' OR LOWER(name) LIKE '%kecantikan%')
AND color IS NULL;

UPDATE categories SET color = 'green'
WHERE (LOWER(name) LIKE '%health%' OR LOWER(name) LIKE '%kesehatan%')
AND color IS NULL;

UPDATE categories SET color = 'cyan'
WHERE (LOWER(name) LIKE '%home%' OR LOWER(name) LIKE '%rumah%')
AND color IS NULL;

UPDATE categories SET color = 'orange'
WHERE (LOWER(name) LIKE '%kitchen%' OR LOWER(name) LIKE '%dapur%')
AND color IS NULL;

-- Assign default colors to remaining categories without colors
-- This uses a simple round-robin approach
UPDATE categories SET color = 'blue'
WHERE color IS NULL
AND id IN (
  SELECT id FROM categories WHERE color IS NULL LIMIT 100 OFFSET 0
);

UPDATE categories SET color = 'green'
WHERE color IS NULL
AND id IN (
  SELECT id FROM categories WHERE color IS NULL LIMIT 100 OFFSET 0
);

UPDATE categories SET color = 'purple'
WHERE color IS NULL
AND id IN (
  SELECT id FROM categories WHERE color IS NULL LIMIT 100 OFFSET 0
);

UPDATE categories SET color = 'orange'
WHERE color IS NULL
AND id IN (
  SELECT id FROM categories WHERE color IS NULL LIMIT 100 OFFSET 0
);

UPDATE categories SET color = 'pink'
WHERE color IS NULL
AND id IN (
  SELECT id FROM categories WHERE color IS NULL LIMIT 100 OFFSET 0
);

UPDATE categories SET color = 'teal'
WHERE color IS NULL;

COMMIT;

-- Verify the updates
SELECT name, color, status FROM categories ORDER BY name;
