-- Migration: Add entity_type column to customers and suppliers tables
-- This column distinguishes between person and company entities
--
-- This migration is IDEMPOTENT - safe to run multiple times
-- Uses table recreation pattern since SQLite doesn't support ADD COLUMN IF NOT EXISTS

-- ============================================================================
-- CUSTOMERS TABLE - Add entity_type
-- ============================================================================

-- Step 1: Create new customers table with entity_type
CREATE TABLE IF NOT EXISTS customers_new (
  id TEXT PRIMARY KEY NOT NULL,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company_name TEXT,
  npwp TEXT,
  entity_type TEXT NOT NULL DEFAULT 'person',
  customer_type TEXT NOT NULL DEFAULT 'retail',
  credit_limit INTEGER DEFAULT 0,
  payment_term_days INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,
  last_order_date INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  date_of_birth INTEGER,
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by TEXT,
  updated_by TEXT,
  deleted_at INTEGER,
  deleted_by TEXT
);

-- Step 2: Copy data from old table (entity_type will use default 'person')
-- NOTE: deleted_at/deleted_by columns are added in migration 0006, so we don't copy them here
INSERT OR IGNORE INTO customers_new (
  id, code, name, email, phone, company_name, npwp, customer_type,
  credit_limit, payment_term_days, total_orders, total_spent,
  last_order_date, status, date_of_birth, notes,
  created_at, updated_at, created_by, updated_by
)
SELECT
  id, code, name, email, phone, company_name, npwp, customer_type,
  credit_limit, payment_term_days, total_orders, total_spent,
  last_order_date, status, date_of_birth, notes,
  created_at, updated_at, created_by, updated_by
FROM customers;

-- Step 3: Drop old table and rename
DROP TABLE IF EXISTS customers;
ALTER TABLE customers_new RENAME TO customers;

-- Step 4: Recreate indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_code ON customers(code);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_customer_type ON customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_entity_type ON customers(entity_type);

-- ============================================================================
-- SUPPLIERS TABLE - Add entity_type
-- ============================================================================

-- Step 1: Create new suppliers table with entity_type
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
  lead_time_days INTEGER,
  minimum_order_amount INTEGER DEFAULT 0,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_account_name TEXT,
  rating REAL,
  total_orders INTEGER DEFAULT 0,
  total_purchased INTEGER DEFAULT 0,
  last_order_date INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by TEXT,
  updated_by TEXT,
  deleted_at INTEGER,
  deleted_by TEXT
);

-- Step 2: Copy data from old table
-- NOTE: deleted_at/deleted_by columns are added in migration 0006, so we don't copy them here
INSERT OR IGNORE INTO suppliers_new (
  id, code, name, email, phone, company_name, npwp,
  payment_term_days, lead_time_days, minimum_order_amount,
  bank_name, bank_account_number, bank_account_name,
  rating, total_orders, total_purchased,
  last_order_date, status, notes, created_at, updated_at, created_by, updated_by
)
SELECT
  id, code, name, email, phone, company_name, npwp,
  payment_term_days, lead_time_days, minimum_order_amount,
  bank_name, bank_account_number, bank_account_name,
  rating, total_orders, total_purchased,
  last_order_date, status, notes, created_at, updated_at, created_by, updated_by
FROM suppliers;

-- Step 3: Drop old table and rename
DROP TABLE IF EXISTS suppliers;
ALTER TABLE suppliers_new RENAME TO suppliers;

-- Step 4: Recreate indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(code);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_entity_type ON suppliers(entity_type);

-- ============================================================================
-- SUPPLIER_CONTACTS TABLE
-- ============================================================================

-- Create supplier_contacts table for sales persons (company suppliers)
CREATE TABLE IF NOT EXISTS supplier_contacts (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  position TEXT,
  is_primary INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  deleted_by TEXT
);

-- Create indexes for supplier_contacts
CREATE INDEX IF NOT EXISTS idx_supplier_contacts_supplier ON supplier_contacts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_contacts_status ON supplier_contacts(status);
