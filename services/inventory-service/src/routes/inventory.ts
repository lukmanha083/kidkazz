import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import { inventory, inventoryMovements } from '../infrastructure/db/schema';
import { broadcastInventoryUpdate } from '../infrastructure/broadcast';

type Bindings = {
  DB: D1Database;
  INVENTORY_EVENTS_QUEUE: Queue;
  INVENTORY_UPDATES: DurableObjectNamespace;
  PRODUCT_SERVICE: Fetcher;
};

const app = new Hono<{ Bindings: Bindings }>();

// Helper to generate ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Validation schemas
const adjustStockSchema = z.object({
  warehouseId: z.string(),
  productId: z.string(),
  quantity: z.number(),
  movementType: z.enum(['in', 'out', 'adjustment']),
  source: z.enum(['warehouse', 'pos']).optional(), // NEW: Operation source (defaults to 'warehouse')
  reason: z.string().optional(),
  notes: z.string().optional(),
  performedBy: z.string().optional(),
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

// POST /api/inventory/adjust - Adjust inventory (add/remove stock)
app.post('/adjust', zValidator('json', adjustStockSchema), async (c) => {
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);
  const now = new Date();

  // Find or create inventory record
  let inventoryRecord = await db
    .select()
    .from(inventory)
    .where(and(
      eq(inventory.productId, data.productId),
      eq(inventory.warehouseId, data.warehouseId)
    ))
    .get();

  if (!inventoryRecord) {
    // Create new inventory record
    inventoryRecord = {
      id: generateId(),
      productId: data.productId,
      warehouseId: data.warehouseId,
      quantityAvailable: 0,
      quantityReserved: 0,
      quantityInTransit: null,
      minimumStock: 0,
      lastRestockedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(inventory).values(inventoryRecord).run();
  }

  // Determine operation source (defaults to 'warehouse')
  const source = data.source || 'warehouse';

  // Calculate new quantity
  let newQuantity = inventoryRecord.quantityAvailable;
  if (data.movementType === 'in') {
    newQuantity += data.quantity;
  } else if (data.movementType === 'out') {
    // BUSINESS RULE: Warehouse operations cannot create negative stock
    if (source === 'warehouse' && inventoryRecord.quantityAvailable < data.quantity) {
      return c.json({
        error: 'Insufficient stock for warehouse adjustment',
        available: inventoryRecord.quantityAvailable,
        requested: data.quantity,
      }, 400);
    }
    // POS operations can create negative stock (first-pay-first-served)
    newQuantity -= data.quantity;
  } else {
    // adjustment - set to exact quantity
    newQuantity = data.quantity;
  }

  // Update inventory
  await db
    .update(inventory)
    .set({
      quantityAvailable: newQuantity,
      lastRestockedAt: data.movementType === 'in' ? now : inventoryRecord.lastRestockedAt,
      updatedAt: now,
    })
    .where(eq(inventory.id, inventoryRecord.id))
    .run();

  // Record movement
  const movement = {
    id: generateId(),
    inventoryId: inventoryRecord.id,
    productId: data.productId,
    warehouseId: data.warehouseId,
    movementType: data.movementType,
    quantity: data.quantity,
    source: source, // Track operation source
    referenceType: null,
    referenceId: null,
    reason: data.reason || null,
    notes: data.notes || null,
    performedBy: data.performedBy || null,
    createdAt: now,
  };

  await db.insert(inventoryMovements).values(movement).run();

  // Get updated record
  const updated = await db
    .select()
    .from(inventory)
    .where(eq(inventory.id, inventoryRecord.id))
    .get();

  // Broadcast real-time update via WebSocket
  if (updated) {
    await broadcastInventoryUpdate(c.env, {
      type: 'inventory_adjusted',
      data: {
        inventoryId: updated.id,
        productId: updated.productId,
        warehouseId: updated.warehouseId,
        quantityAvailable: updated.quantityAvailable,
        quantityReserved: updated.quantityReserved,
        minimumStock: updated.minimumStock ?? undefined,
        timestamp: new Date().toISOString(),
      },
    });
  }

  return c.json({
    inventory: updated,
    movement,
    message: 'Inventory adjusted successfully',
  });
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

export default app;
