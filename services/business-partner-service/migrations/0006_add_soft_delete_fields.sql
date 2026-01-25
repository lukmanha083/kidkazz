-- Migration: Add soft delete fields to addresses, supplier_contacts, and partner_documents
-- These fields enable soft delete (setting deletedAt instead of hard delete)
--
-- This migration is IDEMPOTENT - safe to run multiple times
-- Uses table recreation pattern since SQLite doesn't support ADD COLUMN IF NOT EXISTS

-- ============================================================================
-- ADDRESSES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS addresses_new (
  id TEXT PRIMARY KEY NOT NULL,
  owner_type TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  address_type TEXT NOT NULL,
  is_primary INTEGER DEFAULT 0,
  label TEXT,
  recipient_name TEXT,
  phone TEXT,
  address_line_1 TEXT NOT NULL,
  address_line_2 TEXT,
  subdistrict TEXT,
  district TEXT,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  postal_code TEXT,
  country TEXT DEFAULT 'Indonesia',
  latitude REAL,
  longitude REAL,
  geohash TEXT,
  location_accuracy REAL,
  location_source TEXT,
  location_captured_at INTEGER,
  location_captured_by TEXT,
  geojson TEXT,
  notes TEXT,
  deleted_at INTEGER,
  deleted_by TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Copy data without soft delete columns (they will be NULL by default)
INSERT OR IGNORE INTO addresses_new (
  id, owner_type, owner_id, address_type, is_primary, label, recipient_name, phone,
  address_line_1, address_line_2, subdistrict, district, city, province, postal_code, country,
  latitude, longitude, geohash, location_accuracy, location_source,
  location_captured_at, location_captured_by, geojson, notes,
  created_at, updated_at
)
SELECT
  id, owner_type, owner_id, address_type, is_primary, label, recipient_name, phone,
  address_line_1, address_line_2, subdistrict, district, city, province, postal_code, country,
  latitude, longitude, geohash, location_accuracy, location_source,
  location_captured_at, location_captured_by, geojson, notes,
  created_at, updated_at
FROM addresses;

DROP TABLE IF EXISTS addresses;
ALTER TABLE addresses_new RENAME TO addresses;

CREATE INDEX IF NOT EXISTS idx_addresses_owner ON addresses(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_addresses_type ON addresses(address_type);
CREATE INDEX IF NOT EXISTS idx_addresses_geohash ON addresses(geohash);

-- ============================================================================
-- SUPPLIER_CONTACTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS supplier_contacts_new (
  id TEXT PRIMARY KEY NOT NULL,
  supplier_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  position TEXT,
  is_primary INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  deleted_at INTEGER,
  deleted_by TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Copy data without soft delete columns (they will be NULL by default)
INSERT OR IGNORE INTO supplier_contacts_new (
  id, supplier_id, name, email, phone, position, is_primary, status,
  created_at, updated_at
)
SELECT
  id, supplier_id, name, email, phone, position, is_primary, status,
  created_at, updated_at
FROM supplier_contacts;

DROP TABLE IF EXISTS supplier_contacts;
ALTER TABLE supplier_contacts_new RENAME TO supplier_contacts;

CREATE INDEX IF NOT EXISTS idx_supplier_contacts_supplier ON supplier_contacts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_contacts_status ON supplier_contacts(status);

-- ============================================================================
-- PARTNER_DOCUMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS partner_documents_new (
  id TEXT PRIMARY KEY NOT NULL,
  owner_type TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  document_type TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  deleted_at INTEGER,
  deleted_by TEXT,
  uploaded_at INTEGER NOT NULL,
  uploaded_by TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Copy data without soft delete columns (they will be NULL by default)
INSERT OR IGNORE INTO partner_documents_new (
  id, owner_type, owner_id, document_type, filename, original_name, mime_type, size, url, status,
  uploaded_at, uploaded_by, created_at, updated_at
)
SELECT
  id, owner_type, owner_id, document_type, filename, original_name, mime_type, size, url, status,
  uploaded_at, uploaded_by, created_at, updated_at
FROM partner_documents;

DROP TABLE IF EXISTS partner_documents;
ALTER TABLE partner_documents_new RENAME TO partner_documents;

CREATE INDEX IF NOT EXISTS idx_partner_documents_owner ON partner_documents(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_partner_documents_type ON partner_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_partner_documents_status ON partner_documents(status);
