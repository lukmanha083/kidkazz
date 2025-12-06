import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { inventory, inventoryMovements, warehouses } from '../infrastructure/db/schema';
import { isNull } from 'drizzle-orm';

type Bindings = {
  DB: D1Database;
  PRODUCT_SERVICE: Fetcher;
};

const app = new Hono<{ Bindings: Bindings }>();

/**
 * GET /api/cleanup/orphaned-inventory/check
 * Check for orphaned inventory records (pointing to deleted warehouses or non-existent products)
 */
app.get('/orphaned-inventory/check', async (c) => {
  const db = drizzle(c.env.DB);
  const orphanedData: any = {
    inventoryWithDeletedWarehouses: [],
    inventoryWithNonExistentProducts: [],
  };

  try {
    // 1. Get all active warehouses
    const activeWarehouses = await db
      .select()
      .from(warehouses)
      .where(isNull(warehouses.deletedAt))
      .all();

    const activeWarehouseIds = activeWarehouses.map(w => w.id);

    // 2. Get all inventory records
    const allInventory = await db
      .select()
      .from(inventory)
      .all();

    // 3. Check for inventory pointing to deleted/non-existent warehouses
    for (const inv of allInventory) {
      if (!activeWarehouseIds.includes(inv.warehouseId)) {
        orphanedData.inventoryWithDeletedWarehouses.push({
          id: inv.id,
          productId: inv.productId,
          warehouseId: inv.warehouseId,
          quantityAvailable: inv.quantityAvailable,
          quantityReserved: inv.quantityReserved,
        });
      }
    }

    // 4. Check for inventory pointing to non-existent products
    const productChecks = await Promise.all(
      allInventory.map(async (inv) => {
        try {
          const productResponse = await c.env.PRODUCT_SERVICE.fetch(
            new Request(`http://product-service/api/products/${inv.productId}`)
          );

          return {
            inventoryId: inv.id,
            productId: inv.productId,
            warehouseId: inv.warehouseId,
            quantityAvailable: inv.quantityAvailable,
            productExists: productResponse.ok,
          };
        } catch (error) {
          return {
            inventoryId: inv.id,
            productId: inv.productId,
            warehouseId: inv.warehouseId,
            quantityAvailable: inv.quantityAvailable,
            productExists: false,
          };
        }
      })
    );

    orphanedData.inventoryWithNonExistentProducts = productChecks.filter(
      check => !check.productExists
    );

    const totalOrphaned =
      orphanedData.inventoryWithDeletedWarehouses.length +
      orphanedData.inventoryWithNonExistentProducts.length;

    return c.json({
      totalOrphaned,
      summary: {
        inventoryWithDeletedWarehouses: orphanedData.inventoryWithDeletedWarehouses.length,
        inventoryWithNonExistentProducts: orphanedData.inventoryWithNonExistentProducts.length,
        totalInventoryRecords: allInventory.length,
        activeWarehouses: activeWarehouseIds.length,
      },
      orphanedData,
      warning: totalOrphaned > 0
        ? `${totalOrphaned} orphaned inventory record(s) found! These should be investigated and cleaned up.`
        : null,
      message: totalOrphaned === 0
        ? '✅ No orphaned inventory records - cascade delete working correctly!'
        : '❌ Orphaned inventory detected - may indicate cascade delete failures',
    });
  } catch (error) {
    console.error('Orphaned inventory check error:', error);
    return c.json(
      {
        error: 'Orphaned inventory check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /api/cleanup/orphaned-inventory
 * Clean up orphaned inventory records
 * DANGER: Only use this after confirming orphans should be deleted!
 */
app.post('/orphaned-inventory', async (c) => {
  const db = drizzle(c.env.DB);
  const results = {
    checked: 0,
    deletedWarehouseOrphans: 0,
    deletedProductOrphans: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    // 1. Get active warehouses
    const activeWarehouses = await db
      .select()
      .from(warehouses)
      .where(isNull(warehouses.deletedAt))
      .all();

    const activeWarehouseIds = activeWarehouses.map(w => w.id);

    // 2. Get all inventory
    const allInventory = await db
      .select()
      .from(inventory)
      .all();

    results.checked = allInventory.length;

    // 3. Process each inventory record
    for (const inv of allInventory) {
      try {
        // Check if warehouse is deleted
        if (!activeWarehouseIds.includes(inv.warehouseId)) {
          // SAFETY CHECK: Only delete if quantity is zero
          if (inv.quantityAvailable === 0 && inv.quantityReserved === 0) {
            // Delete movements first
            await db
              .delete(inventoryMovements)
              .where(eq(inventoryMovements.inventoryId, inv.id))
              .run();

            // Delete inventory
            await db
              .delete(inventory)
              .where(eq(inventory.id, inv.id))
              .run();

            results.deletedWarehouseOrphans++;
            console.log(`Deleted orphaned inventory: ${inv.id} (deleted warehouse: ${inv.warehouseId})`);
          } else {
            results.skipped++;
            results.errors.push(
              `Skipped inventory ${inv.id}: Has non-zero stock (${inv.quantityAvailable} available, ${inv.quantityReserved} reserved)`
            );
          }
          continue;
        }

        // Check if product exists
        const productResponse = await c.env.PRODUCT_SERVICE.fetch(
          new Request(`http://product-service/api/products/${inv.productId}`)
        );

        if (!productResponse.ok && productResponse.status === 404) {
          // Product doesn't exist - orphaned inventory
          // SAFETY CHECK: Only delete if quantity is zero
          if (inv.quantityAvailable === 0 && inv.quantityReserved === 0) {
            // Delete movements first
            await db
              .delete(inventoryMovements)
              .where(eq(inventoryMovements.inventoryId, inv.id))
              .run();

            // Delete inventory
            await db
              .delete(inventory)
              .where(eq(inventory.id, inv.id))
              .run();

            results.deletedProductOrphans++;
            console.log(`Deleted orphaned inventory: ${inv.id} (non-existent product: ${inv.productId})`);
          } else {
            results.skipped++;
            results.errors.push(
              `Skipped inventory ${inv.id}: Product not found but has non-zero stock (${inv.quantityAvailable} units) - MANUAL REVIEW REQUIRED!`
            );
          }
        }
      } catch (error) {
        results.errors.push(
          `Error processing inventory ${inv.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return c.json({
      message: 'Cleanup completed',
      summary: {
        totalChecked: results.checked,
        totalDeleted: results.deletedWarehouseOrphans + results.deletedProductOrphans,
        deletedWarehouseOrphans: results.deletedWarehouseOrphans,
        deletedProductOrphans: results.deletedProductOrphans,
        skipped: results.skipped,
        errors: results.errors.length,
      },
      errors: results.errors.length > 0 ? results.errors : null,
      warning: results.skipped > 0
        ? `${results.skipped} record(s) skipped - manual review required for non-zero stock orphans`
        : null,
    });
  } catch (error) {
    console.error('Cleanup job error:', error);
    return c.json(
      {
        error: 'Cleanup job failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        results,
      },
      500
    );
  }
});

export default app;
