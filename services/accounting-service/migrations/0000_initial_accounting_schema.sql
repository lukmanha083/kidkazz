-- =====================================================
-- Accounting Service Initial Schema
-- Version: 1.0
-- Date: 2025-01-26
-- =====================================================

-- Chart of Accounts
CREATE TABLE chart_of_accounts (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  account_type TEXT NOT NULL CHECK(account_type IN ('Asset', 'Liability', 'Equity', 'Revenue', 'COGS', 'Expense')),
  account_category TEXT NOT NULL CHECK(account_category IN (
    'CURRENT_ASSET', 'FIXED_ASSET', 'OTHER_NON_CURRENT_ASSET',
    'CURRENT_LIABILITY', 'LONG_TERM_LIABILITY', 'EQUITY',
    'REVENUE', 'COGS', 'OPERATING_EXPENSE', 'OTHER_INCOME_EXPENSE', 'TAX'
  )),
  normal_balance TEXT NOT NULL CHECK(normal_balance IN ('Debit', 'Credit')),
  parent_account_id TEXT REFERENCES chart_of_accounts(id),
  level INTEGER NOT NULL DEFAULT 0,
  is_detail_account INTEGER NOT NULL DEFAULT 1,
  is_system_account INTEGER NOT NULL DEFAULT 0,
  financial_statement_type TEXT NOT NULL CHECK(financial_statement_type IN ('BALANCE_SHEET', 'INCOME_STATEMENT')),
  status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Inactive', 'Archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

-- Chart of Accounts Indexes
CREATE INDEX idx_coa_code ON chart_of_accounts(code);
CREATE INDEX idx_coa_account_type ON chart_of_accounts(account_type);
CREATE INDEX idx_coa_account_category ON chart_of_accounts(account_category);
CREATE INDEX idx_coa_parent ON chart_of_accounts(parent_account_id);
CREATE INDEX idx_coa_status ON chart_of_accounts(status);
CREATE INDEX idx_coa_level ON chart_of_accounts(level);
CREATE INDEX idx_coa_financial_statement ON chart_of_accounts(financial_statement_type);

-- Journal Entries
CREATE TABLE journal_entries (
  id TEXT PRIMARY KEY,
  entry_number TEXT NOT NULL UNIQUE,
  entry_date TEXT NOT NULL,
  description TEXT NOT NULL,
  reference TEXT,
  notes TEXT,
  entry_type TEXT NOT NULL DEFAULT 'Manual' CHECK(entry_type IN ('Manual', 'System', 'Recurring', 'Adjusting', 'Closing')),
  status TEXT NOT NULL DEFAULT 'Draft' CHECK(status IN ('Draft', 'Posted', 'Voided')),
  fiscal_year INTEGER NOT NULL,
  fiscal_month INTEGER NOT NULL,
  source_service TEXT,
  source_reference_id TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  posted_by TEXT,
  posted_at TEXT,
  voided_by TEXT,
  voided_at TEXT,
  void_reason TEXT,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  deleted_by TEXT,
  delete_reason TEXT
);

-- Journal Entries Indexes
CREATE INDEX idx_je_entry_number ON journal_entries(entry_number);
CREATE INDEX idx_je_entry_date ON journal_entries(entry_date);
CREATE INDEX idx_je_status ON journal_entries(status);
CREATE INDEX idx_je_entry_type ON journal_entries(entry_type);
CREATE INDEX idx_je_fiscal_period ON journal_entries(fiscal_year, fiscal_month);
CREATE INDEX idx_je_source ON journal_entries(source_service, source_reference_id);
CREATE INDEX idx_je_created_by ON journal_entries(created_by);
CREATE INDEX idx_je_deleted ON journal_entries(deleted_at);

-- Journal Lines
CREATE TABLE journal_lines (
  id TEXT PRIMARY KEY,
  journal_entry_id TEXT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  line_sequence INTEGER NOT NULL,
  account_id TEXT NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  direction TEXT NOT NULL CHECK(direction IN ('Debit', 'Credit')),
  amount REAL NOT NULL CHECK(amount > 0),
  memo TEXT,
  sales_person_id TEXT,
  warehouse_id TEXT,
  sales_channel TEXT CHECK(sales_channel IN ('POS', 'Online', 'B2B', 'Marketplace', 'Wholesale')),
  customer_id TEXT,
  vendor_id TEXT,
  product_id TEXT
);

-- Journal Lines Indexes
CREATE INDEX idx_jl_journal_entry ON journal_lines(journal_entry_id);
CREATE INDEX idx_jl_account ON journal_lines(account_id);
CREATE INDEX idx_jl_direction ON journal_lines(direction);
CREATE INDEX idx_jl_sales_person ON journal_lines(sales_person_id);
CREATE INDEX idx_jl_warehouse ON journal_lines(warehouse_id);
CREATE INDEX idx_jl_sales_channel ON journal_lines(sales_channel);
CREATE INDEX idx_jl_customer ON journal_lines(customer_id);
CREATE INDEX idx_jl_vendor ON journal_lines(vendor_id);

-- Account Balances (materialized view for performance)
CREATE TABLE account_balances (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES chart_of_accounts(id),
  fiscal_year INTEGER NOT NULL,
  fiscal_month INTEGER NOT NULL,
  opening_balance REAL NOT NULL DEFAULT 0,
  debit_total REAL NOT NULL DEFAULT 0,
  credit_total REAL NOT NULL DEFAULT 0,
  closing_balance REAL NOT NULL DEFAULT 0,
  last_updated_at TEXT NOT NULL,
  UNIQUE(account_id, fiscal_year, fiscal_month)
);

-- Account Balances Indexes
CREATE INDEX idx_ab_fiscal_period ON account_balances(fiscal_year, fiscal_month);

-- Fiscal Periods
CREATE TABLE fiscal_periods (
  id TEXT PRIMARY KEY,
  fiscal_year INTEGER NOT NULL,
  fiscal_month INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'Open' CHECK(status IN ('Open', 'Closed', 'Locked')),
  closed_at TEXT,
  closed_by TEXT,
  reopened_at TEXT,
  reopened_by TEXT,
  reopen_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(fiscal_year, fiscal_month)
);

-- Fiscal Periods Indexes
CREATE INDEX idx_fp_status ON fiscal_periods(status);

-- =====================================================
-- Seed Default Chart of Accounts (Indonesian PSAK-Compliant)
-- Based on INDONESIAN_TRADING_COA.md
-- =====================================================

-- =====================================================
-- 1000-1099: CURRENT ASSETS - Cash & Bank
-- =====================================================
INSERT INTO chart_of_accounts (id, code, name, name_en, description, account_type, account_category, normal_balance, parent_account_id, level, is_detail_account, is_system_account, financial_statement_type, status, created_at, updated_at) VALUES
('acc-1000', '1000', 'Kas & Bank', 'Cash & Bank', 'Header for cash and bank accounts', 'Asset', 'CURRENT_ASSET', 'Debit', NULL, 0, 0, 1, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1010', '1010', 'Kas Kecil - Kantor Pusat', 'Petty Cash - Head Office', NULL, 'Asset', 'CURRENT_ASSET', 'Debit', 'acc-1000', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1011', '1011', 'Kas Kecil - Gudang', 'Petty Cash - Warehouse', NULL, 'Asset', 'CURRENT_ASSET', 'Debit', 'acc-1000', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1012', '1012', 'Kas Laci POS - Toko 1', 'POS Cash Drawer - Store 1', NULL, 'Asset', 'CURRENT_ASSET', 'Debit', 'acc-1000', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1013', '1013', 'Kas Laci POS - Toko 2', 'POS Cash Drawer - Store 2', NULL, 'Asset', 'CURRENT_ASSET', 'Debit', 'acc-1000', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1014', '1014', 'Kas Laci POS - Toko 3', 'POS Cash Drawer - Store 3', NULL, 'Asset', 'CURRENT_ASSET', 'Debit', 'acc-1000', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1020', '1020', 'Bank BCA - Operasional', 'BCA Bank - Operating', NULL, 'Asset', 'CURRENT_ASSET', 'Debit', 'acc-1000', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1021', '1021', 'Bank BCA - Gaji', 'BCA Bank - Payroll', NULL, 'Asset', 'CURRENT_ASSET', 'Debit', 'acc-1000', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1022', '1022', 'Bank BRI - Tabungan', 'BRI Bank - Savings', NULL, 'Asset', 'CURRENT_ASSET', 'Debit', 'acc-1000', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1023', '1023', 'Bank CIMB Niaga - USD', 'CIMB Niaga Bank - USD', NULL, 'Asset', 'CURRENT_ASSET', 'Debit', 'acc-1000', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1024', '1024', 'Bank Mandiri - Operasional', 'Mandiri Bank - Operating', NULL, 'Asset', 'CURRENT_ASSET', 'Debit', 'acc-1000', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1030', '1030', 'Deposito Berjangka < 3 Bulan', 'Time Deposit < 3 Months', NULL, 'Asset', 'CURRENT_ASSET', 'Debit', 'acc-1000', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now'));

