-- Migration: Initial Accounting Service Schema
-- Description: Chart of Accounts, Journal Entries, and GL Tracking
-- Date: 2025-11-21

-- ============================================
-- Chart of Accounts
-- ============================================
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL, -- 4-digit code (e.g., "1000", "4010")
  name TEXT NOT NULL,
  description TEXT,

  -- Account Type and Classification
  account_type TEXT NOT NULL CHECK(account_type IN ('Asset', 'Liability', 'Equity', 'Revenue', 'COGS', 'Expense')),
  normal_balance TEXT NOT NULL CHECK(normal_balance IN ('Debit', 'Credit')),
  currency TEXT DEFAULT 'IDR' NOT NULL,

  -- Hierarchy (for sub-accounts)
  parent_account_id TEXT,
  level INTEGER DEFAULT 0 NOT NULL, -- 0 = top level, 1 = sub, 2 = sub-sub
  is_detail_account INTEGER DEFAULT 1 NOT NULL, -- 1 = can post transactions, 0 = header only
  is_system_account INTEGER DEFAULT 0 NOT NULL, -- 1 = protected from deletion

  -- Status
  status TEXT DEFAULT 'Active' NOT NULL CHECK(status IN ('Active', 'Inactive', 'Archived')),

  -- Audit fields
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by TEXT,
  updated_by TEXT,

  FOREIGN KEY (parent_account_id) REFERENCES chart_of_accounts(id) ON DELETE RESTRICT
);

-- Indexes for Chart of Accounts
CREATE INDEX IF NOT EXISTS idx_accounts_code ON chart_of_accounts(code);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON chart_of_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_accounts_parent ON chart_of_accounts(parent_account_id);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON chart_of_accounts(status);

-- ============================================
-- Journal Entries (Header)
-- ============================================
CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY,
  entry_number TEXT UNIQUE NOT NULL, -- Auto-generated: "JE-2025-0001"

  -- Entry Details
  entry_date INTEGER NOT NULL, -- Timestamp
  description TEXT NOT NULL,
  reference TEXT, -- Invoice #, PO #, Order #, etc.
  notes TEXT,

  -- Type and Status
  entry_type TEXT DEFAULT 'Manual' NOT NULL CHECK(entry_type IN ('Manual', 'System', 'Recurring', 'Adjusting', 'Closing')),
  status TEXT DEFAULT 'Draft' NOT NULL CHECK(status IN ('Draft', 'Posted', 'Voided')),

  -- Source tracking (which service/module created this entry)
  source_service TEXT, -- 'order-service', 'inventory-service', 'manual'
  source_reference_id TEXT, -- ID from source service (order_id, movement_id, etc.)

  -- Audit trail
  created_by TEXT,
  created_at INTEGER NOT NULL,
  posted_by TEXT,
  posted_at INTEGER,
  voided_by TEXT,
  voided_at INTEGER,
  void_reason TEXT,
  updated_at INTEGER NOT NULL
);

-- Indexes for Journal Entries
CREATE INDEX IF NOT EXISTS idx_journal_entries_entry_number ON journal_entries(entry_number);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_journal_entries_type ON journal_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_journal_entries_source ON journal_entries(source_service, source_reference_id);

-- ============================================
-- Journal Lines (Individual Debit/Credit Postings)
-- ============================================
CREATE TABLE IF NOT EXISTS journal_lines (
  id TEXT PRIMARY KEY,
  journal_entry_id TEXT NOT NULL,
  account_id TEXT NOT NULL,

  -- Amount and Direction
  direction TEXT NOT NULL CHECK(direction IN ('Debit', 'Credit')),
  amount REAL NOT NULL CHECK(amount > 0), -- Always positive, direction determines +/-

  -- Line description
  memo TEXT,

  -- GL Segmentation (for advanced tracking)
  -- Segment 1: Sales Person ID (commission tracking)
  sales_person_id TEXT,

  -- Segment 2: Warehouse ID (location tracking)
  warehouse_id TEXT,

  -- Segment 3: Sales Channel (POS, Online, B2B, Marketplace)
  sales_channel TEXT CHECK(sales_channel IN ('POS', 'Online', 'B2B', 'Marketplace', 'Wholesale')),

  -- Additional tracking fields
  customer_id TEXT, -- Reference to customer (for A/R tracking)
  vendor_id TEXT,   -- Reference to vendor (for A/P tracking)
  product_id TEXT,  -- Reference to product (for product-level reporting)

  -- Line sequence (for display order)
  line_number INTEGER DEFAULT 0 NOT NULL,

  -- Audit
  created_at INTEGER NOT NULL,

  FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id) ON DELETE RESTRICT
);

