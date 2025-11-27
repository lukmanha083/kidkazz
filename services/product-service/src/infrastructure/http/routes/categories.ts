import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { categories } from '../../db/schema';
import { generateId, generateTimestamp } from '../../../shared/utils/helpers';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// Validation schemas
const createCategorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
  parentId: z.string().optional().nullable(),
});

const updateCategorySchema = createCategorySchema.partial();

// GET /api/categories - List all categories
app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const allCategories = await db.select().from(categories).all();

  return c.json({
    categories: allCategories,
    total: allCategories.length,
  });
});

// GET /api/categories/active - List active categories
app.get('/active', async (c) => {
  const db = drizzle(c.env.DB);
  const activeCategories = await db
    .select()
    .from(categories)
    .where(eq(categories.status, 'active'))
    .all();

  return c.json({
    categories: activeCategories,
    total: activeCategories.length,
  });
});

// GET /api/categories/:id - Get category by ID
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const category = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .get();

  if (!category) {
    return c.json({ error: 'Category not found' }, 404);
  }

  return c.json(category);
});

// POST /api/categories - Create new category
app.post('/', zValidator('json', createCategorySchema), async (c) => {
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const now = new Date();
  const newCategory = {
    id: generateId(),
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(categories).values(newCategory).run();

  return c.json(newCategory, 201);
});

// PUT /api/categories/:id - Update category
app.put('/:id', zValidator('json', updateCategorySchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const existing = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Category not found' }, 404);
  }

  await db
    .update(categories)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(categories.id, id))
    .run();

  const updated = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .get();

  return c.json(updated);
});

// DELETE /api/categories/:id - Delete category
app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  await db.delete(categories).where(eq(categories.id, id)).run();

  return c.json({ message: 'Category deleted successfully' });
});

export default app;
