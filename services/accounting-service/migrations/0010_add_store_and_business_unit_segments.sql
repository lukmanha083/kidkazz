-- Migration: Add storeId and businessUnit segments to journal_lines
-- Supports multi-location (store/branch) and multi-business unit (Trading/Restaurant) reporting

-- Add storeId column for physical store/branch tracking
ALTER TABLE journal_lines ADD COLUMN store_id TEXT;

-- Add businessUnit column for business unit segmentation
ALTER TABLE journal_lines ADD COLUMN business_unit TEXT;

-- Create indexes for faster segment-based queries
CREATE INDEX IF NOT EXISTS idx_jl_store ON journal_lines(store_id);
CREATE INDEX IF NOT EXISTS idx_jl_business_unit ON journal_lines(business_unit);

-- Composite index for common reporting queries (business unit + store)
CREATE INDEX IF NOT EXISTS idx_jl_bu_store ON journal_lines(business_unit, store_id);
