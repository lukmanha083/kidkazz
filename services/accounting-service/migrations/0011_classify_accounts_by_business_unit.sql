-- Migration: Classify accounts by business unit tags and add restaurant-specific accounts
-- Tags: 'general' (shared), 'trading' (trading-specific), 'restaurant' (restaurant-specific)

-- =====================================================
-- STEP 1: Update existing accounts with proper tags
-- =====================================================

-- GENERAL accounts (shared by both trading and restaurant)
-- Cash, Bank, AR, AP, Tax, Equity, General Expenses
UPDATE chart_of_accounts SET tags = '["general"]' WHERE code IN (
  -- Cash & Bank (1100-1199)
  '1100', '1101', '1102', '1103', '1110', '1111', '1112', '1113', '1120',
  -- Accounts Receivable (1200-1299)
  '1200', '1210', '1211', '1212', '1220', '1230', '1290',
  -- Prepaid & Deposits (1300-1399) - general ones
  '1300', '1340', '1350',
  -- Fixed Assets - general (1400-1499)
  '1400', '1410', '1420', '1421', '1430', '1431', '1470', '1471', '1490', '1491',
  -- Other Non-Current Assets (1500-1599)
  '1500', '1510', '1520', '1530', '1531', '1532',
  -- Trade Payables (2000-2099)
  '2000', '2010', '2011', '2012', '2020', '2030',
  -- Tax Payables (2100-2199)
  '2100', '2110', '2120', '2130', '2131', '2135',
  -- Accrued Expenses (2200-2299)
  '2200', '2210', '2212', '2220', '2221', '2230',
  -- Long-term Liabilities (2400-2499)
  '2400', '2410', '2420', '2450',
  -- Equity (3000-3999)
  '3000', '3100', '3200', '3210', '3220', '3300', '3500',
  -- Sales Deductions - general (4100-4199)
  '4100', '4110', '4120',
  -- Other Operating Revenue (4200-4299)
  '4200', '4210', '4220',
  -- Purchase Deductions (5100-5199)
  '5100', '5110', '5120',
  -- Inventory Adjustments - general (5200-5299)
  '5200', '5230', '5231', '5232',
  -- Payroll Expenses (6000-6099)
  '6000', '6010', '6020', '6021', '6030', '6031', '6040', '6050',
  -- Rent & Utilities (6100-6199)
  '6100', '6110', '6120', '6130',
  -- Office & Admin (6200-6299)
  '6200', '6210', '6211', '6220', '6230', '6240',
  -- Marketing (6300-6399)
  '6300', '6310', '6320', '6330',
  -- Depreciation (6400-6499)
  '6400', '6410', '6420', '6430', '6440',
  -- Other Operating Expenses (6500-6599)
  '6500', '6510', '6520', '6530', '6540', '6550',
  -- Finance Costs (6600-6699)
  '6600', '6610', '6620', '6630',
  -- Other Income/Expense (7000-7999)
  '7000', '7010', '7020', '7100', '7110', '7120',
  -- Tax Expense (8000-8999)
  '8000', '8010', '8020'
);

-- TRADING accounts (trading business specific)
UPDATE chart_of_accounts SET tags = '["trading"]' WHERE code IN (
  -- Inventory - Merchandise
  '1310',
  -- Store Supplies & Equipment
  '1360', '1450', '1451',
  -- Sales - Trading channels
  '4000', '4010', '4020', '4030', '4040',
  -- COGS - Trading
  '5000', '5010', '5020',
  -- COGS by Channel - Trading
  '5300', '5310', '5320', '5330'
);

-- RESTAURANT accounts (existing ones)
UPDATE chart_of_accounts SET tags = '["restaurant"]' WHERE code IN (
  -- Sales - Restaurant
  '4050',
  -- COGS - Restaurant
  '5350'
);

-- =====================================================
-- STEP 2: Add restaurant-specific accounts
-- =====================================================

-- Restaurant Inventory accounts
INSERT OR IGNORE INTO chart_of_accounts (id, code, name, name_en, description, account_type, account_category, normal_balance, parent_account_id, level, is_detail_account, is_system_account, financial_statement_type, status, tags, created_at, updated_at) VALUES
('acc-1370', '1370', 'Persediaan Bahan Makanan', 'Food Inventory', 'Raw food ingredients inventory', 'Asset', 'CURRENT_ASSET', 'Debit', 'acc-1300', 1, 1, 0, 'BALANCE_SHEET', 'Active', '["restaurant"]', datetime('now'), datetime('now')),
('acc-1371', '1371', 'Persediaan Bahan Minuman', 'Beverage Inventory', 'Beverage ingredients inventory', 'Asset', 'CURRENT_ASSET', 'Debit', 'acc-1300', 1, 1, 0, 'BALANCE_SHEET', 'Active', '["restaurant"]', datetime('now'), datetime('now')),
('acc-1372', '1372', 'Persediaan Kemasan & Packaging', 'Packaging Supplies', 'Food containers, bags, etc.', 'Asset', 'CURRENT_ASSET', 'Debit', 'acc-1300', 1, 1, 0, 'BALANCE_SHEET', 'Active', '["restaurant"]', datetime('now'), datetime('now')),
('acc-1375', '1375', 'Perlengkapan Dapur', 'Kitchen Supplies', 'Consumable kitchen supplies', 'Asset', 'CURRENT_ASSET', 'Debit', 'acc-1300', 1, 1, 0, 'BALANCE_SHEET', 'Active', '["restaurant"]', datetime('now'), datetime('now'));

