-- =====================================================
-- Phase 11a: Event-Driven Integration
-- Domain Events & Event Processing Tables
-- Version: 1.0
-- Date: 2026-01-28
-- =====================================================

-- Domain Events table (Outbox pattern)
-- Stores events to be published reliably
CREATE TABLE IF NOT EXISTS domain_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  payload TEXT NOT NULL, -- JSON
  occurred_at TEXT NOT NULL,
  published_at TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'failed')),
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_domain_events_status ON domain_events(status);
CREATE INDEX IF NOT EXISTS idx_domain_events_type ON domain_events(event_type);
CREATE INDEX IF NOT EXISTS idx_domain_events_aggregate ON domain_events(aggregate_type, aggregate_id);
CREATE INDEX IF NOT EXISTS idx_domain_events_occurred ON domain_events(occurred_at);

-- Processed Events table (Idempotency tracking)
-- Tracks events that have been processed to prevent duplicates
CREATE TABLE IF NOT EXISTS processed_events (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('success', 'failed', 'skipped')),
  error_message TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_processed_events_event_id ON processed_events(event_id);
CREATE INDEX IF NOT EXISTS idx_processed_events_type ON processed_events(event_type);
CREATE INDEX IF NOT EXISTS idx_processed_events_result ON processed_events(result);
