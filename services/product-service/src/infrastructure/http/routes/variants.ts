import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import { productVariants } from '../../db/schema';
import { generateId } from '../../../shared/utils/helpers';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// Validation schemas
const createVariantSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  productSKU: z.string(),
  variantName: z.string(),
  variantSKU: z.string(),
  variantType: z.enum(['Color', 'Size', 'Material', 'Style']),
  price: z.number(),
  stock: z.number().default(0),
  status: z.enum(['active', 'inactive']).default('active'),
  image: z.string().optional().nullable(),
});

const updateVariantSchema = createVariantSchema.partial().omit({ productId: true });

// GET /api/variants - List all variants
app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const productId = c.req.query('productId');

  let query = db.select().from(productVariants);

  const allVariants = productId
    ? await query.where(eq(productVariants.productId, productId)).all()
    : await query.all();

  return c.json({
    variants: allVariants,
    total: allVariants.length,
  });
});

// GET /api/variants/:id - Get variant by ID
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const variant = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.id, id))
    .get();

  if (!variant) {
    return c.json({ error: 'Variant not found' }, 404);
  }

  return c.json(variant);
});

// POST /api/variants - Create new variant
app.post('/', zValidator('json', createVariantSchema), async (c) => {
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const now = new Date();
  const newVariant = {
    id: generateId(),
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(productVariants).values(newVariant).run();

  return c.json(newVariant, 201);
});

// PUT /api/variants/:id - Update variant
app.put('/:id', zValidator('json', updateVariantSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const existing = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Variant not found' }, 404);
  }

  await db
    .update(productVariants)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(productVariants.id, id))
    .run();

  const updated = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.id, id))
    .get();

  return c.json(updated);
});

// PATCH /api/variants/:id/stock - Update variant stock
// NOTE: This route is deprecated after DDD Phase 4 refactoring
// Stock is now managed by Inventory Service
/* DEPRECATED - Commented out during DDD refactoring
app.patch('/:id/stock', zValidator('json', z.object({
  stock: z.number(),
})), async (c) => {
  const id = c.req.param('id');
  const { stock } = c.req.valid('json');
  const db = drizzle(c.env.DB);

  await db
    .update(productVariants)
    .set({ stock, updatedAt: new Date() })
    .where(eq(productVariants.id, id))
    .run();

  return c.json({ message: 'Stock updated successfully' });
});
*/

// DELETE /api/variants/:id - Delete variant
app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  await db.delete(productVariants).where(eq(productVariants.id, id)).run();

  return c.json({ message: 'Variant deleted successfully' });
});

export default app;
