import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { DrizzleAccountRepository } from '@/infrastructure/repositories';
import {
  CreateAccountHandler,
  UpdateAccountHandler,
  DeleteAccountHandler,
} from '@/application/commands';
import {
  GetAccountByIdHandler,
  GetAccountByCodeHandler,
  ListAccountsHandler,
  GetAccountTreeHandler,
} from '@/application/queries';
import {
  createAccountSchema,
  updateAccountSchema,
  listAccountsQuerySchema,
  toAccountResponse,
} from '@/application/dtos';
import type * as schema from '@/infrastructure/db/schema';

type Bindings = {
  DB: D1Database;
};

type Variables = {
  db: DrizzleD1Database<typeof schema>;
  userId: string;
};

const accountRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * GET /accounts - List all accounts
 */
accountRoutes.get('/', zValidator('query', listAccountsQuerySchema), async (c) => {
  const db = c.get('db');
  const query = c.req.valid('query');

  const repository = new DrizzleAccountRepository(db);
  const handler = new ListAccountsHandler(repository);

  const accounts = await handler.execute({
    accountType: query.accountType,
    isDetailAccount: query.isDetailAccount,
    isSystemAccount: query.isSystemAccount,
    search: query.search,
  });

  return c.json({
    success: true,
    data: accounts.map(toAccountResponse),
  });
});

/**
 * GET /accounts/tree - Get account tree (hierarchical)
 */
accountRoutes.get('/tree', async (c) => {
  const db = c.get('db');

  const repository = new DrizzleAccountRepository(db);
  const handler = new GetAccountTreeHandler(repository);

  const accounts = await handler.execute({});

  return c.json({
    success: true,
    data: accounts.map(toAccountResponse),
  });
});

/**
 * GET /accounts/code/:code - Get account by code
 * NOTE: Must be registered BEFORE /:id to avoid route shadowing
 */
accountRoutes.get('/code/:code', async (c) => {
  const db = c.get('db');
  const code = c.req.param('code');

  const repository = new DrizzleAccountRepository(db);
  const handler = new GetAccountByCodeHandler(repository);

  const account = await handler.execute({ code });

  if (!account) {
    return c.json({ success: false, error: 'Account not found' }, 404);
  }

  return c.json({
    success: true,
    data: toAccountResponse(account),
  });
});

/**
 * GET /accounts/:id - Get account by ID
 */
accountRoutes.get('/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const repository = new DrizzleAccountRepository(db);
  const handler = new GetAccountByIdHandler(repository);

  const account = await handler.execute({ id });

  if (!account) {
    return c.json({ success: false, error: 'Account not found' }, 404);
  }

  return c.json({
    success: true,
    data: toAccountResponse(account),
  });
});

/**
 * POST /accounts - Create new account
 */
accountRoutes.post('/', zValidator('json', createAccountSchema), async (c) => {
  const db = c.get('db');
  const body = c.req.valid('json');

  const repository = new DrizzleAccountRepository(db);
  const handler = new CreateAccountHandler(repository);

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
    const message = error instanceof Error ? error.message : 'Failed to create account';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * PUT /accounts/:id - Update account
 */
accountRoutes.put('/:id', zValidator('json', updateAccountSchema), async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = c.req.valid('json');

  const repository = new DrizzleAccountRepository(db);
  const handler = new UpdateAccountHandler(repository);

  try {
    const result = await handler.execute({ id, ...body });

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update account';
    if (message === 'Account not found') {
      return c.json({ success: false, error: message }, 404);
    }
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * DELETE /accounts/:id - Delete account
 */
accountRoutes.delete('/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const repository = new DrizzleAccountRepository(db);
  const handler = new DeleteAccountHandler(repository);

  try {
    await handler.execute({ id });

    return c.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete account';
    if (message === 'Account not found') {
      return c.json({ success: false, error: message }, 404);
    }
    return c.json({ success: false, error: message }, 400);
  }
});

export { accountRoutes };
