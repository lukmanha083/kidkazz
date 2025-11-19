import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { uoms, productUOMs } from '../../db/schema';
import { generateId } from '../../../shared/utils/helpers';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// Validation schemas
const createUOMSchema = z.object({
  code: z.string(),
  name: z.string(),
  conversionFactor: z.number(),
  isBaseUnit: z.boolean().default(false),
});

const createProductUOMSchema = z.object({
  productId: z.string(),
  uomCode: z.string(),
  uomName: z.string(),
  barcode: z.string(),
  conversionFactor: z.number(),
  stock: z.number().default(0),
  isDefault: z.boolean().default(false),
});

// GET /api/uoms - List all UOMs
app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const allUOMs = await db.select().from(uoms).all();

  return c.json({
    uoms: allUOMs,
    total: allUOMs.length,
  });
});

// GET /api/uoms/:code - Get UOM by code
app.get('/:code', async (c) => {
  const code = c.req.param('code');
  const db = drizzle(c.env.DB);

  const uom = await db
    .select()
    .from(uoms)
    .where(eq(uoms.code, code))
    .get();

  if (!uom) {
    return c.json({ error: 'UOM not found' }, 404);
  }

  return c.json(uom);
});

// POST /api/uoms - Create new UOM
app.post('/', zValidator('json', createUOMSchema), async (c) => {
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const newUOM = {
    id: generateId(),
    ...data,
    createdAt: new Date(),
  };

  await db.insert(uoms).values(newUOM).run();

  return c.json(newUOM, 201);
});

// DELETE /api/uoms/:id - Delete UOM
app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  await db.delete(uoms).where(eq(uoms.id, id)).run();

  return c.json({ message: 'UOM deleted successfully' });
});

// Product UOMs routes
// GET /api/uoms/products/:productId - Get all UOMs for a product
app.get('/products/:productId', async (c) => {
  const productId = c.req.param('productId');
  const db = drizzle(c.env.DB);

  const productUOMsList = await db
    .select()
    .from(productUOMs)
    .where(eq(productUOMs.productId, productId))
    .all();

  return c.json({
    productUOMs: productUOMsList,
    total: productUOMsList.length,
  });
});

// POST /api/uoms/products - Add UOM to product
app.post('/products', zValidator('json', createProductUOMSchema), async (c) => {
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const now = new Date();
  const newProductUOM = {
    id: generateId(),
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(productUOMs).values(newProductUOM).run();

  return c.json(newProductUOM, 201);
});

// PATCH /api/uoms/products/:id/stock - Update product UOM stock
app.patch('/products/:id/stock', zValidator('json', z.object({
  stock: z.number(),
})), async (c) => {
  const id = c.req.param('id');
  const { stock } = c.req.valid('json');
  const db = drizzle(c.env.DB);

  await db
    .update(productUOMs)
    .set({ stock, updatedAt: new Date() })
    .where(eq(productUOMs.id, id))
    .run();

  return c.json({ message: 'Stock updated successfully' });
});

// DELETE /api/uoms/products/:id - Remove UOM from product
app.delete('/products/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  await db.delete(productUOMs).where(eq(productUOMs.id, id)).run();

  return c.json({ message: 'Product UOM deleted successfully' });
});

export default app;
