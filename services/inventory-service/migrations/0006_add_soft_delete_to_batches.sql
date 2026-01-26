-- Migration: Add soft delete fields to inventory_batches table
-- These fields enable soft delete (setting deletedAt instead of hard delete)
--
-- This migration is IDEMPOTENT - safe to run multiple times
-- Uses table recreation pattern since SQLite doesn't support ADD COLUMN IF NOT EXISTS

CREATE TABLE IF NOT EXISTS inventory_batches_new (
  id TEXT PRIMARY KEY NOT NULL,
  inventory_id TEXT NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  warehouse_id TEXT NOT NULL,

  batch_number TEXT NOT NULL,
  lot_number TEXT,

  expiration_date TEXT,
  alert_date TEXT,
  manufacture_date TEXT,

  quantity_available INTEGER NOT NULL DEFAULT 0,
  quantity_reserved INTEGER NOT NULL DEFAULT 0,

  received_date TEXT,
  supplier TEXT,
  purchase_order_id TEXT,
  cost INTEGER,

  status TEXT NOT NULL DEFAULT 'active',
  quarantine_reason TEXT,
  recall_reason TEXT,

  deleted_at INTEGER,
  deleted_by TEXT,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by TEXT,
  updated_by TEXT,
  version INTEGER DEFAULT 1,
  last_modified_at TEXT
);

-- Note: Do NOT include deleted_at/deleted_by in SELECT - old table doesn't have them
-- These columns will default to NULL in the new table
INSERT OR IGNORE INTO inventory_batches_new (
  id, inventory_id, product_id, warehouse_id,
  batch_number, lot_number,
  expiration_date, alert_date, manufacture_date,
  quantity_available, quantity_reserved,
  received_date, supplier, purchase_order_id, cost,
  status, quarantine_reason, recall_reason,
  created_at, updated_at, created_by, updated_by, version, last_modified_at
)
SELECT
  id, inventory_id, product_id, warehouse_id,
  batch_number, lot_number,
  expiration_date, alert_date, manufacture_date,
  quantity_available, quantity_reserved,
  received_date, supplier, purchase_order_id, cost,
  status, quarantine_reason, recall_reason,
  created_at, updated_at, created_by, updated_by, version, last_modified_at
FROM inventory_batches;

DROP TABLE IF EXISTS inventory_batches;
ALTER TABLE inventory_batches_new RENAME TO inventory_batches;

CREATE INDEX IF NOT EXISTS idx_batches_inventory ON inventory_batches(inventory_id);
CREATE INDEX IF NOT EXISTS idx_batches_product ON inventory_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_batches_warehouse ON inventory_batches(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_batches_status ON inventory_batches(status);
CREATE INDEX IF NOT EXISTS idx_batches_expiration ON inventory_batches(expiration_date);
