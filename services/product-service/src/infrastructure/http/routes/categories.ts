import { zValidator } from '@hono/zod-validator';
import { and, eq, isNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import { z } from 'zod';
import { generateId, generateTimestamp } from '../../../shared/utils/helpers';
import { categories } from '../../db/schema';

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

// Helper function to get categories with parent names (excluding soft-deleted)
async function getCategoriesWithParentNames(db: any, includeDeleted = false) {
  // Get all categories (optionally including soft-deleted)
  const allCategories = includeDeleted
    ? await db.select().from(categories).all()
    : await db.select().from(categories).where(isNull(categories.deletedAt)).all();

  type Category = typeof categories.$inferSelect;

  // Create a map for quick parent lookup
  const categoryMap = new Map<string, Category>(
    allCategories.map((cat: Category) => [cat.id, cat])
  );

  // Add parentCategoryName to each category
  return allCategories.map((cat: Category) => ({
    ...cat,
    parentCategoryName: cat.parentId ? categoryMap.get(cat.parentId)?.name || null : null,
  }));
}

// Helper function to check if a category already has a parent (is a subcategory)
async function categoryHasParent(db: any, categoryId: string): Promise<boolean> {
  const category = await db.select().from(categories).where(eq(categories.id, categoryId)).get();

  return category && category.parentId !== null && category.parentId !== undefined;
}

// Helper function to check for circular parent reference
async function wouldCreateCircularReference(
  db: any,
  categoryId: string,
  newParentId: string
): Promise<boolean> {
  // A category cannot be its own parent
  if (categoryId === newParentId) {
    return true;
  }

  // Check if the new parent is actually a child of this category
  // This prevents circular references in 2-level hierarchy
  const allCategories = await db.select().from(categories).all();
  const childrenIds = allCategories
    .filter((cat: typeof categories.$inferSelect) => cat.parentId === categoryId)
    .map((cat: typeof categories.$inferSelect) => cat.id);

  return childrenIds.includes(newParentId);
}

// GET /api/categories - List all categories
app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const allCategories = await getCategoriesWithParentNames(db);

  return c.json({
    categories: allCategories,
    total: allCategories.length,
  });
});

// GET /api/categories/active - List active categories (excluding soft-deleted)
app.get('/active', async (c) => {
  const db = drizzle(c.env.DB);

  // Get all non-deleted categories first
  const allCategories = await db
    .select()
    .from(categories)
    .where(isNull(categories.deletedAt))
    .all();

  // Create a map for quick parent lookup
  const categoryMap = new Map(allCategories.map((cat) => [cat.id, cat]));

  // Filter active categories and add parentCategoryName
  const activeCategories = allCategories
    .filter((cat) => cat.status === 'active')
    .map((cat) => ({
      ...cat,
      parentCategoryName: cat.parentId ? categoryMap.get(cat.parentId)?.name || null : null,
    }));

  return c.json({
    categories: activeCategories,
    total: activeCategories.length,
  });
});

// GET /api/categories/:id - Get category by ID (excluding soft-deleted)
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const category = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), isNull(categories.deletedAt)))
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

  // If parentId is provided, validate it
  if (data.parentId) {
    // Check if the parent category exists
    const parentCategory = await db
      .select()
      .from(categories)
      .where(eq(categories.id, data.parentId))
      .get();

    if (!parentCategory) {
      return c.json({ error: 'Parent category not found' }, 404);
    }

    // Check if the parent already has a parent (only 2-level hierarchy: category and subcategory)
    const parentHasParent = await categoryHasParent(db, data.parentId);
    if (parentHasParent) {
      return c.json(
        {
          error: 'Invalid parent category',
          message:
            'Cannot create a subcategory under another subcategory. Only 2 levels are supported: category and subcategory.',
        },
        400
      );
    }
  }

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

  const existing = await db.select().from(categories).where(eq(categories.id, id)).get();

  if (!existing) {
    return c.json({ error: 'Category not found' }, 404);
  }

  // If updating parentId, validate it
  if (data.parentId !== undefined) {
    if (data.parentId !== null) {
      // Check if the parent category exists
      const parentCategory = await db
        .select()
        .from(categories)
        .where(eq(categories.id, data.parentId))
        .get();

      if (!parentCategory) {
        return c.json({ error: 'Parent category not found' }, 404);
      }

      // Check if the parent already has a parent (only 2-level hierarchy)
      const parentHasParent = await categoryHasParent(db, data.parentId);
      if (parentHasParent) {
        return c.json(
          {
            error: 'Invalid parent category',
            message:
              'Cannot create a subcategory under another subcategory. Only 2 levels are supported: category and subcategory.',
          },
          400
        );
      }

      // Check for circular reference
      const wouldBeCircular = await wouldCreateCircularReference(db, id, data.parentId);
      if (wouldBeCircular) {
        return c.json(
          {
            error: 'Circular reference detected',
            message: 'Cannot set a category as parent of its own parent category.',
          },
          400
        );
      }
    }
  }

  await db
    .update(categories)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(categories.id, id))
    .run();

  const updated = await db.select().from(categories).where(eq(categories.id, id)).get();

  return c.json(updated);
});

// DELETE /api/categories/:id - Soft delete category
app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  // Check if category exists and is not already deleted
  const existing = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), isNull(categories.deletedAt)))
    .get();

  if (!existing) {
    return c.json({ error: 'Category not found' }, 404);
  }

  // Soft delete the category
  await db
    .update(categories)
    .set({
      deletedAt: new Date(),
      deletedBy: null, // TODO: Get from auth context when implemented
      status: 'inactive',
      updatedAt: new Date(),
    })
    .where(eq(categories.id, id))
    .run();

  return c.json({ message: 'Category deleted successfully' });
});

export default app;
