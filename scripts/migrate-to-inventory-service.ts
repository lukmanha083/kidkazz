/**
 * DDD Phase 2: Data Migration Script
 * Migrates stock/location data from Product Service to Inventory Service
 *
 * Reference: docs/DDD_REFACTORING_ROADMAP.md - Phase 2
 *
 * This script:
 * 1. Migrates productLocations → inventory (with physical location fields)
 * 2. Migrates variantLocations → inventory (with variantId)
 * 3. Migrates productUOMLocations → inventory (with uomId)
 * 4. Migrates products.expirationDate → inventoryBatches
 */

// Type definitions for migration
export interface MigrationResult {
  productLocations: { migrated: number; errors: number; skipped: number };
  variantLocations: { migrated: number; errors: number; skipped: number };
  uomLocations: { migrated: number; errors: number; skipped: number };
  expirationDates: { migrated: number; errors: number; skipped: number };
  totalDuration: number;
}

export interface ProductLocation {
  id: string;
  productId: string;
  warehouseId: string;
  rack: string | null;
  bin: string | null;
  zone: string | null;
  aisle: string | null;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface VariantLocation {
  id: string;
  variantId: string;
  warehouseId: string;
  rack: string | null;
  bin: string | null;
  zone: string | null;
  aisle: string | null;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductUOMLocation {
  id: string;
  productUOMId: string;
  warehouseId: string;
  rack: string | null;
  bin: string | null;
  zone: string | null;
  aisle: string | null;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductVariant {
  id: string;
  productId: string;
  variantName: string;
  variantSKU: string;
}

export interface ProductUOM {
  id: string;
  productId: string;
  uomCode: string;
  uomName: string;
  conversionFactor: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  expirationDate: string | null;
  alertDate: string | null;
}

export interface Inventory {
  id: string;
  warehouseId: string;
  productId: string;
  variantId: string | null;
  uomId: string | null;
  quantityAvailable: number;
  quantityReserved: number;
  quantityInTransit: number;
  minimumStock: number;
  rack: string | null;
  bin: string | null;
  zone: string | null;
  aisle: string | null;
  version: number;
  lastModifiedAt: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Generates a unique ID for new records
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Main migration function
 * Orchestrates the full migration from Product Service to Inventory Service
 */
export async function runFullMigration(
  productDB: D1Database,
  inventoryDB: D1Database,
  options: { dryRun?: boolean; verbose?: boolean } = {}
): Promise<MigrationResult> {
  const { dryRun = false, verbose = false } = options;
  const startTime = Date.now();

  const result: MigrationResult = {
    productLocations: { migrated: 0, errors: 0, skipped: 0 },
    variantLocations: { migrated: 0, errors: 0, skipped: 0 },
    uomLocations: { migrated: 0, errors: 0, skipped: 0 },
    expirationDates: { migrated: 0, errors: 0, skipped: 0 },
    totalDuration: 0,
  };

  console.log('=== Starting DDD Phase 2 Migration ===');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log('');

  // Step 1: Migrate productLocations
  console.log('Step 1/4: Migrating product locations...');
  const productLocationsResult = await migrateProductLocations(
    productDB,
    inventoryDB,
    { dryRun, verbose }
  );
  result.productLocations = productLocationsResult;
  console.log(`  ✅ Product locations: ${productLocationsResult.migrated} migrated, ${productLocationsResult.skipped} skipped, ${productLocationsResult.errors} errors`);

  // Step 2: Migrate variantLocations
  console.log('Step 2/4: Migrating variant locations...');
  const variantLocationsResult = await migrateVariantLocations(
    productDB,
    inventoryDB,
    { dryRun, verbose }
  );
  result.variantLocations = variantLocationsResult;
  console.log(`  ✅ Variant locations: ${variantLocationsResult.migrated} migrated, ${variantLocationsResult.skipped} skipped, ${variantLocationsResult.errors} errors`);

  // Step 3: Migrate productUOMLocations
  console.log('Step 3/4: Migrating UOM locations...');
  const uomLocationsResult = await migrateUOMLocations(
    productDB,
    inventoryDB,
    { dryRun, verbose }
  );
  result.uomLocations = uomLocationsResult;
  console.log(`  ✅ UOM locations: ${uomLocationsResult.migrated} migrated, ${uomLocationsResult.skipped} skipped, ${uomLocationsResult.errors} errors`);

  // Step 4: Migrate expirationDate to batches
  console.log('Step 4/4: Migrating expiration dates to batches...');
  const expirationResult = await migrateExpirationDates(
    productDB,
    inventoryDB,
    { dryRun, verbose }
  );
  result.expirationDates = expirationResult;
  console.log(`  ✅ Expiration dates: ${expirationResult.migrated} batches created, ${expirationResult.skipped} skipped, ${expirationResult.errors} errors`);

  result.totalDuration = Date.now() - startTime;

  console.log('');
  console.log('=== Migration Complete ===');
  console.log(`Total duration: ${result.totalDuration}ms`);
  console.log(JSON.stringify(result, null, 2));

  return result;
}

/**
 * Step 1: Migrate productLocations → inventory
 */
export async function migrateProductLocations(
  productDB: D1Database,
  inventoryDB: D1Database,
  options: { dryRun?: boolean; verbose?: boolean } = {}
): Promise<{ migrated: number; errors: number; skipped: number }> {
  const { dryRun = false, verbose = false } = options;
  const result = { migrated: 0, errors: 0, skipped: 0 };

  try {
    // Fetch all product locations
    const { results: productLocations } = await productDB.prepare(
      `SELECT
        id,
        product_id as productId,
        warehouse_id as warehouseId,
        rack,
        bin,
        zone,
        aisle,
        quantity,
        created_at as createdAt,
        updated_at as updatedAt
      FROM product_locations`
    ).all<ProductLocation>();

    if (!productLocations || productLocations.length === 0) {
      if (verbose) console.log('  No product locations to migrate');
      return result;
    }

    for (const loc of productLocations) {
      try {
        // Check if inventory record already exists
        const { results: existing } = await inventoryDB.prepare(
          `SELECT id, version FROM inventory
           WHERE product_id = ? AND warehouse_id = ?
           AND variant_id IS NULL AND uom_id IS NULL`
        ).bind(loc.productId, loc.warehouseId).all<Inventory>();

        if (existing && existing.length > 0) {
          // Update existing with location info and quantity
          if (!dryRun) {
            await inventoryDB.prepare(
              `UPDATE inventory SET
                quantity_available = ?,
                rack = ?,
                bin = ?,
                zone = ?,
                aisle = ?,
                version = version + 1,
                last_modified_at = ?,
                updated_at = ?
               WHERE id = ?`
            ).bind(
              loc.quantity,
              loc.rack,
              loc.bin,
              loc.zone,
              loc.aisle,
              new Date().toISOString(),
              Date.now(),
              existing[0].id
            ).run();
          }
          if (verbose) console.log(`  Updated inventory for product ${loc.productId}`);
          result.migrated++;
        } else {
          // Create new inventory record
          const newId = generateId();
          if (!dryRun) {
            await inventoryDB.prepare(
              `INSERT INTO inventory (
                id, product_id, warehouse_id, variant_id, uom_id,
                quantity_available, quantity_reserved, quantity_in_transit,
                minimum_stock, rack, bin, zone, aisle,
                version, last_modified_at, created_at, updated_at
              ) VALUES (?, ?, ?, NULL, NULL, ?, 0, 0, 0, ?, ?, ?, ?, 1, ?, ?, ?)`
            ).bind(
              newId,
              loc.productId,
              loc.warehouseId,
              loc.quantity,
              loc.rack,
              loc.bin,
              loc.zone,
              loc.aisle,
              new Date().toISOString(),
              Date.now(),
              Date.now()
            ).run();
          }
          if (verbose) console.log(`  Created inventory for product ${loc.productId}`);
          result.migrated++;
        }
      } catch (error) {
        console.error(`  Error migrating product location ${loc.id}:`, error);
        result.errors++;
      }
    }
  } catch (error) {
    console.error('Error in migrateProductLocations:', error);
    result.errors++;
  }

  return result;
}

/**
 * Step 2: Migrate variantLocations → inventory
 */
export async function migrateVariantLocations(
  productDB: D1Database,
  inventoryDB: D1Database,
  options: { dryRun?: boolean; verbose?: boolean } = {}
): Promise<{ migrated: number; errors: number; skipped: number }> {
  const { dryRun = false, verbose = false } = options;
  const result = { migrated: 0, errors: 0, skipped: 0 };

  try {
    // Fetch variant locations with parent product info
    const { results: variantLocations } = await productDB.prepare(
      `SELECT
        vl.id,
        vl.variant_id as variantId,
        vl.warehouse_id as warehouseId,
        vl.rack,
        vl.bin,
        vl.zone,
        vl.aisle,
        vl.quantity,
        vl.created_at as createdAt,
        vl.updated_at as updatedAt,
        pv.product_id as productId
       FROM variant_locations vl
       INNER JOIN product_variants pv ON vl.variant_id = pv.id`
    ).all<VariantLocation & { productId: string }>();

    if (!variantLocations || variantLocations.length === 0) {
      if (verbose) console.log('  No variant locations to migrate');
      return result;
    }

    for (const loc of variantLocations) {
      try {
        // Check if inventory record already exists for this variant
        const { results: existing } = await inventoryDB.prepare(
          `SELECT id FROM inventory
           WHERE product_id = ? AND warehouse_id = ? AND variant_id = ?`
        ).bind(loc.productId, loc.warehouseId, loc.variantId).all<Inventory>();

        if (existing && existing.length > 0) {
          result.skipped++;
          if (verbose) console.log(`  Skipped: Variant ${loc.variantId} already in inventory`);
          continue;
        }

        // Create new inventory record with variantId
        const newId = generateId();
        if (!dryRun) {
          await inventoryDB.prepare(
            `INSERT INTO inventory (
              id, product_id, warehouse_id, variant_id, uom_id,
              quantity_available, quantity_reserved, quantity_in_transit,
              minimum_stock, rack, bin, zone, aisle,
              version, last_modified_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, NULL, ?, 0, 0, 0, ?, ?, ?, ?, 1, ?, ?, ?)`
          ).bind(
            newId,
            loc.productId,
            loc.warehouseId,
            loc.variantId,
            loc.quantity,
            loc.rack,
            loc.bin,
            loc.zone,
            loc.aisle,
            new Date().toISOString(),
            Date.now(),
            Date.now()
          ).run();
        }
        if (verbose) console.log(`  Created inventory for variant ${loc.variantId}`);
        result.migrated++;
      } catch (error) {
        console.error(`  Error migrating variant location ${loc.id}:`, error);
        result.errors++;
      }
    }
  } catch (error) {
    console.error('Error in migrateVariantLocations:', error);
    result.errors++;
  }

  return result;
}

/**
 * Step 3: Migrate productUOMLocations → inventory
 */
export async function migrateUOMLocations(
  productDB: D1Database,
  inventoryDB: D1Database,
  options: { dryRun?: boolean; verbose?: boolean } = {}
): Promise<{ migrated: number; errors: number; skipped: number }> {
  const { dryRun = false, verbose = false } = options;
  const result = { migrated: 0, errors: 0, skipped: 0 };

  try {
    // Fetch UOM locations with parent product info
    const { results: uomLocations } = await productDB.prepare(
      `SELECT
        ul.id,
        ul.product_uom_id as productUOMId,
        ul.warehouse_id as warehouseId,
        ul.rack,
        ul.bin,
        ul.zone,
        ul.aisle,
        ul.quantity,
        ul.created_at as createdAt,
        ul.updated_at as updatedAt,
        pu.product_id as productId,
        pu.uom_code as uomCode
       FROM product_uom_locations ul
       INNER JOIN product_uoms pu ON ul.product_uom_id = pu.id`
    ).all<ProductUOMLocation & { productId: string; uomCode: string }>();

    if (!uomLocations || uomLocations.length === 0) {
      if (verbose) console.log('  No UOM locations to migrate');
      return result;
    }

    for (const loc of uomLocations) {
      try {
        // Check if inventory record already exists for this UOM
        const { results: existing } = await inventoryDB.prepare(
          `SELECT id FROM inventory
           WHERE product_id = ? AND warehouse_id = ? AND uom_id = ?`
        ).bind(loc.productId, loc.warehouseId, loc.productUOMId).all<Inventory>();

        if (existing && existing.length > 0) {
          result.skipped++;
          if (verbose) console.log(`  Skipped: UOM ${loc.productUOMId} already in inventory`);
          continue;
        }

        // Create new inventory record with uomId
        const newId = generateId();
        if (!dryRun) {
          await inventoryDB.prepare(
            `INSERT INTO inventory (
              id, product_id, warehouse_id, variant_id, uom_id,
              quantity_available, quantity_reserved, quantity_in_transit,
              minimum_stock, rack, bin, zone, aisle,
              version, last_modified_at, created_at, updated_at
            ) VALUES (?, ?, ?, NULL, ?, ?, 0, 0, 0, ?, ?, ?, ?, 1, ?, ?, ?)`
          ).bind(
            newId,
            loc.productId,
            loc.warehouseId,
            loc.productUOMId,
            loc.quantity,
            loc.rack,
            loc.bin,
            loc.zone,
            loc.aisle,
            new Date().toISOString(),
            Date.now(),
            Date.now()
          ).run();
        }
        if (verbose) console.log(`  Created inventory for UOM ${loc.productUOMId} (${loc.uomCode})`);
        result.migrated++;
      } catch (error) {
        console.error(`  Error migrating UOM location ${loc.id}:`, error);
        result.errors++;
      }
    }
  } catch (error) {
    console.error('Error in migrateUOMLocations:', error);
    result.errors++;
  }

  return result;
}

/**
 * Step 4: Migrate products.expirationDate → inventoryBatches
 */
export async function migrateExpirationDates(
  productDB: D1Database,
  inventoryDB: D1Database,
  options: { dryRun?: boolean; verbose?: boolean } = {}
): Promise<{ migrated: number; errors: number; skipped: number }> {
  const { dryRun = false, verbose = false } = options;
  const result = { migrated: 0, errors: 0, skipped: 0 };

  try {
    // Fetch products with expiration dates
    const { results: products } = await productDB.prepare(
      `SELECT
        id,
        name,
        sku,
        expiration_date as expirationDate,
        alert_date as alertDate
       FROM products
       WHERE expiration_date IS NOT NULL`
    ).all<{ id: string; name: string; sku: string; expirationDate: string; alertDate: string | null }>();

    if (!products || products.length === 0) {
      if (verbose) console.log('  No products with expiration dates to migrate');
      return result;
    }

    for (const product of products) {
      try {
        // Find inventory records for this product (base product only, not variants/UOMs)
        const { results: inventoryRecords } = await inventoryDB.prepare(
          `SELECT id, warehouse_id, quantity_available
           FROM inventory
           WHERE product_id = ? AND variant_id IS NULL AND uom_id IS NULL`
        ).bind(product.id).all<{ id: string; warehouse_id: string; quantity_available: number }>();

        if (!inventoryRecords || inventoryRecords.length === 0) {
          result.skipped++;
          if (verbose) console.log(`  Skipped: No inventory for product ${product.sku}`);
          continue;
        }

        for (const inv of inventoryRecords) {
          // Check if batch already exists
          const { results: existingBatch } = await inventoryDB.prepare(
            `SELECT id FROM inventory_batches
             WHERE inventory_id = ? AND batch_number LIKE 'MIGRATED-%'`
          ).bind(inv.id).all<{ id: string }>();

          if (existingBatch && existingBatch.length > 0) {
            result.skipped++;
            if (verbose) console.log(`  Skipped: Batch already exists for inventory ${inv.id}`);
            continue;
          }

          // Create batch with migrated expiration data
          const batchId = generateId();
          const batchNumber = `MIGRATED-${product.id.slice(-8)}`;

          if (!dryRun) {
            await inventoryDB.prepare(
              `INSERT INTO inventory_batches (
                id, inventory_id, product_id, warehouse_id,
                batch_number, lot_number, expiration_date, alert_date,
                quantity_available, quantity_reserved, status,
                version, last_modified_at, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, 0, 'active', 1, ?, ?, ?)`
            ).bind(
              batchId,
              inv.id,
              product.id,
              inv.warehouse_id,
              batchNumber,
              product.expirationDate,
              product.alertDate,
              inv.quantity_available,
              new Date().toISOString(),
              Date.now(),
              Date.now()
            ).run();
          }
          if (verbose) console.log(`  Created batch ${batchNumber} for product ${product.sku}`);
          result.migrated++;
        }
      } catch (error) {
        console.error(`  Error migrating expiration for product ${product.id}:`, error);
        result.errors++;
      }
    }
  } catch (error) {
    console.error('Error in migrateExpirationDates:', error);
    result.errors++;
  }

  return result;
}

/**
 * Validation queries to verify migration success
 */
export async function validateMigration(
  productDB: D1Database,
  inventoryDB: D1Database
): Promise<{
  productLocationsCount: number;
  inventoryProductsCount: number;
  variantLocationsCount: number;
  inventoryVariantsCount: number;
  uomLocationsCount: number;
  inventoryUOMsCount: number;
  productsWithExpiration: number;
  batchesCreated: number;
  isValid: boolean;
}> {
  // Count source data
  const { results: plCount } = await productDB.prepare(
    `SELECT COUNT(*) as count FROM product_locations`
  ).all<{ count: number }>();

  const { results: vlCount } = await productDB.prepare(
    `SELECT COUNT(*) as count FROM variant_locations`
  ).all<{ count: number }>();

  const { results: ulCount } = await productDB.prepare(
    `SELECT COUNT(*) as count FROM product_uom_locations`
  ).all<{ count: number }>();

  const { results: pExpCount } = await productDB.prepare(
    `SELECT COUNT(*) as count FROM products WHERE expiration_date IS NOT NULL`
  ).all<{ count: number }>();

  // Count target data
  const { results: invProductCount } = await inventoryDB.prepare(
    `SELECT COUNT(*) as count FROM inventory WHERE variant_id IS NULL AND uom_id IS NULL`
  ).all<{ count: number }>();

  const { results: invVariantCount } = await inventoryDB.prepare(
    `SELECT COUNT(*) as count FROM inventory WHERE variant_id IS NOT NULL`
  ).all<{ count: number }>();

  const { results: invUOMCount } = await inventoryDB.prepare(
    `SELECT COUNT(*) as count FROM inventory WHERE uom_id IS NOT NULL`
  ).all<{ count: number }>();

  const { results: batchCount } = await inventoryDB.prepare(
    `SELECT COUNT(*) as count FROM inventory_batches WHERE batch_number LIKE 'MIGRATED-%'`
  ).all<{ count: number }>();

  const result = {
    productLocationsCount: plCount?.[0]?.count || 0,
    inventoryProductsCount: invProductCount?.[0]?.count || 0,
    variantLocationsCount: vlCount?.[0]?.count || 0,
    inventoryVariantsCount: invVariantCount?.[0]?.count || 0,
    uomLocationsCount: ulCount?.[0]?.count || 0,
    inventoryUOMsCount: invUOMCount?.[0]?.count || 0,
    productsWithExpiration: pExpCount?.[0]?.count || 0,
    batchesCreated: batchCount?.[0]?.count || 0,
    isValid: false,
  };

  // Validate counts
  result.isValid =
    result.inventoryProductsCount >= result.productLocationsCount &&
    result.inventoryVariantsCount >= result.variantLocationsCount &&
    result.inventoryUOMsCount >= result.uomLocationsCount;

  console.log('');
  console.log('=== Migration Validation ===');
  console.log(`Product Locations: ${result.productLocationsCount} → Inventory Products: ${result.inventoryProductsCount}`);
  console.log(`Variant Locations: ${result.variantLocationsCount} → Inventory Variants: ${result.inventoryVariantsCount}`);
  console.log(`UOM Locations: ${result.uomLocationsCount} → Inventory UOMs: ${result.inventoryUOMsCount}`);
  console.log(`Products with Expiration: ${result.productsWithExpiration} → Batches Created: ${result.batchesCreated}`);
  console.log(`Validation: ${result.isValid ? '✅ PASSED' : '❌ FAILED'}`);

  return result;
}

// Export for testing
export default {
  runFullMigration,
  migrateProductLocations,
  migrateVariantLocations,
  migrateUOMLocations,
  migrateExpirationDates,
  validateMigration,
  generateId,
};