-- =====================================================
-- 1100-1199: CURRENT ASSETS - Receivables
-- =====================================================
INSERT INTO chart_of_accounts (id, code, name, name_en, description, account_type, account_category, normal_balance, parent_account_id, level, is_detail_account, is_system_account, financial_statement_type, status, created_at, updated_at) VALUES
('acc-1100', '1100', 'Piutang', 'Receivables', 'Header for receivables', 'Asset', 'CURRENT_ASSET', 'Debit', NULL, 0, 0, 1, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1110', '1110', 'Piutang Usaha', 'Accounts Receivable - Trade', NULL, 'Asset', 'CURRENT_ASSET', 'Debit', 'acc-1100', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1111', '1111', 'Piutang Usaha - Retail', 'A/R - Retail Customers', NULL, 'Asset', 'CURRENT_ASSET', 'Debit', 'acc-1100', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1112', '1112', 'Piutang Usaha - Grosir', 'A/R - Wholesale Customers', NULL, 'Asset', 'CURRENT_ASSET', 'Debit', 'acc-1100', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1113', '1113', 'Piutang Usaha - B2B', 'A/R - B2B Customers', NULL, 'Asset', 'CURRENT_ASSET', 'Debit', 'acc-1100', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1120', '1120', 'Cadangan Kerugian Piutang', 'Allowance for Doubtful Accounts', 'Contra asset account', 'Asset', 'CURRENT_ASSET', 'Credit', 'acc-1100', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1130', '1130', 'Piutang Karyawan', 'Employee Receivables', NULL, 'Asset', 'CURRENT_ASSET', 'Debit', 'acc-1100', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1140', '1140', 'Piutang Lain-lain', 'Other Receivables', NULL, 'Asset', 'CURRENT_ASSET', 'Debit', 'acc-1100', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1150', '1150', 'Uang Muka Pembelian', 'Purchase Advances', NULL, 'Asset', 'CURRENT_ASSET', 'Debit', 'acc-1100', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now'));

-- =====================================================
-- 1200-1299: CURRENT ASSETS - Inventory
-- =====================================================
INSERT INTO chart_of_accounts (id, code, name, name_en, description, account_type, account_category, normal_balance, parent_account_id, level, is_detail_account, is_system_account, financial_statement_type, status, created_at, updated_at) VALUES
('acc-1200', '1200', 'Persediaan', 'Inventory', 'Header for inventory', 'Asset', 'CURRENT_ASSET', 'Debit', NULL, 0, 0, 1, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1210', '1210', 'Persediaan Barang Dagang', 'Merchandise Inventory', NULL, 'Asset', 'CURRENT_ASSET', 'Debit', 'acc-1200', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1211', '1211', 'Persediaan - Gudang Utama', 'Inventory - Main Warehouse', NULL, 'Asset', 'CURRENT_ASSET', 'Debit', 'acc-1200', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1212', '1212', 'Persediaan - Gudang Cabang', 'Inventory - Branch Warehouse', NULL, 'Asset', 'CURRENT_ASSET', 'Debit', 'acc-1200', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1213', '1213', 'Persediaan - Toko', 'Inventory - Store', NULL, 'Asset', 'CURRENT_ASSET', 'Debit', 'acc-1200', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1220', '1220', 'Persediaan Dalam Perjalanan', 'Inventory in Transit', NULL, 'Asset', 'CURRENT_ASSET', 'Debit', 'acc-1200', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1240', '1240', 'Cadangan Penurunan Nilai Persediaan', 'Inventory Valuation Allowance', 'Contra asset', 'Asset', 'CURRENT_ASSET', 'Credit', 'acc-1200', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now'));

-- =====================================================
-- 1300-1399: CURRENT ASSETS - Prepaid Expenses
-- =====================================================
INSERT INTO chart_of_accounts (id, code, name, name_en, description, account_type, account_category, normal_balance, parent_account_id, level, is_detail_account, is_system_account, financial_statement_type, status, created_at, updated_at) VALUES
('acc-1300', '1300', 'Biaya Dibayar Dimuka', 'Prepaid Expenses', 'Header for prepaid expenses', 'Asset', 'CURRENT_ASSET', 'Debit', NULL, 0, 0, 1, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1310', '1310', 'Sewa Dibayar Dimuka', 'Prepaid Rent', NULL, 'Asset', 'CURRENT_ASSET', 'Debit', 'acc-1300', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1320', '1320', 'Asuransi Dibayar Dimuka', 'Prepaid Insurance', NULL, 'Asset', 'CURRENT_ASSET', 'Debit', 'acc-1300', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1340', '1340', 'Pajak Dibayar Dimuka', 'Prepaid Taxes', NULL, 'Asset', 'CURRENT_ASSET', 'Debit', 'acc-1300', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1350', '1350', 'Perlengkapan Kantor', 'Office Supplies', NULL, 'Asset', 'CURRENT_ASSET', 'Debit', 'acc-1300', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1360', '1360', 'Perlengkapan Toko', 'Store Supplies', NULL, 'Asset', 'CURRENT_ASSET', 'Debit', 'acc-1300', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now'));

-- =====================================================
-- 1400-1499: FIXED ASSETS
-- =====================================================
INSERT INTO chart_of_accounts (id, code, name, name_en, description, account_type, account_category, normal_balance, parent_account_id, level, is_detail_account, is_system_account, financial_statement_type, status, created_at, updated_at) VALUES
('acc-1400', '1400', 'Aset Tetap', 'Fixed Assets', 'Header for fixed assets', 'Asset', 'FIXED_ASSET', 'Debit', NULL, 0, 0, 1, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1410', '1410', 'Tanah', 'Land', NULL, 'Asset', 'FIXED_ASSET', 'Debit', 'acc-1400', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1420', '1420', 'Bangunan', 'Buildings', NULL, 'Asset', 'FIXED_ASSET', 'Debit', 'acc-1400', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1421', '1421', 'Akumulasi Penyusutan Bangunan', 'Accumulated Depreciation - Buildings', 'Contra asset', 'Asset', 'FIXED_ASSET', 'Credit', 'acc-1400', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1430', '1430', 'Kendaraan', 'Vehicles', NULL, 'Asset', 'FIXED_ASSET', 'Debit', 'acc-1400', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1431', '1431', 'Akumulasi Penyusutan Kendaraan', 'Accumulated Depreciation - Vehicles', 'Contra asset', 'Asset', 'FIXED_ASSET', 'Credit', 'acc-1400', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1440', '1440', 'Peralatan Kantor', 'Office Equipment', NULL, 'Asset', 'FIXED_ASSET', 'Debit', 'acc-1400', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1441', '1441', 'Akumulasi Penyusutan Peralatan Kantor', 'Accumulated Depreciation - Office Equipment', 'Contra asset', 'Asset', 'FIXED_ASSET', 'Credit', 'acc-1400', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1450', '1450', 'Peralatan Toko', 'Store Equipment', NULL, 'Asset', 'FIXED_ASSET', 'Debit', 'acc-1400', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1451', '1451', 'Akumulasi Penyusutan Peralatan Toko', 'Accumulated Depreciation - Store Equipment', 'Contra asset', 'Asset', 'FIXED_ASSET', 'Credit', 'acc-1400', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1470', '1470', 'Peralatan Komputer & IT', 'Computer & IT Equipment', NULL, 'Asset', 'FIXED_ASSET', 'Debit', 'acc-1400', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1471', '1471', 'Akumulasi Penyusutan Peralatan Komputer', 'Accumulated Depreciation - Computer Equipment', 'Contra asset', 'Asset', 'FIXED_ASSET', 'Credit', 'acc-1400', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1490', '1490', 'Meubel & Perabotan', 'Furniture & Fixtures', NULL, 'Asset', 'FIXED_ASSET', 'Debit', 'acc-1400', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1491', '1491', 'Akumulasi Penyusutan Meubel', 'Accumulated Depreciation - Furniture', 'Contra asset', 'Asset', 'FIXED_ASSET', 'Credit', 'acc-1400', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now'));

