import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import {
  DrizzleAssetMaintenanceRepository,
  DrizzleFixedAssetRepository,
} from '@/infrastructure/repositories';
import {
  CreateMaintenanceHandler,
  UpdateMaintenanceHandler,
  StartMaintenanceHandler,
  CompleteMaintenanceHandler,
  CancelMaintenanceHandler,
  DeleteMaintenanceHandler,
} from '@/application/commands';
import {
  GetMaintenanceHandler,
  ListAssetMaintenanceHandler,
  ListScheduledMaintenanceHandler,
  ListOverdueMaintenanceHandler,
} from '@/application/queries';
import {
  createMaintenanceSchema,
  updateMaintenanceSchema,
  completeMaintenanceSchema,
  cancelMaintenanceSchema,
} from '@/application/dtos';
import type * as schema from '@/infrastructure/db/schema';

type Bindings = {
  DB: D1Database;
};

type Variables = {
  db: DrizzleD1Database<typeof schema>;
  userId: string;
};

const maintenanceRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * GET /maintenance/scheduled - List all scheduled maintenance
 */
maintenanceRoutes.get('/scheduled', async (c) => {
  const db = c.get('db');

  const maintenanceRepo = new DrizzleAssetMaintenanceRepository(db);
  const assetRepo = new DrizzleFixedAssetRepository(db);
  const handler = new ListScheduledMaintenanceHandler(maintenanceRepo, assetRepo);

  const result = await handler.execute({});

  return c.json({
    success: true,
    data: result,
  });
});

/**
 * GET /maintenance/overdue - List all overdue maintenance
 */
maintenanceRoutes.get('/overdue', async (c) => {
  const db = c.get('db');

  const maintenanceRepo = new DrizzleAssetMaintenanceRepository(db);
  const assetRepo = new DrizzleFixedAssetRepository(db);
  const handler = new ListOverdueMaintenanceHandler(maintenanceRepo, assetRepo);

  const result = await handler.execute({});

  return c.json({
    success: true,
    data: result,
  });
});

/**
 * GET /maintenance/asset/:assetId - List maintenance for specific asset
 */
maintenanceRoutes.get('/asset/:assetId', async (c) => {
  const db = c.get('db');
  const assetId = c.req.param('assetId');

  const maintenanceRepo = new DrizzleAssetMaintenanceRepository(db);
  const assetRepo = new DrizzleFixedAssetRepository(db);
  const handler = new ListAssetMaintenanceHandler(maintenanceRepo, assetRepo);

  try {
    const result = await handler.execute({ assetId });

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list maintenance';
    if (message === 'Asset not found') {
      return c.json({ success: false, error: message }, 404);
    }
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * GET /maintenance/:id - Get maintenance by ID
 */
maintenanceRoutes.get('/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const maintenanceRepo = new DrizzleAssetMaintenanceRepository(db);
  const assetRepo = new DrizzleFixedAssetRepository(db);
  const handler = new GetMaintenanceHandler(maintenanceRepo, assetRepo);

  const result = await handler.execute({ id });

  if (!result) {
    return c.json({ success: false, error: 'Maintenance record not found' }, 404);
  }

  return c.json({
    success: true,
    data: result,
  });
});

/**
 * POST /maintenance - Create new maintenance record
 */
maintenanceRoutes.post('/', zValidator('json', createMaintenanceSchema), async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');
  const body = c.req.valid('json');

  const maintenanceRepo = new DrizzleAssetMaintenanceRepository(db);
  const assetRepo = new DrizzleFixedAssetRepository(db);
  const handler = new CreateMaintenanceHandler(maintenanceRepo, assetRepo);

  try {
    const result = await handler.execute({
      ...body,
      scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : undefined,
      createdBy: userId,
    });

    return c.json(
      {
        success: true,
        data: result,
      },
      201
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create maintenance';
    if (message === 'Asset not found') {
      return c.json({ success: false, error: message }, 404);
    }
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * PUT /maintenance/:id - Update maintenance record
 */
maintenanceRoutes.put('/:id', zValidator('json', updateMaintenanceSchema), async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = c.req.valid('json');

  const maintenanceRepo = new DrizzleAssetMaintenanceRepository(db);
  const handler = new UpdateMaintenanceHandler(maintenanceRepo);

  try {
    await handler.execute({
      id,
      ...body,
      scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : undefined,
    });

    // Fetch updated record
    const assetRepo = new DrizzleFixedAssetRepository(db);
    const getHandler = new GetMaintenanceHandler(maintenanceRepo, assetRepo);
    const updated = await getHandler.execute({ id });

    return c.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update maintenance';
    if (message === 'Maintenance record not found') {
      return c.json({ success: false, error: message }, 404);
    }
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * POST /maintenance/:id/start - Start maintenance
 */
maintenanceRoutes.post('/:id/start', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const maintenanceRepo = new DrizzleAssetMaintenanceRepository(db);
  const handler = new StartMaintenanceHandler(maintenanceRepo);

  try {
    const result = await handler.execute({ id });

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start maintenance';
    if (message === 'Maintenance record not found') {
      return c.json({ success: false, error: message }, 404);
    }
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * POST /maintenance/:id/complete - Complete maintenance
 */
maintenanceRoutes.post(
  '/:id/complete',
  zValidator('json', completeMaintenanceSchema),
  async (c) => {
    const db = c.get('db');
    const id = c.req.param('id');
    const body = c.req.valid('json');

    const maintenanceRepo = new DrizzleAssetMaintenanceRepository(db);
    const assetRepo = new DrizzleFixedAssetRepository(db);
    const handler = new CompleteMaintenanceHandler(maintenanceRepo, assetRepo);

    try {
      const result = await handler.execute({
        id,
        performedDate: new Date(body.performedDate),
        actualCost: body.actualCost,
        nextScheduledDate: body.nextScheduledDate ? new Date(body.nextScheduledDate) : undefined,
        notes: body.notes,
      });

      return c.json({
        success: true,
        data: result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to complete maintenance';
      if (message === 'Maintenance record not found') {
        return c.json({ success: false, error: message }, 404);
      }
      return c.json({ success: false, error: message }, 400);
    }
  }
);

/**
 * POST /maintenance/:id/cancel - Cancel maintenance
 */
maintenanceRoutes.post(
  '/:id/cancel',
  zValidator('json', cancelMaintenanceSchema),
  async (c) => {
    const db = c.get('db');
    const id = c.req.param('id');
    const body = c.req.valid('json');

    const maintenanceRepo = new DrizzleAssetMaintenanceRepository(db);
    const handler = new CancelMaintenanceHandler(maintenanceRepo);

    try {
      const result = await handler.execute({
        id,
        reason: body.reason,
      });

      return c.json({
        success: true,
        data: result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel maintenance';
      if (message === 'Maintenance record not found') {
        return c.json({ success: false, error: message }, 404);
      }
      return c.json({ success: false, error: message }, 400);
    }
  }
);

/**
 * DELETE /maintenance/:id - Delete maintenance record
 */
maintenanceRoutes.delete('/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const maintenanceRepo = new DrizzleAssetMaintenanceRepository(db);
  const handler = new DeleteMaintenanceHandler(maintenanceRepo);

  try {
    await handler.execute({ id });

    return c.json({
      success: true,
      message: 'Maintenance record deleted',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete maintenance';
    if (message === 'Maintenance record not found') {
      return c.json({ success: false, error: message }, 404);
    }
    return c.json({ success: false, error: message }, 400);
  }
});

export { maintenanceRoutes };
