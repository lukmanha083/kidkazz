import { zValidator } from '@hono/zod-validator';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import { z } from 'zod';
import { generateId } from '../../../shared/utils/helpers';
import { productUOMLocations, productUOMs } from '../../db/schema';

/**
 * Product UOM Locations Routes - DDD Phase 5 Refactored
 *
 * This module manages physical location mapping only (rack, bin, zone, aisle).
 * All stock/quantity data is now managed by Inventory Service.
 *
 * To get stock at locations, use:
 * - Inventory Service: GET /api/inventory/uom/:uomId
 * - Or the helper endpoint: GET /api/product-uom-locations/uom/:productUOMId/with-stock
 */

type Bindings = {
  DB: D1Database;
  INVENTORY_SERVICE: Fetcher;
};

const app = new Hono<{ Bindings: Bindings }>();

// Validation schemas - Phase 5: quantity removed
const createUOMLocationSchema = z.object({
  productUOMId: z.string(),
  warehouseId: z.string(),
  rack: z.string().optional().nullable(),
  bin: z.string().optional().nullable(),
  zone: z.string().optional().nullable(),
  aisle: z.string().optional().nullable(),
  // REMOVED: quantity - now managed by Inventory Service
});

const updateUOMLocationSchema = createUOMLocationSchema.partial().omit({ productUOMId: true });

// REMOVED: validateUOMStockPerWarehouse function
// Stock validation is now handled by Inventory Service

// GET /api/product-uom-locations - List all product UOM locations with optional filters
app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const productUOMId = c.req.query('productUOMId');
  const warehouseId = c.req.query('warehouseId');
  const productId = c.req.query('productId');

  const query = db.select().from(productUOMLocations);

  // Apply filters
  const conditions = [];
  if (productUOMId) {
    conditions.push(eq(productUOMLocations.productUOMId, productUOMId));
  }
  if (warehouseId) {
    conditions.push(eq(productUOMLocations.warehouseId, warehouseId));
  }

  // If filtering by productId, need to join with productUOMs table
  if (productId) {
    const uoms = await db
      .select()
      .from(productUOMs)
      .where(eq(productUOMs.productId, productId))
      .all();

    const uomIds = uoms.map((uom) => uom.id);
    if (uomIds.length > 0) {
      // Get locations for all UOMs of this product
      const locations = await db.select().from(productUOMLocations).all();

      const filteredLocations = locations.filter((loc) => uomIds.includes(loc.productUOMId));
      return c.json({
        locations: filteredLocations,
        total: filteredLocations.length,
      });
    }
    return c.json({
      locations: [],
      total: 0,
    });
  }

  const locations =
    conditions.length > 0 ? await query.where(and(...conditions)).all() : await query.all();

  return c.json({
    locations,
    total: locations.length,
  });
});

// GET /api/product-uom-locations/:id - Get UOM location by ID
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const location = await db
    .select()
    .from(productUOMLocations)
    .where(eq(productUOMLocations.id, id))
    .get();

  if (!location) {
    return c.json({ error: 'UOM location not found' }, 404);
  }

  return c.json(location);
});

// GET /api/product-uom-locations/uom/:productUOMId - Get all locations for a product UOM
app.get('/uom/:productUOMId', async (c) => {
  const productUOMId = c.req.param('productUOMId');
  const db = drizzle(c.env.DB);

  const locations = await db
    .select()
    .from(productUOMLocations)
    .where(eq(productUOMLocations.productUOMId, productUOMId))
    .all();

  return c.json({
    locations,
    total: locations.length,
  });
});

/**
 * GET /api/product-uom-locations/uom/:productUOMId/with-stock
 * Helper endpoint that combines location data with stock from Inventory Service
 * This provides a unified view for clients that need both location and stock data
 */
