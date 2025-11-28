-- Migration: Add updated_at to product_variants
-- Date: 2025-11-28
-- Description: Add updated_at field to product_variants table (missing from initial schema)

-- Add updated_at column to product_variants table
-- Using created_at value as default for existing records (they were just created, so updated_at = created_at makes sense)
-- SQLite requires constant default values, so we add as nullable first, update, then make NOT NULL
ALTER TABLE product_variants ADD COLUMN updated_at INTEGER;

-- Update existing records to use created_at as the initial updated_at value
UPDATE product_variants SET updated_at = created_at WHERE updated_at IS NULL;

-- Note: This column was missing from the initial migration (0000_free_firelord.sql)
-- It is required for the schema to match the Drizzle schema definition
-- For existing records, updated_at is set to match created_at (reasonable assumption for new records)
