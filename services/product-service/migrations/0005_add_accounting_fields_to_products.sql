-- Migration: Add accounting integration fields to products table
-- Description: Links products to Chart of Accounts for automated journal entries
-- Date: 2025-11-21

-- Add Revenue Account fields
ALTER TABLE products ADD COLUMN revenue_account_id TEXT;
ALTER TABLE products ADD COLUMN revenue_account_code TEXT; -- e.g., "4010" - Product Sales

-- Add COGS (Cost of Goods Sold) fields
ALTER TABLE products ADD COLUMN cogs_account_id TEXT;
ALTER TABLE products ADD COLUMN cogs_account_code TEXT; -- e.g., "5010" - Cost of Product Sales

-- Add Inventory Asset fields
ALTER TABLE products ADD COLUMN inventory_account_id TEXT;
ALTER TABLE products ADD COLUMN inventory_account_code TEXT; -- e.g., "1010" - Finished Goods Inventory

-- Add Deferred COGS field (for advanced revenue recognition)
ALTER TABLE products ADD COLUMN deferred_cogs_account_id TEXT;

-- Add Costing fields
ALTER TABLE products ADD COLUMN cost_price REAL; -- Actual cost/purchase price (different from selling price)
ALTER TABLE products ADD COLUMN costing_method TEXT DEFAULT 'Average' CHECK(costing_method IN ('FIFO', 'LIFO', 'Average', 'Standard'));

-- Add Tax fields
ALTER TABLE products ADD COLUMN taxable INTEGER DEFAULT 1; -- Boolean: 1 = taxable, 0 = not taxable
ALTER TABLE products ADD COLUMN tax_category_id TEXT;

-- Add GL Segmentation fields (optional for multi-department/location tracking)
ALTER TABLE products ADD COLUMN gl_segment1 TEXT; -- Department code
ALTER TABLE products ADD COLUMN gl_segment2 TEXT; -- Location code
ALTER TABLE products ADD COLUMN gl_segment3 TEXT; -- Project code

-- Create indexes for account lookups (improves query performance)
CREATE INDEX IF NOT EXISTS idx_products_revenue_account ON products(revenue_account_id);
CREATE INDEX IF NOT EXISTS idx_products_cogs_account ON products(cogs_account_id);
CREATE INDEX IF NOT EXISTS idx_products_inventory_account ON products(inventory_account_id);
CREATE INDEX IF NOT EXISTS idx_products_taxable ON products(taxable);
CREATE INDEX IF NOT EXISTS idx_products_tax_category ON products(tax_category_id);

-- Comments (for documentation)
-- Revenue Account: Account where product sales revenue is posted (e.g., 4010 - Product Sales)
-- COGS Account: Account where cost of goods sold is posted when product is sold (e.g., 5010 - COGS)
-- Inventory Account: Account where inventory value is tracked (e.g., 1010 - Finished Goods)
-- Deferred COGS: For subscription/service products where revenue is recognized over time
-- Cost Price: Actual cost to acquire/produce the product (vs selling price)
-- Costing Method: How inventory is valued (FIFO, LIFO, Average, Standard)
-- Taxable: Whether product is subject to sales tax
-- Tax Category: Tax rate category (standard, reduced, exempt, etc.)
-- GL Segments: Optional fields for segmented accounting (by department, location, project)

-- Example Journal Entry when product is sold:
-- Entry 1: Revenue Recognition
--   Debit:  Accounts Receivable (1200)  $100
--   Credit: Revenue (product.revenue_account_id)  $100
--
-- Entry 2: COGS Recognition (Matching Principle)
--   Debit:  COGS (product.cogs_account_id)  $60
--   Credit: Inventory (product.inventory_account_id)  $60
