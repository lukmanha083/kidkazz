import {
  CloseFiscalPeriodHandler,
  CreateFiscalPeriodHandler,
  LockFiscalPeriodHandler,
  ReopenFiscalPeriodHandler,
} from '@/application/commands/fiscal-period.commands';
import {
  createFiscalPeriodSchema,
  getFiscalPeriodByPeriodQuerySchema,
  listFiscalPeriodsQuerySchema,
  reopenFiscalPeriodSchema,
  toFiscalPeriodDto,
} from '@/application/dtos/fiscal-period.dto';
import {
  GetCurrentFiscalPeriodHandler,
  GetFiscalPeriodByIdHandler,
  GetFiscalPeriodByPeriodHandler,
  ListFiscalPeriodsHandler,
} from '@/application/queries/fiscal-period.queries';
import type * as schema from '@/infrastructure/db/schema';
import { DrizzleFiscalPeriodRepository } from '@/infrastructure/repositories';
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

const fiscalPeriodRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * GET /fiscal-periods - List all fiscal periods
 */
fiscalPeriodRoutes.get('/', zValidator('query', listFiscalPeriodsQuerySchema), async (c) => {
  const db = c.get('db');
  const query = c.req.valid('query');

  const repository = new DrizzleFiscalPeriodRepository(db);
  const handler = new ListFiscalPeriodsHandler(repository);

  const periods = await handler.execute({
    status: query.status,
    fiscalYear: query.fiscalYear,
  });

  return c.json({
    success: true,
    data: periods.map(toFiscalPeriodDto),
  });
});

/**
 * GET /fiscal-periods/current - Get current open fiscal period
 */
fiscalPeriodRoutes.get('/current', async (c) => {
  const db = c.get('db');

  const repository = new DrizzleFiscalPeriodRepository(db);
  const handler = new GetCurrentFiscalPeriodHandler(repository);

  const period = await handler.execute();

  if (!period) {
    return c.json({ success: false, error: 'No open fiscal period found' }, 404);
  }

  return c.json({
    success: true,
    data: toFiscalPeriodDto(period),
  });
});

/**
 * GET /fiscal-periods/period/:year/:month - Get fiscal period by year/month
 */
fiscalPeriodRoutes.get(
  '/period/:year/:month',
  zValidator('param', getFiscalPeriodByPeriodQuerySchema),
  async (c) => {
    const db = c.get('db');
    const params = c.req.valid('param');

    const repository = new DrizzleFiscalPeriodRepository(db);
    const handler = new GetFiscalPeriodByPeriodHandler(repository);

    const period = await handler.execute({
      fiscalYear: params.fiscalYear,
      fiscalMonth: params.fiscalMonth,
    });

    if (!period) {
      return c.json({ success: false, error: 'Fiscal period not found' }, 404);
    }

    return c.json({
      success: true,
      data: toFiscalPeriodDto(period),
    });
  }
);

/**
 * GET /fiscal-periods/:id - Get fiscal period by ID
 */
fiscalPeriodRoutes.get('/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const repository = new DrizzleFiscalPeriodRepository(db);
  const handler = new GetFiscalPeriodByIdHandler(repository);

  const period = await handler.execute({ id });

  if (!period) {
    return c.json({ success: false, error: 'Fiscal period not found' }, 404);
  }

  return c.json({
    success: true,
    data: toFiscalPeriodDto(period),
  });
});

/**
 * POST /fiscal-periods - Create a new fiscal period
 */
fiscalPeriodRoutes.post('/', zValidator('json', createFiscalPeriodSchema), async (c) => {
  const db = c.get('db');
  const body = c.req.valid('json');

  const repository = new DrizzleFiscalPeriodRepository(db);
  const handler = new CreateFiscalPeriodHandler(repository);

  try {
    const result = await handler.execute({
      fiscalYear: body.fiscalYear,
      fiscalMonth: body.fiscalMonth,
    });

    return c.json(
      {
        success: true,
        data: {
          id: result.id,
          fiscalYear: result.fiscalYear,
          fiscalMonth: result.fiscalMonth,
          status: result.status,
          createdAt: result.createdAt.toISOString(),
        },
      },
      201
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create fiscal period';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * POST /fiscal-periods/:id/close - Close a fiscal period
 */
fiscalPeriodRoutes.post('/:id/close', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const userId = c.get('userId');

  // Validate userId is present
  if (!userId) {
    return c.json({ success: false, error: 'Authentication required' }, 401);
  }

  const repository = new DrizzleFiscalPeriodRepository(db);
  const handler = new CloseFiscalPeriodHandler(repository);

  try {
    const result = await handler.execute({
      periodId: id,
      closedBy: userId,
    });

    return c.json({
      success: true,
      data: {
        id: result.id,
        fiscalYear: result.fiscalYear,
        fiscalMonth: result.fiscalMonth,
        status: result.status,
        closedAt: result.closedAt?.toISOString(),
        closedBy: result.closedBy,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to close fiscal period';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * POST /fiscal-periods/:id/reopen - Reopen a closed fiscal period
 */
fiscalPeriodRoutes.post('/:id/reopen', zValidator('json', reopenFiscalPeriodSchema), async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const userId = c.get('userId');
  const body = c.req.valid('json');

  // Validate userId is present
  if (!userId) {
    return c.json({ success: false, error: 'Authentication required' }, 401);
  }

  const repository = new DrizzleFiscalPeriodRepository(db);
  const handler = new ReopenFiscalPeriodHandler(repository);

  try {
    const result = await handler.execute({
      periodId: id,
      reopenedBy: userId,
      reason: body.reason,
    });

    return c.json({
      success: true,
      data: {
        id: result.id,
        fiscalYear: result.fiscalYear,
        fiscalMonth: result.fiscalMonth,
        status: result.status,
        reopenedAt: result.reopenedAt?.toISOString(),
        reopenedBy: result.reopenedBy,
        reopenReason: result.reopenReason,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reopen fiscal period';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * POST /fiscal-periods/:id/lock - Lock a fiscal period
 */
fiscalPeriodRoutes.post('/:id/lock', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const userId = c.get('userId');

  // Validate userId is present
  if (!userId) {
    return c.json({ success: false, error: 'Authentication required' }, 401);
  }

  const repository = new DrizzleFiscalPeriodRepository(db);
  const handler = new LockFiscalPeriodHandler(repository);

  try {
    const result = await handler.execute({
      periodId: id,
      lockedBy: userId,
    });

    return c.json({
      success: true,
      data: {
        id: result.id,
        fiscalYear: result.fiscalYear,
        fiscalMonth: result.fiscalMonth,
        status: result.status,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to lock fiscal period';
    return c.json({ success: false, error: message }, 400);
  }
});

export { fiscalPeriodRoutes };
