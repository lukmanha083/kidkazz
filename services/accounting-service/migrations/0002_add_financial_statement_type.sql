-- Migration: Add financial_statement_type to chart_of_accounts
-- This field explicitly identifies whether an account belongs to Balance Sheet or Income Statement
-- Required for Indonesian PSAK-compliant financial reporting

-- Step 1: Add the column (SQLite requires default for NOT NULL on existing table)
ALTER TABLE chart_of_accounts ADD COLUMN financial_statement_type TEXT DEFAULT 'BALANCE_SHEET';

-- Step 2: Update existing accounts based on account_type
-- Balance Sheet accounts: Asset, Liability, Equity (code 1000-3999)
-- Income Statement accounts: Revenue, COGS, Expense (code 4000-8999)

UPDATE chart_of_accounts
SET financial_statement_type = 'INCOME_STATEMENT'
WHERE account_type IN ('Revenue', 'COGS', 'Expense');

UPDATE chart_of_accounts
SET financial_statement_type = 'BALANCE_SHEET'
WHERE account_type IN ('Asset', 'Liability', 'Equity');

-- Note: The CHECK constraint is enforced at application level via Drizzle schema
-- SQLite doesn't support adding CHECK constraints to existing columns via ALTER TABLE
