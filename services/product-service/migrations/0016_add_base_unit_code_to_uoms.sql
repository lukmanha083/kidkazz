-- Migration: Add base_unit_code to uoms table
-- Description: Adds a base_unit_code column to link custom UOMs to their base units

ALTER TABLE `uoms` ADD COLUMN `base_unit_code` text;
--> statement-breakpoint

-- Add foreign key constraint (optional, for data integrity)
-- Note: In SQLite, foreign keys must be enabled explicitly
-- This creates a soft reference to the base UOM via code
