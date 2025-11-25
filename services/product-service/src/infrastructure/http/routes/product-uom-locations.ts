import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import { productUOMLocations, productUOMs } from '../../db/schema';
import { generateId } from '../../../shared/utils/helpers';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// Validation schemas
const createUOMLocationSchema = z.object({
  productUOMId: z.string(),
  warehouseId: z.string(),
  rack: z.string().optional().nullable(),
  bin: z.string().optional().nullable(),
  zone: z.string().optional().nullable(),
  aisle: z.string().optional().nullable(),
  quantity: z.number().int().min(0).default(0),
});

const updateUOMLocationSchema = createUOMLocationSchema.partial().omit({ productUOMId: true });

// GET /api/product-uom-locations - List all product UOM locations with optional filters
app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const productUOMId = c.req.query('productUOMId');
  const warehouseId = c.req.query('warehouseId');
  const productId = c.req.query('productId');

  let query = db.select().from(productUOMLocations);

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

    const uomIds = uoms.map(uom => uom.id);
    if (uomIds.length > 0) {
      // Get locations for all UOMs of this product
      const locations = await db
        .select()
        .from(productUOMLocations)
        .all();

      const filteredLocations = locations.filter(loc => uomIds.includes(loc.productUOMId));
      return c.json({
        locations: filteredLocations,
        total: filteredLocations.length,
      });
    } else {
      return c.json({
        locations: [],
        total: 0,
      });
    }
  }

  const locations = conditions.length > 0
    ? await query.where(and(...conditions)).all()
    : await query.all();

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

// POST /api/product-uom-locations - Create new UOM location
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
        error: 'UOM location already exists for this product UOM in this warehouse. Use PUT to update.',
      },
      400
    );
  }

  const now = new Date();
  const newLocation = {
    id: generateId(),
    productUOMId: data.productUOMId,
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

  await db.insert(productUOMLocations).values(newLocation).run();

  const created = await db
    .select()
    .from(productUOMLocations)
    .where(eq(productUOMLocations.id, newLocation.id))
    .get();

  return c.json(created, 201);
});

// PUT /api/product-uom-locations/:id - Update UOM location
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

  await db
    .update(productUOMLocations)
    .set(updateData)
    .where(eq(productUOMLocations.id, id))
    .run();

  const updated = await db
    .select()
    .from(productUOMLocations)
    .where(eq(productUOMLocations.id, id))
    .get();

  return c.json(updated);
});

// PATCH /api/product-uom-locations/:id/quantity - Update UOM location quantity
app.patch('/:id/quantity', zValidator('json', z.object({ quantity: z.number().int().min(0) })), async (c) => {
  const id = c.req.param('id');
  const { quantity } = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const existingLocation = await db
    .select()
    .from(productUOMLocations)
    .where(eq(productUOMLocations.id, id))
    .get();

  if (!existingLocation) {
    return c.json({ error: 'UOM location not found' }, 404);
  }

  await db
    .update(productUOMLocations)
    .set({
      quantity,
      updatedAt: new Date(),
    })
    .where(eq(productUOMLocations.id, id))
    .run();

  return c.json({ message: 'Quantity updated successfully' });
});

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
