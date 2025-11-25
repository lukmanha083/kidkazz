-- Migration: Add warehouse_id to product_bundles
-- Date: 2025-11-25
-- Description: Add warehouseId field to product_bundles table to track where bundles are assembled

-- Add warehouse_id column to product_bundles table
ALTER TABLE product_bundles ADD COLUMN warehouse_id TEXT;

-- Note: No foreign key constraint added since warehouse data is in a separate service (inventory-service)
-- warehouse_id references warehouses(id) in the inventory-service database
