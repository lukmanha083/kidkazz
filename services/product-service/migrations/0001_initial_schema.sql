-- Migration: Initial Product Service Schema
-- Created: 2025-11-14
-- Description: Creates tables for products, pricing tiers, and custom pricing

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  description TEXT,

  -- Pricing
  retail_price REAL,
  base_price REAL NOT NULL,

  -- Availability
  available_for_retail INTEGER DEFAULT 0 NOT NULL,
  available_for_wholesale INTEGER DEFAULT 1 NOT NULL,

  -- Wholesale settings
  minimum_order_quantity INTEGER DEFAULT 1 NOT NULL,

  -- Status
  status TEXT DEFAULT 'active' NOT NULL,

  -- Audit fields
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by TEXT,
  updated_by TEXT,

  -- Constraints
  CHECK (base_price > 0),
  CHECK (retail_price IS NULL OR retail_price > 0),
  CHECK (minimum_order_quantity > 0),
  CHECK (status IN ('active', 'inactive', 'discontinued')),
  CHECK (available_for_retail IN (0, 1)),
  CHECK (available_for_wholesale IN (0, 1)),
  CHECK (available_for_retail = 1 OR available_for_wholesale = 1)
);

-- Pricing tiers table
CREATE TABLE IF NOT EXISTS pricing_tiers (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  min_quantity INTEGER NOT NULL,
  discount_percentage REAL NOT NULL,
  created_at INTEGER NOT NULL,

  -- Foreign key
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,

  -- Constraints
  CHECK (min_quantity > 0),
  CHECK (discount_percentage >= 0 AND discount_percentage <= 100)
);

-- Custom pricing table
CREATE TABLE IF NOT EXISTS custom_pricing (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  custom_price REAL NOT NULL,
  valid_from INTEGER,
  valid_until INTEGER,
  created_at INTEGER NOT NULL,
  created_by TEXT,

  -- Foreign key
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,

  -- Constraints
  CHECK (custom_price > 0),
  CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until > valid_from),

  -- Unique constraint: one custom price per product-user combination
  UNIQUE (product_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_retail ON products(available_for_retail);
CREATE INDEX IF NOT EXISTS idx_products_wholesale ON products(available_for_wholesale);
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_product ON pricing_tiers(product_id);
CREATE INDEX IF NOT EXISTS idx_custom_pricing_product ON custom_pricing(product_id);
CREATE INDEX IF NOT EXISTS idx_custom_pricing_user ON custom_pricing(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_pricing_validity ON custom_pricing(valid_from, valid_until);
