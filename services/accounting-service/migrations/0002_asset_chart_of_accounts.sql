-- =====================================================
-- Fixed Asset Chart of Accounts
-- Version: 1.0
-- Date: 2026-01-27
-- =====================================================

-- Fixed Assets Header Account
INSERT OR IGNORE INTO chart_of_accounts (
  id, code, name, name_en, description, account_type, account_category,
  normal_balance, parent_account_id, level, is_detail_account, is_system_account,
  financial_statement_type, status, created_at, updated_at
) VALUES
('acc-1100', '1100', 'Aset Tetap', 'Fixed Assets', 'Header account for all fixed assets', 'Asset', 'FIXED_ASSET', 'Debit', NULL, 0, 0, 1, 'BALANCE_SHEET', 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Computer Equipment
INSERT OR IGNORE INTO chart_of_accounts (
  id, code, name, name_en, description, account_type, account_category,
  normal_balance, parent_account_id, level, is_detail_account, is_system_account,
  financial_statement_type, status, created_at, updated_at
) VALUES
('acc-1140', '1140', 'Peralatan Komputer', 'Computer Equipment', 'Computers, servers, networking equipment', 'Asset', 'FIXED_ASSET', 'Debit', 'acc-1100', 1, 1, 0, 'BALANCE_SHEET', 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('acc-1145', '1145', 'Akum. Peny. Peralatan Komputer', 'Accum. Depr. - Computer Equipment', 'Accumulated depreciation for computer equipment', 'Asset', 'FIXED_ASSET', 'Credit', 'acc-1100', 1, 1, 0, 'BALANCE_SHEET', 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Office Equipment (POS)
INSERT OR IGNORE INTO chart_of_accounts (
  id, code, name, name_en, description, account_type, account_category,
  normal_balance, parent_account_id, level, is_detail_account, is_system_account,
  financial_statement_type, status, created_at, updated_at
) VALUES
('acc-1150', '1150', 'Peralatan Kantor', 'Office Equipment', 'POS terminals, barcode scanners, receipt printers', 'Asset', 'FIXED_ASSET', 'Debit', 'acc-1100', 1, 1, 0, 'BALANCE_SHEET', 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('acc-1155', '1155', 'Akum. Peny. Peralatan Kantor', 'Accum. Depr. - Office Equipment', 'Accumulated depreciation for office equipment', 'Asset', 'FIXED_ASSET', 'Credit', 'acc-1100', 1, 1, 0, 'BALANCE_SHEET', 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Warehouse Equipment
INSERT OR IGNORE INTO chart_of_accounts (
  id, code, name, name_en, description, account_type, account_category,
  normal_balance, parent_account_id, level, is_detail_account, is_system_account,
  financial_statement_type, status, created_at, updated_at
) VALUES
('acc-1160', '1160', 'Peralatan Gudang', 'Warehouse Equipment', 'Forklifts, pallet jacks, racking systems', 'Asset', 'FIXED_ASSET', 'Debit', 'acc-1100', 1, 1, 0, 'BALANCE_SHEET', 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('acc-1165', '1165', 'Akum. Peny. Peralatan Gudang', 'Accum. Depr. - Warehouse Equipment', 'Accumulated depreciation for warehouse equipment', 'Asset', 'FIXED_ASSET', 'Credit', 'acc-1100', 1, 1, 0, 'BALANCE_SHEET', 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Vehicles
INSERT OR IGNORE INTO chart_of_accounts (
  id, code, name, name_en, description, account_type, account_category,
  normal_balance, parent_account_id, level, is_detail_account, is_system_account,
  financial_statement_type, status, created_at, updated_at
) VALUES
('acc-1170', '1170', 'Kendaraan', 'Vehicles', 'Delivery trucks, vans, motorcycles', 'Asset', 'FIXED_ASSET', 'Debit', 'acc-1100', 1, 1, 0, 'BALANCE_SHEET', 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('acc-1175', '1175', 'Akum. Peny. Kendaraan', 'Accum. Depr. - Vehicles', 'Accumulated depreciation for vehicles', 'Asset', 'FIXED_ASSET', 'Credit', 'acc-1100', 1, 1, 0, 'BALANCE_SHEET', 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Fixtures & Fittings
INSERT OR IGNORE INTO chart_of_accounts (
  id, code, name, name_en, description, account_type, account_category,
  normal_balance, parent_account_id, level, is_detail_account, is_system_account,
  financial_statement_type, status, created_at, updated_at
) VALUES
('acc-1180', '1180', 'Perlengkapan Toko', 'Store Fixtures', 'Shelving, display cases, signage', 'Asset', 'FIXED_ASSET', 'Debit', 'acc-1100', 1, 1, 0, 'BALANCE_SHEET', 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('acc-1185', '1185', 'Akum. Peny. Perlengkapan Toko', 'Accum. Depr. - Store Fixtures', 'Accumulated depreciation for store fixtures', 'Asset', 'FIXED_ASSET', 'Credit', 'acc-1100', 1, 1, 0, 'BALANCE_SHEET', 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Furniture
INSERT OR IGNORE INTO chart_of_accounts (
  id, code, name, name_en, description, account_type, account_category,
  normal_balance, parent_account_id, level, is_detail_account, is_system_account,
  financial_statement_type, status, created_at, updated_at
) VALUES
('acc-1190', '1190', 'Perabotan Kantor', 'Office Furniture', 'Desks, chairs, cabinets, AC units', 'Asset', 'FIXED_ASSET', 'Debit', 'acc-1100', 1, 1, 0, 'BALANCE_SHEET', 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('acc-1195', '1195', 'Akum. Peny. Perabotan Kantor', 'Accum. Depr. - Office Furniture', 'Accumulated depreciation for office furniture', 'Asset', 'FIXED_ASSET', 'Credit', 'acc-1100', 1, 1, 0, 'BALANCE_SHEET', 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Leasehold Improvements
INSERT OR IGNORE INTO chart_of_accounts (
  id, code, name, name_en, description, account_type, account_category,
  normal_balance, parent_account_id, level, is_detail_account, is_system_account,
  financial_statement_type, status, created_at, updated_at
) VALUES
('acc-1200', '1200', 'Perbaikan Sewa Guna', 'Leasehold Improvements', 'Building renovations, improvements', 'Asset', 'FIXED_ASSET', 'Debit', 'acc-1100', 1, 1, 0, 'BALANCE_SHEET', 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('acc-1205', '1205', 'Akum. Peny. Perbaikan Sewa Guna', 'Accum. Depr. - Leasehold Improvements', 'Accumulated depreciation for leasehold improvements', 'Asset', 'FIXED_ASSET', 'Credit', 'acc-1100', 1, 1, 0, 'BALANCE_SHEET', 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Depreciation Expense Accounts
INSERT OR IGNORE INTO chart_of_accounts (
  id, code, name, name_en, description, account_type, account_category,
  normal_balance, parent_account_id, level, is_detail_account, is_system_account,
  financial_statement_type, status, created_at, updated_at
) VALUES
('acc-6500', '6500', 'Beban Penyusutan - Umum', 'Depreciation Expense - General', 'General depreciation expense for fixed assets', 'Expense', 'OPERATING_EXPENSE', 'Debit', NULL, 0, 1, 0, 'INCOME_STATEMENT', 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('acc-6510', '6510', 'Beban Penyusutan - Kendaraan', 'Depreciation Expense - Vehicles', 'Depreciation expense for vehicles', 'Expense', 'OPERATING_EXPENSE', 'Debit', NULL, 0, 1, 0, 'INCOME_STATEMENT', 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('acc-6520', '6520', 'Beban Penyusutan - Sewa Guna', 'Depreciation Expense - Leasehold', 'Depreciation expense for leasehold improvements', 'Expense', 'OPERATING_EXPENSE', 'Debit', NULL, 0, 1, 0, 'INCOME_STATEMENT', 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Gain/Loss on Disposal
INSERT OR IGNORE INTO chart_of_accounts (
  id, code, name, name_en, description, account_type, account_category,
  normal_balance, parent_account_id, level, is_detail_account, is_system_account,
  financial_statement_type, status, created_at, updated_at
) VALUES
('acc-7100', '7100', 'Laba/Rugi Pelepasan Aset', 'Gain/Loss on Asset Disposal', 'Gain or loss from selling or disposing fixed assets', 'Expense', 'OTHER_INCOME_EXPENSE', 'Debit', NULL, 0, 1, 0, 'INCOME_STATEMENT', 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