-- =====================================================
-- 1500-1599: OTHER NON-CURRENT ASSETS
-- =====================================================
INSERT INTO chart_of_accounts (id, code, name, name_en, description, account_type, account_category, normal_balance, parent_account_id, level, is_detail_account, is_system_account, financial_statement_type, status, created_at, updated_at) VALUES
('acc-1500', '1500', 'Aset Tidak Lancar Lainnya', 'Other Non-Current Assets', 'Header', 'Asset', 'OTHER_NON_CURRENT_ASSET', 'Debit', NULL, 0, 0, 1, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1510', '1510', 'Investasi Jangka Panjang', 'Long-term Investments', NULL, 'Asset', 'OTHER_NON_CURRENT_ASSET', 'Debit', 'acc-1500', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1520', '1520', 'Uang Jaminan', 'Security Deposits', NULL, 'Asset', 'OTHER_NON_CURRENT_ASSET', 'Debit', 'acc-1500', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1530', '1530', 'Aset Tak Berwujud', 'Intangible Assets', NULL, 'Asset', 'OTHER_NON_CURRENT_ASSET', 'Debit', 'acc-1500', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1531', '1531', 'Software & Lisensi', 'Software & Licenses', NULL, 'Asset', 'OTHER_NON_CURRENT_ASSET', 'Debit', 'acc-1500', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-1532', '1532', 'Akumulasi Amortisasi Software', 'Accumulated Amortization - Software', 'Contra asset', 'Asset', 'OTHER_NON_CURRENT_ASSET', 'Credit', 'acc-1500', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now'));

