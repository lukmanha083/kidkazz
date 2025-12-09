-- DDD Enhancement Migration
-- Phase 1: Add variant/UOM support, physical location fields, and optimistic locking
-- Reference: docs/DDD_REFACTORING_ROADMAP.md

-- ============================================
-- 1. Add variant and UOM support to inventory
-- ============================================
ALTER TABLE inventory ADD COLUMN variant_id TEXT;
ALTER TABLE inventory ADD COLUMN uom_id TEXT;

-- ============================================
-- 2. Add physical location fields (from Product Service)
-- These fields are moved from productLocations, variantLocations, productUOMLocations
-- ============================================
ALTER TABLE inventory ADD COLUMN rack TEXT;
ALTER TABLE inventory ADD COLUMN bin TEXT;
ALTER TABLE inventory ADD COLUMN zone TEXT;
ALTER TABLE inventory ADD COLUMN aisle TEXT;

-- ============================================
-- 3. Add optimistic locking fields
-- Used to prevent race conditions during concurrent updates
-- ============================================
ALTER TABLE inventory ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE inventory ADD COLUMN last_modified_at TEXT DEFAULT CURRENT_TIMESTAMP;

-- ============================================
-- 4. Add optimistic locking to batches
-- ============================================
ALTER TABLE inventory_batches ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE inventory_batches ADD COLUMN last_modified_at TEXT DEFAULT CURRENT_TIMESTAMP;

-- ============================================
-- 5. Indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_inventory_variant ON inventory(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_uom ON inventory(uom_id);
CREATE INDEX IF NOT EXISTS idx_inventory_version ON inventory(product_id, warehouse_id, version);
CREATE INDEX IF NOT EXISTS idx_inventory_location ON inventory(warehouse_id, zone, aisle, rack, bin);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_version ON inventory_batches(inventory_id, version);
