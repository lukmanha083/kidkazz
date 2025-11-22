-- Migration: Add soft delete fields to warehouses and inventory_movements
-- Date: 2025-11-22
-- Phase 1: Soft Delete Implementation

-- Add soft delete fields to warehouses
ALTER TABLE warehouses ADD COLUMN deleted_at INTEGER;
ALTER TABLE warehouses ADD COLUMN deleted_by TEXT;

-- Add soft delete fields to inventory_movements (audit trail)
ALTER TABLE inventory_movements ADD COLUMN deleted_at INTEGER;
ALTER TABLE inventory_movements ADD COLUMN deleted_by TEXT;

-- Create index for better query performance on active warehouses
CREATE INDEX idx_warehouses_deleted_at ON warehouses(deleted_at) WHERE deleted_at IS NULL;

-- Create index for better query performance on active inventory movements
CREATE INDEX idx_inventory_movements_deleted_at ON inventory_movements(deleted_at) WHERE deleted_at IS NULL;
