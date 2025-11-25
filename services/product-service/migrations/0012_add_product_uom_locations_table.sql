-- Migration: Add product_uom_locations table
-- Description: Tracks physical location and stock of product UOMs (BOX6, CARTON18, etc.) in warehouses
-- This allows multi-warehouse support for different packaging units
-- Date: 2025-11-25

CREATE TABLE IF NOT EXISTS product_uom_locations (
  id TEXT PRIMARY KEY,
  product_uom_id TEXT NOT NULL REFERENCES product_uoms(id) ON DELETE CASCADE,
  warehouse_id TEXT NOT NULL,
  rack TEXT,
  bin TEXT,
  zone TEXT,
  aisle TEXT,
  quantity INTEGER DEFAULT 0 NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_product_uom_locations_product_uom_id ON product_uom_locations(product_uom_id);
CREATE INDEX IF NOT EXISTS idx_product_uom_locations_warehouse_id ON product_uom_locations(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_product_uom_locations_uom_warehouse ON product_uom_locations(product_uom_id, warehouse_id);