-- Restaurant Fixed Assets
INSERT OR IGNORE INTO chart_of_accounts (id, code, name, name_en, description, account_type, account_category, normal_balance, parent_account_id, level, is_detail_account, is_system_account, financial_statement_type, status, tags, created_at, updated_at) VALUES
('acc-1460', '1460', 'Peralatan Dapur', 'Kitchen Equipment', 'Stoves, ovens, refrigerators, etc.', 'Asset', 'FIXED_ASSET', 'Debit', 'acc-1400', 1, 1, 0, 'BALANCE_SHEET', 'Active', '["restaurant"]', datetime('now'), datetime('now')),
('acc-1461', '1461', 'Akumulasi Penyusutan Peralatan Dapur', 'Accumulated Depreciation - Kitchen Equipment', 'Contra asset', 'Asset', 'FIXED_ASSET', 'Credit', 'acc-1400', 1, 1, 0, 'BALANCE_SHEET', 'Active', '["restaurant"]', datetime('now'), datetime('now')),
('acc-1465', '1465', 'Peralatan Restoran', 'Restaurant Equipment', 'Tables, chairs, display, POS kiosk', 'Asset', 'FIXED_ASSET', 'Debit', 'acc-1400', 1, 1, 0, 'BALANCE_SHEET', 'Active', '["restaurant"]', datetime('now'), datetime('now')),
('acc-1466', '1466', 'Akumulasi Penyusutan Peralatan Restoran', 'Accumulated Depreciation - Restaurant Equipment', 'Contra asset', 'Asset', 'FIXED_ASSET', 'Credit', 'acc-1400', 1, 1, 0, 'BALANCE_SHEET', 'Active', '["restaurant"]', datetime('now'), datetime('now'));

-- Restaurant Revenue accounts (sub-categories)
INSERT OR IGNORE INTO chart_of_accounts (id, code, name, name_en, description, account_type, account_category, normal_balance, parent_account_id, level, is_detail_account, is_system_account, financial_statement_type, status, tags, created_at, updated_at) VALUES
('acc-4051', '4051', 'Penjualan Makanan', 'Food Sales', 'Revenue from food items', 'Revenue', 'REVENUE', 'Credit', 'acc-4000', 1, 1, 0, 'INCOME_STATEMENT', 'Active', '["restaurant"]', datetime('now'), datetime('now')),
('acc-4052', '4052', 'Penjualan Minuman', 'Beverage Sales', 'Revenue from beverages', 'Revenue', 'REVENUE', 'Credit', 'acc-4000', 1, 1, 0, 'INCOME_STATEMENT', 'Active', '["restaurant"]', datetime('now'), datetime('now')),
('acc-4053', '4053', 'Penjualan Dine-in', 'Dine-in Sales', 'Revenue from dine-in customers', 'Revenue', 'REVENUE', 'Credit', 'acc-4000', 1, 1, 0, 'INCOME_STATEMENT', 'Active', '["restaurant"]', datetime('now'), datetime('now')),
('acc-4054', '4054', 'Penjualan Take-away', 'Take-away Sales', 'Revenue from take-away orders', 'Revenue', 'REVENUE', 'Credit', 'acc-4000', 1, 1, 0, 'INCOME_STATEMENT', 'Active', '["restaurant"]', datetime('now'), datetime('now')),
('acc-4055', '4055', 'Penjualan Delivery', 'Delivery Sales', 'Revenue from delivery orders', 'Revenue', 'REVENUE', 'Credit', 'acc-4000', 1, 1, 0, 'INCOME_STATEMENT', 'Active', '["restaurant"]', datetime('now'), datetime('now'));

