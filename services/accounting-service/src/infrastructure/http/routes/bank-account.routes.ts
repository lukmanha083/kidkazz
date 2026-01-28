import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import {
  DrizzleBankAccountRepository,
} from '@/infrastructure/repositories';
import {
  CreateBankAccountHandler,
  UpdateBankAccountHandler,
  DeactivateBankAccountHandler,
  ReactivateBankAccountHandler,
  CloseBankAccountHandler,
} from '@/application/commands';
import {
  createBankAccountSchema,
  updateBankAccountSchema,
  listBankAccountsQuerySchema,
} from '@/application/dtos';
import type * as schema from '@/infrastructure/db/schema';

type Bindings = {
  DB: D1Database;
};

type Variables = {
  db: DrizzleD1Database<typeof schema>;
  userId: string;
};

const bankAccountRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * GET /bank-accounts - List all bank accounts
 */
bankAccountRoutes.get('/', zValidator('query', listBankAccountsQuerySchema), async (c) => {
  const db = c.get('db');
  const query = c.req.valid('query');

  const repository = new DrizzleBankAccountRepository(db);
  const result = await repository.findAll({
    status: query.status,
    accountType: query.accountType,
  });

  return c.json({
    success: true,
    data: result.data.map((ba) => ({
      id: ba.id,
      accountId: ba.accountId,
      bankName: ba.bankName,
      accountNumber: ba.accountNumber,
      accountType: ba.accountType,
      currency: ba.currency,
      status: ba.status,
      lastReconciledDate: ba.lastReconciledDate?.toISOString(),
      lastReconciledBalance: ba.lastReconciledBalance,
      createdAt: ba.createdAt.toISOString(),
      updatedAt: ba.updatedAt.toISOString(),
    })),
  });
});

/**
 * GET /bank-accounts/:id - Get bank account by ID
 */
bankAccountRoutes.get('/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const repository = new DrizzleBankAccountRepository(db);
  const bankAccount = await repository.findById(id);

  if (!bankAccount) {
    return c.json({ success: false, error: 'Bank account not found' }, 404);
  }

  return c.json({
    success: true,
    data: {
      id: bankAccount.id,
      accountId: bankAccount.accountId,
      bankName: bankAccount.bankName,
      accountNumber: bankAccount.accountNumber,
      accountType: bankAccount.accountType,
      currency: bankAccount.currency,
      status: bankAccount.status,
      lastReconciledDate: bankAccount.lastReconciledDate?.toISOString(),
      lastReconciledBalance: bankAccount.lastReconciledBalance,
      createdAt: bankAccount.createdAt.toISOString(),
      updatedAt: bankAccount.updatedAt.toISOString(),
    },
  });
});

/**
 * POST /bank-accounts - Create new bank account
 */
bankAccountRoutes.post('/', zValidator('json', createBankAccountSchema), async (c) => {
  const db = c.get('db');
  const body = c.req.valid('json');

  const repository = new DrizzleBankAccountRepository(db);
  const handler = new CreateBankAccountHandler(repository);

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
    const message = error instanceof Error ? error.message : 'Failed to create bank account';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * PUT /bank-accounts/:id - Update bank account
 */
bankAccountRoutes.put('/:id', zValidator('json', updateBankAccountSchema), async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = c.req.valid('json');

  const repository = new DrizzleBankAccountRepository(db);
  const handler = new UpdateBankAccountHandler(repository);

  try {
    await handler.execute({
      id,
      ...body,
    });

    // Fetch updated bank account
    const updated = await repository.findById(id);

    return c.json({
      success: true,
      data: updated
        ? {
            id: updated.id,
            accountId: updated.accountId,
            bankName: updated.bankName,
            accountNumber: updated.accountNumber,
            accountType: updated.accountType,
            currency: updated.currency,
            status: updated.status,
            lastReconciledDate: updated.lastReconciledDate?.toISOString(),
            lastReconciledBalance: updated.lastReconciledBalance,
            createdAt: updated.createdAt.toISOString(),
            updatedAt: updated.updatedAt.toISOString(),
          }
        : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update bank account';
    if (message === 'Bank account not found') {
      return c.json({ success: false, error: message }, 404);
    }
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * POST /bank-accounts/:id/deactivate - Deactivate bank account
 */
bankAccountRoutes.post('/:id/deactivate', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const repository = new DrizzleBankAccountRepository(db);
  const handler = new DeactivateBankAccountHandler(repository);

  try {
    const result = await handler.execute({ id });

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to deactivate bank account';
    if (message === 'Bank account not found') {
      return c.json({ success: false, error: message }, 404);
    }
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * POST /bank-accounts/:id/reactivate - Reactivate bank account
 */
bankAccountRoutes.post('/:id/reactivate', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const repository = new DrizzleBankAccountRepository(db);
  const handler = new ReactivateBankAccountHandler(repository);

  try {
    const result = await handler.execute({ id });

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reactivate bank account';
    if (message === 'Bank account not found') {
      return c.json({ success: false, error: message }, 404);
    }
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * POST /bank-accounts/:id/close - Close bank account
 */
bankAccountRoutes.post('/:id/close', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const repository = new DrizzleBankAccountRepository(db);
  const handler = new CloseBankAccountHandler(repository);

  try {
    const result = await handler.execute({ id });

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to close bank account';
    if (message === 'Bank account not found') {
      return c.json({ success: false, error: message }, 404);
    }
    return c.json({ success: false, error: message }, 400);
  }
});

export { bankAccountRoutes };