app.get('/uom/:productUOMId/with-stock', async (c) => {
  const productUOMId = c.req.param('productUOMId');
  const db = drizzle(c.env.DB);

  // Get physical locations from Product Service
  const locations = await db
    .select()
    .from(productUOMLocations)
    .where(eq(productUOMLocations.productUOMId, productUOMId))
    .all();

  // Get UOM details for context
  const productUOM = await db
    .select()
    .from(productUOMs)
    .where(eq(productUOMs.id, productUOMId))
    .get();

  // Get stock data from Inventory Service
  let inventoryData: any[] = [];
  try {
    const inventoryResponse = await c.env.INVENTORY_SERVICE.fetch(
      new Request(`http://inventory-service/api/inventory/uom/${productUOMId}`)
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
      uomCode: productUOM?.uomCode,
      uomName: productUOM?.uomName,
      conversionFactor: productUOM?.conversionFactor,
    };
  });

  return c.json({
    locations: locationsWithStock,
    total: locationsWithStock.length,
    note: 'Stock data fetched from Inventory Service (DDD Phase 5)',
  });
});

// GET /api/product-uom-locations/warehouse/:warehouseId - Get all UOM locations in a warehouse
app.get('/warehouse/:warehouseId', async (c) => {
  const warehouseId = c.req.param('warehouseId');
  const db = drizzle(c.env.DB);

  const locations = await db
    .select()
    .from(productUOMLocations)
    .where(eq(productUOMLocations.warehouseId, warehouseId))
    .all();

  return c.json({
    locations,
    total: locations.length,
  });
});

// POST /api/product-uom-locations - Create new UOM location (physical location only)
app.post('/', zValidator('json', createUOMLocationSchema), async (c) => {
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  // Verify productUOM exists
  const productUOM = await db
    .select()
    .from(productUOMs)
    .where(eq(productUOMs.id, data.productUOMId))
    .get();

  if (!productUOM) {
    return c.json({ error: 'Product UOM not found' }, 404);
  }

  // Check if location already exists for this productUOM + warehouse combination
  const existingLocation = await db
    .select()
    .from(productUOMLocations)
    .where(
      and(
        eq(productUOMLocations.productUOMId, data.productUOMId),
        eq(productUOMLocations.warehouseId, data.warehouseId)
      )
    )
    .get();

  if (existingLocation) {
    return c.json(
      {
        error:
          'UOM location already exists for this product UOM in this warehouse. Use PUT to update.',
      },
      400
    );
  }

  // DDD Phase 5: Stock validation removed
  // Stock is now managed by Inventory Service

  const now = new Date();
  const newLocation = {
    id: generateId(),
    productUOMId: data.productUOMId,
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

  await db.insert(productUOMLocations).values(newLocation).run();

  const created = await db
    .select()
    .from(productUOMLocations)
    .where(eq(productUOMLocations.id, newLocation.id))
    .get();

  // DDD Phase 5: No longer validating or syncing stock here
  // Stock management is the responsibility of Inventory Service

  return c.json(created, 201);
});

// PUT /api/product-uom-locations/:id - Update UOM location (physical location only)
app.put('/:id', zValidator('json', updateUOMLocationSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const existingLocation = await db
    .select()
    .from(productUOMLocations)
    .where(eq(productUOMLocations.id, id))
    .get();

  if (!existingLocation) {
    return c.json({ error: 'UOM location not found' }, 404);
  }

  const updateData: any = {
    ...data,
    updatedAt: new Date(),
  };

  await db.update(productUOMLocations).set(updateData).where(eq(productUOMLocations.id, id)).run();

  const updated = await db
    .select()
    .from(productUOMLocations)
    .where(eq(productUOMLocations.id, id))
    .get();

  // DDD Phase 5: No longer validating or syncing stock here
  // Stock management is the responsibility of Inventory Service

  return c.json(updated);
});

// REMOVED: PATCH /:id/quantity - Use Inventory Service POST /api/inventory/uom/:uomId/adjust instead

// DELETE /api/product-uom-locations/:id - Delete UOM location
app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const existingLocation = await db
    .select()
    .from(productUOMLocations)
    .where(eq(productUOMLocations.id, id))
    .get();

  if (!existingLocation) {
    return c.json({ error: 'UOM location not found' }, 404);
  }

  await db.delete(productUOMLocations).where(eq(productUOMLocations.id, id)).run();

  return c.json({ message: 'UOM location deleted successfully' });
});

export default app;
