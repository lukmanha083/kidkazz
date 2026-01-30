/**
 * Account Balance Routes
 *
 * API endpoints for calculating and retrieving account balances.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import {
  chartOfAccounts,
  journalEntries,
  journalLines,
  accountBalances,
} from '@/infrastructure/db/schema';
import { DrizzleAccountBalanceRepository } from '@/infrastructure/repositories/account-balance.repository';
import {
  CalculatePeriodBalancesHandler,
  GetAccountBalanceHandler,
  GetPeriodBalancesHandler,
  type CalculatePeriodBalancesDependencies,
  type AccountWithNormalBalance,
  type JournalLineSummary,
} from '@/application/commands/account-balance.commands';
import { FiscalPeriod } from '@/domain/value-objects';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Variables = { db: any };

export const accountBalanceRoutes = new Hono<{ Variables: Variables }>();

// ============================================================================
// Validation Schemas
// ============================================================================

const calculateBalancesSchema = z.object({
  fiscalYear: z.coerce.number().int().min(2000).max(2100),
  fiscalMonth: z.coerce.number().int().min(1).max(12),
  recalculate: z.coerce.boolean().optional().default(false),
});

const getBalanceQuerySchema = z.object({
  fiscalYear: z.coerce.number().int().min(2000).max(2100),
  fiscalMonth: z.coerce.number().int().min(1).max(12),
});

// ============================================================================
// Dependencies Factory
// ============================================================================

function createCalculateBalancesDependencies(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any
): CalculatePeriodBalancesDependencies {
  const accountBalanceRepository = new DrizzleAccountBalanceRepository(db);

  return {
    accountBalanceRepository,

    async getAccountsWithActivity(
      year: number,
      month: number
    ): Promise<AccountWithNormalBalance[]> {
      // Get all unique accounts that have posted journal lines in this period
      const results = await db
        .selectDistinct({
          id: chartOfAccounts.id,
          code: chartOfAccounts.code,
          name: chartOfAccounts.name,
          normalBalance: chartOfAccounts.normalBalance,
        })
        .from(journalLines)
        .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
        .innerJoin(chartOfAccounts, eq(journalLines.accountId, chartOfAccounts.id))
        .where(
          and(
            eq(journalEntries.status, 'Posted'),
            eq(journalEntries.fiscalYear, year),
            eq(journalEntries.fiscalMonth, month)
          )
        );

      return results.map(
        (r: { id: string; code: string; name: string; normalBalance: string }) => ({
          id: r.id,
          code: r.code,
          name: r.name,
          normalBalance: r.normalBalance as 'Debit' | 'Credit',
        })
      );
    },

    async getJournalLineSummary(year: number, month: number): Promise<JournalLineSummary[]> {
      // Aggregate debits and credits by account for posted entries in the period
      const results = await db
        .select({
          accountId: journalLines.accountId,
          debitTotal: sql<number>`COALESCE(SUM(CASE WHEN ${journalLines.direction} = 'Debit' THEN ${journalLines.amount} ELSE 0 END), 0)`,
          creditTotal: sql<number>`COALESCE(SUM(CASE WHEN ${journalLines.direction} = 'Credit' THEN ${journalLines.amount} ELSE 0 END), 0)`,
        })
        .from(journalLines)
        .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
        .where(
          and(
            eq(journalEntries.status, 'Posted'),
            eq(journalEntries.fiscalYear, year),
            eq(journalEntries.fiscalMonth, month)
          )
        )
        .groupBy(journalLines.accountId);

      return results.map((r: { accountId: string; debitTotal: number; creditTotal: number }) => ({
        accountId: r.accountId,
        debitTotal: r.debitTotal,
        creditTotal: r.creditTotal,
      }));
    },

    async getPreviousPeriodClosingBalance(
      accountId: string,
      year: number,
      month: number
    ): Promise<number> {
      // Get previous period
      const period = FiscalPeriod.create(year, month);
      const previous = period.previous();

      if (!previous) {
        return 0;
      }

      // Look for previous period's closing balance
      const result = await db
        .select({ closingBalance: accountBalances.closingBalance })
        .from(accountBalances)
        .where(
          and(
            eq(accountBalances.accountId, accountId),
            eq(accountBalances.fiscalYear, previous.year),
            eq(accountBalances.fiscalMonth, previous.month)
          )
        )
        .limit(1);

      return result[0]?.closingBalance ?? 0;
    },
  };
}

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /account-balances/calculate - Calculate and persist account balances for a period
 *
 * This should be called:
 * 1. When closing a fiscal period
 * 2. When you want to recalculate balances for a period
 *
 * For open periods, reports calculate balances in real-time from journal entries.
 * For closed periods, balances are read from the account_balances table.
 */
