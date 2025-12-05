-- Migration: 0004_add_audit_fields_to_batches
-- Description: Add created_by and updated_by audit fields to inventory_batches table
-- This aligns the database schema with the Drizzle schema definition

ALTER TABLE inventory_batches ADD COLUMN created_by TEXT;
ALTER TABLE inventory_batches ADD COLUMN updated_by TEXT;
