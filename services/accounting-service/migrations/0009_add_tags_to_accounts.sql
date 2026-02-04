-- Migration: Add tags column to chart_of_accounts table
-- Supports industry-specific account tagging (e.g., 'restaurant', 'retail', 'general')
-- Tags stored as JSON array for flexibility

-- Add tags column (JSON array stored as TEXT)
ALTER TABLE chart_of_accounts ADD COLUMN tags TEXT DEFAULT '[]';

-- Create index for faster tag-based queries
-- SQLite doesn't support JSON array indexing, but we can use LIKE for simple queries
CREATE INDEX IF NOT EXISTS idx_coa_tags ON chart_of_accounts(tags);

-- Update existing accounts to have 'general' tag
UPDATE chart_of_accounts SET tags = '["general"]' WHERE tags = '[]' OR tags IS NULL;
