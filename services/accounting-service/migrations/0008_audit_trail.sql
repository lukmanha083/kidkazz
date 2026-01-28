-- Migration: 0008_audit_trail
-- Description: Add audit trail, tax summary, and data archival tables
-- Phase: 11d - Audit Trail & Compliance

-- Audit logs table for comprehensive audit trail
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT,
  action TEXT NOT NULL, -- CREATE, UPDATE, DELETE, VOID, APPROVE, POST, CLOSE, REOPEN
  entity_type TEXT NOT NULL, -- JournalEntry, Account, FiscalPeriod, Budget, etc.
  entity_id TEXT NOT NULL,
  old_values TEXT, -- JSON of previous values
  new_values TEXT, -- JSON of new values
  ip_address TEXT,
  user_agent TEXT,
  metadata TEXT, -- Additional context JSON
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Tax summary table for period tax summaries (Indonesian tax compliance)
CREATE TABLE IF NOT EXISTS tax_summary (
  id TEXT PRIMARY KEY,
  fiscal_year INTEGER NOT NULL,
  fiscal_month INTEGER NOT NULL,
  tax_type TEXT NOT NULL, -- PPN, PPH21, PPH23, PPH4_2
  gross_amount REAL NOT NULL DEFAULT 0,
  tax_amount REAL NOT NULL DEFAULT 0,
  net_amount REAL NOT NULL DEFAULT 0,
  transaction_count INTEGER NOT NULL DEFAULT 0,
  calculated_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(fiscal_year, fiscal_month, tax_type)
);

CREATE INDEX IF NOT EXISTS idx_tax_summary_period ON tax_summary(fiscal_year, fiscal_month);

-- Archived data table for tracking data archival
CREATE TABLE IF NOT EXISTS archived_data (
  id TEXT PRIMARY KEY,
  archive_type TEXT NOT NULL, -- journal_entries, audit_logs
  fiscal_year INTEGER NOT NULL,
  record_count INTEGER NOT NULL,
  archive_path TEXT, -- Cloud storage path
  archived_at TEXT NOT NULL,
  archived_by TEXT NOT NULL,
  checksum TEXT NOT NULL, -- Data integrity verification
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_archived_data_type ON archived_data(archive_type, fiscal_year);
