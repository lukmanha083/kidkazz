-- Migration: 0003_add_inventory_batches_table
-- Description: Add inventory_batches table for batch/lot tracking with FEFO support
-- Phase: 3 - Batch Tracking & FEFO
-- DDD Fix: Expiration dates are batch-level characteristics, not product-level

CREATE TABLE IF NOT EXISTS inventory_batches (
  id TEXT PRIMARY KEY,
  inventory_id TEXT NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  warehouse_id TEXT NOT NULL,

  -- Batch identification
  batch_number TEXT NOT NULL,
  lot_number TEXT,

  -- Batch-specific expiration (DDD: expiration is batch characteristic!)
  expiration_date TEXT,
  alert_date TEXT,
  manufacture_date TEXT,

  -- Stock for this specific batch
  quantity_available INTEGER NOT NULL DEFAULT 0,
  quantity_reserved INTEGER NOT NULL DEFAULT 0,

  -- Traceability
  received_date TEXT,
  supplier TEXT,
  purchase_order_id TEXT,
  cost INTEGER,

  -- Batch status
  status TEXT NOT NULL DEFAULT 'active',
  quarantine_reason TEXT,
  recall_reason TEXT,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Indexes for efficient querying
CREATE INDEX idx_inventory_batches_inventory_id ON inventory_batches(inventory_id);
CREATE INDEX idx_inventory_batches_product_warehouse ON inventory_batches(product_id, warehouse_id);
CREATE INDEX idx_inventory_batches_batch_number ON inventory_batches(batch_number);
CREATE INDEX idx_inventory_batches_expiration ON inventory_batches(expiration_date);
CREATE INDEX idx_inventory_batches_status ON inventory_batches(status);

-- Composite index for FEFO (First Expired, First Out) ordering
CREATE INDEX idx_inventory_batches_fefo ON inventory_batches(product_id, warehouse_id, expiration_date, status);