-- Restaurant COGS accounts (Food Cost)
INSERT OR IGNORE INTO chart_of_accounts (id, code, name, name_en, description, account_type, account_category, normal_balance, parent_account_id, level, is_detail_account, is_system_account, financial_statement_type, status, tags, created_at, updated_at) VALUES
('acc-5400', '5400', 'HPP Restoran', 'Restaurant COGS', 'Header for restaurant cost of goods sold', 'COGS', 'COGS', 'Debit', NULL, 0, 0, 1, 'INCOME_STATEMENT', 'Active', '["restaurant"]', datetime('now'), datetime('now')),
('acc-5410', '5410', 'Biaya Bahan Makanan', 'Food Cost', 'Cost of food ingredients', 'COGS', 'COGS', 'Debit', 'acc-5400', 1, 1, 0, 'INCOME_STATEMENT', 'Active', '["restaurant"]', datetime('now'), datetime('now')),
('acc-5420', '5420', 'Biaya Bahan Minuman', 'Beverage Cost', 'Cost of beverage ingredients', 'COGS', 'COGS', 'Debit', 'acc-5400', 1, 1, 0, 'INCOME_STATEMENT', 'Active', '["restaurant"]', datetime('now'), datetime('now')),
('acc-5430', '5430', 'Biaya Kemasan', 'Packaging Cost', 'Cost of food packaging', 'COGS', 'COGS', 'Debit', 'acc-5400', 1, 1, 0, 'INCOME_STATEMENT', 'Active', '["restaurant"]', datetime('now'), datetime('now')),
('acc-5440', '5440', 'Bahan Terbuang/Waste', 'Food Waste', 'Spoiled or wasted ingredients', 'COGS', 'COGS', 'Debit', 'acc-5400', 1, 1, 0, 'INCOME_STATEMENT', 'Active', '["restaurant"]', datetime('now'), datetime('now'));

-- Restaurant Operating Expenses
INSERT OR IGNORE INTO chart_of_accounts (id, code, name, name_en, description, account_type, account_category, normal_balance, parent_account_id, level, is_detail_account, is_system_account, financial_statement_type, status, tags, created_at, updated_at) VALUES
('acc-6700', '6700', 'Biaya Operasional Restoran', 'Restaurant Operating Expenses', 'Header for restaurant-specific expenses', 'Expense', 'OPERATING_EXPENSE', 'Debit', NULL, 0, 0, 1, 'INCOME_STATEMENT', 'Active', '["restaurant"]', datetime('now'), datetime('now')),
('acc-6710', '6710', 'Biaya Gas/LPG', 'Gas/LPG Expense', 'Cooking gas expense', 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6700', 1, 1, 0, 'INCOME_STATEMENT', 'Active', '["restaurant"]', datetime('now'), datetime('now')),
('acc-6720', '6720', 'Biaya Perlengkapan Dapur', 'Kitchen Supplies Expense', 'Consumable kitchen items', 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6700', 1, 1, 0, 'INCOME_STATEMENT', 'Active', '["restaurant"]', datetime('now'), datetime('now')),
('acc-6730', '6730', 'Biaya Kebersihan Dapur', 'Kitchen Cleaning Expense', 'Cleaning supplies for kitchen', 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6700', 1, 1, 0, 'INCOME_STATEMENT', 'Active', '["restaurant"]', datetime('now'), datetime('now')),
('acc-6740', '6740', 'Biaya Pemeliharaan Peralatan Dapur', 'Kitchen Equipment Maintenance', 'Repair and maintenance', 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6700', 1, 1, 0, 'INCOME_STATEMENT', 'Active', '["restaurant"]', datetime('now'), datetime('now')),
('acc-6750', '6750', 'Biaya Delivery Platform', 'Delivery Platform Fees', 'GoFood, GrabFood, ShopeeFood fees', 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6700', 1, 1, 0, 'INCOME_STATEMENT', 'Active', '["restaurant"]', datetime('now'), datetime('now')),
('acc-6760', '6760', 'Biaya Seragam Dapur', 'Kitchen Uniform Expense', 'Chef coats, aprons, etc.', 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6700', 1, 1, 0, 'INCOME_STATEMENT', 'Active', '["restaurant"]', datetime('now'), datetime('now'));

-- Restaurant Payroll (specific roles)
INSERT OR IGNORE INTO chart_of_accounts (id, code, name, name_en, description, account_type, account_category, normal_balance, parent_account_id, level, is_detail_account, is_system_account, financial_statement_type, status, tags, created_at, updated_at) VALUES
('acc-6060', '6060', 'Gaji Koki/Chef', 'Chef Salary', 'Salary for kitchen staff', 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6000', 1, 1, 0, 'INCOME_STATEMENT', 'Active', '["restaurant"]', datetime('now'), datetime('now')),
('acc-6061', '6061', 'Gaji Kitchen Helper', 'Kitchen Helper Salary', 'Salary for kitchen assistants', 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6000', 1, 1, 0, 'INCOME_STATEMENT', 'Active', '["restaurant"]', datetime('now'), datetime('now'));

-- Restaurant Depreciation
INSERT OR IGNORE INTO chart_of_accounts (id, code, name, name_en, description, account_type, account_category, normal_balance, parent_account_id, level, is_detail_account, is_system_account, financial_statement_type, status, tags, created_at, updated_at) VALUES
('acc-6450', '6450', 'Penyusutan Peralatan Dapur', 'Depreciation - Kitchen Equipment', NULL, 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6400', 1, 1, 0, 'INCOME_STATEMENT', 'Active', '["restaurant"]', datetime('now'), datetime('now')),
('acc-6455', '6455', 'Penyusutan Peralatan Restoran', 'Depreciation - Restaurant Equipment', NULL, 'Expense', 'OPERATING_EXPENSE', 'Debit', 'acc-6400', 1, 1, 0, 'INCOME_STATEMENT', 'Active', '["restaurant"]', datetime('now'), datetime('now'));
