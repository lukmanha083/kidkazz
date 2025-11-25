-- Migration: Create variant_locations table
-- Date: 2025-11-25
-- Description: Create variant_locations table to track physical location of product variants in warehouses

CREATE TABLE IF NOT EXISTS variant_locations (
  id TEXT PRIMARY KEY NOT NULL,
  variant_id TEXT NOT NULL,
  warehouse_id TEXT NOT NULL,
  rack TEXT,
  bin TEXT,
  zone TEXT,
  aisle TEXT,
  quantity INTEGER DEFAULT 0 NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by TEXT,
  updated_by TEXT,
  FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_variant_locations_variant_id ON variant_locations(variant_id);
CREATE INDEX IF NOT EXISTS idx_variant_locations_warehouse_id ON variant_locations(warehouse_id);

-- Create unique constraint to prevent duplicate locations for same variant in same warehouse
CREATE UNIQUE INDEX IF NOT EXISTS idx_variant_locations_unique ON variant_locations(variant_id, warehouse_id);
