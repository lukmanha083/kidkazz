import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, isNull } from 'drizzle-orm';
import { inventory, inventoryMovements } from '../infrastructure/db/schema';
import { broadcastInventoryEvent } from '../infrastructure/broadcast';
import type { InventoryEvent } from '../durable-objects/InventoryUpdatesBroadcaster';

type Bindings = {
  DB: D1Database;
  INVENTORY_EVENTS_QUEUE: Queue;
  INVENTORY_UPDATES: DurableObjectNamespace;
  PRODUCT_SERVICE: Fetcher;
};

const app = new Hono<{ Bindings: Bindings }>();

// Helper to generate ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Phase 3: Optimistic locking configuration
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 100;

// Validation schemas (Phase 3: Enhanced with variant and UOM support)
const adjustStockSchema = z.object({
  warehouseId: z.string(),
  productId: z.string(),
  variantId: z.string().optional(), // Phase 3: Variant support
  uomId: z.string().optional(), // Phase 3: UOM support
  quantity: z.number(),
  movementType: z.enum(['in', 'out', 'adjustment']),
  version: z.number().int().min(1), // Required for optimistic locking - must match stored version
  source: z.enum(['warehouse', 'pos']).optional(), // Operation source (defaults to 'warehouse')
  reason: z.string().optional(),
  notes: z.string().optional(),
  performedBy: z.string().optional(),
  // Phase 3: Physical location support
  rack: z.string().optional(),
  bin: z.string().optional(),
  zone: z.string().optional(),
  aisle: z.string().optional(),
});

const setMinimumStockSchema = z.object({
  minimumStock: z.number().min(0),
});

// GET /api/inventory - Get all inventory records
app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const warehouseId = c.req.query('warehouseId');
  const productId = c.req.query('productId');

  let query = db.select().from(inventory);

  const conditions = [];
  if (warehouseId) {
    conditions.push(eq(inventory.warehouseId, warehouseId));
  }
  if (productId) {
    conditions.push(eq(inventory.productId, productId));
  }

  const inventoryRecords = conditions.length > 0
    ? await query.where(and(...conditions)).all()
    : await query.all();

  return c.json({
    inventory: inventoryRecords,
    total: inventoryRecords.length,
  });
});

// GET /api/inventory/movements/:productId - Get movement history for a product
app.get('/movements/:productId', async (c) => {
  const productId = c.req.param('productId');
  const db = drizzle(c.env.DB);
  const limit = parseInt(c.req.query('limit') || '50');

  const movements = await db
    .select()
    .from(inventoryMovements)
    .where(eq(inventoryMovements.productId, productId))
    .orderBy(inventoryMovements.createdAt)
    .limit(limit)
    .all();

  return c.json({
    movements,
    total: movements.length,
  });
});

