import { zValidator } from '@hono/zod-validator';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import { z } from 'zod';
import { generateId } from '../../../shared/utils/helpers';
import { productLocations } from '../../db/schema';

/**
 * Product Locations Routes - DDD Phase 5 Refactored
 *
 * This module manages physical location mapping only (rack, bin, zone, aisle).
 * All stock/quantity data is now managed by Inventory Service.
 *
 * To get stock at locations, use:
 * - Inventory Service: GET /api/inventory/:productId
 * - Or the helper endpoint: GET /api/product-locations/product/:productId/with-stock
 */

type Bindings = {
  DB: D1Database;
  INVENTORY_SERVICE: Fetcher;
};

const app = new Hono<{ Bindings: Bindings }>();

// Validation schemas - Phase 5: quantity removed
const createLocationSchema = z.object({
  productId: z.string(),
  warehouseId: z.string(),
  rack: z.string().optional().nullable(),
  bin: z.string().optional().nullable(),
  zone: z.string().optional().nullable(),
  aisle: z.string().optional().nullable(),
  // REMOVED: quantity - now managed by Inventory Service
});

const updateLocationSchema = createLocationSchema.partial().omit({ productId: true });

// GET /api/product-locations - List all product locations
app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const productId = c.req.query('productId');
  const warehouseId = c.req.query('warehouseId');

  const query = db.select().from(productLocations);

  // Apply filters
  const conditions = [];
  if (productId) {
    conditions.push(eq(productLocations.productId, productId));
  }
  if (warehouseId) {
    conditions.push(eq(productLocations.warehouseId, warehouseId));
  }

  const locations =
    conditions.length > 0 ? await query.where(and(...conditions)).all() : await query.all();

  return c.json({
    locations,
    total: locations.length,
  });
});

// GET /api/product-locations/:id - Get location by ID
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const location = await db
    .select()
    .from(productLocations)
    .where(eq(productLocations.id, id))
    .get();

  if (!location) {
    return c.json({ error: 'Location not found' }, 404);
  }

  return c.json(location);
});

// GET /api/product-locations/product/:productId - Get all locations for a product
app.get('/product/:productId', async (c) => {
  const productId = c.req.param('productId');
  const db = drizzle(c.env.DB);

  const locations = await db
    .select()
    .from(productLocations)
    .where(eq(productLocations.productId, productId))
    .all();

  return c.json({
    locations,
    total: locations.length,
  });
});

/**
 * GET /api/product-locations/product/:productId/with-stock
 * Helper endpoint that combines location data with stock from Inventory Service
 * This provides a unified view for clients that need both location and stock data
 */
app.get('/product/:productId/with-stock', async (c) => {
  const productId = c.req.param('productId');
  const db = drizzle(c.env.DB);

  // Get physical locations from Product Service
  const locations = await db
    .select()
    .from(productLocations)
    .where(eq(productLocations.productId, productId))
    .all();

  // Get stock data from Inventory Service
  let inventoryData: any[] = [];
  try {
    const inventoryResponse = await c.env.INVENTORY_SERVICE.fetch(
      new Request(`http://inventory-service/api/inventory/product/${productId}`)
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
      minimumStock: inventory?.minimumStock || null,
      inventoryId: inventory?.id || null,
    };
  });

  return c.json({
    locations: locationsWithStock,
    total: locationsWithStock.length,
    note: 'Stock data fetched from Inventory Service (DDD Phase 5)',
  });
});

// GET /api/product-locations/warehouse/:warehouseId - Get all locations in a warehouse
app.get('/warehouse/:warehouseId', async (c) => {
  const warehouseId = c.req.param('warehouseId');
  const db = drizzle(c.env.DB);

  const locations = await db
    .select()
    .from(productLocations)
    .where(eq(productLocations.warehouseId, warehouseId))
    .all();

  return c.json({
    locations,
    total: locations.length,
  });
});

// POST /api/product-locations - Create new location (physical location only)
app.post('/', zValidator('json', createLocationSchema), async (c) => {
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  // Check if location already exists for this product + warehouse combination
  const existingLocation = await db
    .select()
    .from(productLocations)
    .where(
      and(
        eq(productLocations.productId, data.productId),
        eq(productLocations.warehouseId, data.warehouseId)
      )
    )
    .get();

  if (existingLocation) {
    return c.json(
      {
        error: 'Location already exists for this product in this warehouse. Use PUT to update.',
      },
      400
    );
  }

  const now = new Date();
  const newLocation = {
    id: generateId(),
    productId: data.productId,
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

  await db.insert(productLocations).values(newLocation).run();

  const created = await db
    .select()
    .from(productLocations)
    .where(eq(productLocations.id, newLocation.id))
    .get();

  // DDD Phase 5: No longer syncing inventory here
  // Stock management is the responsibility of Inventory Service
  // Use POST /api/inventory/adjust for stock operations

  return c.json(created, 201);
});

// PUT /api/product-locations/:id - Update location (physical location only)
app.put('/:id', zValidator('json', updateLocationSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const existingLocation = await db
    .select()
    .from(productLocations)
    .where(eq(productLocations.id, id))
    .get();

  if (!existingLocation) {
    return c.json({ error: 'Location not found' }, 404);
  }

  const updateData: any = {
    ...data,
    updatedAt: new Date(),
  };

  await db.update(productLocations).set(updateData).where(eq(productLocations.id, id)).run();

  const updated = await db.select().from(productLocations).where(eq(productLocations.id, id)).get();

  // DDD Phase 5: No longer syncing inventory here
  // Stock management is the responsibility of Inventory Service

  return c.json(updated);
});

// REMOVED: PATCH /:id/quantity - Use Inventory Service POST /api/inventory/adjust instead

// DELETE /api/product-locations/warehouse/:warehouseId - Delete all locations for a warehouse
app.delete('/warehouse/:warehouseId', async (c) => {
  const warehouseId = c.req.param('warehouseId');
  const db = drizzle(c.env.DB);

  // 1. Get all locations for this warehouse before deletion
  const locations = await db
    .select()
    .from(productLocations)
    .where(eq(productLocations.warehouseId, warehouseId))
    .all();

  if (locations.length === 0) {
    return c.json({
      message: 'No product locations found for this warehouse',
      deletedLocations: 0,
    });
  }

  const productIds = [...new Set(locations.map((loc) => loc.productId))];

  // 2. Delete all product locations for this warehouse
  await db.delete(productLocations).where(eq(productLocations.warehouseId, warehouseId)).run();

  console.log(
    `Cascade delete - Warehouse ${warehouseId}: Deleted ${locations.length} product locations (${productIds.length} unique products)`
  );

  return c.json({
    message: 'Warehouse product locations deleted successfully',
    warehouseId,
    deletedLocations: locations.length,
    affectedProducts: productIds.length,
    products: productIds,
  });
});

// DELETE /api/product-locations/:id - Delete location
app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const existingLocation = await db
    .select()
    .from(productLocations)
    .where(eq(productLocations.id, id))
    .get();

  if (!existingLocation) {
    return c.json({ error: 'Location not found' }, 404);
  }

  await db.delete(productLocations).where(eq(productLocations.id, id)).run();

  return c.json({ message: 'Location deleted successfully' });
});

export default app;
