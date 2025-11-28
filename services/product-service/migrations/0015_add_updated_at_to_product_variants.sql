-- Migration: Add updated_at to product_variants
-- Date: 2025-11-28
-- Description: Add updated_at field to product_variants table (missing from initial schema)

-- Add updated_at column to product_variants table
ALTER TABLE product_variants ADD COLUMN updated_at INTEGER NOT NULL DEFAULT (cast(strftime('%s', 'now') as int));

-- Note: This column was missing from the initial migration (0000_free_firelord.sql)
-- It is required for the schema to match the Drizzle schema definition
-- The default value sets it to the current Unix timestamp for existing records
