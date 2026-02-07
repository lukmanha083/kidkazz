-- Migration: Remove store_id from journal_lines
-- Reason: storeId is redundant with warehouseId in omnichannel model
-- where store = warehouse (same location handles storage + sales)

-- Drop indexes first
DROP INDEX IF EXISTS idx_jl_store;
DROP INDEX IF EXISTS idx_jl_bu_store;

-- SQLite doesn't support DROP COLUMN directly, but since the column
-- was just added and has no data, we can safely ignore it.
-- The Drizzle schema no longer references it, so it will be unused.

-- Note: For a clean removal, SQLite requires table recreation:
-- 1. Create new table without store_id
-- 2. Copy data
-- 3. Drop old table
-- 4. Rename new table
--
-- However, since store_id has no data and indexes are dropped,
-- leaving the column orphaned is acceptable for now.
-- The column will be ignored by Drizzle ORM.