// POST /api/inventory/adjust - Adjust inventory with optimistic locking (Phase 3 DDD)
app.post('/adjust', zValidator('json', adjustStockSchema), async (c) => {
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      const now = new Date();

      // 1. Find or create inventory record with version
      let inventoryRecord = await db
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.productId, data.productId),
            eq(inventory.warehouseId, data.warehouseId),
            data.variantId ? eq(inventory.variantId, data.variantId) : isNull(inventory.variantId),
            data.uomId ? eq(inventory.uomId, data.uomId) : isNull(inventory.uomId)
          )
        )
        .get();

      if (!inventoryRecord) {
        // For new inventory, client must send version: 1 (initial version)
        if (data.version !== 1) {
          return c.json(
            {
              error: 'Version mismatch: inventory record does not exist',
              code: 'VERSION_MISMATCH',
              expectedVersion: 1,
              providedVersion: data.version,
              message: 'For new inventory records, version must be 1',
            },
            409
          );
        }

        // Create new inventory record with optimistic locking
        const newInv = {
          id: generateId(),
          productId: data.productId,
          warehouseId: data.warehouseId,
          variantId: data.variantId || null,
          uomId: data.uomId || null,
          quantityAvailable: data.movementType === 'adjustment' ? data.quantity : Math.abs(data.quantity),
          quantityReserved: 0,
          quantityInTransit: 0,
          minimumStock: 0,
          rack: data.rack || null,
          bin: data.bin || null,
          zone: data.zone || null,
          aisle: data.aisle || null,
          version: 1,
          lastModifiedAt: now.toISOString(),
          lastRestockedAt: data.movementType === 'in' ? now : null,
          createdAt: now,
          updatedAt: now,
        };

        await db.insert(inventory).values(newInv).run();

        // Record movement for new inventory
        await db.insert(inventoryMovements).values({
          id: generateId(),
          inventoryId: newInv.id,
          productId: data.productId,
          warehouseId: data.warehouseId,
          movementType: data.movementType,
          quantity: data.quantity,
          source: data.source || 'warehouse',
          referenceType: null,
          referenceId: null,
          reason: data.reason || null,
          notes: data.notes || null,
          performedBy: data.performedBy || null,
          createdAt: now,
        }).run();

        // Broadcast new inventory event
        await broadcastInventoryEvent(c.env, {
          type: 'inventory.updated',
          data: {
            inventoryId: newInv.id,
            productId: data.productId,
            warehouseId: data.warehouseId,
            variantId: data.variantId,
            uomId: data.uomId,
            quantityAvailable: newInv.quantityAvailable,
            quantityReserved: 0,
            version: 1,
            timestamp: now.toISOString(),
          },
        });

        return c.json({ inventory: newInv, message: 'Inventory created' }, 201);
      }

      // 2. Get current version for optimistic locking
      const currentVersion = inventoryRecord.version || 1;
      const previousQty = inventoryRecord.quantityAvailable;

      // 3. VALIDATE: Client version must match stored version (optimistic locking)
      if (data.version !== currentVersion) {
        return c.json(
          {
            error: 'Version mismatch: inventory has been modified by another operation',
            code: 'VERSION_MISMATCH',
            currentVersion: currentVersion,
            providedVersion: data.version,
            message: 'Please refresh the inventory data and try again',
          },
          409
        );
      }

      // 4. Calculate new quantity
      const source = data.source || 'warehouse';
      let newQty: number;

      if (data.movementType === 'in') {
        newQty = previousQty + Math.abs(data.quantity);
      } else if (data.movementType === 'out') {
        const qtyToRemove = Math.abs(data.quantity);
        // BUSINESS RULE: Warehouse operations cannot create negative stock
        if (source === 'warehouse' && previousQty < qtyToRemove) {
          return c.json(
            {
              error: 'Insufficient stock for warehouse adjustment',
              available: previousQty,
              requested: qtyToRemove,
            },
            400
          );
        }
        newQty = previousQty - qtyToRemove;
      } else {
        // adjustment - set to exact quantity
        newQty = data.quantity;
      }

      // 4. Update with version check (optimistic locking)
      const updateResult = await db
        .update(inventory)
        .set({
          quantityAvailable: newQty,
          version: currentVersion + 1,
          lastModifiedAt: now.toISOString(),
          lastRestockedAt: data.movementType === 'in' ? now : inventoryRecord.lastRestockedAt,
          updatedAt: now,
          ...(data.rack && { rack: data.rack }),
          ...(data.bin && { bin: data.bin }),
          ...(data.zone && { zone: data.zone }),
          ...(data.aisle && { aisle: data.aisle }),
        })
        .where(
          and(
            eq(inventory.id, inventoryRecord.id),
            eq(inventory.version, currentVersion) // Optimistic lock check
          )
        )
        .run();

      // 5. Check if update succeeded (version matched)
      if (updateResult.meta?.changes === 0) {
        retries++;
        if (retries >= MAX_RETRIES) {
          return c.json(
            {
              error: 'Concurrent update conflict. Please refresh and try again.',
              code: 'OPTIMISTIC_LOCK_FAILURE',
            },
            409
          );
        }
        // Exponential backoff before retry
        await new Promise((r) => setTimeout(r, BASE_RETRY_DELAY_MS * Math.pow(2, retries)));
        continue;
      }

      // 6. Record movement
      const movement = {
        id: generateId(),
        inventoryId: inventoryRecord.id,
        productId: data.productId,
        warehouseId: data.warehouseId,
        movementType: data.movementType,
        quantity: data.quantity,
        source: source,
        referenceType: null,
        referenceId: null,
        reason: data.reason || null,
        notes: data.notes || null,
        performedBy: data.performedBy || null,
        createdAt: now,
      };

      await db.insert(inventoryMovements).values(movement).run();

      // 7. Determine event type based on new quantity
      let eventType: InventoryEvent['type'] = 'inventory.updated';
      if (newQty === 0) {
        eventType = 'inventory.out_of_stock';
      } else if (inventoryRecord.minimumStock && newQty < inventoryRecord.minimumStock) {
        eventType = 'inventory.low_stock';
      }

      // 8. Broadcast change via WebSocket
      await broadcastInventoryEvent(c.env, {
        type: eventType,
        data: {
          inventoryId: inventoryRecord.id,
          productId: data.productId,
          warehouseId: data.warehouseId,
          variantId: data.variantId,
          uomId: data.uomId,
          quantityAvailable: newQty,
          quantityReserved: inventoryRecord.quantityReserved,
          minimumStock: inventoryRecord.minimumStock ?? undefined,
          version: currentVersion + 1,
          previousQuantity: previousQty,
          changeAmount: data.quantity,
          movementType: data.movementType,
          timestamp: now.toISOString(),
        },
      });

      return c.json({
        inventory: {
          ...inventoryRecord,
          quantityAvailable: newQty,
          version: currentVersion + 1,
          lastModifiedAt: now.toISOString(),
        },
        previousQuantity: previousQty,
        newQuantity: newQty,
        movement,
        message: 'Inventory adjusted successfully',
      });
    } catch (error) {
      console.error('Inventory adjustment error:', error);
      return c.json({ error: 'Failed to adjust inventory' }, 500);
    }
  }

  return c.json({ error: 'Unexpected error in inventory adjustment' }, 500);
});