-- =====================================================
-- 2000-2099: CURRENT LIABILITIES - Trade Payables
-- =====================================================
INSERT INTO chart_of_accounts (id, code, name, name_en, description, account_type, account_category, normal_balance, parent_account_id, level, is_detail_account, is_system_account, financial_statement_type, status, created_at, updated_at) VALUES
('acc-2000', '2000', 'Hutang Usaha', 'Trade Payables', 'Header', 'Liability', 'CURRENT_LIABILITY', 'Credit', NULL, 0, 0, 1, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-2010', '2010', 'Hutang Dagang', 'Accounts Payable - Trade', NULL, 'Liability', 'CURRENT_LIABILITY', 'Credit', 'acc-2000', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-2011', '2011', 'Hutang Dagang - Supplier Lokal', 'A/P - Local Suppliers', NULL, 'Liability', 'CURRENT_LIABILITY', 'Credit', 'acc-2000', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-2012', '2012', 'Hutang Dagang - Supplier Impor', 'A/P - Import Suppliers', NULL, 'Liability', 'CURRENT_LIABILITY', 'Credit', 'acc-2000', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-2020', '2020', 'Hutang Lain-lain', 'Other Payables', NULL, 'Liability', 'CURRENT_LIABILITY', 'Credit', 'acc-2000', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-2030', '2030', 'Uang Muka Pelanggan', 'Customer Advances', NULL, 'Liability', 'CURRENT_LIABILITY', 'Credit', 'acc-2000', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now'));

-- =====================================================
-- 2100-2199: CURRENT LIABILITIES - Tax Payables
-- =====================================================
INSERT INTO chart_of_accounts (id, code, name, name_en, description, account_type, account_category, normal_balance, parent_account_id, level, is_detail_account, is_system_account, financial_statement_type, status, created_at, updated_at) VALUES
('acc-2100', '2100', 'Hutang Pajak', 'Tax Payables', 'Header', 'Liability', 'CURRENT_LIABILITY', 'Credit', NULL, 0, 0, 1, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-2110', '2110', 'PPn Keluaran', 'VAT Output (Sales VAT)', NULL, 'Liability', 'CURRENT_LIABILITY', 'Credit', 'acc-2100', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-2120', '2120', 'PPn Masukan', 'VAT Input (Purchase VAT)', 'Debit balance - offset against output', 'Liability', 'CURRENT_LIABILITY', 'Debit', 'acc-2100', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-2130', '2130', 'Hutang PPh 21', 'Income Tax Art. 21 Payable', NULL, 'Liability', 'CURRENT_LIABILITY', 'Credit', 'acc-2100', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-2131', '2131', 'Hutang PPh 23', 'Income Tax Art. 23 Payable', NULL, 'Liability', 'CURRENT_LIABILITY', 'Credit', 'acc-2100', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-2135', '2135', 'Hutang PPh Final UMKM', 'PPh Final UMKM Payable', NULL, 'Liability', 'CURRENT_LIABILITY', 'Credit', 'acc-2100', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now'));

-- =====================================================
-- 2200-2299: CURRENT LIABILITIES - Accrued Expenses
-- =====================================================
INSERT INTO chart_of_accounts (id, code, name, name_en, description, account_type, account_category, normal_balance, parent_account_id, level, is_detail_account, is_system_account, financial_statement_type, status, created_at, updated_at) VALUES
('acc-2200', '2200', 'Hutang Gaji & Beban Akrual', 'Accrued Expenses', 'Header', 'Liability', 'CURRENT_LIABILITY', 'Credit', NULL, 0, 0, 1, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-2210', '2210', 'Hutang Gaji', 'Salaries Payable', NULL, 'Liability', 'CURRENT_LIABILITY', 'Credit', 'acc-2200', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-2212', '2212', 'Hutang THR', 'Holiday Allowance Payable', NULL, 'Liability', 'CURRENT_LIABILITY', 'Credit', 'acc-2200', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-2220', '2220', 'Hutang BPJS Kesehatan', 'BPJS Health Payable', NULL, 'Liability', 'CURRENT_LIABILITY', 'Credit', 'acc-2200', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-2221', '2221', 'Hutang BPJS Ketenagakerjaan', 'BPJS Employment Payable', NULL, 'Liability', 'CURRENT_LIABILITY', 'Credit', 'acc-2200', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-2230', '2230', 'Hutang Listrik & Air', 'Utilities Payable', NULL, 'Liability', 'CURRENT_LIABILITY', 'Credit', 'acc-2200', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now'));

