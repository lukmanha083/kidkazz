import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '../../db/schema';
import { DrizzleBudgetRepository } from '../../repositories/budget.repository';
import { DrizzleAccountBalanceRepository } from '../../repositories/account-balance.repository';
import { DrizzleAccountRepository } from '../../repositories/account.repository';
import {
  CreateBudgetHandler,
  UpdateBudgetLinesHandler,
  ApproveBudgetHandler,
  DeleteBudgetHandler,
} from '@/application/commands/budget.commands';
import {
  GetBudgetVsActualHandler,
  GetARAgingHandler,
  GetAPAgingHandler,
} from '@/application/queries/budget-reports.queries';
import {
  createBudgetSchema,
  updateBudgetLinesSchema,
  listBudgetsQuerySchema,
  budgetVsActualQuerySchema,
  agingReportQuerySchema,
  toBudgetResponse,
} from '@/application/dtos/budget.dto';

type Bindings = {
  DB: D1Database;
};

type Variables = {
  db: DrizzleD1Database<typeof schema>;
  userId: string;
};

const budgetRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * GET /budgets - List all budgets
 */
budgetRoutes.get('/', zValidator('query', listBudgetsQuerySchema), async (c) => {
  const db = c.get('db');
  const query = c.req.valid('query');

  const repository = new DrizzleBudgetRepository(db);
  const budgets = await repository.findAll({
    fiscalYear: query.fiscalYear,
    status: query.status,
  });

  return c.json({
    success: true,
    data: budgets.map(toBudgetResponse),
  });
});

/**
 * GET /budgets/:id - Get a specific budget
 */
budgetRoutes.get('/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const repository = new DrizzleBudgetRepository(db);
  const budget = await repository.findById(id);

  if (!budget) {
    return c.json({ success: false, error: 'Budget not found' }, 404);
  }

  return c.json({
    success: true,
    data: toBudgetResponse(budget),
  });
});

/**
 * POST /budgets - Create a new budget
 */
budgetRoutes.post('/', zValidator('json', createBudgetSchema), async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');
  const body = c.req.valid('json');

  const repository = new DrizzleBudgetRepository(db);
  const handler = new CreateBudgetHandler(repository);

  const result = await handler.execute({
    name: body.name,
    fiscalYear: body.fiscalYear,
    createdBy: userId,
    lines: body.lines,
  });

  return c.json({
    success: true,
    data: result,
  }, 201);
});

/**
 * PUT /budgets/:id/lines - Update budget lines
 */
budgetRoutes.put('/:id/lines', zValidator('json', updateBudgetLinesSchema), async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');
  const budgetId = c.req.param('id');
  const body = c.req.valid('json');

  const repository = new DrizzleBudgetRepository(db);
  const handler = new UpdateBudgetLinesHandler(repository);

  await handler.execute({
    budgetId,
    lines: body.lines,
    userId,
  });

  return c.json({ success: true });
});

/**
 * POST /budgets/:id/approve - Approve a budget
 */
budgetRoutes.post('/:id/approve', async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');
  const budgetId = c.req.param('id');

  const repository = new DrizzleBudgetRepository(db);
  const handler = new ApproveBudgetHandler(repository);

  await handler.execute({ budgetId, userId });

  return c.json({ success: true });
});

/**
 * DELETE /budgets/:id - Delete a draft budget
 */
budgetRoutes.delete('/:id', async (c) => {
  const db = c.get('db');
  const budgetId = c.req.param('id');

  const repository = new DrizzleBudgetRepository(db);
  const handler = new DeleteBudgetHandler(repository);

  await handler.execute({ budgetId });

  return c.json({ success: true });
});

/**
 * GET /budgets/reports/budget-vs-actual - Budget vs Actual report
 */
budgetRoutes.get('/reports/budget-vs-actual', zValidator('query', budgetVsActualQuerySchema), async (c) => {
  const db = c.get('db');
  const query = c.req.valid('query');

  const budgetRepository = new DrizzleBudgetRepository(db);
  const accountBalanceRepository = new DrizzleAccountBalanceRepository(db);
  const accountRepository = new DrizzleAccountRepository(db);

  const handler = new GetBudgetVsActualHandler(
    budgetRepository,
    accountBalanceRepository,
    accountRepository
  );

  const report = await handler.execute({
    budgetId: query.budgetId,
    fiscalMonth: query.fiscalMonth,
  });

  return c.json({
    success: true,
    data: report,
  });
});

/**
 * GET /budgets/reports/ar-aging - AR Aging report
 */
budgetRoutes.get('/reports/ar-aging', zValidator('query', agingReportQuerySchema), async (c) => {
  const db = c.get('db');
  const query = c.req.valid('query');

  const accountRepository = new DrizzleAccountRepository(db);
  const accountBalanceRepository = new DrizzleAccountBalanceRepository(db);

  const handler = new GetARAgingHandler(accountRepository, accountBalanceRepository);
  const asOfDate = query.asOfDate ? new Date(query.asOfDate) : new Date();

  const report = await handler.execute({ asOfDate });

  return c.json({
    success: true,
    data: report,
  });
});

/**
 * GET /budgets/reports/ap-aging - AP Aging report
 */
budgetRoutes.get('/reports/ap-aging', zValidator('query', agingReportQuerySchema), async (c) => {
  const db = c.get('db');
  const query = c.req.valid('query');

  const accountRepository = new DrizzleAccountRepository(db);
  const accountBalanceRepository = new DrizzleAccountBalanceRepository(db);

  const handler = new GetAPAgingHandler(accountRepository, accountBalanceRepository);
  const asOfDate = query.asOfDate ? new Date(query.asOfDate) : new Date();

  const report = await handler.execute({ asOfDate });

  return c.json({
    success: true,
    data: report,
  });
});

export { budgetRoutes };
