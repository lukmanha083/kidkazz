import { zValidator } from '@hono/zod-validator';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import { z } from 'zod';
import { generateId } from '../../../shared/utils/helpers';
import { productVariants, variantLocations } from '../../db/schema';

/**
 * Variant Locations Routes - DDD Phase 5 Refactored
 *
 * This module manages physical location mapping only (rack, bin, zone, aisle).
 * All stock/quantity data is now managed by Inventory Service.
 *
 * To get stock at locations, use:
 * - Inventory Service: GET /api/inventory/variant/:variantId
 * - Or the helper endpoint: GET /api/variant-locations/variant/:variantId/with-stock
 */

type Bindings = {
  DB: D1Database;
  INVENTORY_SERVICE: Fetcher;
};

const app = new Hono<{ Bindings: Bindings }>();

// Validation schemas - Phase 5: quantity removed
const createLocationSchema = z.object({
  variantId: z.string(),
  warehouseId: z.string(),
  rack: z.string().optional().nullable(),
  bin: z.string().optional().nullable(),
  zone: z.string().optional().nullable(),
  aisle: z.string().optional().nullable(),
  // REMOVED: quantity - now managed by Inventory Service
});

const updateLocationSchema = createLocationSchema.partial().omit({ variantId: true });

// REMOVED: validateVariantStockPerWarehouse function
// Stock validation is now handled by Inventory Service

// GET /api/variant-locations - List all variant locations
app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const variantId = c.req.query('variantId');
  const warehouseId = c.req.query('warehouseId');

  const query = db.select().from(variantLocations);

  // Apply filters
  const conditions = [];
  if (variantId) {
    conditions.push(eq(variantLocations.variantId, variantId));
  }
  if (warehouseId) {
    conditions.push(eq(variantLocations.warehouseId, warehouseId));
  }

  const locations =
    conditions.length > 0 ? await query.where(and(...conditions)).all() : await query.all();

  return c.json({
    variantLocations: locations,
    total: locations.length,
  });
});

// GET /api/variant-locations/:id - Get location by ID
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const location = await db
    .select()
    .from(variantLocations)
    .where(eq(variantLocations.id, id))
    .get();

  if (!location) {
    return c.json({ error: 'Variant location not found' }, 404);
  }

  return c.json(location);
});

// GET /api/variant-locations/variant/:variantId - Get all locations for a variant
app.get('/variant/:variantId', async (c) => {
  const variantId = c.req.param('variantId');
  const db = drizzle(c.env.DB);

  const locations = await db
    .select()
    .from(variantLocations)
    .where(eq(variantLocations.variantId, variantId))
    .all();

  return c.json({
    variantLocations: locations,
    total: locations.length,
  });
});

/**
 * GET /api/variant-locations/variant/:variantId/with-stock
 * Helper endpoint that combines location data with stock from Inventory Service
 * This provides a unified view for clients that need both location and stock data
 */
app.get('/variant/:variantId/with-stock', async (c) => {
  const variantId = c.req.param('variantId');
  const db = drizzle(c.env.DB);

  // Get physical locations from Product Service
  const locations = await db
    .select()
    .from(variantLocations)
    .where(eq(variantLocations.variantId, variantId))
    .all();

  // Get stock data from Inventory Service
  let inventoryData: any[] = [];
  try {
    const inventoryResponse = await c.env.INVENTORY_SERVICE.fetch(
      new Request(`http://inventory-service/api/inventory/variant/${variantId}`)
    );
    if (inventoryResponse.ok) {
      const result = await inventoryResponse.json();
      inventoryData = (result as any).inventories || [];
    }
  } catch (error) {
    console.error('Failed to fetch inventory data:', error);
  }

  // Merge location data with stock data
  const locationsWithStock = locations.map((location) => {
    const inventory = inventoryData.find((inv: any) => inv.warehouseId === location.warehouseId);
    return {
      ...location,
      quantity: inventory?.quantity || 0,
      reservedQuantity: inventory?.reservedQuantity || 0,
      availableQuantity: inventory?.availableQuantity || 0,
      inventoryId: inventory?.id || null,
    };
  });

  return c.json({
    variantLocations: locationsWithStock,
    total: locationsWithStock.length,
    note: 'Stock data fetched from Inventory Service (DDD Phase 5)',
  });
});

// GET /api/variant-locations/warehouse/:warehouseId - Get all variant locations in a warehouse
app.get('/warehouse/:warehouseId', async (c) => {
  const warehouseId = c.req.param('warehouseId');
  const db = drizzle(c.env.DB);

  const locations = await db
    .select()
    .from(variantLocations)
    .where(eq(variantLocations.warehouseId, warehouseId))
    .all();

  return c.json({
    variantLocations: locations,
    total: locations.length,
  });
});

// POST /api/variant-locations - Create new location (physical location only)
app.post('/', zValidator('json', createLocationSchema), async (c) => {
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  // Check if location already exists for this variant + warehouse combination
  const existingLocation = await db
    .select()
    .from(variantLocations)
    .where(
      and(
        eq(variantLocations.variantId, data.variantId),
        eq(variantLocations.warehouseId, data.warehouseId)
      )
    )
    .get();

  if (existingLocation) {
    return c.json(
      {
        error: 'Location already exists for this variant in this warehouse. Use PUT to update.',
      },
      400
    );
  }

  // Verify variant exists
  const variant = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.id, data.variantId))
    .get();

  if (!variant) {
    return c.json({ error: 'Variant not found' }, 404);
  }

  // DDD Phase 5: Stock validation removed
  // Stock is now managed by Inventory Service

  const now = new Date();
  const newLocation = {
    id: generateId(),
    variantId: data.variantId,
    warehouseId: data.warehouseId,
    rack: data.rack || null,
    bin: data.bin || null,
    zone: data.zone || null,
    aisle: data.aisle || null,
    // REMOVED: quantity - use Inventory Service for stock management
    createdAt: now,
    updatedAt: now,
    createdBy: null,
    updatedBy: null,
  };

  await db.insert(variantLocations).values(newLocation).run();

  const created = await db
    .select()
    .from(variantLocations)
    .where(eq(variantLocations.id, newLocation.id))
    .get();

  // DDD Phase 5: No longer validating or syncing stock here
  // Stock management is the responsibility of Inventory Service

  return c.json(created, 201);
});

// PUT /api/variant-locations/:id - Update location (physical location only)
app.put('/:id', zValidator('json', updateLocationSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const existingLocation = await db
    .select()
    .from(variantLocations)
    .where(eq(variantLocations.id, id))
    .get();

  if (!existingLocation) {
    return c.json({ error: 'Variant location not found' }, 404);
  }

  const updateData: any = {
    ...data,
    updatedAt: new Date(),
  };

  await db.update(variantLocations).set(updateData).where(eq(variantLocations.id, id)).run();

  const updated = await db.select().from(variantLocations).where(eq(variantLocations.id, id)).get();

  // DDD Phase 5: No longer validating or syncing stock here
  // Stock management is the responsibility of Inventory Service

  return c.json(updated);
});

// REMOVED: PATCH /:id/quantity - Use Inventory Service POST /api/inventory/variant/:variantId/adjust instead

// DELETE /api/variant-locations/:id - Delete location
app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const existingLocation = await db
    .select()
    .from(variantLocations)
    .where(eq(variantLocations.id, id))
    .get();

  if (!existingLocation) {
    return c.json({ error: 'Variant location not found' }, 404);
  }

  await db.delete(variantLocations).where(eq(variantLocations.id, id)).run();

  return c.json({ message: 'Variant location deleted successfully' });
});

export default app;
