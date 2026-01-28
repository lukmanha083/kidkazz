import { listMovementsQuerySchema } from '@/application/dtos';
import {
  GetMovementHandler,
  ListAssetMovementsHandler,
  ListMovementsByDateRangeHandler,
} from '@/application/queries';
import type * as schema from '@/infrastructure/db/schema';
import {
  DrizzleAssetMovementRepository,
  DrizzleFixedAssetRepository,
} from '@/infrastructure/repositories';
import { zValidator } from '@hono/zod-validator';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
};

type Variables = {
  db: DrizzleD1Database<typeof schema>;
  userId: string;
};

const movementRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * GET /movements - List movements by date range
 */
movementRoutes.get('/', zValidator('query', listMovementsQuerySchema), async (c) => {
  const db = c.get('db');
  const query = c.req.valid('query');

  const movementRepo = new DrizzleAssetMovementRepository(db);
  const assetRepo = new DrizzleFixedAssetRepository(db);
  const handler = new ListMovementsByDateRangeHandler(movementRepo, assetRepo);

  // Default to last 30 days if no dates provided
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(defaultFrom.getDate() - 30);

  const from = query.from ? new Date(query.from) : defaultFrom;
  const to = query.to ? new Date(query.to) : now;

  const result = await handler.execute({ from, to });

  return c.json({
    success: true,
    data: result,
  });
});

/**
 * GET /movements/asset/:assetId - List movements for specific asset
 */
movementRoutes.get('/asset/:assetId', async (c) => {
  const db = c.get('db');
  const assetId = c.req.param('assetId');

  const movementRepo = new DrizzleAssetMovementRepository(db);
  const assetRepo = new DrizzleFixedAssetRepository(db);
  const handler = new ListAssetMovementsHandler(movementRepo, assetRepo);

  try {
    const result = await handler.execute({ assetId });

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list movements';
    if (message === 'Asset not found') {
      return c.json({ success: false, error: message }, 404);
    }
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * GET /movements/:id - Get movement by ID
 */
movementRoutes.get('/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const movementRepo = new DrizzleAssetMovementRepository(db);
  const assetRepo = new DrizzleFixedAssetRepository(db);
  const handler = new GetMovementHandler(movementRepo, assetRepo);

  const result = await handler.execute({ id });

  if (!result) {
    return c.json({ success: false, error: 'Movement not found' }, 404);
  }

  return c.json({
    success: true,
    data: result,
  });
});

export { movementRoutes };
