-- =====================================================
-- Phase 11c: Advanced Reporting
-- Budget Management Tables
-- Version: 1.0
-- Date: 2026-01-28
-- =====================================================

-- Budgets table
-- Budget headers by fiscal year
CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  fiscal_year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'locked')),
  approved_by TEXT,
  approved_at TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_budgets_fiscal_year ON budgets(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_budgets_status ON budgets(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_year_name ON budgets(fiscal_year, name);

-- Budget Lines table
-- Budget amounts per account per month
CREATE TABLE IF NOT EXISTS budget_lines (
  id TEXT PRIMARY KEY,
  budget_id TEXT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  fiscal_month INTEGER NOT NULL CHECK (fiscal_month >= 1 AND fiscal_month <= 12),
  amount REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_budget_lines_budget ON budget_lines(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_lines_account ON budget_lines(account_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_budget_lines_unique ON budget_lines(budget_id, account_id, fiscal_month);

-- Budget Revisions table
-- Tracks budget change history
CREATE TABLE IF NOT EXISTS budget_revisions (
  id TEXT PRIMARY KEY,
  budget_line_id TEXT NOT NULL REFERENCES budget_lines(id) ON DELETE CASCADE,
  previous_amount REAL NOT NULL,
  new_amount REAL NOT NULL,
  reason TEXT NOT NULL,
  revised_by TEXT NOT NULL,
  revised_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_budget_revisions_line ON budget_revisions(budget_line_id);
CREATE INDEX IF NOT EXISTS idx_budget_revisions_date ON budget_revisions(revised_at);
