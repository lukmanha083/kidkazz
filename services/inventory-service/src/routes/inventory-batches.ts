import { zValidator } from '@hono/zod-validator';
import { and, asc, desc, eq, gte, isNotNull, isNull, lt } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import { z } from 'zod';
import { inventory, inventoryBatches, inventoryMovements } from '../infrastructure/db/schema';

type Bindings = {
  DB: D1Database;
  PRODUCT_SERVICE: Fetcher;
};

const app = new Hono<{ Bindings: Bindings }>();

// Helper to generate ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Validation schemas
const createBatchSchema = z.object({
  inventoryId: z.string(),
  productId: z.string(),
  warehouseId: z.string(),
  batchNumber: z.string().min(1),
  lotNumber: z.string().optional().nullable(),
  expirationDate: z.string().optional().nullable(), // ISO date string
  alertDate: z.string().optional().nullable(),
  manufactureDate: z.string().optional().nullable(),
  quantityAvailable: z.number().int().min(0),
  receivedDate: z.string().optional().nullable(),
  supplier: z.string().optional().nullable(),
  purchaseOrderId: z.string().optional().nullable(),
  cost: z.number().int().optional().nullable(), // in cents
  createdBy: z.string().optional().nullable(),
});

const updateBatchSchema = z.object({
  batchNumber: z.string().optional(),
  lotNumber: z.string().optional().nullable(),
  expirationDate: z.string().optional().nullable(),
  alertDate: z.string().optional().nullable(),
  manufactureDate: z.string().optional().nullable(),
  quantityAvailable: z.number().int().min(0).optional(),
  quantityReserved: z.number().int().min(0).optional(),
  receivedDate: z.string().optional().nullable(),
  supplier: z.string().optional().nullable(),
  purchaseOrderId: z.string().optional().nullable(),
  cost: z.number().int().optional().nullable(),
  status: z.enum(['active', 'expired', 'quarantined', 'recalled']).optional(),
  quarantineReason: z.string().optional().nullable(),
  recallReason: z.string().optional().nullable(),
  updatedBy: z.string().optional().nullable(),
});

// GET /api/batches - Get all batches with optional filters (excluding soft-deleted)
app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const productId = c.req.query('productId');
  const warehouseId = c.req.query('warehouseId');
  const status = c.req.query('status');
  const includeDeleted = c.req.query('includeDeleted') === 'true';

  const query = db.select().from(inventoryBatches);

  // Always exclude soft-deleted unless explicitly requested
  const conditions = [];
  if (!includeDeleted) {
    conditions.push(isNull(inventoryBatches.deletedAt));
  }
  if (productId) {
    conditions.push(eq(inventoryBatches.productId, productId));
  }
  if (warehouseId) {
    conditions.push(eq(inventoryBatches.warehouseId, warehouseId));
  }
  if (status) {
    conditions.push(eq(inventoryBatches.status, status));
  }

  const batches =
    conditions.length > 0 ? await query.where(and(...conditions)).all() : await query.all();

  return c.json({
    batches,
    total: batches.length,
  });
});

// GET /api/batches/expiring - Get batches expiring within X days (excluding soft-deleted)
// NOTE: This must come BEFORE /:id route to avoid "expiring" being treated as an ID
app.get('/expiring', async (c) => {
  const days = Number.parseInt(c.req.query('days') || '30');
  const db = drizzle(c.env.DB);

  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  const expiringBatches = await db
    .select()
    .from(inventoryBatches)
    .where(
      and(
        isNull(inventoryBatches.deletedAt),
        eq(inventoryBatches.status, 'active'),
        isNotNull(inventoryBatches.expirationDate),
        gte(inventoryBatches.expirationDate, now.toISOString()),
        lt(inventoryBatches.expirationDate, futureDate.toISOString())
      )
    )
    .orderBy(asc(inventoryBatches.expirationDate))
    .all();

  return c.json({
    batches: expiringBatches,
    total: expiringBatches.length,
    days,
  });
});

// GET /api/batches/expired - Get expired batches (excluding soft-deleted)
app.get('/expired', async (c) => {
  const db = drizzle(c.env.DB);
  const now = new Date().toISOString();

  const expiredBatches = await db
    .select()
    .from(inventoryBatches)
    .where(
      and(
        isNull(inventoryBatches.deletedAt),
        eq(inventoryBatches.status, 'active'), // Still marked as active but expired
        isNotNull(inventoryBatches.expirationDate),
        lt(inventoryBatches.expirationDate, now)
      )
    )
    .orderBy(asc(inventoryBatches.expirationDate))
    .all();

  return c.json({
    batches: expiredBatches,
    total: expiredBatches.length,
  });
});

