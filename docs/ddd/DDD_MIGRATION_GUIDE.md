# DDD Phase 1 & 2 Migration Guide

This guide explains how to run the database schema migration (Phase 1) and data migration (Phase 2) for the DDD refactoring.

## Current Status

**Phase 1 (Schema Migration):** ✅ Complete
- Inventory Service database schema updated successfully
- All required columns and indexes added to `inventory` and `inventory_batches` tables

**Phase 2 (Data Migration):** 🔄 In Progress
- ✅ Seed script now populates both service and migration worker databases
- ✅ Migration worker can access populated test data (16 location records detected)
- ⚠️ **Known Issue:** Migration script expects camelCase property names but D1 returns snake_case columns
  - Impact: All location migrations fail with "Type 'undefined' not supported" errors
  - Next Step: Update migration queries to handle snake_case column names from database

## Prerequisites

- Node.js 18+
- pnpm installed
- Wrangler CLI (`npm install -g wrangler`)
- Access to Cloudflare D1 database

## Phase 1: Database Schema Migration

### Step 1: Navigate to Inventory Service

```bash
cd services/inventory-service
```

### Step 2: View Pending Migrations

```bash
# List all migrations and their status
npx wrangler d1 migrations list inventory-db --local
```

### Step 3: Apply Migration Locally (Development)

```bash
# Apply all pending migrations to local D1 database
npx wrangler d1 migrations apply inventory-db --local
```

Expected output:
```
Migrations to be applied:
┌─────────────────────────────────┐
│ Name                            │
├─────────────────────────────────┤
│ 0005_ddd_enhancement.sql        │
└─────────────────────────────────┘

✅ Migration 0005_ddd_enhancement.sql applied successfully
```

### Step 4: Apply Migration to Production

```bash
# Apply to remote Cloudflare D1 database
npx wrangler d1 migrations apply inventory-db
```

### Step 5: Verify Migration Success

```bash
# Check inventory table structure
npx wrangler d1 execute inventory-db --local --command "PRAGMA table_info(inventory);"

# Check inventory_batches table structure
npx wrangler d1 execute inventory-db --local --command "PRAGMA table_info(inventory_batches);"

# Verify indexes were created
npx wrangler d1 execute inventory-db --local --command "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='inventory';"
```

Expected new columns in `inventory` table:
- `variant_id` (TEXT)
- `uom_id` (TEXT)
- `rack` (TEXT)
- `bin` (TEXT)
- `zone` (TEXT)
- `aisle` (TEXT)
- `version` (INTEGER, default 1)
- `last_modified_at` (TEXT)

Expected new columns in `inventory_batches` table:
- `version` (INTEGER, default 1)
- `last_modified_at` (TEXT)

---

## Phase 2: Data Migration

### Overview

The data migration moves stock/location data from Product Service to Inventory Service:

| Source (Product Service) | Target (Inventory Service) |
|-------------------------|---------------------------|
| `product_locations` | `inventory` (with location fields) |
| `variant_locations` | `inventory` (with `variant_id`) |
| `product_uom_locations` | `inventory` (with `uom_id`) |
| `products.expiration_date` | `inventory_batches` |

### Step 0: Seed Test Data (Optional, for Testing)

If you're working with fresh databases and want to test the migration with sample data, run the seed script:

```bash
# From project root
bash scripts/seed-databases.sh
```

This will create:
- 2 warehouses (WH-CENTRAL, WH-NORTH) in Inventory DB
- 1 category, 3 products (with 2 having expiration dates) in Product DB
- 2 product variants
- 3 product UOMs
- 6 product locations (3 products × 2 warehouses)
- 4 variant locations (2 variants × 2 warehouses)
- 6 UOM locations (3 UOMs × 2 warehouses)

Expected output:
```
=== Test Data Seeding Complete ===

Summary:
- 2 warehouses
- 1 category
- 3 products (2 with expiration dates)
- 2 product variants
- 3 product UOMs
- 6 product locations
- 4 variant locations
- 6 UOM locations
```

> **Note**: This script directly inserts data via SQL commands using `wrangler d1 execute`, avoiding the complexity of worker-based seeding with multiple database locations.

### Step 1: Start Migration Server

```bash
# From project root
cd scripts

# Start the migration worker locally
npx wrangler dev run-ddd-migration.ts --local --config wrangler-migration.toml
```

> **Note**: You need to update `wrangler-migration.toml` with your actual database IDs first.

### Step 2: Run Dry Run (Preview Only)

```bash
# Preview what will be migrated (no changes made)
curl "http://localhost:8787/migrate?dryRun=true&verbose=true"
```

