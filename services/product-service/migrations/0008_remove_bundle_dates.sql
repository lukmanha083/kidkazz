-- Migration: Remove start_date and end_date from product_bundles table
-- Product bundles do not have expiration dates as per business requirements

-- SQLite doesn't support DROP COLUMN directly, so we need to recreate the table

-- Step 1: Create new table without start_date and end_date
CREATE TABLE product_bundles_new (
  id TEXT PRIMARY KEY,
  bundle_name TEXT NOT NULL,
  bundle_sku TEXT UNIQUE NOT NULL,
  bundle_description TEXT,
  bundle_image TEXT,
  bundle_price REAL NOT NULL,
  discount_percentage REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  available_stock INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Step 2: Copy data from old table to new table (excluding start_date and end_date)
INSERT INTO product_bundles_new (
  id, bundle_name, bundle_sku, bundle_description, bundle_image,
  bundle_price, discount_percentage, status, available_stock,
  created_at, updated_at
)
SELECT
  id, bundle_name, bundle_sku, bundle_description, bundle_image,
  bundle_price, discount_percentage, status, available_stock,
  created_at, updated_at
FROM product_bundles;

-- Step 3: Drop old table
DROP TABLE product_bundles;

-- Step 4: Rename new table to original name
ALTER TABLE product_bundles_new RENAME TO product_bundles;
