/**
 * Database connection and test utilities
 *
 * This file provides database access for both production and test environments.
 * In production, it uses Cloudflare D1.
 * In tests, it uses better-sqlite3 for in-memory testing.
 */

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

// Create in-memory SQLite database for testing
const sqlite = new Database(':memory:');

// Initialize schema for testing
sqlite.exec(`
  -- Warehouses table
  CREATE TABLE IF NOT EXISTS warehouses (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT NOT NULL,
    province TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    country TEXT DEFAULT 'Indonesia' NOT NULL,
    contact_name TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    status TEXT DEFAULT 'active' NOT NULL,
    deleted_at INTEGER,
    deleted_by TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  -- Inventory table (Phase 1 enhanced)
  CREATE TABLE IF NOT EXISTS inventory (
    id TEXT PRIMARY KEY,
    warehouse_id TEXT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    variant_id TEXT,
    uom_id TEXT,
    quantity_available INTEGER DEFAULT 0 NOT NULL,
    quantity_reserved INTEGER DEFAULT 0 NOT NULL,
    quantity_in_transit INTEGER DEFAULT 0,
    minimum_stock INTEGER DEFAULT 0,
    rack TEXT,
    bin TEXT,
    zone TEXT,
    aisle TEXT,
    version INTEGER DEFAULT 1,
    last_modified_at TEXT,
    last_restocked_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  -- Inventory reservations table
  CREATE TABLE IF NOT EXISTS inventory_reservations (
    id TEXT PRIMARY KEY,
    inventory_id TEXT NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
    order_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity_reserved INTEGER NOT NULL,
    status TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    confirmed_at INTEGER,
    released_at INTEGER,
    created_at INTEGER NOT NULL
  );

  -- Inventory movements table
  CREATE TABLE IF NOT EXISTS inventory_movements (
    id TEXT PRIMARY KEY,
    inventory_id TEXT NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    warehouse_id TEXT NOT NULL,
    movement_type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    source TEXT DEFAULT 'warehouse',
    reference_type TEXT,
    reference_id TEXT,
    reason TEXT,
    notes TEXT,
    performed_by TEXT,
    deleted_at INTEGER,
    deleted_by TEXT,
    created_at INTEGER NOT NULL
  );

  -- Inventory batches table (Phase 3)
  CREATE TABLE IF NOT EXISTS inventory_batches (
    id TEXT PRIMARY KEY,
    inventory_id TEXT NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    warehouse_id TEXT NOT NULL,
    batch_number TEXT NOT NULL,
    lot_number TEXT,
    expiration_date TEXT,
    alert_date TEXT,
    manufacture_date TEXT,
    quantity_available INTEGER DEFAULT 0 NOT NULL,
    quantity_reserved INTEGER DEFAULT 0 NOT NULL,
    received_date TEXT,
    supplier TEXT,
    purchase_order_id TEXT,
    cost INTEGER,
    status TEXT DEFAULT 'active' NOT NULL,
    quarantine_reason TEXT,
    recall_reason TEXT,
    version INTEGER DEFAULT 1,
    last_modified_at TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    created_by TEXT,
    updated_by TEXT
  );

  -- Create indexes for performance
  CREATE INDEX IF NOT EXISTS idx_inventory_variant ON inventory(variant_id);
  CREATE INDEX IF NOT EXISTS idx_inventory_uom ON inventory(uom_id);
  CREATE INDEX IF NOT EXISTS idx_inventory_version ON inventory(product_id, warehouse_id, version);
  CREATE INDEX IF NOT EXISTS idx_inventory_location ON inventory(warehouse_id, zone, aisle, rack, bin);
  CREATE INDEX IF NOT EXISTS idx_inventory_batches_version ON inventory_batches(inventory_id, version);
  CREATE INDEX IF NOT EXISTS idx_inventory_batches_expiration ON inventory_batches(expiration_date);
  CREATE INDEX IF NOT EXISTS idx_inventory_warehouse ON inventory(warehouse_id);
  CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
`);

// Export the drizzle instance for testing
export const db = drizzle(sqlite, { schema });

// Export schema for convenience
export * from './schema';

// Utility function to reset database between tests
export function resetDatabase(): void {
  sqlite.exec(`
    DELETE FROM inventory_batches;
    DELETE FROM inventory_movements;
    DELETE FROM inventory_reservations;
    DELETE FROM inventory;
    DELETE FROM warehouses;
  `);
}

// Utility function to generate unique IDs
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
