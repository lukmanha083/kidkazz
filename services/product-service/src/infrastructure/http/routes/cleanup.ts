import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, notInArray, isNull } from 'drizzle-orm';
import { productLocations, productUOMLocations, variantLocations } from '../../db/schema';

type Bindings = {
  DB: D1Database;
  INVENTORY_SERVICE: Fetcher;
};

const app = new Hono<{ Bindings: Bindings }>();

/**
 * POST /api/cleanup/orphaned-locations
 * Clean up product locations that reference non-existent or soft-deleted warehouses
 */
app.post('/orphaned-locations', async (c) => {
  const db = drizzle(c.env.DB);
  const results = {
    productLocations: { checked: 0, orphaned: 0, deleted: 0 },
    productUOMLocations: { checked: 0, orphaned: 0, deleted: 0 },
    variantLocations: { checked: 0, orphaned: 0, deleted: 0 },
  };

  try {
    // Get list of active warehouses from Inventory Service
    const warehouseResponse = await c.env.INVENTORY_SERVICE.fetch(
      new Request('http://inventory-service/api/warehouses/active')
    );

    if (!warehouseResponse.ok) {
      return c.json(
        {
          error: 'Failed to fetch warehouses from Inventory Service',
          status: warehouseResponse.status,
        },
        503
      );
    }

    const warehouseData = await warehouseResponse.json();
    const activeWarehouseIds = warehouseData.warehouses.map((w: any) => w.id);

    if (activeWarehouseIds.length === 0) {
      return c.json({
        error: 'No active warehouses found',
        suggestion: 'Cannot perform cleanup without active warehouses',
      }, 400);
    }

    // 1. Clean up orphaned productLocations
    const allProductLocations = await db
      .select()
      .from(productLocations)
      .all();

    results.productLocations.checked = allProductLocations.length;

    for (const location of allProductLocations) {
      if (!activeWarehouseIds.includes(location.warehouseId)) {
        results.productLocations.orphaned++;

        // Delete orphaned location
        await db
          .delete(productLocations)
          .where(eq(productLocations.id, location.id))
          .run();

        results.productLocations.deleted++;

        console.log(`Deleted orphaned product location: ${location.id} (warehouse: ${location.warehouseId})`);
      }
    }

    // 2. Clean up orphaned productUOMLocations
    const allUOMLocations = await db
      .select()
      .from(productUOMLocations)
      .all();

    results.productUOMLocations.checked = allUOMLocations.length;

    for (const location of allUOMLocations) {
      if (!activeWarehouseIds.includes(location.warehouseId)) {
        results.productUOMLocations.orphaned++;

        await db
          .delete(productUOMLocations)
          .where(eq(productUOMLocations.id, location.id))
          .run();

        results.productUOMLocations.deleted++;

        console.log(`Deleted orphaned UOM location: ${location.id} (warehouse: ${location.warehouseId})`);
      }
    }

    // 3. Clean up orphaned variantLocations
    const allVariantLocations = await db
      .select()
      .from(variantLocations)
      .all();

    results.variantLocations.checked = allVariantLocations.length;

    for (const location of allVariantLocations) {
      if (!activeWarehouseIds.includes(location.warehouseId)) {
        results.variantLocations.orphaned++;

        await db
          .delete(variantLocations)
          .where(eq(variantLocations.id, location.id))
          .run();

        results.variantLocations.deleted++;

        console.log(`Deleted orphaned variant location: ${location.id} (warehouse: ${location.warehouseId})`);
      }
    }

    return c.json({
      message: 'Cleanup completed successfully',
      summary: {
        totalOrphaned:
          results.productLocations.orphaned +
          results.productUOMLocations.orphaned +
          results.variantLocations.orphaned,
        totalDeleted:
          results.productLocations.deleted +
          results.productUOMLocations.deleted +
          results.variantLocations.deleted,
      },
      details: results,
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

/**
 * GET /api/cleanup/orphaned-locations/check
 * Check for orphaned locations without deleting them
 */
app.get('/orphaned-locations/check', async (c) => {
  const db = drizzle(c.env.DB);
  const orphanedLocations: any = {
    productLocations: [],
    productUOMLocations: [],
    variantLocations: [],
  };

  try {
    // Get list of active warehouses from Inventory Service
    const warehouseResponse = await c.env.INVENTORY_SERVICE.fetch(
      new Request('http://inventory-service/api/warehouses/active')
    );

    if (!warehouseResponse.ok) {
      return c.json(
        {
          error: 'Failed to fetch warehouses from Inventory Service',
          status: warehouseResponse.status,
        },
        503
      );
    }

    const warehouseData = await warehouseResponse.json();
    const activeWarehouseIds = warehouseData.warehouses.map((w: any) => w.id);

    // Check productLocations
    const allProductLocations = await db
      .select()
      .from(productLocations)
      .all();

    for (const location of allProductLocations) {
      if (!activeWarehouseIds.includes(location.warehouseId)) {
        orphanedLocations.productLocations.push({
          id: location.id,
          productId: location.productId,
          warehouseId: location.warehouseId,
          quantity: location.quantity,
        });
      }
    }

    // Check productUOMLocations
    const allUOMLocations = await db
      .select()
      .from(productUOMLocations)
      .all();

    for (const location of allUOMLocations) {
      if (!activeWarehouseIds.includes(location.warehouseId)) {
        orphanedLocations.productUOMLocations.push({
          id: location.id,
          productUOMId: location.productUOMId,
          warehouseId: location.warehouseId,
          quantity: location.quantity,
        });
      }
    }

    // Check variantLocations
    const allVariantLocations = await db
      .select()
      .from(variantLocations)
      .all();

    for (const location of allVariantLocations) {
      if (!activeWarehouseIds.includes(location.warehouseId)) {
        orphanedLocations.variantLocations.push({
          id: location.id,
          variantId: location.variantId,
          warehouseId: location.warehouseId,
          quantity: location.quantity,
        });
      }
    }

    const totalOrphaned =
      orphanedLocations.productLocations.length +
      orphanedLocations.productUOMLocations.length +
      orphanedLocations.variantLocations.length;

    return c.json({
      totalOrphaned,
      orphanedLocations,
      activeWarehouses: activeWarehouseIds.length,
      warning: totalOrphaned > 0 ? 'Orphaned locations found! Run POST /api/cleanup/orphaned-locations to delete them.' : null,
    });
  } catch (error) {
    console.error('Cleanup check error:', error);
    return c.json(
      {
        error: 'Cleanup check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

export default app;
