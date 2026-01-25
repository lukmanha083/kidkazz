-- Migration: Add best_seller_product_count column to suppliers table
-- This column tracks the number of best-seller products provided by each supplier
-- Updated by Product Service via tRPC
--
-- This migration is IDEMPOTENT - safe to run multiple times
-- Uses table recreation pattern since SQLite doesn't support ADD COLUMN IF NOT EXISTS

-- Step 1: Create new table with desired schema (includes new column)
CREATE TABLE IF NOT EXISTS suppliers_new (
  id TEXT PRIMARY KEY NOT NULL,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  entity_type TEXT NOT NULL DEFAULT 'person',
  company_name TEXT,
  npwp TEXT,
  payment_term_days INTEGER DEFAULT 30,
  lead_time_days INTEGER, -- Calculated from purchase orders, no default
  minimum_order_amount INTEGER DEFAULT 0,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_account_name TEXT,
  rating REAL,
  total_orders INTEGER DEFAULT 0,
  total_purchased INTEGER DEFAULT 0,
  best_seller_product_count INTEGER DEFAULT 0,
  last_order_date INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

-- Step 2: Copy data from old table
-- Use explicit column list without best_seller_product_count (it will use default 0)
INSERT OR IGNORE INTO suppliers_new (
  id, code, name, email, phone, entity_type, company_name, npwp,
  payment_term_days, lead_time_days, minimum_order_amount,
  bank_name, bank_account_number, bank_account_name,
  rating, total_orders, total_purchased,
  last_order_date, status, notes, created_at, updated_at, created_by, updated_by
)
SELECT
  id, code, name, email, phone,
  COALESCE(entity_type, 'person'),
  company_name, npwp,
  payment_term_days, lead_time_days, minimum_order_amount,
  bank_name, bank_account_number, bank_account_name,
  rating, total_orders, total_purchased,
  last_order_date, status, notes, created_at, updated_at, created_by, updated_by
FROM suppliers;

-- Step 3: Drop old table
DROP TABLE IF EXISTS suppliers;

-- Step 4: Rename new table to original name
ALTER TABLE suppliers_new RENAME TO suppliers;

-- Step 5: Recreate indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(code);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_entity_type ON suppliers(entity_type);
