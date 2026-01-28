import {
  AddReconcilingItemHandler,
  ApproveReconciliationHandler,
  AutoMatchTransactionsHandler,
  CalculateAdjustedBalancesHandler,
  CompleteReconciliationHandler,
  CreateReconciliationHandler,
  ImportBankStatementHandler,
  MatchTransactionHandler,
  StartReconciliationHandler,
} from '@/application/commands';
import { matchTransactionSchema } from '@/application/dtos';
import { ReconciliationItemType } from '@/domain/value-objects';
import type * as schema from '@/infrastructure/db/schema';
import {
  DrizzleBankAccountRepository,
  DrizzleBankReconciliationRepository,
  DrizzleBankStatementRepository,
  DrizzleBankTransactionRepository,
} from '@/infrastructure/repositories';
import { zValidator } from '@hono/zod-validator';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import { z } from 'zod';

// ============================================================================
// Local Schemas (not duplicating DTOs, these are route-specific)
// ============================================================================

/**
 * Create Reconciliation Body Schema (route-specific with different field names)
 */
const createReconciliationBodySchema = z.object({
  bankAccountId: z.string().min(1),
  fiscalYear: z.number().int().min(2020).max(2100),
  fiscalMonth: z.number().int().min(1).max(12),
  statementEndingBalance: z.number(),
  bookEndingBalance: z.number(),
  notes: z.string().optional(),
});

/**
 * Import Bank Statement Schema with distinct period dates
 */
const importBankStatementBodySchema = z.object({
  bankAccountId: z.string().min(1),
  statementDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  openingBalance: z.number(),
  closingBalance: z.number(),
  transactions: z.array(
    z.object({
      transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      valueDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
      description: z.string().min(1).max(500),
      reference: z.string().max(100).optional(),
      amount: z.number(),
      checkNumber: z.string().max(50).optional(),
    })
  ),
});

/**
 * Auto-Match Body Schema with journal lines
 */
const autoMatchBodySchema = z.object({
  journalLines: z.array(
    z.object({
      id: z.string(),
      amount: z.number(),
      date: z.string(),
      direction: z.enum(['Debit', 'Credit']),
    })
  ),
  dateTolerance: z.number().int().min(0).max(7).default(3),
});

/**
 * Add Reconciling Item Body Schema (route-specific field mapping)
 */
const addItemBodySchema = z.object({
  itemType: z.enum([
    'OUTSTANDING_CHECK',
    'DEPOSIT_IN_TRANSIT',
    'BANK_FEE',
    'BANK_INTEREST',
    'NSF_CHECK',
    'ADJUSTMENT',
  ]),
  description: z.string().min(1).max(500),
  amount: z.number(),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reference: z.string().max(100).optional(),
  requiresJournalEntry: z.boolean().optional(),
});

type Bindings = {
  DB: D1Database;
};

type Variables = {
  db: DrizzleD1Database<typeof schema>;
  userId: string;
};

const reconciliationRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ============================================================================
// Reconciliation Routes
// ============================================================================

/**
 * GET /reconciliations - List all reconciliations
 */
reconciliationRoutes.get('/', async (c) => {
  const db = c.get('db');

  const repository = new DrizzleBankReconciliationRepository(db);
  const { data } = await repository.findAll();

  return c.json({
    success: true,
    data: data.map((rec) => ({
      id: rec.id,
      bankAccountId: rec.bankAccountId,
      fiscalYear: rec.fiscalYear,
      fiscalMonth: rec.fiscalMonth,
      statementEndingBalance: rec.statementEndingBalance,
      bookEndingBalance: rec.bookEndingBalance,
      adjustedBankBalance: rec.adjustedBankBalance,
      adjustedBookBalance: rec.adjustedBookBalance,
      status: rec.status,
      completedAt: rec.completedAt?.toISOString(),
      approvedAt: rec.approvedAt?.toISOString(),
    })),
  });
});

/**
 * GET /reconciliations/:id - Get reconciliation by ID
 */
