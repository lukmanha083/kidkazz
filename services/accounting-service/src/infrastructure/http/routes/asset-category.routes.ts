import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import {
  DrizzleAssetCategoryRepository,
  DrizzleFixedAssetRepository,
} from '@/infrastructure/repositories';
import {
  CreateAssetCategoryHandler,
  UpdateAssetCategoryHandler,
  DeleteAssetCategoryHandler,
} from '@/application/commands';
import {
  GetAssetCategoryHandler,
  ListAssetCategoriesHandler,
} from '@/application/queries';
import {
  createAssetCategorySchema,
  updateAssetCategorySchema,
  listAssetCategoriesQuerySchema,
} from '@/application/dtos';
import type * as schema from '@/infrastructure/db/schema';

type Bindings = {
  DB: D1Database;
};

type Variables = {
  db: DrizzleD1Database<typeof schema>;
  userId: string;
};

const assetCategoryRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * GET /asset-categories - List all asset categories
 */
assetCategoryRoutes.get(
  '/',
  zValidator('query', listAssetCategoriesQuerySchema),
  async (c) => {
    const db = c.get('db');
    const query = c.req.valid('query');

    const repository = new DrizzleAssetCategoryRepository(db);
    const handler = new ListAssetCategoriesHandler(repository);

    const categories = await handler.execute({
      includeInactive: query.includeInactive,
    });

    return c.json({
      success: true,
      data: categories,
    });
  }
);

/**
 * GET /asset-categories/:id - Get asset category by ID
 */
assetCategoryRoutes.get('/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const repository = new DrizzleAssetCategoryRepository(db);
  const handler = new GetAssetCategoryHandler(repository);

  const category = await handler.execute({ id });

  if (!category) {
    return c.json({ success: false, error: 'Category not found' }, 404);
  }

  return c.json({
    success: true,
    data: category,
  });
});

/**
 * POST /asset-categories - Create new asset category
 */
assetCategoryRoutes.post(
  '/',
  zValidator('json', createAssetCategorySchema),
  async (c) => {
    const db = c.get('db');
    const body = c.req.valid('json');

    const repository = new DrizzleAssetCategoryRepository(db);
    const handler = new CreateAssetCategoryHandler(repository);

    try {
      const result = await handler.execute(body);

      return c.json(
        {
          success: true,
          data: result,
        },
        201
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create category';
      return c.json({ success: false, error: message }, 400);
    }
  }
);

/**
 * PUT /asset-categories/:id - Update asset category
 */
assetCategoryRoutes.put(
  '/:id',
  zValidator('json', updateAssetCategorySchema),
  async (c) => {
    const db = c.get('db');
    const id = c.req.param('id');
    const body = c.req.valid('json');

    const repository = new DrizzleAssetCategoryRepository(db);
    const handler = new UpdateAssetCategoryHandler(repository);

    try {
      await handler.execute({ id, ...body });

      // Fetch updated category
      const getHandler = new GetAssetCategoryHandler(repository);
      const updated = await getHandler.execute({ id });

      return c.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update category';
      if (message === 'Category not found') {
        return c.json({ success: false, error: message }, 404);
      }
      return c.json({ success: false, error: message }, 400);
    }
  }
);

/**
 * DELETE /asset-categories/:id - Delete asset category
 */
assetCategoryRoutes.delete('/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const categoryRepo = new DrizzleAssetCategoryRepository(db);
  const assetRepo = new DrizzleFixedAssetRepository(db);
  const handler = new DeleteAssetCategoryHandler(categoryRepo, assetRepo);

  try {
    await handler.execute({ id });

    return c.json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete category';
    if (message === 'Category not found') {
      return c.json({ success: false, error: message }, 404);
    }
    return c.json({ success: false, error: message }, 400);
  }
});

export { assetCategoryRoutes };
