-- =====================================================
-- Seed Default Asset Categories
-- Version: 1.0
-- Date: 2026-01-27
-- =====================================================

-- POS Equipment
INSERT OR IGNORE INTO asset_categories (
  id, code, name, description,
  default_useful_life_months, default_depreciation_method, default_salvage_value_percent,
  asset_account_id, accumulated_depreciation_account_id,
  depreciation_expense_account_id, gain_loss_on_disposal_account_id,
  tax_useful_life_months, tax_depreciation_method, tax_asset_group,
  is_active, created_at, updated_at
) VALUES (
  'cat-pos', 'POS', 'POS Equipment',
  'Point of Sale terminals, barcode scanners, receipt printers',
  60, 'STRAIGHT_LINE', 10,
  'acc-1150', 'acc-1155', 'acc-6500', 'acc-7100',
  48, 'STRAIGHT_LINE', 'GROUP_1',
  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- Warehouse Equipment
INSERT OR IGNORE INTO asset_categories (
  id, code, name, description,
  default_useful_life_months, default_depreciation_method, default_salvage_value_percent,
  asset_account_id, accumulated_depreciation_account_id,
  depreciation_expense_account_id, gain_loss_on_disposal_account_id,
  tax_useful_life_months, tax_depreciation_method, tax_asset_group,
  is_active, created_at, updated_at
) VALUES (
  'cat-whs', 'WHS', 'Warehouse Equipment',
  'Forklifts, pallet jacks, racking systems, conveyors',
  120, 'STRAIGHT_LINE', 5,
  'acc-1160', 'acc-1165', 'acc-6500', 'acc-7100',
  96, 'STRAIGHT_LINE', 'GROUP_2',
  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- Vehicles
INSERT OR IGNORE INTO asset_categories (
  id, code, name, description,
  default_useful_life_months, default_depreciation_method, default_salvage_value_percent,
  asset_account_id, accumulated_depreciation_account_id,
  depreciation_expense_account_id, gain_loss_on_disposal_account_id,
  tax_useful_life_months, tax_depreciation_method, tax_asset_group,
  is_active, created_at, updated_at
) VALUES (
  'cat-veh', 'VEH', 'Vehicles',
  'Delivery trucks, vans, motorcycles',
  96, 'DECLINING_BALANCE', 15,
  'acc-1170', 'acc-1175', 'acc-6510', 'acc-7100',
  96, 'DECLINING_BALANCE', 'GROUP_2',
  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- IT Infrastructure
INSERT OR IGNORE INTO asset_categories (
  id, code, name, description,
  default_useful_life_months, default_depreciation_method, default_salvage_value_percent,
  asset_account_id, accumulated_depreciation_account_id,
  depreciation_expense_account_id, gain_loss_on_disposal_account_id,
  tax_useful_life_months, tax_depreciation_method, tax_asset_group,
  is_active, created_at, updated_at
) VALUES (
  'cat-it', 'IT', 'IT Infrastructure',
  'Servers, computers, networking equipment',
  48, 'STRAIGHT_LINE', 5,
  'acc-1140', 'acc-1145', 'acc-6500', 'acc-7100',
  48, 'STRAIGHT_LINE', 'GROUP_1',
  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- Store Fixtures
INSERT OR IGNORE INTO asset_categories (
  id, code, name, description,
  default_useful_life_months, default_depreciation_method, default_salvage_value_percent,
  asset_account_id, accumulated_depreciation_account_id,
  depreciation_expense_account_id, gain_loss_on_disposal_account_id,
  tax_useful_life_months, tax_depreciation_method, tax_asset_group,
  is_active, created_at, updated_at
) VALUES (
  'cat-fix', 'FIX', 'Store Fixtures',
  'Shelving, display cases, signage',
  120, 'STRAIGHT_LINE', 0,
  'acc-1180', 'acc-1185', 'acc-6500', 'acc-7100',
  96, 'STRAIGHT_LINE', 'GROUP_2',
  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- Office Furniture
INSERT OR IGNORE INTO asset_categories (
  id, code, name, description,
  default_useful_life_months, default_depreciation_method, default_salvage_value_percent,
  asset_account_id, accumulated_depreciation_account_id,
  depreciation_expense_account_id, gain_loss_on_disposal_account_id,
  tax_useful_life_months, tax_depreciation_method, tax_asset_group,
  is_active, created_at, updated_at
) VALUES (
  'cat-fur', 'FUR', 'Office Furniture',
  'Desks, chairs, cabinets, AC units',
  96, 'STRAIGHT_LINE', 5,
  'acc-1190', 'acc-1195', 'acc-6500', 'acc-7100',
  96, 'STRAIGHT_LINE', 'GROUP_2',
  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- Building Improvements
INSERT OR IGNORE INTO asset_categories (
  id, code, name, description,
  default_useful_life_months, default_depreciation_method, default_salvage_value_percent,
  asset_account_id, accumulated_depreciation_account_id,
  depreciation_expense_account_id, gain_loss_on_disposal_account_id,
  tax_useful_life_months, tax_depreciation_method, tax_asset_group,
  is_active, created_at, updated_at
) VALUES (
  'cat-bld', 'BLD', 'Building Improvements',
  'Leasehold improvements, renovations',
  120, 'STRAIGHT_LINE', 0,
  'acc-1200', 'acc-1205', 'acc-6520', 'acc-7100',
  120, 'STRAIGHT_LINE', 'NON_PERMANENT',
  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);