// GET /api/batches/product/:productId/warehouse/:warehouseId - Get batches for product at warehouse (FEFO order, excluding soft-deleted)
app.get('/product/:productId/warehouse/:warehouseId', async (c) => {
  const productId = c.req.param('productId');
  const warehouseId = c.req.param('warehouseId');
  const db = drizzle(c.env.DB);

  // FEFO: Order by expiration date (earliest first), nulls last
  const batches = await db
    .select()
    .from(inventoryBatches)
    .where(
      and(
        isNull(inventoryBatches.deletedAt),
        eq(inventoryBatches.productId, productId),
        eq(inventoryBatches.warehouseId, warehouseId),
        eq(inventoryBatches.status, 'active')
      )
    )
    .orderBy(asc(inventoryBatches.expirationDate))
    .all();

  // Separate batches with and without expiration dates
  const batchesWithExpiration = batches.filter((b) => b.expirationDate);
  const batchesWithoutExpiration = batches.filter((b) => !b.expirationDate);

  // FEFO: Expired first, then by expiration date, then non-expiring
  const orderedBatches = [...batchesWithExpiration, ...batchesWithoutExpiration];

  return c.json({
    batches: orderedBatches,
    total: orderedBatches.length,
  });
});

// GET /api/batches/:id - Get batch by ID (excluding soft-deleted)
// NOTE: This must come AFTER all specific routes to avoid matching them as IDs
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const batch = await db
    .select()
    .from(inventoryBatches)
    .where(and(eq(inventoryBatches.id, id), isNull(inventoryBatches.deletedAt)))
    .get();

  if (!batch) {
    return c.json({ error: 'Batch not found' }, 404);
  }

  return c.json(batch);
});

// POST /api/batches - Create new batch
app.post('/', zValidator('json', createBatchSchema), async (c) => {
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);
  const now = new Date();

  const batchId = generateId();

  // Create batch
  const newBatch = {
    id: batchId,
    inventoryId: data.inventoryId,
    productId: data.productId,
    warehouseId: data.warehouseId,
    batchNumber: data.batchNumber,
    lotNumber: data.lotNumber || null,
    expirationDate: data.expirationDate || null,
    alertDate: data.alertDate || null,
    manufactureDate: data.manufactureDate || null,
    quantityAvailable: data.quantityAvailable,
    quantityReserved: 0,
    receivedDate: data.receivedDate || now.toISOString(),
    supplier: data.supplier || null,
    purchaseOrderId: data.purchaseOrderId || null,
    cost: data.cost || null,
    status: 'active',
    quarantineReason: null,
    recallReason: null,
    createdAt: now,
    updatedAt: now,
    createdBy: data.createdBy || null,
    updatedBy: null,
  };

  await db.insert(inventoryBatches).values(newBatch).run();

  // Update parent inventory quantityAvailable
  await db
    .update(inventory)
    .set({
      quantityAvailable: data.quantityAvailable,
      lastRestockedAt: now,
      updatedAt: now,
    })
    .where(eq(inventory.id, data.inventoryId))
    .run();

  // Create inventory movement record
  const movementId = generateId();
  await db
    .insert(inventoryMovements)
    .values({
      id: movementId,
      inventoryId: data.inventoryId,
      productId: data.productId,
      warehouseId: data.warehouseId,
      movementType: 'in',
      quantity: data.quantityAvailable,
      source: 'warehouse',
      referenceType: 'batch',
      referenceId: batchId,
      reason: 'Batch received',
      notes: `Batch ${data.batchNumber} received`,
      performedBy: data.createdBy || null,
      deletedAt: null,
      deletedBy: null,
      createdAt: now,
    })
    .run();

  return c.json(
    {
      batch: newBatch,
      message: 'Batch created successfully',
    },
    201
  );
});

// PUT /api/batches/:id - Update batch
app.put('/:id', zValidator('json', updateBatchSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const existing = await db
    .select()
    .from(inventoryBatches)
    .where(eq(inventoryBatches.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Batch not found' }, 404);
  }

  await db
    .update(inventoryBatches)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(inventoryBatches.id, id))
    .run();

  return c.json({ message: 'Batch updated successfully' });
});

