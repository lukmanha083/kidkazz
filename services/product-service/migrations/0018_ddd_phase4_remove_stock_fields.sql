-- Migration: 0018_ddd_phase4_remove_stock_fields
-- Description: Remove all stock-related fields from Product Service tables (DDD Phase 4)
-- Phase: 4 - Product Service Schema Cleanup
-- DDD Fix: All stock/inventory data is now the sole responsibility of Inventory Service
--
-- IMPORTANT: SQLite does not support DROP COLUMN directly.
-- We need to use the table recreation approach:
-- 1. Create new table without the column
-- 2. Copy data from old table
-- 3. Drop old table
-- 4. Rename new table

-- ============================================================
-- STEP 1: Remove minimumStock, expirationDate, alertDate from products
-- ============================================================

-- Create temporary table without stock fields
CREATE TABLE products_new (
  id TEXT PRIMARY KEY,
  barcode TEXT UNIQUE NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  brand TEXT,

  price REAL NOT NULL,
  retail_price REAL,
  wholesale_price REAL,

  -- REMOVED: minimumStock - now in Inventory Service

  base_unit TEXT DEFAULT 'PCS' NOT NULL,
  wholesale_threshold INTEGER DEFAULT 100,
  minimum_order_quantity INTEGER DEFAULT 1,

  weight REAL,
  length REAL,
  width REAL,
  height REAL,

  rating REAL DEFAULT 0,
  reviews INTEGER DEFAULT 0,

  available_for_retail INTEGER DEFAULT 1,
  available_for_wholesale INTEGER DEFAULT 1,

  status TEXT DEFAULT 'omnichannel sales',
  is_bundle INTEGER DEFAULT 0,

  -- REMOVED: expiration_date, alert_date - now in Inventory Service batches

  revenue_account_id TEXT,
  revenue_account_code TEXT,
  cogs_account_id TEXT,
  cogs_account_code TEXT,
  inventory_account_id TEXT,
  inventory_account_code TEXT,
  deferred_cogs_account_id TEXT,

  cost_price REAL,
  costing_method TEXT DEFAULT 'Average',

  taxable INTEGER DEFAULT 1,
  tax_category_id TEXT,

  gl_segment1 TEXT,
  gl_segment2 TEXT,
  gl_segment3 TEXT,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Copy data (excluding removed columns)
INSERT INTO products_new SELECT
  id, barcode, sku, name, description, category_id, brand,
  price, retail_price, wholesale_price,
  base_unit, wholesale_threshold, minimum_order_quantity,
  weight, length, width, height,
  rating, reviews,
  available_for_retail, available_for_wholesale,
  status, is_bundle,
  revenue_account_id, revenue_account_code, cogs_account_id, cogs_account_code,
  inventory_account_id, inventory_account_code, deferred_cogs_account_id,
  cost_price, costing_method,
  taxable, tax_category_id,
  gl_segment1, gl_segment2, gl_segment3,
  created_at, updated_at
FROM products;

DROP TABLE products;
ALTER TABLE products_new RENAME TO products;

-- ============================================================
-- STEP 2: Remove stock from product_uoms
-- ============================================================

CREATE TABLE product_uoms_new (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  uom_code TEXT NOT NULL,
  uom_name TEXT NOT NULL,
  barcode TEXT UNIQUE NOT NULL,
  conversion_factor INTEGER NOT NULL,
  -- REMOVED: stock - now in Inventory Service
  is_default INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

INSERT INTO product_uoms_new SELECT
  id, product_id, uom_code, uom_name, barcode, conversion_factor,
  is_default, created_at, updated_at
FROM product_uoms;

DROP TABLE product_uoms;
ALTER TABLE product_uoms_new RENAME TO product_uoms;

-- ============================================================
-- STEP 3: Remove stock from product_variants
-- ============================================================

CREATE TABLE product_variants_new (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_sku TEXT NOT NULL,
  variant_name TEXT NOT NULL,
  variant_sku TEXT UNIQUE NOT NULL,
  variant_type TEXT NOT NULL,
  price REAL NOT NULL,
  -- REMOVED: stock - now in Inventory Service
  status TEXT DEFAULT 'active' NOT NULL,
  image TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

INSERT INTO product_variants_new SELECT
  id, product_id, product_name, product_sku, variant_name, variant_sku,
  variant_type, price, status, image, created_at, updated_at
FROM product_variants;

DROP TABLE product_variants;
ALTER TABLE product_variants_new RENAME TO product_variants;

-- ============================================================
-- STEP 4: Remove quantity from product_locations
-- ============================================================

CREATE TABLE product_locations_new (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id TEXT NOT NULL,
  rack TEXT,
  bin TEXT,
  zone TEXT,
  aisle TEXT,
  -- REMOVED: quantity - now in Inventory Service
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

INSERT INTO product_locations_new SELECT
  id, product_id, warehouse_id, rack, bin, zone, aisle,
  created_at, updated_at, created_by, updated_by
FROM product_locations;

DROP TABLE product_locations;
ALTER TABLE product_locations_new RENAME TO product_locations;

-- ============================================================
-- STEP 5: Remove quantity from variant_locations
-- ============================================================

CREATE TABLE variant_locations_new (
  id TEXT PRIMARY KEY,
  variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  warehouse_id TEXT NOT NULL,
  rack TEXT,
  bin TEXT,
  zone TEXT,
  aisle TEXT,
  -- REMOVED: quantity - now in Inventory Service
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

INSERT INTO variant_locations_new SELECT
  id, variant_id, warehouse_id, rack, bin, zone, aisle,
  created_at, updated_at, created_by, updated_by
FROM variant_locations;

DROP TABLE variant_locations;
ALTER TABLE variant_locations_new RENAME TO variant_locations;

-- ============================================================
-- STEP 6: Remove quantity from product_uom_locations
-- ============================================================

CREATE TABLE product_uom_locations_new (
  id TEXT PRIMARY KEY,
  product_uom_id TEXT NOT NULL REFERENCES product_uoms(id) ON DELETE CASCADE,
  warehouse_id TEXT NOT NULL,
  rack TEXT,
  bin TEXT,
  zone TEXT,
  aisle TEXT,
  -- REMOVED: quantity - now in Inventory Service
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

INSERT INTO product_uom_locations_new SELECT
  id, product_uom_id, warehouse_id, rack, bin, zone, aisle,
  created_at, updated_at, created_by, updated_by
FROM product_uom_locations;

DROP TABLE product_uom_locations;
ALTER TABLE product_uom_locations_new RENAME TO product_uom_locations;

-- ============================================================
-- Recreate indexes (if any were defined)
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_product_uoms_product ON product_uoms(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_locations_product ON product_locations(product_id);
CREATE INDEX IF NOT EXISTS idx_product_locations_warehouse ON product_locations(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_variant_locations_variant ON variant_locations(variant_id);
CREATE INDEX IF NOT EXISTS idx_variant_locations_warehouse ON variant_locations(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_product_uom_locations_uom ON product_uom_locations(product_uom_id);
CREATE INDEX IF NOT EXISTS idx_product_uom_locations_warehouse ON product_uom_locations(warehouse_id);
