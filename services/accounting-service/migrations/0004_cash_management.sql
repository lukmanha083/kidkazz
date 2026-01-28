-- =====================================================
-- Cash Management Module Schema
-- Phase 10b: Bank Reconciliation & Cash Reports
-- Version: 1.0
-- Date: 2026-01-28
-- =====================================================

-- Bank Accounts
-- Links bank accounts to GL accounts for reconciliation
CREATE TABLE IF NOT EXISTS bank_accounts (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('OPERATING', 'PAYROLL', 'SAVINGS', 'FOREIGN_CURRENCY')),
  currency TEXT NOT NULL DEFAULT 'IDR',
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Closed')),
  last_reconciled_date TEXT,
  last_reconciled_balance REAL,
  -- Audit
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_account_id ON bank_accounts(account_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_number ON bank_accounts(account_number);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_bank_name ON bank_accounts(bank_name);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_status ON bank_accounts(status);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_type ON bank_accounts(account_type);

-- Bank Statements
-- Imported bank statement headers
CREATE TABLE IF NOT EXISTS bank_statements (
  id TEXT PRIMARY KEY,
  bank_account_id TEXT NOT NULL REFERENCES bank_accounts(id) ON DELETE RESTRICT,
  statement_date TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  opening_balance REAL NOT NULL,
  closing_balance REAL NOT NULL,
  total_debits REAL NOT NULL DEFAULT 0,
  total_credits REAL NOT NULL DEFAULT 0,
  transaction_count INTEGER NOT NULL DEFAULT 0,
  -- Import tracking
  import_source TEXT,
  imported_at TEXT NOT NULL,
  imported_by TEXT,
  -- Audit
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bank_statements_account ON bank_statements(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_statements_date ON bank_statements(statement_date);
CREATE INDEX IF NOT EXISTS idx_bank_statements_period ON bank_statements(period_start, period_end);

-- Bank Transactions
-- Individual statement lines with fingerprints for duplicate detection
CREATE TABLE IF NOT EXISTS bank_transactions (
  id TEXT PRIMARY KEY,
  bank_statement_id TEXT NOT NULL REFERENCES bank_statements(id) ON DELETE CASCADE,
  bank_account_id TEXT NOT NULL REFERENCES bank_accounts(id) ON DELETE RESTRICT,
  transaction_date TEXT NOT NULL,
  post_date TEXT,
  description TEXT NOT NULL,
  reference TEXT,
  amount REAL NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('DEBIT', 'CREDIT')),
  running_balance REAL,
  -- Duplicate detection fingerprint
  fingerprint TEXT NOT NULL,
  -- Matching status
  match_status TEXT NOT NULL DEFAULT 'UNMATCHED' CHECK (match_status IN ('UNMATCHED', 'MATCHED', 'EXCLUDED')),
  matched_journal_line_id TEXT,
  matched_at TEXT,
  matched_by TEXT,
  -- Audit
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_statement ON bank_transactions(bank_statement_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_account ON bank_transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_transactions(transaction_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_transactions_fingerprint ON bank_transactions(fingerprint);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_match_status ON bank_transactions(match_status);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_matched_journal ON bank_transactions(matched_journal_line_id);

-- Bank Reconciliations
-- Reconciliation records per period
CREATE TABLE IF NOT EXISTS bank_reconciliations (
  id TEXT PRIMARY KEY,
  bank_account_id TEXT NOT NULL REFERENCES bank_accounts(id) ON DELETE RESTRICT,
  fiscal_year INTEGER NOT NULL,
  fiscal_month INTEGER NOT NULL,
  -- Balances
  statement_ending_balance REAL NOT NULL,
  book_ending_balance REAL NOT NULL,
  -- Adjusted balances
  adjusted_bank_balance REAL,
  adjusted_book_balance REAL,
  -- Reconciliation counts
  total_transactions INTEGER NOT NULL DEFAULT 0,
  matched_transactions INTEGER NOT NULL DEFAULT 0,
  unmatched_transactions INTEGER NOT NULL DEFAULT 0,
  -- Status workflow
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'APPROVED')),
  -- Workflow timestamps
  completed_at TEXT,
  completed_by TEXT,
  approved_at TEXT,
  approved_by TEXT,
  -- Notes
  notes TEXT,
  -- Audit
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_bank_reconciliations_account ON bank_reconciliations(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_reconciliations_period ON bank_reconciliations(fiscal_year, fiscal_month);
CREATE INDEX IF NOT EXISTS idx_bank_reconciliations_status ON bank_reconciliations(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_reconciliations_account_period ON bank_reconciliations(bank_account_id, fiscal_year, fiscal_month);

-- Reconciliation Items
-- Outstanding checks, deposits in transit, adjustments
CREATE TABLE IF NOT EXISTS reconciliation_items (
  id TEXT PRIMARY KEY,
  reconciliation_id TEXT NOT NULL REFERENCES bank_reconciliations(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('OUTSTANDING_CHECK', 'DEPOSIT_IN_TRANSIT', 'BANK_FEE', 'BANK_INTEREST', 'NSF_CHECK', 'ADJUSTMENT')),
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  transaction_date TEXT NOT NULL,
  reference TEXT,
  -- Whether this item requires a journal entry
  requires_journal_entry INTEGER NOT NULL DEFAULT 0,
  journal_entry_id TEXT,
  -- Status
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CLEARED', 'VOIDED')),
  cleared_at TEXT,
  cleared_in_reconciliation_id TEXT,
  -- Audit
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_items_reconciliation ON reconciliation_items(reconciliation_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_items_type ON reconciliation_items(item_type);
CREATE INDEX IF NOT EXISTS idx_reconciliation_items_status ON reconciliation_items(status);
CREATE INDEX IF NOT EXISTS idx_reconciliation_items_date ON reconciliation_items(transaction_date);

-- Cash Threshold Configuration
-- Warning/critical/emergency thresholds for cash alerts (Rule 35)
CREATE TABLE IF NOT EXISTS cash_threshold_config (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  -- Threshold amounts (in IDR)
  warning_threshold REAL NOT NULL,
  critical_threshold REAL NOT NULL,
  emergency_threshold REAL NOT NULL,
  -- Alert settings
  enable_alerts INTEGER NOT NULL DEFAULT 1,
  alert_email_recipients TEXT, -- JSON array of emails
  -- Active flag
  is_active INTEGER NOT NULL DEFAULT 1,
  -- Audit
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cash_threshold_config_name ON cash_threshold_config(name);
CREATE INDEX IF NOT EXISTS idx_cash_threshold_config_active ON cash_threshold_config(is_active);

-- Insert default cash threshold configuration (Rule 35)
INSERT OR IGNORE INTO cash_threshold_config (
  id, name, description,
  warning_threshold, critical_threshold, emergency_threshold,
  enable_alerts, is_active, created_at, updated_at, created_by
) VALUES (
  'default',
  'Default Cash Threshold',
  'Default cash threshold configuration per Rule 35',
  300000000, -- Rp 300M warning
  275000000, -- Rp 275M critical
  250000000, -- Rp 250M emergency
  1,
  1,
  datetime('now'),
  datetime('now'),
  'system'
);
