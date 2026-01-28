import {
  CreateJournalEntryHandler,
  DeleteJournalEntryHandler,
  PostJournalEntryHandler,
  UpdateJournalEntryHandler,
  VoidJournalEntryHandler,
} from '@/application/commands';
import {
  createJournalEntrySchema,
  listJournalEntriesQuerySchema,
  toJournalEntryResponse,
  updateJournalEntrySchema,
  voidJournalEntrySchema,
} from '@/application/dtos';
import {
  GetJournalEntriesByAccountHandler,
  GetJournalEntryByIdHandler,
  ListJournalEntriesHandler,
} from '@/application/queries';
import type * as schema from '@/infrastructure/db/schema';
import {
  DrizzleAccountRepository,
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

const journalEntryRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * GET /journal-entries - List journal entries with pagination
 */
journalEntryRoutes.get('/', zValidator('query', listJournalEntriesQuerySchema), async (c) => {
  const db = c.get('db');
  const query = c.req.valid('query');

  const repository = new DrizzleJournalEntryRepository(db);
  const handler = new ListJournalEntriesHandler(repository);

  const result = await handler.execute({
    status: query.status,
    entryType: query.entryType,
    fromDate: query.fromDate,
    toDate: query.toDate,
    accountId: query.accountId,
    createdBy: query.createdBy,
    search: query.search,
    page: query.page,
    limit: query.limit,
  });

  return c.json({
    success: true,
    data: result.data.map(toJournalEntryResponse),
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: result.totalPages,
  });
});

/**
 * GET /journal-entries/by-account/:accountId - Get journal entries by account
 * NOTE: Must be registered BEFORE /:id to avoid route shadowing
 */
journalEntryRoutes.get('/by-account/:accountId', async (c) => {
  const db = c.get('db');
  const accountId = c.req.param('accountId');

  const repository = new DrizzleJournalEntryRepository(db);
  const handler = new GetJournalEntriesByAccountHandler(repository);

  const entries = await handler.execute({ accountId });

  return c.json({
    success: true,
    data: entries.map(toJournalEntryResponse),
  });
});

/**
 * GET /journal-entries/:id - Get journal entry by ID
 */
journalEntryRoutes.get('/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const repository = new DrizzleJournalEntryRepository(db);
  const handler = new GetJournalEntryByIdHandler(repository);

  const entry = await handler.execute({ id });

  if (!entry) {
    return c.json({ success: false, error: 'Journal entry not found' }, 404);
  }

  return c.json({
    success: true,
    data: toJournalEntryResponse(entry),
  });
});

/**
 * POST /journal-entries - Create new journal entry
 */
journalEntryRoutes.post('/', zValidator('json', createJournalEntrySchema), async (c) => {
  const db = c.get('db');
  const userId = c.get('userId') || 'system';
  const body = c.req.valid('json');

  const journalEntryRepository = new DrizzleJournalEntryRepository(db);
  const accountRepository = new DrizzleAccountRepository(db);
  const handler = new CreateJournalEntryHandler(journalEntryRepository, accountRepository);

  try {
    const result = await handler.execute({
      ...body,
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
    const message = error instanceof Error ? error.message : 'Failed to create journal entry';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * PUT /journal-entries/:id - Update journal entry (draft only)
 */
journalEntryRoutes.put('/:id', zValidator('json', updateJournalEntrySchema), async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = c.req.valid('json');

  const journalEntryRepository = new DrizzleJournalEntryRepository(db);
  const accountRepository = new DrizzleAccountRepository(db);
  const handler = new UpdateJournalEntryHandler(journalEntryRepository, accountRepository);

  try {
    const result = await handler.execute({ id, ...body });

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update journal entry';
    if (message === 'Journal entry not found') {
      return c.json({ success: false, error: message }, 404);
    }
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * DELETE /journal-entries/:id - Delete journal entry (draft only)
 */
journalEntryRoutes.delete('/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const repository = new DrizzleJournalEntryRepository(db);
  const handler = new DeleteJournalEntryHandler(repository);

  try {
    await handler.execute({ id });

    return c.json({
      success: true,
      message: 'Journal entry deleted successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete journal entry';
    if (message === 'Journal entry not found') {
      return c.json({ success: false, error: message }, 404);
    }
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * POST /journal-entries/:id/post - Post journal entry
 */
journalEntryRoutes.post('/:id/post', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const userId = c.get('userId') || 'system';

  const repository = new DrizzleJournalEntryRepository(db);
  const handler = new PostJournalEntryHandler(repository);

  try {
    const result = await handler.execute({ id, postedBy: userId });

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to post journal entry';
    if (message === 'Journal entry not found') {
      return c.json({ success: false, error: message }, 404);
    }
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * POST /journal-entries/:id/void - Void journal entry
 */
journalEntryRoutes.post('/:id/void', zValidator('json', voidJournalEntrySchema), async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const userId = c.get('userId') || 'system';
  const body = c.req.valid('json');

  const repository = new DrizzleJournalEntryRepository(db);
  const handler = new VoidJournalEntryHandler(repository);

  try {
    const result = await handler.execute({
      id,
      voidedBy: userId,
      reason: body.reason,
    });

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to void journal entry';
    if (message === 'Journal entry not found') {
      return c.json({ success: false, error: message }, 404);
    }
    return c.json({ success: false, error: message }, 400);
  }
});

export { journalEntryRoutes };
