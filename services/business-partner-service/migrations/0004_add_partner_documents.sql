-- Migration: Add partner_documents table for storing employee/customer/supplier documents
-- Documents are stored in R2, this table stores metadata and references

CREATE TABLE IF NOT EXISTS partner_documents (
  id TEXT PRIMARY KEY,

  -- Owner (polymorphic - employee, customer, supplier)
  owner_type TEXT NOT NULL, -- 'employee' | 'customer' | 'supplier'
  owner_id TEXT NOT NULL,

  -- Document Type
  document_type TEXT NOT NULL, -- 'ktp' | 'npwp' | 'contract' | 'other'

  -- File Info
  filename TEXT NOT NULL, -- R2 key
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL, -- bytes

  -- R2 URL
  url TEXT NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'archived' | 'deleted'

  -- Audit
  uploaded_at INTEGER NOT NULL,
  uploaded_by TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_partner_documents_owner ON partner_documents(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_partner_documents_type ON partner_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_partner_documents_status ON partner_documents(status);
