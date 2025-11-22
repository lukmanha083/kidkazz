-- Migration: Add soft delete fields to journal_entries
-- Date: 2025-11-22
-- Phase 1: Soft Delete Implementation

-- Add soft delete fields to journal_entries
ALTER TABLE journal_entries ADD COLUMN deleted_at INTEGER;
ALTER TABLE journal_entries ADD COLUMN deleted_by TEXT;
ALTER TABLE journal_entries ADD COLUMN delete_reason TEXT;

-- Create index for better query performance on active journal entries
CREATE INDEX idx_journal_entries_deleted_at ON journal_entries(deleted_at) WHERE deleted_at IS NULL;

-- Create index for better query performance on voided entries
CREATE INDEX idx_journal_entries_voided_at ON journal_entries(voided_at);