reconciliationRoutes.get('/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const repository = new DrizzleBankReconciliationRepository(db);
  const reconciliation = await repository.findById(id);

  if (!reconciliation) {
    return c.json({ success: false, error: 'Reconciliation not found' }, 404);
  }

  return c.json({
    success: true,
    data: {
      id: reconciliation.id,
      bankAccountId: reconciliation.bankAccountId,
      fiscalYear: reconciliation.fiscalYear,
      fiscalMonth: reconciliation.fiscalMonth,
      statementEndingBalance: reconciliation.statementEndingBalance,
      bookEndingBalance: reconciliation.bookEndingBalance,
      adjustedBankBalance: reconciliation.adjustedBankBalance,
      adjustedBookBalance: reconciliation.adjustedBookBalance,
      totalTransactions: reconciliation.totalTransactions,
      matchedTransactions: reconciliation.matchedTransactions,
      unmatchedTransactions: reconciliation.unmatchedTransactions,
      status: reconciliation.status,
      reconcilingItems: reconciliation.reconcilingItems,
      completedAt: reconciliation.completedAt?.toISOString(),
      completedBy: reconciliation.completedBy,
      approvedAt: reconciliation.approvedAt?.toISOString(),
      approvedBy: reconciliation.approvedBy,
    },
  });
});

/**
 * POST /reconciliations - Create new reconciliation
 */