accountBalanceRoutes.post(
  '/calculate',
  zValidator('json', calculateBalancesSchema),
  async (c) => {
    const db = c.get('db');
    const body = c.req.valid('json');

    const deps = createCalculateBalancesDependencies(db);
    const handler = new CalculatePeriodBalancesHandler(deps);

    try {
      const result = await handler.execute({
        fiscalYear: body.fiscalYear,
        fiscalMonth: body.fiscalMonth,
        recalculate: body.recalculate,
      });

      return c.json({
        success: true,
        data: result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to calculate balances';
      return c.json({ success: false, error: message }, 400);
    }
  }
);

/**
 * GET /account-balances/:accountId - Get balance for a specific account in a period
 */
accountBalanceRoutes.get(
  '/:accountId',
  zValidator('query', getBalanceQuerySchema),
  async (c) => {
    const db = c.get('db');
    const accountId = c.req.param('accountId');
    const query = c.req.valid('query');

    const repository = new DrizzleAccountBalanceRepository(db);
    const handler = new GetAccountBalanceHandler(repository);

    try {
      const result = await handler.execute({
        accountId,
        fiscalYear: query.fiscalYear,
        fiscalMonth: query.fiscalMonth,
      });

      if (!result) {
        // If no pre-calculated balance exists, calculate in real-time
        const realtimeBalance = await calculateRealtimeBalance(
          db,
          accountId,
          query.fiscalYear,
          query.fiscalMonth
        );

        if (!realtimeBalance) {
          return c.json({ success: false, error: 'Account balance not found' }, 404);
        }

        return c.json({
          success: true,
          data: realtimeBalance,
        });
      }

      return c.json({
        success: true,
        data: {
          ...result,
          lastUpdatedAt: result.lastUpdatedAt.toISOString(),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get account balance';
      return c.json({ success: false, error: message }, 400);
    }
  }
);

/**
 * GET /account-balances - Get all balances for a period
 */
accountBalanceRoutes.get('/', zValidator('query', getBalanceQuerySchema), async (c) => {
  const db = c.get('db');
  const query = c.req.valid('query');

  const repository = new DrizzleAccountBalanceRepository(db);
  const handler = new GetPeriodBalancesHandler(repository);

  try {
    const result = await handler.execute({
      fiscalYear: query.fiscalYear,
      fiscalMonth: query.fiscalMonth,
    });

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get period balances';
    return c.json({ success: false, error: message }, 400);
  }
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate account balance in real-time from journal entries
 * Used when no pre-calculated balance exists
 */
async function calculateRealtimeBalance(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  accountId: string,
  fiscalYear: number,
  fiscalMonth: number
): Promise<{
  accountId: string;
  fiscalYear: number;
  fiscalMonth: number;
  openingBalance: number;
  debitTotal: number;
  creditTotal: number;
  closingBalance: number;
} | null> {
  // Get account info
  const accountResult = await db
    .select({
      id: chartOfAccounts.id,
      normalBalance: chartOfAccounts.normalBalance,
    })
    .from(chartOfAccounts)
    .where(eq(chartOfAccounts.id, accountId))
    .limit(1);

  if (accountResult.length === 0) {
    return null;
  }

  const account = accountResult[0];

  // Get previous period closing balance
  const period = FiscalPeriod.create(fiscalYear, fiscalMonth);
  const previous = period.previous();
  let openingBalance = 0;

  if (previous) {
    const prevBalanceResult = await db
      .select({ closingBalance: accountBalances.closingBalance })
      .from(accountBalances)
      .where(
        and(
          eq(accountBalances.accountId, accountId),
          eq(accountBalances.fiscalYear, previous.year),
          eq(accountBalances.fiscalMonth, previous.month)
        )
      )
      .limit(1);

    openingBalance = prevBalanceResult[0]?.closingBalance ?? 0;
  }

  // Get current period activity
  const activityResult = await db
    .select({
      debitTotal: sql<number>`COALESCE(SUM(CASE WHEN ${journalLines.direction} = 'Debit' THEN ${journalLines.amount} ELSE 0 END), 0)`,
      creditTotal: sql<number>`COALESCE(SUM(CASE WHEN ${journalLines.direction} = 'Credit' THEN ${journalLines.amount} ELSE 0 END), 0)`,
    })
    .from(journalLines)
    .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
    .where(
      and(
        eq(journalLines.accountId, accountId),
        eq(journalEntries.status, 'Posted'),
        eq(journalEntries.fiscalYear, fiscalYear),
        eq(journalEntries.fiscalMonth, fiscalMonth)
      )
    );

  const debitTotal = activityResult[0]?.debitTotal ?? 0;
  const creditTotal = activityResult[0]?.creditTotal ?? 0;

  // Calculate closing balance based on normal balance direction
  let closingBalance: number;
  if (account.normalBalance === 'Debit') {
    closingBalance = openingBalance + debitTotal - creditTotal;
  } else {
    closingBalance = openingBalance + creditTotal - debitTotal;
  }

  return {
    accountId,
    fiscalYear,
    fiscalMonth,
    openingBalance,
    debitTotal,
    creditTotal,
    closingBalance,
  };
}