-- =====================================================
-- 2400-2499: LONG-TERM LIABILITIES
-- =====================================================
INSERT INTO chart_of_accounts (id, code, name, name_en, description, account_type, account_category, normal_balance, parent_account_id, level, is_detail_account, is_system_account, financial_statement_type, status, created_at, updated_at) VALUES
('acc-2400', '2400', 'Liabilitas Jangka Panjang', 'Long-term Liabilities', 'Header', 'Liability', 'LONG_TERM_LIABILITY', 'Credit', NULL, 0, 0, 1, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-2410', '2410', 'Hutang Bank Jangka Panjang', 'Long-term Bank Loan', NULL, 'Liability', 'LONG_TERM_LIABILITY', 'Credit', 'acc-2400', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-2420', '2420', 'Hutang Sewa Pembiayaan', 'Finance Lease Liability', NULL, 'Liability', 'LONG_TERM_LIABILITY', 'Credit', 'acc-2400', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-2450', '2450', 'Liabilitas Imbalan Kerja', 'Employee Benefits Liability', NULL, 'Liability', 'LONG_TERM_LIABILITY', 'Credit', 'acc-2400', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now'));

-- =====================================================
-- 3000-3999: EQUITY
-- =====================================================
INSERT INTO chart_of_accounts (id, code, name, name_en, description, account_type, account_category, normal_balance, parent_account_id, level, is_detail_account, is_system_account, financial_statement_type, status, created_at, updated_at) VALUES
('acc-3000', '3000', 'Ekuitas', 'Equity', 'Header', 'Equity', 'EQUITY', 'Credit', NULL, 0, 0, 1, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-3100', '3100', 'Modal Disetor', 'Paid-in Capital', NULL, 'Equity', 'EQUITY', 'Credit', 'acc-3000', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-3200', '3200', 'Laba Ditahan', 'Retained Earnings', NULL, 'Equity', 'EQUITY', 'Credit', 'acc-3000', 1, 1, 1, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-3210', '3210', 'Laba Ditahan Tahun Lalu', 'Prior Year Retained Earnings', NULL, 'Equity', 'EQUITY', 'Credit', 'acc-3000', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-3220', '3220', 'Laba Tahun Berjalan', 'Current Year Earnings', NULL, 'Equity', 'EQUITY', 'Credit', 'acc-3000', 1, 1, 1, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-3300', '3300', 'Dividen', 'Dividends', 'Contra equity', 'Equity', 'EQUITY', 'Debit', 'acc-3000', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now')),
('acc-3500', '3500', 'Prive/Penarikan Pemilik', 'Owner''s Drawings', 'Contra equity', 'Equity', 'EQUITY', 'Debit', 'acc-3000', 1, 1, 0, 'BALANCE_SHEET', 'Active', datetime('now'), datetime('now'));

-- =====================================================
-- 4000-4099: REVENUE - Sales
-- =====================================================
INSERT INTO chart_of_accounts (id, code, name, name_en, description, account_type, account_category, normal_balance, parent_account_id, level, is_detail_account, is_system_account, financial_statement_type, status, created_at, updated_at) VALUES
('acc-4000', '4000', 'Pendapatan Penjualan', 'Sales Revenue', 'Header', 'Revenue', 'REVENUE', 'Credit', NULL, 0, 0, 1, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-4010', '4010', 'Penjualan - POS Retail', 'Sales - POS Retail', NULL, 'Revenue', 'REVENUE', 'Credit', 'acc-4000', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-4020', '4020', 'Penjualan - Online/E-Commerce', 'Sales - Online/E-Commerce', NULL, 'Revenue', 'REVENUE', 'Credit', 'acc-4000', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-4030', '4030', 'Penjualan - Grosir/Wholesale', 'Sales - Wholesale', NULL, 'Revenue', 'REVENUE', 'Credit', 'acc-4000', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-4040', '4040', 'Penjualan - B2B', 'Sales - B2B', NULL, 'Revenue', 'REVENUE', 'Credit', 'acc-4000', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-4050', '4050', 'Penjualan - Restoran', 'Sales - Restaurant', NULL, 'Revenue', 'REVENUE', 'Credit', 'acc-4000', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now'));