reconciliationRoutes.post('/', zValidator('json', createReconciliationBodySchema), async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');
  const body = c.req.valid('json');

  const bankAccountRepo = new DrizzleBankAccountRepository(db);
  const reconciliationRepo = new DrizzleBankReconciliationRepository(db);
  const handler = new CreateReconciliationHandler(bankAccountRepo, reconciliationRepo);

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
    const message = error instanceof Error ? error.message : 'Failed to create reconciliation';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * POST /reconciliations/:id/start - Start reconciliation
 */
reconciliationRoutes.post('/:id/start', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const repository = new DrizzleBankReconciliationRepository(db);
  const handler = new StartReconciliationHandler(repository);

  try {
    await handler.execute({ reconciliationId: id });

    return c.json({
      success: true,
      message: 'Reconciliation started',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start reconciliation';
    if (message === 'Reconciliation not found') {
      return c.json({ success: false, error: message }, 404);
    }
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * POST /reconciliations/:id/import-statement - Import bank statement
 */
reconciliationRoutes.post(
  '/:id/import-statement',
  zValidator('json', importBankStatementBodySchema),
  async (c) => {
    const db = c.get('db');
    const userId = c.get('userId');
    const body = c.req.valid('json');

    const bankAccountRepo = new DrizzleBankAccountRepository(db);
    const statementRepo = new DrizzleBankStatementRepository(db);
    const transactionRepo = new DrizzleBankTransactionRepository(db);
    const handler = new ImportBankStatementHandler(bankAccountRepo, statementRepo, transactionRepo);

    try {
      const result = await handler.execute({
        bankAccountId: body.bankAccountId,
        statementDate: new Date(body.statementDate),
        periodStart: new Date(body.periodStart),
        periodEnd: new Date(body.periodEnd),
        openingBalance: body.openingBalance,
        closingBalance: body.closingBalance,
        transactions: body.transactions.map((tx) => ({
          transactionDate: new Date(tx.transactionDate),
          valueDate: tx.valueDate ? new Date(tx.valueDate) : undefined,
          description: tx.description,
          reference: tx.reference,
          amount: tx.amount,
          checkNumber: tx.checkNumber,
        })),
        importedBy: userId,
      });

      return c.json({
        success: true,
        data: result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import statement';
      return c.json({ success: false, error: message }, 400);
    }
  }
);

/**
 * GET /reconciliations/:id/unmatched - Get unmatched transactions
 */
reconciliationRoutes.get('/:id/unmatched', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const reconciliationRepo = new DrizzleBankReconciliationRepository(db);
  const transactionRepo = new DrizzleBankTransactionRepository(db);

  const reconciliation = await reconciliationRepo.findById(id);
  if (!reconciliation) {
    return c.json({ success: false, error: 'Reconciliation not found' }, 404);
  }

  const unmatched = await transactionRepo.findUnmatched(reconciliation.bankAccountId);

  return c.json({
    success: true,
    data: unmatched.map((tx) => ({
      id: tx.id,
      transactionDate: tx.transactionDate.toISOString(),
      description: tx.description,
      reference: tx.reference,
      amount: tx.amount,
      transactionType: tx.transactionType,
      matchStatus: tx.matchStatus,
    })),
  });
});

/**
 * POST /reconciliations/:id/match - Match transaction to journal line
 */
reconciliationRoutes.post('/:id/match', zValidator('json', matchTransactionSchema), async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');
  const id = c.req.param('id');
  const body = c.req.valid('json');

  const reconciliationRepo = new DrizzleBankReconciliationRepository(db);
  const transactionRepo = new DrizzleBankTransactionRepository(db);
  const handler = new MatchTransactionHandler(reconciliationRepo, transactionRepo);

  try {
    const result = await handler.execute({
      reconciliationId: id,
      bankTransactionId: body.bankTransactionId,
      journalLineId: body.journalLineId,
      matchedBy: userId,
    });

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to match transaction';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * POST /reconciliations/:id/auto-match - Auto-match transactions
 */
reconciliationRoutes.post('/:id/auto-match', zValidator('json', autoMatchBodySchema), async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');
  const id = c.req.param('id');
  const body = c.req.valid('json');

  const reconciliationRepo = new DrizzleBankReconciliationRepository(db);
  const transactionRepo = new DrizzleBankTransactionRepository(db);
  const handler = new AutoMatchTransactionsHandler(reconciliationRepo, transactionRepo);

  try {
    const result = await handler.execute({
      reconciliationId: id,
      journalLines: body.journalLines.map((jl) => ({
        id: jl.id,
        amount: jl.amount,
        date: new Date(jl.date),
        direction: jl.direction,
      })),
      matchedBy: userId,
      options: {
        dateTolerance: body.dateTolerance,
      },
    });

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to auto-match transactions';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * POST /reconciliations/:id/items - Add reconciling item
 */
reconciliationRoutes.post('/:id/items', zValidator('json', addItemBodySchema), async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');
  const id = c.req.param('id');
  const body = c.req.valid('json');

  const repository = new DrizzleBankReconciliationRepository(db);
  const handler = new AddReconcilingItemHandler(repository);

  // Map string to enum value
  const itemType = ReconciliationItemType[body.itemType as keyof typeof ReconciliationItemType];

  try {
    const result = await handler.execute({
      reconciliationId: id,
      itemType,
      description: body.description,
      amount: body.amount,
      transactionDate: new Date(body.transactionDate),
      reference: body.reference,
      requiresJournalEntry: body.requiresJournalEntry,
      createdBy: userId,
    });

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add reconciling item';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * POST /reconciliations/:id/calculate - Calculate adjusted balances
 */
reconciliationRoutes.post('/:id/calculate', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const repository = new DrizzleBankReconciliationRepository(db);
  const handler = new CalculateAdjustedBalancesHandler(repository);

  try {
    const result = await handler.execute({ reconciliationId: id });

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to calculate balances';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * POST /reconciliations/:id/complete - Complete reconciliation
 */
reconciliationRoutes.post('/:id/complete', async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');
  const id = c.req.param('id');

  const repository = new DrizzleBankReconciliationRepository(db);
  const handler = new CompleteReconciliationHandler(repository);

  try {
    const result = await handler.execute({
      reconciliationId: id,
      completedBy: userId,
    });

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to complete reconciliation';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * POST /reconciliations/:id/approve - Approve reconciliation
 */
reconciliationRoutes.post('/:id/approve', async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');
  const id = c.req.param('id');

  const bankAccountRepo = new DrizzleBankAccountRepository(db);
  const reconciliationRepo = new DrizzleBankReconciliationRepository(db);
  const handler = new ApproveReconciliationHandler(reconciliationRepo, bankAccountRepo);

  try {
    const result = await handler.execute({
      reconciliationId: id,
      approvedBy: userId,
    });

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to approve reconciliation';
    return c.json({ success: false, error: message }, 400);
  }
});

export { reconciliationRoutes };