// PATCH /api/inventory/:id/minimum-stock - Set minimum stock level
app.patch('/:id/minimum-stock', zValidator('json', setMinimumStockSchema), async (c) => {
  const id = c.req.param('id');
  const { minimumStock } = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const existing = await db
    .select()
    .from(inventory)
    .where(eq(inventory.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Inventory record not found' }, 404);
  }

  await db
    .update(inventory)
    .set({ minimumStock, updatedAt: new Date() })
    .where(eq(inventory.id, id))
    .run();

  return c.json({ message: 'Minimum stock updated successfully' });
});

// GET /api/inventory/:productId - Get inventory for a product across all warehouses
app.get('/:productId', async (c) => {
  const productId = c.req.param('productId');
  const db = drizzle(c.env.DB);

  const inventoryRecords = await db
    .select()
    .from(inventory)
    .where(eq(inventory.productId, productId))
    .all();

  return c.json({
    productId,
    warehouses: inventoryRecords,
    totalAvailable: inventoryRecords.reduce((sum, inv) => sum + inv.quantityAvailable, 0),
    totalReserved: inventoryRecords.reduce((sum, inv) => sum + inv.quantityReserved, 0),
  });
});

// GET /api/inventory/:productId/:warehouseId - Get inventory for specific product-warehouse
app.get('/:productId/:warehouseId', async (c) => {
  const productId = c.req.param('productId');
  const warehouseId = c.req.param('warehouseId');
  const db = drizzle(c.env.DB);

  const inventoryRecord = await db
    .select()
    .from(inventory)
    .where(and(
      eq(inventory.productId, productId),
      eq(inventory.warehouseId, warehouseId)
    ))
    .get();

  if (!inventoryRecord) {
    return c.json({ error: 'Inventory record not found' }, 404);
  }

  return c.json(inventoryRecord);
});

// GET /api/inventory/product/:id/total-stock - Get total stock across all warehouses for a product
app.get('/product/:id/total-stock', async (c) => {
  const productId = c.req.param('id');
  const db = drizzle(c.env.DB);

  // Get all inventory records for this product across all warehouses
  const inventoryRecords = await db
    .select()
    .from(inventory)
    .where(eq(inventory.productId, productId))
    .all();

  if (inventoryRecords.length === 0) {
    return c.json({
      productId,
      totalStock: 0,
      totalReserved: 0,
      totalAvailable: 0,
      warehouses: [],
    });
  }

  // Calculate totals
  const totalStock = inventoryRecords.reduce((sum, inv) => sum + (inv.quantityAvailable || 0), 0);
  const totalReserved = inventoryRecords.reduce((sum, inv) => sum + (inv.quantityReserved || 0), 0);

  // Warehouse breakdown
  const warehouses = inventoryRecords.map(inv => ({
    warehouseId: inv.warehouseId,
    quantityAvailable: inv.quantityAvailable,
    quantityReserved: inv.quantityReserved,
    minimumStock: inv.minimumStock,
    isLowStock: inv.minimumStock ? inv.quantityAvailable < inv.minimumStock : false,
  }));

  return c.json({
    productId,
    totalStock,
    totalReserved,
    totalAvailable: totalStock - totalReserved,
    warehouses,
  });
});

// GET /api/inventory/product/:id/low-stock-status - Check if product is low stock in any warehouse
app.get('/product/:id/low-stock-status', async (c) => {
  const productId = c.req.param('id');
  const db = drizzle(c.env.DB);

  // Get all inventory records for this product
  const inventoryRecords = await db
    .select()
    .from(inventory)
    .where(eq(inventory.productId, productId))
    .all();

  if (inventoryRecords.length === 0) {
    return c.json({
      productId,
      isLowStock: false,
      totalStock: 0,
      lowStockWarehouses: [],
      message: 'No inventory records found',
    });
  }

  // Check which warehouses are low stock
  const lowStockWarehouses = inventoryRecords
    .filter(inv => inv.minimumStock && inv.quantityAvailable < inv.minimumStock)
    .map(inv => ({
      warehouseId: inv.warehouseId,
      currentStock: inv.quantityAvailable,
      minimumStock: inv.minimumStock,
      deficit: inv.minimumStock! - inv.quantityAvailable,
    }));

  const totalStock = inventoryRecords.reduce((sum, inv) => sum + (inv.quantityAvailable || 0), 0);
  const isLowStock = lowStockWarehouses.length > 0;

  return c.json({
    productId,
    isLowStock,
    totalStock,
    lowStockWarehouses,
    message: isLowStock
      ? `Low stock in ${lowStockWarehouses.length} warehouse(s)`
      : 'Stock levels are adequate',
  });
});

// GET /api/inventory/warehouse/:warehouseId/report - Get detailed inventory report for warehouse deletion validation
app.get('/warehouse/:warehouseId/report', async (c) => {
  const warehouseId = c.req.param('warehouseId');
  const db = drizzle(c.env.DB);

  // Get all inventory in this warehouse
  const inventoryRecords = await db
    .select()
    .from(inventory)
    .where(eq(inventory.warehouseId, warehouseId))
    .all();

  if (inventoryRecords.length === 0) {
    return c.json({
      warehouseId,
      canDelete: true,
      totalStock: 0,
      productCount: 0,
      products: [],
      message: 'Warehouse has no inventory - safe to delete',
    });
  }

  // Fetch product details from Product Service for each inventory record
  const productsWithStock = await Promise.all(
    inventoryRecords.map(async (inv) => {
      try {
        const productResponse = await c.env.PRODUCT_SERVICE.fetch(
          new Request(`http://product-service/api/products/${inv.productId}`)
        );

        if (productResponse.ok) {
          const product = await productResponse.json();
          return {
            productId: inv.productId,
            productName: product.name || 'Unknown',
            productSKU: product.sku || 'Unknown',
            quantityAvailable: inv.quantityAvailable,
            quantityReserved: inv.quantityReserved,
            minimumStock: inv.minimumStock,
            isLowStock: inv.minimumStock ? inv.quantityAvailable < inv.minimumStock : false,
          };
        } else {
          // Product not found - might be deleted
          return {
            productId: inv.productId,
            productName: '[Product Not Found]',
            productSKU: 'N/A',
            quantityAvailable: inv.quantityAvailable,
            quantityReserved: inv.quantityReserved,
            minimumStock: inv.minimumStock,
            isLowStock: false,
          };
        }
      } catch (error) {
        console.error(`Failed to fetch product ${inv.productId}:`, error);
        return {
          productId: inv.productId,
          productName: '[Error Fetching Product]',
          productSKU: 'N/A',
          quantityAvailable: inv.quantityAvailable,
          quantityReserved: inv.quantityReserved,
          minimumStock: inv.minimumStock,
          isLowStock: false,
        };
      }
    })
  );

  const totalStock = inventoryRecords.reduce((sum, inv) => sum + inv.quantityAvailable, 0);
  const totalReserved = inventoryRecords.reduce((sum, inv) => sum + inv.quantityReserved, 0);
  const canDelete = totalStock === 0;

  return c.json({
    warehouseId,
    canDelete,
    totalStock,
    totalReserved,
    productCount: inventoryRecords.length,
    products: productsWithStock,
    message: canDelete
      ? 'All inventory is at zero - safe to delete warehouse'
      : `⚠️ WARNING: Warehouse contains ${totalStock} units across ${inventoryRecords.length} product(s). Transfer inventory to another warehouse before deletion.`,
  });
});

// DELETE /api/inventory/warehouse/:warehouseId - Delete all inventory for a warehouse (cascade delete support)
app.delete('/warehouse/:warehouseId', async (c) => {
  const warehouseId = c.req.param('warehouseId');
  const db = drizzle(c.env.DB);

  // 1. Get all inventory records for this warehouse before deletion
  const inventoryRecords = await db
    .select()
    .from(inventory)
    .where(eq(inventory.warehouseId, warehouseId))
    .all();

  if (inventoryRecords.length === 0) {
    return c.json({
      message: 'No inventory records found for this warehouse',
      deletedInventoryRecords: 0,
      deletedMovements: 0,
    });
  }

  const totalStock = inventoryRecords.reduce((sum, inv) => sum + inv.quantityAvailable, 0);
  const productIds = [...new Set(inventoryRecords.map(inv => inv.productId))];

  // 2. VALIDATION: Ensure all stock is zero (prevent data loss)
  if (totalStock > 0) {
    return c.json(
      {
        error: 'Cannot delete inventory with non-zero stock',
        totalStock,
        productCount: productIds.length,
        message: 'Transfer all inventory to another warehouse before deletion',
        products: inventoryRecords
          .filter(inv => inv.quantityAvailable > 0)
          .map(inv => ({
            productId: inv.productId,
            quantityAvailable: inv.quantityAvailable,
          })),
      },
      400
    );
  }

  // 3. Delete all inventory movements for this warehouse
  const deleteMovementsResult = await db
    .delete(inventoryMovements)
    .where(eq(inventoryMovements.warehouseId, warehouseId))
    .run();

  // 4. Delete all inventory records for this warehouse
  const deleteInventoryResult = await db
    .delete(inventory)
    .where(eq(inventory.warehouseId, warehouseId))
    .run();

  console.log(`Cascade delete - Warehouse ${warehouseId}: Deleted ${inventoryRecords.length} inventory records (${productIds.length} products) and movements`);

  return c.json({
    message: 'Warehouse inventory deleted successfully',
    warehouseId,
    deletedInventoryRecords: inventoryRecords.length,
    deletedMovements: deleteMovementsResult.meta?.changes || 0,
    affectedProducts: productIds.length,
    products: productIds,
  });
});

// DELETE /api/inventory/product/:productId - Delete all inventory for a product (cascade delete support)
app.delete('/product/:productId', async (c) => {
  const productId = c.req.param('productId');
  const db = drizzle(c.env.DB);

  // 1. Get all inventory records for this product before deletion
  const inventoryRecords = await db
    .select()
    .from(inventory)
    .where(eq(inventory.productId, productId))
    .all();

  if (inventoryRecords.length === 0) {
    return c.json({
      message: 'No inventory records found for this product',
      deletedInventoryRecords: 0,
      deletedMovements: 0,
    });
  }

  const inventoryIds = inventoryRecords.map(inv => inv.id);
  const totalStock = inventoryRecords.reduce((sum, inv) => sum + inv.quantityAvailable, 0);

  // 2. Delete all inventory movements for this product
  const deleteMovementsResult = await db
    .delete(inventoryMovements)
    .where(eq(inventoryMovements.productId, productId))
    .run();

  // 3. Delete all inventory records for this product
  const deleteInventoryResult = await db
    .delete(inventory)
    .where(eq(inventory.productId, productId))
    .run();

  console.log(`Cascade delete - Product ${productId}: Deleted ${inventoryRecords.length} inventory records (${totalStock} total units) and movements`);

  return c.json({
    message: 'Inventory records deleted successfully',
    productId,
    deletedInventoryRecords: inventoryRecords.length,
    deletedMovements: deleteMovementsResult.meta?.changes || 0,
    totalStockDeleted: totalStock,
    warehouses: inventoryRecords.map(inv => ({
      warehouseId: inv.warehouseId,
      quantity: inv.quantityAvailable,
    })),
  });
});

// POST /api/inventory/admin/sync-minimum-stock - Admin endpoint to sync minimumStock from Product Service
app.post('/admin/sync-minimum-stock', async (c) => {
  const db = drizzle(c.env.DB);

  interface ProductResponse {
    id: string;
    name: string;
    sku: string;
    minimumStock: number | null;
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
    const inventoryRecords = await db.select().from(inventory).all();
    result.totalInventoryRecords = inventoryRecords.length;
    console.log(`Found ${result.totalInventoryRecords} inventory records`);

    if (inventoryRecords.length === 0) {
      console.log('No inventory records to migrate');
      result.success = true;
      return c.json(result);
    }

    // Process each inventory record
    for (const inv of inventoryRecords) {
      try {
        // Fetch product details from Product Service
        const productResponse = await c.env.PRODUCT_SERVICE.fetch(
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
          .update(inventory)
          .set({ minimumStock: product.minimumStock, updatedAt: new Date() })
          .where(eq(inventory.id, inv.id))
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

    return c.json(result);
  } catch (error) {
    console.error('Migration failed:', error);
    result.success = false;
    result.errors.push({
      inventoryId: 'GLOBAL',
      error: error instanceof Error ? error.message : String(error),
    });
    return c.json(result, 500);
  }
});

// ============================================
// Phase 3: New DDD-Compliant Endpoints
// ============================================

// GET /api/inventory/variant/:variantId - Get stock for a variant across all warehouses
app.get('/variant/:variantId', async (c) => {
  const variantId = c.req.param('variantId');
  const db = drizzle(c.env.DB);

  const records = await db
    .select()
    .from(inventory)
    .where(eq(inventory.variantId, variantId))
    .all();

  const totalAvailable = records.reduce((sum, inv) => sum + inv.quantityAvailable, 0);
  const totalReserved = records.reduce((sum, inv) => sum + inv.quantityReserved, 0);
  const isLowStock = records.some(
    (inv) => inv.minimumStock && inv.quantityAvailable < inv.minimumStock
  );

  return c.json({
    variantId,
    warehouses: records,
    totalAvailable,
    totalReserved,
    isLowStock,
  });
});

// GET /api/inventory/uom/:uomId - Get stock for a UOM across all warehouses
app.get('/uom/:uomId', async (c) => {
  const uomId = c.req.param('uomId');
  const db = drizzle(c.env.DB);

  const records = await db
    .select()
    .from(inventory)
    .where(eq(inventory.uomId, uomId))
    .all();

  const totalAvailable = records.reduce((sum, inv) => sum + inv.quantityAvailable, 0);
  const totalReserved = records.reduce((sum, inv) => sum + inv.quantityReserved, 0);

  return c.json({
    uomId,
    warehouses: records,
    totalAvailable,
    totalReserved,
  });
});

// GET /api/inventory/low-stock - Get all low stock items (Phase 3 DDD)
app.get('/low-stock', async (c) => {
  const warehouseId = c.req.query('warehouseId');
  const db = drizzle(c.env.DB);

  let query = db.select().from(inventory);

  if (warehouseId) {
    query = query.where(eq(inventory.warehouseId, warehouseId)) as typeof query;
  }

  const allRecords = await query.all();

  // Filter for low stock items (where quantityAvailable < minimumStock)
  const lowStockItems = allRecords
    .filter((inv) => inv.minimumStock && inv.quantityAvailable < inv.minimumStock)
    .map((inv) => ({
      inventoryId: inv.id,
      productId: inv.productId,
      warehouseId: inv.warehouseId,
      variantId: inv.variantId,
      uomId: inv.uomId,
      quantityAvailable: inv.quantityAvailable,
      minimumStock: inv.minimumStock,
      deficit: (inv.minimumStock || 0) - inv.quantityAvailable,
      version: inv.version,
    }));

  return c.json({
    items: lowStockItems,
    total: lowStockItems.length,
    timestamp: new Date().toISOString(),
  });
});

export default app;
