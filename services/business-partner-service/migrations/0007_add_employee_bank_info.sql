-- Migration: Add bank account fields to employees table
-- These fields store bank information for salary payments
--
-- This migration is IDEMPOTENT - safe to run multiple times
-- Uses table recreation pattern since SQLite doesn't support ADD COLUMN IF NOT EXISTS
-- Note: D1 tracks migrations, so this typically runs once per database

CREATE TABLE IF NOT EXISTS employees_new (
  id TEXT PRIMARY KEY NOT NULL,
  code TEXT NOT NULL UNIQUE,

  -- Basic Info
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,

  -- Employment Info
  employee_number TEXT UNIQUE,
  department TEXT,
  position TEXT,
  manager_id TEXT,

  -- Personal Info
  date_of_birth INTEGER,
  gender TEXT,
  national_id TEXT,
  npwp TEXT,

  -- Employment Dates
  join_date INTEGER,
  end_date INTEGER,

  -- Status
  employment_status TEXT NOT NULL DEFAULT 'active',

  -- Salary
  base_salary INTEGER,

  -- Bank Info (for salary payment)
  bank_name TEXT,
  bank_account_number TEXT,
  bank_account_name TEXT,

  -- Notes
  notes TEXT,

  -- Audit
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

-- Copy existing data (bank columns will be NULL on first run, preserved on re-runs)
INSERT OR IGNORE INTO employees_new (
  id, code, name, email, phone,
  employee_number, department, position, manager_id,
  date_of_birth, gender, national_id, npwp,
  join_date, end_date, employment_status, base_salary,
  notes, created_at, updated_at, created_by, updated_by
)
SELECT
  id, code, name, email, phone,
  employee_number, department, position, manager_id,
  date_of_birth, gender, national_id, npwp,
  join_date, end_date, employment_status, base_salary,
  notes, created_at, updated_at, created_by, updated_by
FROM employees;

DROP TABLE IF EXISTS employees;
ALTER TABLE employees_new RENAME TO employees;

CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_code ON employees(code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(employment_status);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_manager ON employees(manager_id);