-- Indexes for Journal Lines
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_direction ON journal_lines(direction);
CREATE INDEX IF NOT EXISTS idx_journal_lines_sales_person ON journal_lines(sales_person_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_warehouse ON journal_lines(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_channel ON journal_lines(sales_channel);
CREATE INDEX IF NOT EXISTS idx_journal_lines_customer ON journal_lines(customer_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_product ON journal_lines(product_id);

-- Composite index for common queries (warehouse + account reporting)
CREATE INDEX IF NOT EXISTS idx_journal_lines_warehouse_account ON journal_lines(warehouse_id, account_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_channel_account ON journal_lines(sales_channel, account_id);

-- ============================================
-- Account Balances (Materialized View for Performance)
-- ============================================
CREATE TABLE IF NOT EXISTS account_balances (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,

  -- Fiscal Period
  fiscal_year INTEGER NOT NULL,
  fiscal_month INTEGER NOT NULL, -- 1-12

  -- Balances
  opening_balance REAL DEFAULT 0 NOT NULL,
  debit_total REAL DEFAULT 0 NOT NULL,
  credit_total REAL DEFAULT 0 NOT NULL,
  closing_balance REAL DEFAULT 0 NOT NULL,

  -- Timestamps
  last_updated INTEGER NOT NULL,

  FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id) ON DELETE CASCADE,
  UNIQUE(account_id, fiscal_year, fiscal_month)
);

-- Indexes for Account Balances
CREATE INDEX IF NOT EXISTS idx_account_balances_account ON account_balances(account_id);
CREATE INDEX IF NOT EXISTS idx_account_balances_period ON account_balances(fiscal_year, fiscal_month);

-- ============================================
-- Triggers and Constraints
-- ============================================

-- Trigger: Update journal entry timestamp
CREATE TRIGGER IF NOT EXISTS update_journal_entry_timestamp
AFTER UPDATE ON journal_entries
FOR EACH ROW
BEGIN
  UPDATE journal_entries SET updated_at = unixepoch() WHERE id = NEW.id;
END;

-- ============================================
-- Initial Chart of Accounts (Standard Accounts)
-- ============================================

-- Insert base system accounts
INSERT OR IGNORE INTO chart_of_accounts (id, code, name, account_type, normal_balance, level, is_detail_account, is_system_account, created_at, updated_at)
VALUES
  -- ASSETS (1000-1999)
  ('acc-1000', '1000', 'Cash', 'Asset', 'Debit', 0, 1, 1, unixepoch(), unixepoch()),
  ('acc-1010', '1010', 'Inventory - Finished Goods', 'Asset', 'Debit', 0, 1, 1, unixepoch(), unixepoch()),
  ('acc-1200', '1200', 'Accounts Receivable', 'Asset', 'Debit', 0, 1, 1, unixepoch(), unixepoch()),

  -- LIABILITIES (2000-2999)
  ('acc-2000', '2000', 'Accounts Payable', 'Liability', 'Credit', 0, 1, 1, unixepoch(), unixepoch()),

  -- EQUITY (3000-3999)
  ('acc-3000', '3000', 'Owner Equity', 'Equity', 'Credit', 0, 1, 1, unixepoch(), unixepoch()),
  ('acc-3100', '3100', 'Retained Earnings', 'Equity', 'Credit', 0, 1, 1, unixepoch(), unixepoch()),

  -- REVENUE (4000-4999)
  ('acc-4010', '4010', 'Product Sales - Retail', 'Revenue', 'Credit', 0, 1, 1, unixepoch(), unixepoch()),
  ('acc-4020', '4020', 'Product Sales - Wholesale', 'Revenue', 'Credit', 0, 1, 1, unixepoch(), unixepoch()),

  -- COGS (5000-5999)
  ('acc-5010', '5010', 'Cost of Goods Sold', 'COGS', 'Debit', 0, 1, 1, unixepoch(), unixepoch()),

  -- EXPENSES (6000-7999)
  ('acc-6000', '6000', 'Operating Expenses', 'Expense', 'Debit', 0, 1, 1, unixepoch(), unixepoch()),
  ('acc-6100', '6100', 'Salaries Expense', 'Expense', 'Debit', 0, 1, 1, unixepoch(), unixepoch()),
  ('acc-6200', '6200', 'Rent Expense', 'Expense', 'Debit', 0, 1, 1, unixepoch(), unixepoch());

-- ============================================
-- Comments and Documentation
-- ============================================

-- GL Segmentation Usage Examples:
--
-- 1. Track sales by warehouse:
--    SELECT warehouse_id, SUM(amount)
--    FROM journal_lines
--    WHERE account_id = 'acc-4010' AND direction = 'Credit'
--    GROUP BY warehouse_id;
--
-- 2. Track sales by sales person:
--    SELECT sales_person_id, SUM(amount)
--    FROM journal_lines
--    WHERE account_id IN ('acc-4010', 'acc-4020') AND direction = 'Credit'
--    GROUP BY sales_person_id;
--
-- 3. Track sales by channel:
--    SELECT sales_channel, SUM(amount)
--    FROM journal_lines
--    WHERE account_id IN ('acc-4010', 'acc-4020') AND direction = 'Credit'
--    GROUP BY sales_channel;
--
-- 4. Multi-dimensional analysis (warehouse + channel):
--    SELECT warehouse_id, sales_channel, SUM(amount)
--    FROM journal_lines
--    WHERE account_id = 'acc-4010' AND direction = 'Credit'
--    GROUP BY warehouse_id, sales_channel;