-- =====================================================
-- 4100-4199: REVENUE - Sales Deductions (Contra)
-- =====================================================
INSERT INTO chart_of_accounts (id, code, name, name_en, description, account_type, account_category, normal_balance, parent_account_id, level, is_detail_account, is_system_account, financial_statement_type, status, created_at, updated_at) VALUES
('acc-4100', '4100', 'Potongan & Retur Penjualan', 'Sales Deductions', 'Header - Contra revenue', 'Revenue', 'REVENUE', 'Debit', NULL, 0, 0, 1, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-4110', '4110', 'Diskon Penjualan', 'Sales Discounts', 'Contra revenue', 'Revenue', 'REVENUE', 'Debit', 'acc-4100', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-4120', '4120', 'Retur Penjualan', 'Sales Returns', 'Contra revenue', 'Revenue', 'REVENUE', 'Debit', 'acc-4100', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now'));

-- =====================================================
-- 4200-4299: REVENUE - Other Operating Revenue
-- =====================================================
INSERT INTO chart_of_accounts (id, code, name, name_en, description, account_type, account_category, normal_balance, parent_account_id, level, is_detail_account, is_system_account, financial_statement_type, status, created_at, updated_at) VALUES
('acc-4200', '4200', 'Pendapatan Operasional Lain', 'Other Operating Revenue', 'Header', 'Revenue', 'REVENUE', 'Credit', NULL, 0, 0, 1, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-4210', '4210', 'Pendapatan Jasa Pengiriman', 'Delivery Service Income', NULL, 'Revenue', 'REVENUE', 'Credit', 'acc-4200', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-4220', '4220', 'Pendapatan Sewa', 'Rental Income', NULL, 'Revenue', 'REVENUE', 'Credit', 'acc-4200', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now'));

-- =====================================================
-- 5000-5099: COGS - Purchases
-- =====================================================
INSERT INTO chart_of_accounts (id, code, name, name_en, description, account_type, account_category, normal_balance, parent_account_id, level, is_detail_account, is_system_account, financial_statement_type, status, created_at, updated_at) VALUES
('acc-5000', '5000', 'Harga Pokok Penjualan', 'Cost of Goods Sold', 'Header', 'COGS', 'COGS', 'Debit', NULL, 0, 0, 1, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-5010', '5010', 'Pembelian Barang Dagang', 'Merchandise Purchases', NULL, 'COGS', 'COGS', 'Debit', 'acc-5000', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-5020', '5020', 'Ongkos Kirim Pembelian', 'Freight-in', NULL, 'COGS', 'COGS', 'Debit', 'acc-5000', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now'));

-- =====================================================
-- 5100-5199: COGS - Purchase Deductions (Contra)
-- =====================================================
INSERT INTO chart_of_accounts (id, code, name, name_en, description, account_type, account_category, normal_balance, parent_account_id, level, is_detail_account, is_system_account, financial_statement_type, status, created_at, updated_at) VALUES
('acc-5100', '5100', 'Potongan & Retur Pembelian', 'Purchase Deductions', 'Header - Contra COGS', 'COGS', 'COGS', 'Credit', NULL, 0, 0, 1, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-5110', '5110', 'Diskon Pembelian', 'Purchase Discounts', 'Contra COGS', 'COGS', 'COGS', 'Credit', 'acc-5100', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-5120', '5120', 'Retur Pembelian', 'Purchase Returns', 'Contra COGS', 'COGS', 'COGS', 'Credit', 'acc-5100', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now'));

-- =====================================================
-- 5200-5299: COGS - Inventory Adjustments
-- =====================================================
INSERT INTO chart_of_accounts (id, code, name, name_en, description, account_type, account_category, normal_balance, parent_account_id, level, is_detail_account, is_system_account, financial_statement_type, status, created_at, updated_at) VALUES
('acc-5200', '5200', 'Penyesuaian Persediaan', 'Inventory Adjustments', 'Header', 'COGS', 'COGS', 'Debit', NULL, 0, 0, 1, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-5230', '5230', 'Penyesuaian Persediaan', 'Inventory Adjustments', NULL, 'COGS', 'COGS', 'Debit', 'acc-5200', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-5231', '5231', 'Selisih Stok Opname', 'Stock Count Variance', NULL, 'COGS', 'COGS', 'Debit', 'acc-5200', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-5232', '5232', 'Barang Rusak/Kadaluarsa', 'Damaged/Expired Goods', NULL, 'COGS', 'COGS', 'Debit', 'acc-5200', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now'));

-- =====================================================
-- 5300-5399: COGS - By Channel
-- =====================================================
INSERT INTO chart_of_accounts (id, code, name, name_en, description, account_type, account_category, normal_balance, parent_account_id, level, is_detail_account, is_system_account, financial_statement_type, status, created_at, updated_at) VALUES
('acc-5300', '5300', 'HPP Per Channel', 'COGS by Channel', 'Header', 'COGS', 'COGS', 'Debit', NULL, 0, 0, 1, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-5310', '5310', 'HPP - POS Retail', 'COGS - POS Retail', NULL, 'COGS', 'COGS', 'Debit', 'acc-5300', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-5320', '5320', 'HPP - Online/E-Commerce', 'COGS - Online/E-Commerce', NULL, 'COGS', 'COGS', 'Debit', 'acc-5300', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-5330', '5330', 'HPP - Grosir/Wholesale', 'COGS - Wholesale', NULL, 'COGS', 'COGS', 'Debit', 'acc-5300', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-5350', '5350', 'HPP - Restoran', 'COGS - Restaurant', NULL, 'COGS', 'COGS', 'Debit', 'acc-5300', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now'));

-- =====================================================
-- 6000-6099: OPERATING EXPENSES - Payroll
-- =====================================================
INSERT INTO chart_of_accounts (id, code, name, name_en, description, account_type, account_category, normal_balance, parent_account_id, level, is_detail_account, is_system_account, financial_statement_type, status, created_at, updated_at) VALUES
('acc-6000', '6000', 'Beban Gaji & Karyawan', 'Payroll & Employee Expenses', 'Header', 'Expense', 'OPERATING_EXPENSE', 'Debit', NULL, 0, 0, 1, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-6010', '6010', 'Beban Gaji Pokok', 'Basic Salary Expense', NULL, 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6000', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-6020', '6020', 'Tunjangan Karyawan', 'Employee Allowances', NULL, 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6000', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-6030', '6030', 'THR (Tunjangan Hari Raya)', 'Holiday Allowance (THR)', NULL, 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6000', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-6040', '6040', 'Bonus Karyawan', 'Employee Bonuses', NULL, 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6000', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-6050', '6050', 'Komisi Sales', 'Sales Commissions', NULL, 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6000', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-6060', '6060', 'BPJS Kesehatan - Perusahaan', 'BPJS Health - Company', NULL, 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6000', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-6061', '6061', 'BPJS Ketenagakerjaan - Perusahaan', 'BPJS Employment - Company', NULL, 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6000', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now'));

-- =====================================================
-- 6100-6199: OPERATING EXPENSES - Rent & Utilities
-- =====================================================
INSERT INTO chart_of_accounts (id, code, name, name_en, description, account_type, account_category, normal_balance, parent_account_id, level, is_detail_account, is_system_account, financial_statement_type, status, created_at, updated_at) VALUES
('acc-6100', '6100', 'Beban Sewa & Utilitas', 'Rent & Utilities', 'Header', 'Expense', 'OPERATING_EXPENSE', 'Debit', NULL, 0, 0, 1, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-6110', '6110', 'Beban Sewa Kantor', 'Office Rent Expense', NULL, 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6100', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-6111', '6111', 'Beban Sewa Toko', 'Store Rent Expense', NULL, 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6100', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-6112', '6112', 'Beban Sewa Gudang', 'Warehouse Rent Expense', NULL, 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6100', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-6120', '6120', 'Beban Listrik', 'Electricity Expense', NULL, 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6100', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-6130', '6130', 'Beban Air', 'Water Expense', NULL, 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6100', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-6140', '6140', 'Beban Telepon', 'Telephone Expense', NULL, 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6100', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-6150', '6150', 'Beban Internet', 'Internet Expense', NULL, 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6100', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now'));

-- =====================================================
-- 6200-6299: OPERATING EXPENSES - Depreciation
-- =====================================================
INSERT INTO chart_of_accounts (id, code, name, name_en, description, account_type, account_category, normal_balance, parent_account_id, level, is_detail_account, is_system_account, financial_statement_type, status, created_at, updated_at) VALUES
('acc-6200', '6200', 'Beban Penyusutan & Amortisasi', 'Depreciation & Amortization', 'Header', 'Expense', 'OPERATING_EXPENSE', 'Debit', NULL, 0, 0, 1, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-6210', '6210', 'Beban Penyusutan Bangunan', 'Depreciation Expense - Buildings', NULL, 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6200', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-6220', '6220', 'Beban Penyusutan Kendaraan', 'Depreciation Expense - Vehicles', NULL, 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6200', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-6230', '6230', 'Beban Penyusutan Peralatan Kantor', 'Depreciation Expense - Office Equipment', NULL, 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6200', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-6240', '6240', 'Beban Penyusutan Peralatan Toko', 'Depreciation Expense - Store Equipment', NULL, 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6200', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-6260', '6260', 'Beban Penyusutan Komputer', 'Depreciation Expense - Computers', NULL, 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6200', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-6280', '6280', 'Beban Penyusutan Meubel', 'Depreciation Expense - Furniture', NULL, 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6200', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-6290', '6290', 'Beban Amortisasi Software', 'Amortization Expense - Software', NULL, 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6200', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now'));

-- =====================================================
-- 6300-6399: OPERATING EXPENSES - Marketing & Sales
-- =====================================================
INSERT INTO chart_of_accounts (id, code, name, name_en, description, account_type, account_category, normal_balance, parent_account_id, level, is_detail_account, is_system_account, financial_statement_type, status, created_at, updated_at) VALUES
('acc-6300', '6300', 'Beban Pemasaran & Penjualan', 'Marketing & Sales Expenses', 'Header', 'Expense', 'OPERATING_EXPENSE', 'Debit', NULL, 0, 0, 1, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-6310', '6310', 'Beban Iklan Online', 'Online Advertising Expense', NULL, 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6300', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-6320', '6320', 'Beban Iklan Offline', 'Offline Advertising Expense', NULL, 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6300', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-6330', '6330', 'Beban Promosi', 'Promotional Expenses', NULL, 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6300', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-6350', '6350', 'Beban Kemasan', 'Packaging Expenses', NULL, 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6300', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-6370', '6370', 'Beban Biaya Payment Gateway', 'Payment Gateway Fees', NULL, 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6300', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now'));

-- =====================================================
-- 6400-6499: OPERATING EXPENSES - Shipping & Logistics
-- =====================================================
INSERT INTO chart_of_accounts (id, code, name, name_en, description, account_type, account_category, normal_balance, parent_account_id, level, is_detail_account, is_system_account, financial_statement_type, status, created_at, updated_at) VALUES
('acc-6400', '6400', 'Beban Pengiriman & Logistik', 'Shipping & Logistics', 'Header', 'Expense', 'OPERATING_EXPENSE', 'Debit', NULL, 0, 0, 1, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-6410', '6410', 'Beban Pengiriman', 'Shipping/Freight-out Expense', NULL, 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6400', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-6420', '6420', 'Beban Bensin/BBM', 'Fuel Expense', NULL, 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6400', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-6430', '6430', 'Beban Parkir & Tol', 'Parking & Toll Expense', NULL, 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6400', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now'));

-- =====================================================
-- 6500-6599: OPERATING EXPENSES - Administrative
-- =====================================================
INSERT INTO chart_of_accounts (id, code, name, name_en, description, account_type, account_category, normal_balance, parent_account_id, level, is_detail_account, is_system_account, financial_statement_type, status, created_at, updated_at) VALUES
('acc-6500', '6500', 'Beban Administrasi & Umum', 'Admin & General Expenses', 'Header', 'Expense', 'OPERATING_EXPENSE', 'Debit', NULL, 0, 0, 1, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-6510', '6510', 'Beban ATK (Alat Tulis Kantor)', 'Office Supplies Expense', NULL, 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6500', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-6560', '6560', 'Beban Langganan Software', 'Software Subscription', NULL, 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6500', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-6570', '6570', 'Beban Perizinan/Lisensi', 'Permits & Licenses', NULL, 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6500', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-6580', '6580', 'Beban Konsultan & Profesional', 'Professional & Consulting Fees', NULL, 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6500', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now'));

-- =====================================================
-- 6800-6899: OPERATING EXPENSES - Loss Expenses
-- =====================================================
INSERT INTO chart_of_accounts (id, code, name, name_en, description, account_type, account_category, normal_balance, parent_account_id, level, is_detail_account, is_system_account, financial_statement_type, status, created_at, updated_at) VALUES
('acc-6800', '6800', 'Beban Kerugian', 'Loss Expenses', 'Header', 'Expense', 'OPERATING_EXPENSE', 'Debit', NULL, 0, 0, 1, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-6810', '6810', 'Beban Kerugian Piutang', 'Bad Debt Expense', NULL, 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6800', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-6820', '6820', 'Beban Kerugian Persediaan', 'Inventory Loss Expense', NULL, 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6800', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now'));

-- =====================================================
-- 6900-6999: OPERATING EXPENSES - Other
-- =====================================================
INSERT INTO chart_of_accounts (id, code, name, name_en, description, account_type, account_category, normal_balance, parent_account_id, level, is_detail_account, is_system_account, financial_statement_type, status, created_at, updated_at) VALUES
('acc-6900', '6900', 'Beban Operasional Lain', 'Other Operating Expenses', 'Header', 'Expense', 'OPERATING_EXPENSE', 'Debit', NULL, 0, 0, 1, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-6950', '6950', 'Beban Bank', 'Bank Charges', NULL, 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6900', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-6990', '6990', 'Beban Lain-lain', 'Miscellaneous Expenses', NULL, 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6900', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now'));

-- =====================================================
-- 7000-7099: OTHER INCOME
-- =====================================================
INSERT INTO chart_of_accounts (id, code, name, name_en, description, account_type, account_category, normal_balance, parent_account_id, level, is_detail_account, is_system_account, financial_statement_type, status, created_at, updated_at) VALUES
('acc-7000', '7000', 'Pendapatan Lain-lain', 'Other Income', 'Header', 'Revenue', 'OTHER_INCOME_EXPENSE', 'Credit', NULL, 0, 0, 1, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-7010', '7010', 'Pendapatan Bunga Bank', 'Bank Interest Income', NULL, 'Revenue', 'OTHER_INCOME_EXPENSE', 'Credit', 'acc-7000', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-7030', '7030', 'Pendapatan Selisih Kurs', 'Foreign Exchange Gain', NULL, 'Revenue', 'OTHER_INCOME_EXPENSE', 'Credit', 'acc-7000', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-7040', '7040', 'Pendapatan Penjualan Aset Tetap', 'Gain on Fixed Asset Sale', NULL, 'Revenue', 'OTHER_INCOME_EXPENSE', 'Credit', 'acc-7000', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now'));

-- =====================================================
-- 7100-7199: OTHER EXPENSES
-- =====================================================
INSERT INTO chart_of_accounts (id, code, name, name_en, description, account_type, account_category, normal_balance, parent_account_id, level, is_detail_account, is_system_account, financial_statement_type, status, created_at, updated_at) VALUES
('acc-7100', '7100', 'Beban Lain-lain', 'Other Expenses', 'Header', 'Expense', 'OTHER_INCOME_EXPENSE', 'Debit', NULL, 0, 0, 1, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-7110', '7110', 'Beban Bunga Pinjaman', 'Loan Interest Expense', NULL, 'Expense', 'OTHER_INCOME_EXPENSE', 'Debit', 'acc-7100', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-7130', '7130', 'Beban Selisih Kurs', 'Foreign Exchange Loss', NULL, 'Expense', 'OTHER_INCOME_EXPENSE', 'Debit', 'acc-7100', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-7140', '7140', 'Rugi Penjualan Aset Tetap', 'Loss on Fixed Asset Sale', NULL, 'Expense', 'OTHER_INCOME_EXPENSE', 'Debit', 'acc-7100', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now'));

-- =====================================================
-- 8000-8999: TAX
-- =====================================================
INSERT INTO chart_of_accounts (id, code, name, name_en, description, account_type, account_category, normal_balance, parent_account_id, level, is_detail_account, is_system_account, financial_statement_type, status, created_at, updated_at) VALUES
('acc-8000', '8000', 'Pajak Penghasilan', 'Income Tax', 'Header', 'Expense', 'TAX', 'Debit', NULL, 0, 0, 1, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-8010', '8010', 'Beban PPh Badan Kini', 'Current Corporate Income Tax', NULL, 'Expense', 'TAX', 'Debit', 'acc-8000', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-8020', '8020', 'Beban PPh Tangguhan', 'Deferred Income Tax Expense', NULL, 'Expense', 'TAX', 'Debit', 'acc-8000', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-8030', '8030', 'Manfaat Pajak Tangguhan', 'Deferred Tax Benefit', 'Credit balance', 'Expense', 'TAX', 'Credit', 'acc-8000', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now')),
('acc-8040', '8040', 'Beban PPh Final UMKM', 'PPh Final UMKM Expense (0.5%)', NULL, 'Expense', 'TAX', 'Debit', 'acc-8000', 1, 1, 0, 'INCOME_STATEMENT', 'Active', datetime('now'), datetime('now'));
