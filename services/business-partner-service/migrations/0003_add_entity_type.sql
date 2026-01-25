-- Migration: Add entity_type column to customers and suppliers tables
-- This column distinguishes between person and company entities

-- Add entity_type to customers table
ALTER TABLE customers ADD COLUMN entity_type TEXT NOT NULL DEFAULT 'person';

-- Add entity_type to suppliers table
ALTER TABLE suppliers ADD COLUMN entity_type TEXT NOT NULL DEFAULT 'person';

-- Create indexes for entity_type filtering
CREATE INDEX IF NOT EXISTS idx_customers_entity_type ON customers(entity_type);
CREATE INDEX IF NOT EXISTS idx_suppliers_entity_type ON suppliers(entity_type);

-- Create supplier_contacts table for sales persons (company suppliers)
CREATE TABLE IF NOT EXISTS supplier_contacts (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  position TEXT,
  is_primary INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Create indexes for supplier_contacts
CREATE INDEX IF NOT EXISTS idx_supplier_contacts_supplier ON supplier_contacts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_contacts_status ON supplier_contacts(status);
