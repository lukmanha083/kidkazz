-- =====================================================
-- Asset Accounting Module Schema
-- Version: 1.0
-- Date: 2026-01-27
-- =====================================================

-- Asset Categories
CREATE TABLE IF NOT EXISTS asset_categories (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,

  -- Default Depreciation Settings
  default_useful_life_months INTEGER NOT NULL,
  default_depreciation_method TEXT NOT NULL CHECK (default_depreciation_method IN ('STRAIGHT_LINE', 'DECLINING_BALANCE', 'SUM_OF_YEARS_DIGITS', 'UNITS_OF_PRODUCTION')),
  default_salvage_value_percent REAL NOT NULL DEFAULT 0,

  -- Accounting Accounts (references chart_of_accounts)
  asset_account_id TEXT NOT NULL,
  accumulated_depreciation_account_id TEXT NOT NULL,
  depreciation_expense_account_id TEXT NOT NULL,
  gain_loss_on_disposal_account_id TEXT NOT NULL,

  -- Tax Settings (Indonesian PSAK 16)
  tax_useful_life_months INTEGER,
  tax_depreciation_method TEXT CHECK (tax_depreciation_method IN ('STRAIGHT_LINE', 'DECLINING_BALANCE', 'SUM_OF_YEARS_DIGITS', 'UNITS_OF_PRODUCTION')),
  tax_asset_group TEXT CHECK (tax_asset_group IN ('GROUP_1', 'GROUP_2', 'GROUP_3', 'GROUP_4', 'NON_PERMANENT', 'PERMANENT')),

  -- Status
  is_active INTEGER NOT NULL DEFAULT 1,

  -- Audit
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Fixed Assets
CREATE TABLE IF NOT EXISTS fixed_assets (
  id TEXT PRIMARY KEY,
  asset_number TEXT NOT NULL UNIQUE,

  -- Basic Information
  name TEXT NOT NULL,
  description TEXT,
  category_id TEXT NOT NULL REFERENCES asset_categories(id),

  -- Physical Identification
  serial_number TEXT,
  barcode TEXT UNIQUE,
  manufacturer TEXT,
  model TEXT,

  -- Location & Assignment
  location_id TEXT,
  department_id TEXT,
  assigned_to_user_id TEXT,

  -- Acquisition Details
  acquisition_date TEXT NOT NULL,
  acquisition_method TEXT NOT NULL CHECK (acquisition_method IN ('PURCHASE', 'LEASE', 'DONATION', 'TRANSFER', 'CONSTRUCTION')),
  acquisition_cost REAL NOT NULL,
  purchase_order_id TEXT,
  supplier_id TEXT,
  invoice_number TEXT,

  -- Depreciation Settings
  useful_life_months INTEGER NOT NULL,
  salvage_value REAL NOT NULL DEFAULT 0,
  depreciation_method TEXT NOT NULL CHECK (depreciation_method IN ('STRAIGHT_LINE', 'DECLINING_BALANCE', 'SUM_OF_YEARS_DIGITS', 'UNITS_OF_PRODUCTION')),
  depreciation_start_date TEXT NOT NULL,

  -- Current Values (denormalized for performance)
  accumulated_depreciation REAL NOT NULL DEFAULT 0,
  book_value REAL NOT NULL,
  last_depreciation_date TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'FULLY_DEPRECIATED', 'DISPOSED', 'WRITTEN_OFF', 'SUSPENDED')),

  -- Disposal Information
  disposal_date TEXT,
  disposal_method TEXT CHECK (disposal_method IN ('SALE', 'SCRAP', 'DONATION', 'TRADE_IN', 'THEFT', 'DESTRUCTION')),
  disposal_value REAL,
  disposal_reason TEXT,
  gain_loss_on_disposal REAL,

  -- Insurance & Warranty
  insurance_policy_number TEXT,
  insurance_expiry_date TEXT,
  warranty_expiry_date TEXT,

  -- Physical Verification
  last_verified_at TEXT,
  last_verified_by TEXT,

  -- Audit
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  version INTEGER NOT NULL DEFAULT 1
);

