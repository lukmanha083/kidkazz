/**
 * Migration Script: Sync inventory.minimumStock from products.minimumStock
 *
 * Purpose: Fix DDD violation where minimumStock is duplicated across services
 * This script syncs existing inventory records to have the correct minimumStock
 * from the Product Service.
 *
 * Usage: Run this via wrangler or as a one-time admin endpoint
 */

interface ProductResponse {
  id: string;
  name: string;
  sku: string;
  minimumStock: number | null;
}

interface InventoryRecord {
  id: string;
  productId: string;
  warehouseId: string;
  minimumStock: number | null;
  quantityAvailable: number;
}

interface MigrationResult {
  success: boolean;
  totalInventoryRecords: number;
  updatedRecords: number;
  skippedRecords: number;
  errorRecords: number;
  errors: Array<{ inventoryId: string; error: string }>;
  details: Array<{
    inventoryId: string;
    productId: string;
    warehouseId: string;
    oldMinimumStock: number | null;
    newMinimumStock: number | null;
    status: 'updated' | 'skipped' | 'error';
  }>;
}

export async function syncMinimumStock(
  db: D1Database,
  productService: Fetcher
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    totalInventoryRecords: 0,
    updatedRecords: 0,
    skippedRecords: 0,
    errorRecords: 0,
    errors: [],
    details: [],
  };

  try {
    console.log('Starting minimumStock migration...');

    // Get all inventory records
    const inventoryRecords = await db
      .prepare('SELECT * FROM inventory')
      .all<InventoryRecord>();

    result.totalInventoryRecords = inventoryRecords.results?.length || 0;
    console.log(`Found ${result.totalInventoryRecords} inventory records`);

    if (!inventoryRecords.results || inventoryRecords.results.length === 0) {
      console.log('No inventory records to migrate');
      result.success = true;
      return result;
    }

    // Process each inventory record
    for (const inv of inventoryRecords.results) {
      try {
        // Fetch product details from Product Service
        const productResponse = await productService.fetch(
          new Request(`http://product-service/api/products/${inv.productId}`)
        );

        if (!productResponse.ok) {
          console.error(`Failed to fetch product ${inv.productId}: ${productResponse.status}`);
          result.errorRecords++;
          result.errors.push({
            inventoryId: inv.id,
            error: `Product not found or service error: ${productResponse.status}`,
          });
          result.details.push({
            inventoryId: inv.id,
            productId: inv.productId,
            warehouseId: inv.warehouseId,
            oldMinimumStock: inv.minimumStock,
            newMinimumStock: null,
            status: 'error',
          });
          continue;
        }

        const product = (await productResponse.json()) as ProductResponse;

        // Check if minimumStock needs updating
        if (product.minimumStock === null || product.minimumStock === undefined) {
          console.log(
            `Skipping inventory ${inv.id}: Product ${product.sku} has no minimumStock set`
          );
          result.skippedRecords++;
          result.details.push({
            inventoryId: inv.id,
            productId: inv.productId,
            warehouseId: inv.warehouseId,
            oldMinimumStock: inv.minimumStock,
            newMinimumStock: null,
            status: 'skipped',
          });
          continue;
        }

        // Only update if different
        if (inv.minimumStock === product.minimumStock) {
          console.log(
            `Skipping inventory ${inv.id}: Already has correct minimumStock (${product.minimumStock})`
          );
          result.skippedRecords++;
          result.details.push({
            inventoryId: inv.id,
            productId: inv.productId,
            warehouseId: inv.warehouseId,
            oldMinimumStock: inv.minimumStock,
            newMinimumStock: product.minimumStock,
            status: 'skipped',
          });
          continue;
        }

        // Update inventory record
        await db
          .prepare('UPDATE inventory SET minimum_stock = ?, updated_at = ? WHERE id = ?')
          .bind(product.minimumStock, Date.now(), inv.id)
          .run();

        console.log(
          `✅ Updated inventory ${inv.id} (Product: ${product.sku}): minimumStock ${inv.minimumStock} → ${product.minimumStock}`
        );

        result.updatedRecords++;
        result.details.push({
          inventoryId: inv.id,
          productId: inv.productId,
          warehouseId: inv.warehouseId,
          oldMinimumStock: inv.minimumStock,
          newMinimumStock: product.minimumStock,
          status: 'updated',
        });
      } catch (error) {
        console.error(`Error processing inventory ${inv.id}:`, error);
        result.errorRecords++;
        result.errors.push({
          inventoryId: inv.id,
          error: error instanceof Error ? error.message : String(error),
        });
        result.details.push({
          inventoryId: inv.id,
          productId: inv.productId,
          warehouseId: inv.warehouseId,
          oldMinimumStock: inv.minimumStock,
          newMinimumStock: null,
          status: 'error',
        });
      }
    }

    result.success = result.errorRecords === 0;
    console.log('\n=== Migration Complete ===');
    console.log(`Total records: ${result.totalInventoryRecords}`);
    console.log(`✅ Updated: ${result.updatedRecords}`);
    console.log(`⏭️  Skipped: ${result.skippedRecords}`);
    console.log(`❌ Errors: ${result.errorRecords}`);

    return result;
  } catch (error) {
    console.error('Migration failed:', error);
    result.success = false;
    result.errors.push({
      inventoryId: 'GLOBAL',
      error: error instanceof Error ? error.message : String(error),
    });
    return result;
  }
}
