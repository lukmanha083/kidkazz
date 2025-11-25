import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import { variantLocations } from '../../db/schema';
import { generateId } from '../../../shared/utils/helpers';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// Validation schemas
const createLocationSchema = z.object({
  variantId: z.string(),
  warehouseId: z.string(),
  rack: z.string().optional().nullable(),
  bin: z.string().optional().nullable(),
  zone: z.string().optional().nullable(),
  aisle: z.string().optional().nullable(),
  quantity: z.number().int().min(0).default(0),
});

const updateLocationSchema = createLocationSchema.partial().omit({ variantId: true });

// GET /api/variant-locations - List all variant locations
app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const variantId = c.req.query('variantId');
  const warehouseId = c.req.query('warehouseId');

  let query = db.select().from(variantLocations);

  // Apply filters
  const conditions = [];
  if (variantId) {
    conditions.push(eq(variantLocations.variantId, variantId));
  }
  if (warehouseId) {
    conditions.push(eq(variantLocations.warehouseId, warehouseId));
  }

  const locations = conditions.length > 0
    ? await query.where(and(...conditions)).all()
    : await query.all();

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

// POST /api/variant-locations - Create new location
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

  const now = new Date();
  const newLocation = {
    id: generateId(),
    variantId: data.variantId,
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

  await db.insert(variantLocations).values(newLocation).run();

  const created = await db
    .select()
    .from(variantLocations)
    .where(eq(variantLocations.id, newLocation.id))
    .get();

  return c.json(created, 201);
});

// PUT /api/variant-locations/:id - Update location
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

  await db
    .update(variantLocations)
    .set(updateData)
    .where(eq(variantLocations.id, id))
    .run();

  const updated = await db
    .select()
    .from(variantLocations)
    .where(eq(variantLocations.id, id))
    .get();

  return c.json(updated);
});

// PATCH /api/variant-locations/:id/quantity - Update location quantity
app.patch('/:id/quantity', zValidator('json', z.object({ quantity: z.number().int().min(0) })), async (c) => {
  const id = c.req.param('id');
  const { quantity } = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const existingLocation = await db
    .select()
    .from(variantLocations)
    .where(eq(variantLocations.id, id))
    .get();

  if (!existingLocation) {
    return c.json({ error: 'Variant location not found' }, 404);
  }

  await db
    .update(variantLocations)
    .set({
      quantity,
      updatedAt: new Date(),
    })
    .where(eq(variantLocations.id, id))
    .run();

  return c.json({ message: 'Quantity updated successfully' });
});

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