Example response:
```json
{
  "success": true,
  "dryRun": true,
  "result": {
    "productLocations": { "migrated": 15, "errors": 0, "skipped": 0 },
    "variantLocations": { "migrated": 8, "errors": 0, "skipped": 0 },
    "uomLocations": { "migrated": 12, "errors": 0, "skipped": 0 },
    "expirationDates": { "migrated": 5, "errors": 0, "skipped": 2 },
    "totalDuration": 234
  }
}
```

### Step 3: Run Actual Migration

```bash
# Execute the actual migration
curl "http://localhost:8787/migrate?dryRun=false"
```

### Step 4: Validate Migration

```bash
# Verify migration results
curl "http://localhost:8787/validate"
```

Example validation response:
```json
{
  "success": true,
  "validation": {
    "productLocationsCount": 15,
    "inventoryProductsCount": 15,
    "variantLocationsCount": 8,
    "inventoryVariantsCount": 8,
    "uomLocationsCount": 12,
    "inventoryUOMsCount": 12,
    "productsWithExpiration": 7,
    "batchesCreated": 5,
    "isValid": true
  }
}
```

### Alternative: Direct SQL Migration

If you prefer to run migrations via SQL directly:

```bash
# From inventory-service directory
cd services/inventory-service

# Execute migration script via D1
npx wrangler d1 execute inventory-db --local --file=./migrations/0005_ddd_enhancement.sql
```

---

## Running Unit Tests

### Step 1: Install Dependencies

```bash
# From project root
pnpm install

# Or specifically for inventory-service
cd services/inventory-service
pnpm install
```

### Step 2: Run All Tests

```bash
cd services/inventory-service

# Run all tests
pnpm test

# Run with watch mode (re-runs on file changes)
pnpm test:watch

# Run with coverage report
pnpm test:coverage
```

### Step 3: Run Specific Tests

```bash
# Run only Phase 1 schema tests
pnpm test src/infrastructure/db/schema.test.ts

# Run only Phase 2 migration tests (from project root)
cd ../..
npx vitest scripts/migrate-to-inventory-service.test.ts
```

### Step 4: View Test Coverage

```bash
cd services/inventory-service
pnpm test:coverage
```

Coverage report will be generated in `coverage/` directory.

---

## Troubleshooting

### Migration Errors

| Error | Solution |
|-------|----------|
| `no such table: inventory` | Run previous migrations first |
| `duplicate column name` | Migration already applied |
| `database is locked` | Close other connections to D1 |
| `FOREIGN KEY constraint failed` | Ensure warehouse records exist |

### Test Errors

| Error | Solution |
|-------|----------|
| `Cannot find module 'vitest'` | Run `pnpm install` |
| `Test timeout` | Increase timeout in vitest.config.ts |
| `Database connection failed` | Check D1 binding in wrangler.jsonc |

### Rollback Migration

If you need to rollback the migration:

```bash
# Remove added columns (manual SQL)
npx wrangler d1 execute inventory-db --local --command "
  -- Note: SQLite doesn't support DROP COLUMN directly
  -- You need to recreate the table without the columns
  -- This is for emergency rollback only
"
```

> **Warning**: Rollback should only be done in development. In production, create a new migration to handle changes.

---

## Quick Reference Commands

```bash
# === SCHEMA MIGRATION (Phase 1) ===
cd services/inventory-service

# List pending migrations
npx wrangler d1 migrations list inventory-db --local

# Apply migrations locally
npx wrangler d1 migrations apply inventory-db --local

# Apply migrations to production
npx wrangler d1 migrations apply inventory-db

# Check table structure
npx wrangler d1 execute inventory-db --local --command "PRAGMA table_info(inventory);"

# === SEED TEST DATA (Optional) ===
# Run seed script to populate test data
bash scripts/seed-databases.sh

# === DATA MIGRATION (Phase 2) ===
cd scripts

# Start migration server
npx wrangler dev run-ddd-migration.ts --config wrangler-migration.toml --local

# Dry run
curl "http://localhost:8787/migrate?dryRun=true&verbose=true"

# Actual migration
curl "http://localhost:8787/migrate?dryRun=false"

# Validate
curl "http://localhost:8787/validate"

# === UNIT TESTS ===
cd services/inventory-service

# Run all tests
pnpm test

# Run with watch
pnpm test:watch

# Run with coverage
pnpm test:coverage
```

---

## Related Documentation

- [DDD Refactoring Roadmap](./DDD_REFACTORING_ROADMAP.md)
- [DDD Hexagonal Boundary Review](./DDD_HEXAGONAL_BOUNDARY_REVIEW.md)
- [Frontend Refactoring Roadmap](./FRONTEND_REFACTORING_ROADMAP.md)