-- Depreciation Schedules
CREATE TABLE IF NOT EXISTS depreciation_schedules (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES fixed_assets(id),

  -- Period
  fiscal_year INTEGER NOT NULL,
  fiscal_month INTEGER NOT NULL,

  -- Amounts
  opening_book_value REAL NOT NULL,
  depreciation_amount REAL NOT NULL,
  closing_book_value REAL NOT NULL,
  accumulated_depreciation REAL NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'CALCULATED', 'POSTED', 'REVERSED')),

  -- Journal Reference
  journal_entry_id TEXT,

  -- Timestamps
  calculated_at TEXT NOT NULL,
  posted_at TEXT,

  UNIQUE(asset_id, fiscal_year, fiscal_month)
);

-- Asset Movements
CREATE TABLE IF NOT EXISTS asset_movements (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES fixed_assets(id),

  -- Movement Type
  movement_type TEXT NOT NULL CHECK (movement_type IN ('TRANSFER', 'ASSIGNMENT', 'DISPOSAL', 'REVALUATION', 'IMPAIRMENT')),

  -- Location Change
  from_location_id TEXT,
  to_location_id TEXT,

  -- Department Change
  from_department_id TEXT,
  to_department_id TEXT,

  -- Assignment Change
  from_user_id TEXT,
  to_user_id TEXT,

  -- Details
  movement_date TEXT NOT NULL,
  reason TEXT,
  notes TEXT,

  -- Audit
  performed_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Asset Maintenance
CREATE TABLE IF NOT EXISTS asset_maintenance (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES fixed_assets(id),

  -- Maintenance Details
  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('PREVENTIVE', 'CORRECTIVE', 'INSPECTION', 'UPGRADE', 'OVERHAUL')),
  description TEXT NOT NULL,

  -- Schedule
  scheduled_date TEXT,
  performed_date TEXT,
  next_scheduled_date TEXT,

  -- Cost
  cost REAL NOT NULL DEFAULT 0,
  is_capitalized INTEGER NOT NULL DEFAULT 0,

  -- If capitalized, extends useful life
  extends_useful_life_months INTEGER DEFAULT 0,

  -- Vendor
  vendor_id TEXT,
  vendor_name TEXT,
  invoice_number TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),

  -- Notes
  notes TEXT,

  -- Audit
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Depreciation Batch Runs (for tracking monthly runs)
CREATE TABLE IF NOT EXISTS depreciation_runs (
  id TEXT PRIMARY KEY,
  fiscal_year INTEGER NOT NULL,
  fiscal_month INTEGER NOT NULL,

  -- Summary
  total_assets INTEGER NOT NULL,
  assets_depreciated INTEGER NOT NULL,
  assets_skipped INTEGER NOT NULL,
  total_depreciation REAL NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'CALCULATED' CHECK (status IN ('CALCULATED', 'POSTED', 'REVERSED')),

  -- Journal Reference (consolidated entry)
  journal_entry_id TEXT,

  -- Timestamps
  calculated_at TEXT NOT NULL,
  posted_at TEXT,
  posted_by TEXT,

  UNIQUE(fiscal_year, fiscal_month)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_fixed_assets_category ON fixed_assets(category_id);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_status ON fixed_assets(status);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_location ON fixed_assets(location_id);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_barcode ON fixed_assets(barcode);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_number ON fixed_assets(asset_number);

CREATE INDEX IF NOT EXISTS idx_depreciation_asset ON depreciation_schedules(asset_id);
CREATE INDEX IF NOT EXISTS idx_depreciation_period ON depreciation_schedules(fiscal_year, fiscal_month);
CREATE INDEX IF NOT EXISTS idx_depreciation_status ON depreciation_schedules(status);

CREATE INDEX IF NOT EXISTS idx_movements_asset ON asset_movements(asset_id);
CREATE INDEX IF NOT EXISTS idx_movements_date ON asset_movements(movement_date);

CREATE INDEX IF NOT EXISTS idx_maintenance_asset ON asset_maintenance(asset_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON asset_maintenance(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_scheduled ON asset_maintenance(scheduled_date);

CREATE INDEX IF NOT EXISTS idx_depreciation_runs_period ON depreciation_runs(fiscal_year, fiscal_month);
