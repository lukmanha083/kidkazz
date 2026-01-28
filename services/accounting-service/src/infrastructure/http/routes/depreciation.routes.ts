import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import {
  DrizzleFixedAssetRepository,
  DrizzleAssetCategoryRepository,
  DrizzleJournalEntryRepository,
} from '@/infrastructure/repositories';
import {
  DrizzleDepreciationScheduleRepository,
} from '@/infrastructure/repositories/depreciation-schedule.repository';
import {
  DrizzleDepreciationRunRepository,
} from '@/infrastructure/repositories/depreciation-run.repository';
import {
  CalculateDepreciationHandler,
  PostDepreciationHandler,
  ReverseDepreciationHandler,
} from '@/application/commands/depreciation.commands';
import {
  GetDepreciationPreviewHandler,
  GetAssetDepreciationScheduleHandler,
  GetDepreciationRunHandler,
  ListDepreciationRunsHandler,
} from '@/application/queries/depreciation.queries';
import {
  calculateDepreciationSchema,
  postDepreciationSchema,
  reverseDepreciationSchema,
  depreciationPreviewQuerySchema,
} from '@/application/dtos/depreciation.dto';
import type * as schema from '@/infrastructure/db/schema';

type Bindings = {
  DB: D1Database;
};

type Variables = {
  db: DrizzleD1Database<typeof schema>;
  userId: string;
};

const depreciationRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * GET /depreciation/preview - Get depreciation preview for a period
 */
depreciationRoutes.get(
  '/preview',
  zValidator('query', depreciationPreviewQuerySchema),
  async (c) => {
    const db = c.get('db');
    const query = c.req.valid('query');

    const assetRepo = new DrizzleFixedAssetRepository(db);
    const categoryRepo = new DrizzleAssetCategoryRepository(db);
    const runRepo = new DrizzleDepreciationRunRepository(db);

    const handler = new GetDepreciationPreviewHandler(assetRepo, categoryRepo, runRepo);

    const result = await handler.execute({
      fiscalYear: query.fiscalYear,
      fiscalMonth: query.fiscalMonth,
    });

    return c.json({
      success: true,
      data: result,
    });
  }
);

/**
 * GET /depreciation/runs - List all depreciation runs
 */
depreciationRoutes.get('/runs', async (c) => {
  const db = c.get('db');

  const runRepo = new DrizzleDepreciationRunRepository(db);
  const handler = new ListDepreciationRunsHandler(runRepo);

  const runs = await handler.execute({});

  return c.json({
    success: true,
    data: runs,
  });
});

/**
 * GET /depreciation/runs/:runId - Get a specific depreciation run
 */
depreciationRoutes.get('/runs/:runId', async (c) => {
  const db = c.get('db');
  const runId = c.req.param('runId');

  const runRepo = new DrizzleDepreciationRunRepository(db);
  const handler = new GetDepreciationRunHandler(runRepo);

  const run = await handler.execute({ runId });

  if (!run) {
    return c.json({ success: false, error: 'Depreciation run not found' }, 404);
  }

  return c.json({
    success: true,
    data: run,
  });
});

/**
 * POST /depreciation/calculate - Calculate depreciation for a period
 */
depreciationRoutes.post(
  '/calculate',
  zValidator('json', calculateDepreciationSchema),
  async (c) => {
    const db = c.get('db');
    const body = c.req.valid('json');

    const assetRepo = new DrizzleFixedAssetRepository(db);
    const categoryRepo = new DrizzleAssetCategoryRepository(db);
    const scheduleRepo = new DrizzleDepreciationScheduleRepository(db);
    const runRepo = new DrizzleDepreciationRunRepository(db);

    const handler = new CalculateDepreciationHandler(
      assetRepo,
      categoryRepo,
      scheduleRepo,
      runRepo
    );

    try {
      const result = await handler.execute({
        fiscalYear: body.fiscalYear,
        fiscalMonth: body.fiscalMonth,
      });

      return c.json(
        {
          success: true,
          data: result,
        },
        201
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to calculate depreciation';
      return c.json({ success: false, error: message }, 400);
    }
  }
);

/**
 * POST /depreciation/post - Post calculated depreciation to GL
 */
depreciationRoutes.post(
  '/post',
  zValidator('json', postDepreciationSchema),
  async (c) => {
    const db = c.get('db');
    const userId = c.get('userId');
    const body = c.req.valid('json');

    const assetRepo = new DrizzleFixedAssetRepository(db);
    const categoryRepo = new DrizzleAssetCategoryRepository(db);
    const scheduleRepo = new DrizzleDepreciationScheduleRepository(db);
    const runRepo = new DrizzleDepreciationRunRepository(db);
    const journalEntryRepo = new DrizzleJournalEntryRepository(db);

    const handler = new PostDepreciationHandler(
      assetRepo,
      categoryRepo,
      scheduleRepo,
      runRepo,
      journalEntryRepo
    );

    try {
      const result = await handler.execute({
        runId: body.runId,
        postedBy: userId,
      });

      return c.json({
        success: true,
        data: result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to post depreciation';
      return c.json({ success: false, error: message }, 400);
    }
  }
);

/**
 * POST /depreciation/reverse - Reverse a posted depreciation run
 */
depreciationRoutes.post(
  '/reverse',
  zValidator('json', reverseDepreciationSchema),
  async (c) => {
    const db = c.get('db');
    const userId = c.get('userId');
    const body = c.req.valid('json');

    const assetRepo = new DrizzleFixedAssetRepository(db);
    const scheduleRepo = new DrizzleDepreciationScheduleRepository(db);
    const runRepo = new DrizzleDepreciationRunRepository(db);
    const journalEntryRepo = new DrizzleJournalEntryRepository(db);

    const handler = new ReverseDepreciationHandler(
      assetRepo,
      scheduleRepo,
      runRepo,
      journalEntryRepo
    );

    try {
      const result = await handler.execute({
        runId: body.runId,
        reason: body.reason,
        reversedBy: userId,
      });

      return c.json({
        success: true,
        data: result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reverse depreciation';
      return c.json({ success: false, error: message }, 400);
    }
  }
);

/**
 * GET /depreciation/assets/:assetId/schedule - Get asset depreciation schedule
 */
depreciationRoutes.get('/assets/:assetId/schedule', async (c) => {
  const db = c.get('db');
  const assetId = c.req.param('assetId');

  const assetRepo = new DrizzleFixedAssetRepository(db);
  const scheduleRepo = new DrizzleDepreciationScheduleRepository(db);

  const handler = new GetAssetDepreciationScheduleHandler(assetRepo, scheduleRepo);

  const result = await handler.execute({ assetId });

  if (!result) {
    return c.json({ success: false, error: 'Asset not found' }, 404);
  }

  return c.json({
    success: true,
    data: result,
  });
});

export { depreciationRoutes };
