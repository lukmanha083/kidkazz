-- Migration: Add soft delete fields to products and categories tables
-- These fields enable soft delete (setting deletedAt instead of hard delete)
--
-- This migration is IDEMPOTENT - safe to run multiple times
-- Uses table recreation pattern since SQLite doesn't support ADD COLUMN IF NOT EXISTS

-- ============================================================================
-- CATEGORIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS categories_new (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  parent_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  deleted_at INTEGER,
  deleted_by TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Note: Include deleted_at and deleted_by to preserve soft-delete data on re-runs
INSERT OR IGNORE INTO categories_new (
  id, name, description, icon, color, parent_id, status,
  deleted_at, deleted_by,
  created_at, updated_at
)
SELECT
  id, name, description, icon, color, parent_id, status,
  deleted_at, deleted_by,
  created_at, updated_at
FROM categories;

DROP TABLE IF EXISTS categories;
ALTER TABLE categories_new RENAME TO categories;

CREATE INDEX IF NOT EXISTS idx_categories_status ON categories(status);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

-- ============================================================================
-- PRODUCTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS products_new (
  id TEXT PRIMARY KEY NOT NULL,
  barcode TEXT UNIQUE NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image TEXT,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,

  price REAL NOT NULL,
  retail_price REAL,
  wholesale_price REAL,

  base_unit TEXT NOT NULL DEFAULT 'PCS',
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

  status TEXT DEFAULT 'active',
  is_bundle INTEGER DEFAULT 0,

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

  deleted_at INTEGER,
  deleted_by TEXT,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

-- Note: Include deleted_at and deleted_by to preserve soft-delete data on re-runs
INSERT OR IGNORE INTO products_new (
  id, barcode, sku, name, description, image, category_id,
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
  deleted_at, deleted_by,
  created_at, updated_at, created_by, updated_by
)
SELECT
  id, barcode, sku, name, description, image, category_id,
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
  deleted_at, deleted_by,
  created_at, updated_at, created_by, updated_by
FROM products;

DROP TABLE IF EXISTS products;
ALTER TABLE products_new RENAME TO products;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
