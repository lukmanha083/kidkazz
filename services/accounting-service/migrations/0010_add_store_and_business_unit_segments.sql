-- Migration: Add storeId and businessUnit segments to journal_lines
-- Supports multi-location (store/branch) and multi-business unit (Trading/Restaurant) reporting
--
-- NOTE: D1 migrations are tracked and only run once. If you need to re-run,
-- use: wrangler d1 migrations apply DB --local (for local) or without --local (for remote)
-- The migration system prevents duplicate runs.

-- Add storeId column for physical store/branch tracking
ALTER TABLE journal_lines ADD COLUMN store_id TEXT;

-- Add businessUnit column for business unit segmentation
ALTER TABLE journal_lines ADD COLUMN business_unit TEXT;

-- Create indexes for faster segment-based queries
CREATE INDEX IF NOT EXISTS idx_jl_store ON journal_lines(store_id);
CREATE INDEX IF NOT EXISTS idx_jl_business_unit ON journal_lines(business_unit);

-- Composite index for common reporting queries (business unit + store)
CREATE INDEX IF NOT EXISTS idx_jl_bu_store ON journal_lines(business_unit, store_id);
