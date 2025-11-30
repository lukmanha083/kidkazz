import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import { productLocations, products } from '../../db/schema';
import { generateId } from '../../../shared/utils/helpers';

type Bindings = {
  DB: D1Database;
  INVENTORY_SERVICE: Fetcher;
};

const app = new Hono<{ Bindings: Bindings }>();

// Validation schemas
const createLocationSchema = z.object({
  productId: z.string(),
  warehouseId: z.string(),
  rack: z.string().optional().nullable(),
  bin: z.string().optional().nullable(),
  zone: z.string().optional().nullable(),
  aisle: z.string().optional().nullable(),
  quantity: z.number().int().min(0).default(0),
});

const updateLocationSchema = createLocationSchema.partial().omit({ productId: true });

// GET /api/product-locations - List all product locations
app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const productId = c.req.query('productId');
  const warehouseId = c.req.query('warehouseId');

  let query = db.select().from(productLocations);

  // Apply filters
  const conditions = [];
  if (productId) {
    conditions.push(eq(productLocations.productId, productId));
  }
  if (warehouseId) {
    conditions.push(eq(productLocations.warehouseId, warehouseId));
  }

  const locations = conditions.length > 0
    ? await query.where(and(...conditions)).all()
    : await query.all();

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

// POST /api/product-locations - Create new location
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
    quantity: data.quantity,
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

  // DDD FIX: Create/update inventory record in Inventory Service
  // This ensures inventory tracking is synchronized with product locations
  try {
    // Get product details for minimumStock
    const product = await db
      .select()
      .from(products)
      .where(eq(products.id, data.productId))
      .get();

    // Check if inventory record already exists
    const inventoryCheckResponse = await c.env.INVENTORY_SERVICE.fetch(
      new Request(`http://inventory-service/api/inventory/${data.productId}/${data.warehouseId}`)
    );

    if (inventoryCheckResponse.status === 404) {
      // Inventory record doesn't exist, create it via adjust endpoint
      const adjustResponse = await c.env.INVENTORY_SERVICE.fetch(
        new Request('http://inventory-service/api/inventory/adjust', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: data.productId,
            warehouseId: data.warehouseId,
            quantity: data.quantity,
            movementType: 'adjustment',
            reason: 'Product location created',
            notes: `Initial stock from product location creation`,
          }),
        })
      );

      if (adjustResponse.ok) {
        const invData = await adjustResponse.json();
        const inventoryId = invData.inventory?.id;

        // Set minimumStock if product has it defined
        if (inventoryId && product?.minimumStock) {
          await c.env.INVENTORY_SERVICE.fetch(
            new Request(`http://inventory-service/api/inventory/${inventoryId}/minimum-stock`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ minimumStock: product.minimumStock }),
            })
          );
        }
        console.log(`✅ Created inventory record for product ${data.productId} at warehouse ${data.warehouseId}`);
      }
    } else if (inventoryCheckResponse.ok) {
      // Inventory exists, update the quantity
      await c.env.INVENTORY_SERVICE.fetch(
        new Request('http://inventory-service/api/inventory/adjust', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: data.productId,
            warehouseId: data.warehouseId,
            quantity: data.quantity,
            movementType: 'adjustment',
            reason: 'Product location updated',
            notes: `Stock adjusted from product location update`,
          }),
        })
      );
      console.log(`✅ Updated inventory record for product ${data.productId} at warehouse ${data.warehouseId}`);
    }
  } catch (invError) {
    console.error('❌ Failed to create/update inventory record:', invError);
    // Don't fail the entire request if inventory sync fails
    // The product location was still created successfully
  }

  return c.json(created, 201);
});

// PUT /api/product-locations/:id - Update location
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

  await db
    .update(productLocations)
    .set(updateData)
    .where(eq(productLocations.id, id))
    .run();

  const updated = await db
    .select()
    .from(productLocations)
    .where(eq(productLocations.id, id))
    .get();

  // DDD FIX: Sync inventory if quantity changed
  if (data.quantity !== undefined && updated) {
    try {
      await c.env.INVENTORY_SERVICE.fetch(
        new Request('http://inventory-service/api/inventory/adjust', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: updated.productId,
            warehouseId: updated.warehouseId,
            quantity: data.quantity,
            movementType: 'adjustment',
            reason: 'Product location quantity updated',
            notes: `Quantity adjusted from product location update`,
          }),
        })
      );
      console.log(`✅ Synced inventory for product ${updated.productId} at warehouse ${updated.warehouseId}`);
    } catch (invError) {
      console.error('❌ Failed to sync inventory on location update:', invError);
    }
  }

  return c.json(updated);
});

// PATCH /api/product-locations/:id/quantity - Update location quantity
app.patch('/:id/quantity', zValidator('json', z.object({ quantity: z.number().int().min(0) })), async (c) => {
  const id = c.req.param('id');
  const { quantity } = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const existingLocation = await db
    .select()
    .from(productLocations)
    .where(eq(productLocations.id, id))
    .get();

  if (!existingLocation) {
    return c.json({ error: 'Location not found' }, 404);
  }

  await db
    .update(productLocations)
    .set({
      quantity,
      updatedAt: new Date(),
    })
    .where(eq(productLocations.id, id))
    .run();

  return c.json({ message: 'Quantity updated successfully' });
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