// PATCH /api/batches/:id/adjust - Adjust batch quantity
app.patch(
  '/:id/adjust',
  zValidator(
    'json',
    z.object({
      quantity: z.number().int(),
      reason: z.string(),
      notes: z.string().optional(),
      performedBy: z.string().optional(),
    })
  ),
  async (c) => {
    const id = c.req.param('id');
    const { quantity, reason, notes, performedBy } = c.req.valid('json');
    const db = drizzle(c.env.DB);

    const batch = await db.select().from(inventoryBatches).where(eq(inventoryBatches.id, id)).get();

    if (!batch) {
      return c.json({ error: 'Batch not found' }, 404);
    }

    const newQuantity = batch.quantityAvailable + quantity;

    if (newQuantity < 0) {
      return c.json({ error: 'Insufficient quantity in batch' }, 400);
    }

    // Update batch quantity
    await db
      .update(inventoryBatches)
      .set({
        quantityAvailable: newQuantity,
        updatedAt: new Date(),
      })
      .where(eq(inventoryBatches.id, id))
      .run();

    // Update parent inventory
    const inv = await db.select().from(inventory).where(eq(inventory.id, batch.inventoryId)).get();

    if (inv) {
      await db
        .update(inventory)
        .set({
          quantityAvailable: inv.quantityAvailable + quantity,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, batch.inventoryId))
        .run();
    }

    // Create movement record
    const movementId = generateId();
    await db
      .insert(inventoryMovements)
      .values({
        id: movementId,
        inventoryId: batch.inventoryId,
        productId: batch.productId,
        warehouseId: batch.warehouseId,
        movementType: quantity > 0 ? 'in' : 'out',
        quantity,
        source: 'warehouse',
        referenceType: 'batch',
        referenceId: id,
        reason,
        notes: notes || null,
        performedBy: performedBy || null,
        deletedAt: null,
        deletedBy: null,
        createdAt: new Date(),
      })
      .run();

    return c.json({
      message: 'Batch quantity adjusted',
      batch: {
        id,
        previousQuantity: batch.quantityAvailable,
        newQuantity,
        adjustment: quantity,
      },
    });
  }
);

// PATCH /api/batches/:id/status - Update batch status
app.patch(
  '/:id/status',
  zValidator(
    'json',
    z.object({
      status: z.enum(['active', 'expired', 'quarantined', 'recalled']),
      reason: z.string().optional(),
      updatedBy: z.string().optional(),
    })
  ),
  async (c) => {
    const id = c.req.param('id');
    const { status, reason, updatedBy } = c.req.valid('json');
    const db = drizzle(c.env.DB);

    const batch = await db.select().from(inventoryBatches).where(eq(inventoryBatches.id, id)).get();

    if (!batch) {
      return c.json({ error: 'Batch not found' }, 404);
    }

    const updateData: any = {
      status,
      updatedAt: new Date(),
      updatedBy: updatedBy || null,
    };

    if (status === 'quarantined') {
      updateData.quarantineReason = reason || null;
    } else if (status === 'recalled') {
      updateData.recallReason = reason || null;
    }

    await db.update(inventoryBatches).set(updateData).where(eq(inventoryBatches.id, id)).run();

    return c.json({
      message: `Batch status updated to ${status}`,
      batch: {
        id,
        previousStatus: batch.status,
        newStatus: status,
        reason: reason || null,
      },
    });
  }
);

// DELETE /api/batches/:id - Soft delete batch
app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const batch = await db
    .select()
    .from(inventoryBatches)
    .where(and(eq(inventoryBatches.id, id), isNull(inventoryBatches.deletedAt)))
    .get();

  if (!batch) {
    return c.json({ error: 'Batch not found' }, 404);
  }

  // Update parent inventory to deduct this batch's quantity
  const inv = await db.select().from(inventory).where(eq(inventory.id, batch.inventoryId)).get();

  if (inv) {
    await db
      .update(inventory)
      .set({
        quantityAvailable: Math.max(0, inv.quantityAvailable - batch.quantityAvailable),
        updatedAt: new Date(),
      })
      .where(eq(inventory.id, batch.inventoryId))
      .run();
  }

  // Soft delete the batch
  await db
    .update(inventoryBatches)
    .set({
      deletedAt: new Date(),
      deletedBy: null, // TODO: Get from auth context when implemented
      status: 'expired', // Mark as expired when soft deleted
      updatedAt: new Date(),
    })
    .where(eq(inventoryBatches.id, id))
    .run();

  return c.json({ message: 'Batch deleted successfully' });
});

export default app;
