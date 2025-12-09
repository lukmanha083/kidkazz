# Migration Scripts

This directory contains scripts for DDD Phase 2 data migration and test data seeding.

## Available Scripts

### 1. `seed-databases.sh` - Seed Test Data

Seeds test data directly into Product and Inventory databases using SQL commands.

**Usage:**
```bash
# From project root
bash scripts/seed-databases.sh
```

**What it creates:**
- 2 warehouses in Inventory DB
- 1 category, 3 products (2 with expiration dates) in Product DB
- 2 product variants
- 3 product UOMs
- 6 product locations (3 products × 2 warehouses)
- 4 variant locations (2 variants × 2 warehouses)
- 6 UOM locations (3 UOMs × 2 warehouses)

**How it works:**
- Uses `npx wrangler d1 execute` to run SQL INSERT statements directly
- Accesses databases via their respective service configurations
- No worker setup needed - runs entirely via CLI commands

### 2. `run-ddd-migration.ts` + `migrate-to-inventory-service.ts` - Data Migration

Migrates data from Product Service to Inventory Service.

**Config:** `wrangler-migration.toml`

**Usage:**
```bash
# Start the migration worker
cd scripts
npx wrangler dev run-ddd-migration.ts --config wrangler-migration.toml --local

# In another terminal:

# Dry run (preview only, no changes)
curl "http://localhost:8787/migrate?dryRun=true&verbose=true"

# Actual migration
curl "http://localhost:8787/migrate?dryRun=false"

# Validate migration
curl "http://localhost:8787/validate"
```

**What it migrates:**
- `product_locations` → `inventory` (with location fields)
- `variant_locations` → `inventory` (with `variant_id`)
- `product_uom_locations` → `inventory` (with `uom_id`)
- `products.expiration_date` → `inventory_batches`

## Complete Workflow

### Testing Migration with Fresh Databases

1. **Apply schema migrations:**
   ```bash
   cd services/product-service
   npx wrangler d1 migrations apply product-db --local

   cd ../inventory-service
   npx wrangler d1 migrations apply inventory-db --local
   ```

2. **Seed test data:**
   ```bash
   # From project root
   bash scripts/seed-databases.sh
   ```

3. **Run migration (dry run first):**
   ```bash
   cd scripts
   npx wrangler dev run-ddd-migration.ts --config wrangler-migration.toml --local
   ```

   In another terminal:
   ```bash
   # Dry run
   curl "http://localhost:8787/migrate?dryRun=true&verbose=true"

   # If dry run looks good, run actual migration
   curl "http://localhost:8787/migrate?dryRun=false"

   # Validate
   curl "http://localhost:8787/validate"
   ```

4. **Verify results:**
   ```bash
   # Check inventory records
   cd services/inventory-service
   npx wrangler d1 execute inventory-db --local --command "SELECT COUNT(*) as count FROM inventory;"

   # Check inventory batches
   npx wrangler d1 execute inventory-db --local --command "SELECT COUNT(*) as count FROM inventory_batches;"
   ```

## Configuration Files

### `wrangler-migration.toml`
Configuration for the migration worker. Contains D1 database bindings for:
- `PRODUCT_DB` - Product Service database
- `INVENTORY_DB` - Inventory Service database

## Database IDs

Current database IDs (update these if needed):
- Product DB: `43857977-dffc-4978-bbc9-b64d0f60bc69`
- Inventory DB: `904fdb02-3a8f-4bb6-9117-5008f6deb3ae`

## Troubleshooting

### Migration Errors: No Data to Migrate

If the migration shows 0 migrated with errors:
```json
{
  "productLocations": { "migrated": 0, "errors": 1 },
  "variantLocations": { "migrated": 0, "errors": 1 }
}
```

**Solution:** Run the seed script first to populate test data:
```bash
bash scripts/seed-databases.sh
```

### Database Connection Errors

Ensure migrations are applied first:
```bash
cd services/product-service
npx wrangler d1 migrations apply product-db --local

cd ../inventory-service
npx wrangler d1 migrations apply inventory-db --local
```

### Table Does Not Exist Errors

This usually means:
1. Migrations haven't been applied to the local database
2. You're running from the wrong directory

Make sure to run migrations from the respective service directories.

## Related Documentation

- [DDD Migration Guide](../docs/DDD_MIGRATION_GUIDE.md)
- [DDD Refactoring Roadmap](../docs/DDD_REFACTORING_ROADMAP.md)
