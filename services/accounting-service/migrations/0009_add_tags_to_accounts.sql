-- Migration: Add tags column to chart_of_accounts table
-- Supports industry-specific account tagging (e.g., 'restaurant', 'retail', 'general')
-- Tags stored as JSON array for flexibility
--
-- NOTE: D1 migrations are tracked and only run once. If you need to re-run,
-- use: wrangler d1 migrations apply DB --local (for local) or without --local (for remote)
-- The migration system prevents duplicate runs.

-- Add tags column (JSON array stored as TEXT)
-- This will fail if run twice, but D1 migration tracking prevents that
ALTER TABLE chart_of_accounts ADD COLUMN tags TEXT DEFAULT '[]';

-- Create index for faster tag-based queries
CREATE INDEX IF NOT EXISTS idx_coa_tags ON chart_of_accounts(tags);

-- Update existing accounts to have 'general' tag
UPDATE chart_of_accounts SET tags = '["general"]' WHERE tags = '[]' OR tags IS NULL;
