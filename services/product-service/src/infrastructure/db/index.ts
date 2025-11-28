import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

// Create an in-memory SQLite database for testing
// In production, this would be replaced with actual D1 database connection
const sqlite = new Database(':memory:');
export const db = drizzle(sqlite, { schema });

// Initialize tables for testing
// This creates all tables defined in the schema
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    barcode TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    sku TEXT NOT NULL UNIQUE,
    description TEXT,
    image TEXT,
    category_id TEXT,
    price REAL NOT NULL,
    retail_price REAL,
    wholesale_price REAL,
    stock INTEGER NOT NULL DEFAULT 0,
    minimum_stock INTEGER,
    base_unit TEXT NOT NULL DEFAULT 'PCS',
    wholesale_threshold INTEGER DEFAULT 100,
    minimum_order_quantity INTEGER DEFAULT 1,
    weight REAL,
    length REAL,
    width REAL,
    height REAL,
    rating REAL DEFAULT 0,
    reviews INTEGER DEFAULT 0,
    available_for_retail INTEGER DEFAULT 1,
    available_for_wholesale INTEGER DEFAULT 1,
    status TEXT DEFAULT 'omnichannel sales',
    is_bundle INTEGER DEFAULT 0,
    expiration_date TEXT,
    alert_date TEXT,
    revenue_account_id TEXT,
    revenue_account_code TEXT,
    cogs_account_id TEXT,
    cogs_account_code TEXT,
    inventory_account_id TEXT,
    inventory_account_code TEXT,
    deferred_cogs_account_id TEXT,
    cost_price REAL,
    costing_method TEXT DEFAULT 'Average',
    taxable INTEGER DEFAULT 1,
    tax_category_id TEXT,
    gl_segment1 TEXT,
    gl_segment2 TEXT,
    gl_segment3 TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    created_by TEXT,
    updated_by TEXT
  );

  CREATE TABLE IF NOT EXISTS product_uoms (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    uom_code TEXT NOT NULL,
    uom_name TEXT NOT NULL,
    barcode TEXT NOT NULL UNIQUE,
    conversion_factor REAL NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS product_variants (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    product_sku TEXT NOT NULL,
    variant_name TEXT NOT NULL,
    variant_sku TEXT NOT NULL UNIQUE,
    variant_type TEXT,
    price REAL NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS product_images (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    is_primary INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    thumbnail_url TEXT,
    medium_url TEXT,
    large_url TEXT,
    original_url TEXT,
    uploaded_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS product_bundles (
    id TEXT PRIMARY KEY,
    bundle_name TEXT NOT NULL,
    bundle_sku TEXT NOT NULL UNIQUE,
    bundle_price REAL NOT NULL,
    discount_percentage REAL,
    status TEXT NOT NULL DEFAULT 'active',
    available_stock INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bundle_items (
    id TEXT PRIMARY KEY,
    bundle_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_sku TEXT NOT NULL,
    product_name TEXT NOT NULL,
    barcode TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (bundle_id) REFERENCES product_bundles(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS custom_pricing (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    custom_price REAL NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
`);
