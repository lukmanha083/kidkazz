import {
  ActivateAssetHandler,
  CreateAssetHandler,
  DisposeAssetWithJournalHandler,
  TransferAssetHandler,
  UpdateAssetHandler,
} from '@/application/commands';
import {
  createAssetSchema,
  disposeAssetSchema,
  listAssetsQuerySchema,
  transferAssetSchema,
  updateAssetSchema,
} from '@/application/dtos';
import {
  GetAssetByBarcodeHandler,
  GetAssetHandler,
  GetDepreciableAssetsHandler,
  ListAssetsHandler,
} from '@/application/queries';
import type * as schema from '@/infrastructure/db/schema';
import {
  DrizzleAssetCategoryRepository,
  DrizzleAssetMovementRepository,
  DrizzleFixedAssetRepository,
  DrizzleJournalEntryRepository,
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

const assetRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * GET /assets - List all assets
 */
assetRoutes.get('/', zValidator('query', listAssetsQuerySchema), async (c) => {
  const db = c.get('db');
  const query = c.req.valid('query');

  const repository = new DrizzleFixedAssetRepository(db);
  const handler = new ListAssetsHandler(repository);

  const result = await handler.execute({
    categoryId: query.categoryId,
    status: query.status,
    locationId: query.locationId,
    departmentId: query.departmentId,
    assignedToUserId: query.assignedToUserId,
    acquisitionDateFrom: query.acquisitionDateFrom,
    acquisitionDateTo: query.acquisitionDateTo,
    search: query.search,
    page: query.page,
    limit: query.limit,
  });

  return c.json({
    success: true,
    data: result.data,
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    },
  });
});

/**
 * GET /assets/depreciable - Get all depreciable assets
 */
assetRoutes.get('/depreciable', async (c) => {
  const db = c.get('db');

  const repository = new DrizzleFixedAssetRepository(db);
  const handler = new GetDepreciableAssetsHandler(repository);

  const assets = await handler.execute({});

  return c.json({
    success: true,
    data: assets,
  });
});

/**
 * GET /assets/barcode/:barcode - Get asset by barcode
 */
assetRoutes.get('/barcode/:barcode', async (c) => {
  const db = c.get('db');
  const barcode = c.req.param('barcode');

  const repository = new DrizzleFixedAssetRepository(db);
  const handler = new GetAssetByBarcodeHandler(repository);

  const asset = await handler.execute({ barcode });

  if (!asset) {
    return c.json({ success: false, error: 'Asset not found' }, 404);
  }

  return c.json({
    success: true,
    data: asset,
  });
});

/**
 * GET /assets/:id - Get asset by ID
 */
assetRoutes.get('/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const repository = new DrizzleFixedAssetRepository(db);
  const handler = new GetAssetHandler(repository);

  const asset = await handler.execute({ id });

  if (!asset) {
    return c.json({ success: false, error: 'Asset not found' }, 404);
  }

  return c.json({
    success: true,
    data: asset,
  });
});

/**
 * POST /assets - Create new asset
 */
assetRoutes.post('/', zValidator('json', createAssetSchema), async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');
  const body = c.req.valid('json');

  const assetRepo = new DrizzleFixedAssetRepository(db);
  const categoryRepo = new DrizzleAssetCategoryRepository(db);
  const handler = new CreateAssetHandler(assetRepo, categoryRepo);

  try {
    const result = await handler.execute({
      ...body,
      acquisitionDate: new Date(body.acquisitionDate),
      depreciationStartDate: body.depreciationStartDate
        ? new Date(body.depreciationStartDate)
        : undefined,
      insuranceExpiryDate: body.insuranceExpiryDate
        ? new Date(body.insuranceExpiryDate)
        : undefined,
      warrantyExpiryDate: body.warrantyExpiryDate ? new Date(body.warrantyExpiryDate) : undefined,
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
    const message = error instanceof Error ? error.message : 'Failed to create asset';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * PUT /assets/:id - Update asset
 */
assetRoutes.put('/:id', zValidator('json', updateAssetSchema), async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = c.req.valid('json');

  const repository = new DrizzleFixedAssetRepository(db);
  const handler = new UpdateAssetHandler(repository);

  try {
    await handler.execute({
      id,
      ...body,
      insuranceExpiryDate: body.insuranceExpiryDate
        ? new Date(body.insuranceExpiryDate)
        : undefined,
      warrantyExpiryDate: body.warrantyExpiryDate ? new Date(body.warrantyExpiryDate) : undefined,
    });

    // Fetch updated asset
    const getHandler = new GetAssetHandler(repository);
    const updated = await getHandler.execute({ id });

    return c.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update asset';
    if (message === 'Asset not found') {
      return c.json({ success: false, error: message }, 404);
    }
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * POST /assets/:id/activate - Activate asset
 */
assetRoutes.post('/:id/activate', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const repository = new DrizzleFixedAssetRepository(db);
  const handler = new ActivateAssetHandler(repository);

  try {
    const result = await handler.execute({ id });

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to activate asset';
    if (message === 'Asset not found') {
      return c.json({ success: false, error: message }, 404);
    }
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * POST /assets/:id/transfer - Transfer asset
 */
assetRoutes.post('/:id/transfer', zValidator('json', transferAssetSchema), async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');
  const id = c.req.param('id');
  const body = c.req.valid('json');

  const repository = new DrizzleFixedAssetRepository(db);
  const handler = new TransferAssetHandler(repository);

  try {
    const result = await handler.execute({
      id,
      ...body,
      transferredBy: userId,
    });

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to transfer asset';
    if (message === 'Asset not found') {
      return c.json({ success: false, error: message }, 404);
    }
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * POST /assets/:id/dispose - Dispose asset with journal entry
 */
assetRoutes.post('/:id/dispose', zValidator('json', disposeAssetSchema), async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');
  const id = c.req.param('id');
  const body = c.req.valid('json');

  const assetRepo = new DrizzleFixedAssetRepository(db);
  const categoryRepo = new DrizzleAssetCategoryRepository(db);
  const journalRepo = new DrizzleJournalEntryRepository(db);
  const movementRepo = new DrizzleAssetMovementRepository(db);
  const handler = new DisposeAssetWithJournalHandler(
    assetRepo,
    categoryRepo,
    journalRepo,
    movementRepo
  );

  try {
    const result = await handler.execute({
      assetId: id,
      ...body,
      disposedBy: userId,
    });

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to dispose asset';
    if (message === 'Asset not found') {
      return c.json({ success: false, error: message }, 404);
    }
    return c.json({ success: false, error: message }, 400);
  }
});

export { assetRoutes };
