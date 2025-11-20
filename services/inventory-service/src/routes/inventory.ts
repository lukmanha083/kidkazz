import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import { inventory, inventoryMovements } from '../infrastructure/db/schema';

type Bindings = {
  DB: D1Database;
  INVENTORY_EVENTS_QUEUE: Queue;
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

  // Calculate new quantity
  let newQuantity = inventoryRecord.quantityAvailable;
  if (data.movementType === 'in') {
    newQuantity += data.quantity;
  } else if (data.movementType === 'out') {
    newQuantity -= data.quantity;
    // Allow negative stock for POS as per business rules
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

export default app;
