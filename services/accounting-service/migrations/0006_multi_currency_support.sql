-- =====================================================
-- Phase 11b: Multi-Currency Support (USD/IDR only)
-- Currencies, Exchange Rates, and Journal Entry Modifications
-- Version: 1.0
-- Date: 2026-01-28
-- =====================================================

-- Currencies table
-- Stores supported currencies (USD and IDR only)
CREATE TABLE IF NOT EXISTS currencies (
  code TEXT PRIMARY KEY, -- ISO 4217: USD, IDR
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  decimal_places INTEGER NOT NULL DEFAULT 2,
  is_active INTEGER NOT NULL DEFAULT 1,
  is_base_currency INTEGER NOT NULL DEFAULT 0, -- IDR is base currency
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_currencies_active ON currencies(is_active);
CREATE INDEX IF NOT EXISTS idx_currencies_base ON currencies(is_base_currency);

-- Exchange Rates table
-- Historical USD/IDR exchange rates
CREATE TABLE IF NOT EXISTS exchange_rates (
  id TEXT PRIMARY KEY,
  from_currency TEXT NOT NULL REFERENCES currencies(code) ON DELETE RESTRICT,
  to_currency TEXT NOT NULL REFERENCES currencies(code) ON DELETE RESTRICT,
  rate REAL NOT NULL, -- from_currency * rate = to_currency
  effective_date TEXT NOT NULL,
  source TEXT, -- manual, api, bank
  created_by TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_from ON exchange_rates(from_currency);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_to ON exchange_rates(to_currency);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_date ON exchange_rates(effective_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_exchange_rates_unique ON exchange_rates(from_currency, to_currency, effective_date);

-- Add currency columns to journal_entries
ALTER TABLE journal_entries ADD COLUMN currency TEXT DEFAULT 'IDR';
ALTER TABLE journal_entries ADD COLUMN exchange_rate REAL DEFAULT 1;
ALTER TABLE journal_entries ADD COLUMN base_currency_amount REAL;

-- Add currency columns to journal_lines
ALTER TABLE journal_lines ADD COLUMN currency TEXT DEFAULT 'IDR';
ALTER TABLE journal_lines ADD COLUMN foreign_debit REAL DEFAULT 0;
ALTER TABLE journal_lines ADD COLUMN foreign_credit REAL DEFAULT 0;

-- Currency Revaluation Records table
-- Tracks month-end USD revaluation
CREATE TABLE IF NOT EXISTS currency_revaluations (
  id TEXT PRIMARY KEY,
  fiscal_year INTEGER NOT NULL,
  fiscal_month INTEGER NOT NULL,
  revaluation_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'reversed')),
  -- Summary
  total_unrealized_gain REAL NOT NULL DEFAULT 0,
  total_unrealized_loss REAL NOT NULL DEFAULT 0,
  net_gain_loss REAL NOT NULL DEFAULT 0,
  -- Journal reference
  journal_entry_id TEXT,
  -- Audit
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  posted_by TEXT,
  posted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_currency_revaluations_period ON currency_revaluations(fiscal_year, fiscal_month);
CREATE INDEX IF NOT EXISTS idx_currency_revaluations_status ON currency_revaluations(status);

-- Currency Revaluation Lines table
CREATE TABLE IF NOT EXISTS currency_revaluation_lines (
  id TEXT PRIMARY KEY,
  revaluation_id TEXT NOT NULL REFERENCES currency_revaluations(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  currency TEXT NOT NULL REFERENCES currencies(code) ON DELETE RESTRICT,
  foreign_balance REAL NOT NULL,
  original_rate REAL NOT NULL,
  new_rate REAL NOT NULL,
  original_base_amount REAL NOT NULL,
  new_base_amount REAL NOT NULL,
  gain_loss REAL NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_revaluation_lines_revaluation ON currency_revaluation_lines(revaluation_id);
CREATE INDEX IF NOT EXISTS idx_revaluation_lines_account ON currency_revaluation_lines(account_id);

-- Seed USD and IDR currencies only
INSERT OR IGNORE INTO currencies (code, name, symbol, decimal_places, is_active, is_base_currency, created_at, updated_at)
VALUES
  ('IDR', 'Indonesian Rupiah', 'Rp', 0, 1, 1, datetime('now'), datetime('now')),
  ('USD', 'US Dollar', '$', 2, 1, 0, datetime('now'), datetime('now'));
