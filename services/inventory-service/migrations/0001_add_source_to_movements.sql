-- Migration: Add 'source' column to inventory_movements table
-- Purpose: Track whether inventory adjustment came from warehouse operations or POS sales
-- Business Rule: POS can create negative stock (first-pay-first-served), warehouse cannot

ALTER TABLE `inventory_movements` ADD COLUMN `source` text DEFAULT 'warehouse';
