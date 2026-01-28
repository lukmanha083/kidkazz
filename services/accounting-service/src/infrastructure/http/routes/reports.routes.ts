import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { eq, and, sql, inArray, or, like } from 'drizzle-orm';
import { FiscalPeriod, FiscalPeriodStatus } from '@/domain/value-objects';
import { GetTrialBalanceHandler, type TrialBalanceDependencies } from '@/application/queries/trial-balance.queries';
import { GetIncomeStatementHandler, type IncomeStatementDependencies } from '@/application/queries/income-statement.queries';
import { GetBalanceSheetHandler, type BalanceSheetDependencies } from '@/application/queries/balance-sheet.queries';
import { GetCashPositionHandler, type CashPositionDependencies } from '@/application/queries/cash-position.queries';
import { GetCashForecastHandler, type CashForecastDependencies } from '@/application/queries/cash-forecast.queries';
import { PeriodCloseService, type PeriodCloseServiceDependencies } from '@/domain/services/PeriodCloseService';
import type { CashAccountBalance, CashThresholdConfig } from '@/domain/services/CashPositionService';
import type { ExpectedCollection, ScheduledPayment, RecurringPayments } from '@/domain/services/CashForecastService';
import {
  trialBalanceQuerySchema,
  incomeStatementQuerySchema,
  balanceSheetQuerySchema,
  closeChecklistQuerySchema,
  cashPositionQuerySchema,
  cashForecastQuerySchema,
} from '@/application/dtos';
import {
  chartOfAccounts,
  journalEntries,
  journalLines,
  accountBalances,
  fiscalPeriods,
  cashThresholdConfig,
} from '@/infrastructure/db/schema';
import type * as schema from '@/infrastructure/db/schema';

type Bindings = {
  DB: D1Database;
};

type Variables = {
  db: DrizzleD1Database<typeof schema>;
  userId: string;
};

const reportsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ============================================================================
// Helper: Create Trial Balance Dependencies
// ============================================================================

function createTrialBalanceDependencies(db: DrizzleD1Database<typeof schema>): TrialBalanceDependencies {
  return {
    async getPeriodStatus(year: number, month: number) {
      const result = await db
        .select({ status: fiscalPeriods.status })
        .from(fiscalPeriods)
        .where(and(eq(fiscalPeriods.fiscalYear, year), eq(fiscalPeriods.fiscalMonth, month)))
        .limit(1);

      return result[0]?.status as FiscalPeriodStatus | null ?? null;
    },

    async getAccountBalances(year: number, month: number) {
      const results = await db
        .select({
          accountId: accountBalances.accountId,
          openingBalance: accountBalances.openingBalance,
          debitTotal: accountBalances.debitTotal,
          creditTotal: accountBalances.creditTotal,
          closingBalance: accountBalances.closingBalance,
        })
        .from(accountBalances)
        .where(and(eq(accountBalances.fiscalYear, year), eq(accountBalances.fiscalMonth, month)));

      return results;
    },

    async getAccountInfo(accountIds: string[]) {
      if (accountIds.length === 0) return new Map();

      const results = await db
        .select({
          id: chartOfAccounts.id,
          code: chartOfAccounts.code,
          name: chartOfAccounts.name,
          accountType: chartOfAccounts.accountType,
          normalBalance: chartOfAccounts.normalBalance,
        })
        .from(chartOfAccounts)
        .where(inArray(chartOfAccounts.id, accountIds));

      return new Map(
        results.map((r) => [
          r.id,
          {
            code: r.code,
            name: r.name,
            accountType: r.accountType,
            normalBalance: r.normalBalance as 'Debit' | 'Credit',
          },
        ])
      );
    },

    async getRealTimeBalances(year: number, month: number) {
      // Aggregate from posted journal entries
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

      return results;
    },

    async getPriorPeriodBalances(year: number, month: number) {
      // Calculate prior period (handle January -> December of prior year)
      const priorMonth = month === 1 ? 12 : month - 1;
      const priorYear = month === 1 ? year - 1 : year;

      // Get closing balances from prior period as opening balances
      const results = await db
        .select({
          accountId: accountBalances.accountId,
          closingBalance: accountBalances.closingBalance,
        })
        .from(accountBalances)
        .where(
          and(
            eq(accountBalances.fiscalYear, priorYear),
            eq(accountBalances.fiscalMonth, priorMonth)
          )
        );

      return new Map(results.map((r) => [r.accountId, r.closingBalance]));
    },
  };
}

// ============================================================================
// Helper: Create Income Statement Dependencies
// ============================================================================

type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'COGS' | 'Expense';
type AccountCategory = 'CURRENT_ASSET' | 'FIXED_ASSET' | 'OTHER_NON_CURRENT_ASSET' | 'CURRENT_LIABILITY' | 'LONG_TERM_LIABILITY' | 'EQUITY' | 'REVENUE' | 'COGS' | 'OPERATING_EXPENSE' | 'OTHER_INCOME_EXPENSE' | 'TAX';

function createIncomeStatementDependencies(db: DrizzleD1Database<typeof schema>): IncomeStatementDependencies {
  const getAccountsWithBalance = async (year: number, month: number, accountType: AccountType) => {
    // Get YTD balances from account_balances table or calculate from journal entries
    const results = await db
      .select({
        accountId: chartOfAccounts.id,
        accountCode: chartOfAccounts.code,
        accountName: chartOfAccounts.name,
        balance: sql<number>`COALESCE(SUM(
          CASE
            WHEN ${chartOfAccounts.normalBalance} = 'Credit'
            THEN ${accountBalances.creditTotal} - ${accountBalances.debitTotal}
            ELSE ${accountBalances.debitTotal} - ${accountBalances.creditTotal}
          END
        ), 0)`,
      })
      .from(chartOfAccounts)
      .leftJoin(
        accountBalances,
        and(
          eq(accountBalances.accountId, chartOfAccounts.id),
          eq(accountBalances.fiscalYear, year),
          sql`${accountBalances.fiscalMonth} <= ${month}`
        )
      )
      .where(
        and(
          eq(chartOfAccounts.accountType, accountType),
          eq(chartOfAccounts.isDetailAccount, true),
          eq(chartOfAccounts.status, 'Active')
        )
      )
      .groupBy(chartOfAccounts.id);

    return results.filter(r => r.balance !== 0);
  };

  return {
    async getRevenueAccounts(year: number, month: number) {
      return getAccountsWithBalance(year, month, 'Revenue');
    },

    async getCOGSAccounts(year: number, month: number) {
      return getAccountsWithBalance(year, month, 'COGS');
    },

    async getExpenseAccounts(year: number, month: number) {
      return getAccountsWithBalance(year, month, 'Expense');
    },

    async getOtherIncomeExpenseAccounts(year: number, month: number) {
      // Get accounts with category 'OTHER_INCOME_EXPENSE'
      const results = await db
        .select({
          accountId: chartOfAccounts.id,
          accountCode: chartOfAccounts.code,
          accountName: chartOfAccounts.name,
          normalBalance: chartOfAccounts.normalBalance,
          balance: sql<number>`COALESCE(SUM(
            CASE
              WHEN ${chartOfAccounts.normalBalance} = 'Credit'
              THEN ${accountBalances.creditTotal} - ${accountBalances.debitTotal}
              ELSE ${accountBalances.debitTotal} - ${accountBalances.creditTotal}
            END
          ), 0)`,
        })
        .from(chartOfAccounts)
        .leftJoin(
          accountBalances,
          and(
            eq(accountBalances.accountId, chartOfAccounts.id),
            eq(accountBalances.fiscalYear, year),
            sql`${accountBalances.fiscalMonth} <= ${month}`
          )
        )
        .where(
          and(
            eq(chartOfAccounts.accountCategory, 'OTHER_INCOME_EXPENSE'),
            eq(chartOfAccounts.isDetailAccount, true),
            eq(chartOfAccounts.status, 'Active')
          )
        )
        .groupBy(chartOfAccounts.id);

      return results
        .filter(r => r.balance !== 0)
        .map(r => ({
          accountId: r.accountId,
          accountCode: r.accountCode,
          accountName: r.accountName,
          balance: Math.abs(r.balance),
          isIncome: r.normalBalance === 'Credit',
        }));
    },
  };
}

// ============================================================================
// Helper: Create Balance Sheet Dependencies
// ============================================================================

function createBalanceSheetDependencies(db: DrizzleD1Database<typeof schema>): BalanceSheetDependencies {
  const getAccountsByCategory = async (asOfDate: Date, category: AccountCategory) => {
    const year = asOfDate.getFullYear();
    const month = asOfDate.getMonth() + 1;

    const results = await db
      .select({
        accountId: chartOfAccounts.id,
        accountCode: chartOfAccounts.code,
        accountName: chartOfAccounts.name,
        balance: sql<number>`COALESCE(SUM(${accountBalances.closingBalance}), 0)`,
      })
      .from(chartOfAccounts)
      .leftJoin(
        accountBalances,
        and(
          eq(accountBalances.accountId, chartOfAccounts.id),
          eq(accountBalances.fiscalYear, year),
          sql`${accountBalances.fiscalMonth} <= ${month}`
        )
      )
      .where(
        and(
          eq(chartOfAccounts.accountCategory, category),
          eq(chartOfAccounts.isDetailAccount, true),
          eq(chartOfAccounts.status, 'Active')
        )
      )
      .groupBy(chartOfAccounts.id);

    return results.filter(r => r.balance !== 0);
  };

  return {
    async getCurrentAssets(asOfDate: Date) {
      return getAccountsByCategory(asOfDate, 'CURRENT_ASSET');
    },

    async getFixedAssets(asOfDate: Date) {
      return getAccountsByCategory(asOfDate, 'FIXED_ASSET');
    },

    async getOtherAssets(asOfDate: Date) {
      return getAccountsByCategory(asOfDate, 'OTHER_NON_CURRENT_ASSET');
    },

    async getCurrentLiabilities(asOfDate: Date) {
      return getAccountsByCategory(asOfDate, 'CURRENT_LIABILITY');
    },

    async getLongTermLiabilities(asOfDate: Date) {
      return getAccountsByCategory(asOfDate, 'LONG_TERM_LIABILITY');
    },

    async getEquityAccounts(asOfDate: Date) {
      return getAccountsByCategory(asOfDate, 'EQUITY');
    },

    async getRetainedEarnings(_asOfDate: Date) {
      // TODO: Calculate retained earnings from prior years
      return 0;
    },

    async getCurrentYearNetIncome(_asOfDate: Date) {
      // TODO: Calculate current year net income
      return 0;
    },
  };
}

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /reports/trial-balance - Get trial balance
 */
reportsRoutes.get('/trial-balance', zValidator('query', trialBalanceQuerySchema), async (c) => {
  const db = c.get('db');
  const query = c.req.valid('query');

  const deps = createTrialBalanceDependencies(db);
  const handler = new GetTrialBalanceHandler(deps);

  const result = await handler.execute({
    fiscalYear: query.fiscalYear,
    fiscalMonth: query.fiscalMonth,
  });

  return c.json({
    success: true,
    data: {
      ...result,
      asOfDate: result.asOfDate.toISOString(),
    },
  });
});

/**
 * GET /reports/income-statement - Get income statement
 */
reportsRoutes.get('/income-statement', zValidator('query', incomeStatementQuerySchema), async (c) => {
  const db = c.get('db');
  const query = c.req.valid('query');

  const deps = createIncomeStatementDependencies(db);
  const handler = new GetIncomeStatementHandler(deps);

  const result = await handler.execute({
    fiscalYear: query.fiscalYear,
    fiscalMonth: query.fiscalMonth,
  });

  return c.json({
    success: true,
    data: {
      ...result,
      periodStart: result.periodStart.toISOString(),
      periodEnd: result.periodEnd.toISOString(),
    },
  });
});

/**
 * GET /reports/balance-sheet - Get balance sheet
 */
reportsRoutes.get('/balance-sheet', zValidator('query', balanceSheetQuerySchema), async (c) => {
  const db = c.get('db');
  const query = c.req.valid('query');

  const asOfDate = new Date(query.asOfDate);

  const deps = createBalanceSheetDependencies(db);
  const handler = new GetBalanceSheetHandler(deps);

  const result = await handler.execute({ asOfDate });

  return c.json({
    success: true,
    data: {
      ...result,
      asOfDate: result.asOfDate.toISOString(),
    },
  });
});

/**
 * GET /reports/close-checklist - Get period close checklist
 */
reportsRoutes.get('/close-checklist', zValidator('query', closeChecklistQuerySchema), async (c) => {
  const db = c.get('db');
  const query = c.req.valid('query');

  const period = FiscalPeriod.create(query.fiscalYear, query.fiscalMonth);

  const deps: PeriodCloseServiceDependencies = {
    async getPeriodStatus(p: FiscalPeriod) {
      const result = await db
        .select({ status: fiscalPeriods.status })
        .from(fiscalPeriods)
        .where(and(eq(fiscalPeriods.fiscalYear, p.year), eq(fiscalPeriods.fiscalMonth, p.month)))
        .limit(1);

      return result[0]?.status as FiscalPeriodStatus | null ?? null;
    },

    async getPreviousPeriodStatus(p: FiscalPeriod) {
      const prev = p.previous();
      if (!prev) return null;

      const result = await db
        .select({ status: fiscalPeriods.status })
        .from(fiscalPeriods)
        .where(and(eq(fiscalPeriods.fiscalYear, prev.year), eq(fiscalPeriods.fiscalMonth, prev.month)))
        .limit(1);

      return result[0]?.status as FiscalPeriodStatus | null ?? null;
    },

    async getDraftEntriesCount(p: FiscalPeriod) {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(journalEntries)
        .where(
          and(
            eq(journalEntries.fiscalYear, p.year),
            eq(journalEntries.fiscalMonth, p.month),
            eq(journalEntries.status, 'Draft')
          )
        );

      return result[0]?.count ?? 0;
    },

    async getTrialBalanceValidation(p: FiscalPeriod) {
      // Get total debits and credits from posted entries
      const result = await db
        .select({
          totalDebits: sql<number>`COALESCE(SUM(CASE WHEN ${journalLines.direction} = 'Debit' THEN ${journalLines.amount} ELSE 0 END), 0)`,
          totalCredits: sql<number>`COALESCE(SUM(CASE WHEN ${journalLines.direction} = 'Credit' THEN ${journalLines.amount} ELSE 0 END), 0)`,
        })
        .from(journalLines)
        .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
        .where(
          and(
            eq(journalEntries.status, 'Posted'),
            eq(journalEntries.fiscalYear, p.year),
            eq(journalEntries.fiscalMonth, p.month)
          )
        );

      const totalDebits = result[0]?.totalDebits ?? 0;
      const totalCredits = result[0]?.totalCredits ?? 0;
      const difference = Math.abs(totalDebits - totalCredits);

      return {
        isBalanced: difference < 0.01,
        difference,
      };
    },

    async calculateAndSaveAccountBalances(_p: FiscalPeriod) {
      // This would be implemented to calculate and save balances
      // For now, it's a stub
    },

    async closePeriod(_p: FiscalPeriod, _closedBy: string) {
      // This would update the period status
      // For now, it's a stub
    },
  };

  const service = new PeriodCloseService(deps);
  const checklist = await service.getCloseChecklist(period);

  return c.json({
    success: true,
    data: checklist,
  });
});

// ============================================================================
// Cash Position Report
// ============================================================================

/**
 * GET /reports/cash-position - Get real-time cash position
 */
reportsRoutes.get('/cash-position', zValidator('query', cashPositionQuerySchema), async (c) => {
  const db = c.get('db');
  const query = c.req.valid('query');

  const asOfDate = query.asOfDate ? new Date(query.asOfDate) : new Date();

  const deps: CashPositionDependencies = {
    async getCashAccountBalances(_date: Date): Promise<CashAccountBalance[]> {
      // Get all cash accounts (codes 1010-1039)
      const results = await db
        .select({
          accountId: chartOfAccounts.id,
          accountCode: chartOfAccounts.code,
          accountName: chartOfAccounts.name,
          balance: sql<number>`COALESCE(${accountBalances.closingBalance}, 0)`,
        })
        .from(chartOfAccounts)
        .leftJoin(
          accountBalances,
          and(
            eq(accountBalances.accountId, chartOfAccounts.id),
            eq(accountBalances.fiscalYear, asOfDate.getFullYear()),
            eq(accountBalances.fiscalMonth, asOfDate.getMonth() + 1)
          )
        )
        .where(
          and(
            eq(chartOfAccounts.isDetailAccount, true),
            eq(chartOfAccounts.status, 'Active'),
            or(
              like(chartOfAccounts.code, '101%'),
              like(chartOfAccounts.code, '102%'),
              like(chartOfAccounts.code, '103%')
            )
          )
        );

      return results.map((r) => ({
        accountCode: r.accountCode,
        accountName: r.accountName,
        balance: r.balance,
      }));
    },

    async getThresholdConfig(): Promise<CashThresholdConfig | null> {
      const result = await db.select().from(cashThresholdConfig).limit(1);
      if (result.length === 0) return null;

      return {
        warningThreshold: result[0].warningThreshold,
        criticalThreshold: result[0].criticalThreshold,
        emergencyThreshold: result[0].emergencyThreshold,
      };
    },
  };

  const handler = new GetCashPositionHandler(deps);
  const result = await handler.execute({
    asOfDate,
    includeThresholdCheck: query.includeThresholdCheck,
  });

  return c.json({
    success: true,
    data: result,
  });
});

// ============================================================================
// Cash Forecast Report
// ============================================================================

/**
 * GET /reports/cash-forecast - Get 30-day cash forecast
 */
reportsRoutes.get('/cash-forecast', zValidator('query', cashForecastQuerySchema), async (c) => {
  const db = c.get('db');
  const query = c.req.valid('query');

  const deps: CashForecastDependencies = {
    async getCurrentCashBalance(): Promise<number> {
      // Get sum of all cash accounts
      const now = new Date();
      const result = await db
        .select({
          total: sql<number>`COALESCE(SUM(${accountBalances.closingBalance}), 0)`,
        })
        .from(accountBalances)
        .innerJoin(chartOfAccounts, eq(accountBalances.accountId, chartOfAccounts.id))
        .where(
          and(
            or(
              like(chartOfAccounts.code, '101%'),
              like(chartOfAccounts.code, '102%'),
              like(chartOfAccounts.code, '103%')
            ),
            eq(accountBalances.fiscalYear, now.getFullYear()),
            eq(accountBalances.fiscalMonth, now.getMonth() + 1)
          )
        );

      return result[0]?.total ?? 0;
    },

    async getExpectedARCollections(_weeks: number): Promise<ExpectedCollection[]> {
      // TODO: Implement AR aging-based collection estimates
      // For now, return empty array
      return [];
    },

    async getScheduledAPPayments(_weeks: number): Promise<ScheduledPayment[]> {
      // TODO: Implement AP aging-based payment schedules
      // For now, return empty array
      return [];
    },

    async getRecurringPayments(): Promise<RecurringPayments> {
      // TODO: Implement recurring payment configuration
      // For now, return empty config
      return {};
    },

    async getAverageDailySales(): Promise<number> {
      // TODO: Calculate average daily sales from revenue accounts
      // For now, return 0
      return 0;
    },

    async getThresholdConfig(): Promise<CashThresholdConfig | null> {
      const result = await db.select().from(cashThresholdConfig).limit(1);
      if (result.length === 0) return null;

      return {
        warningThreshold: result[0].warningThreshold,
        criticalThreshold: result[0].criticalThreshold,
        emergencyThreshold: result[0].emergencyThreshold,
      };
    },
  };

  const handler = new GetCashForecastHandler(deps);
  const result = await handler.execute({
    weeks: query.weeks,
    includeThresholdAlerts: query.includeThresholdAlerts,
  });

  return c.json({
    success: true,
    data: result,
  });
});

// ============================================================================
// Cash Threshold Config
// ============================================================================

const updateThresholdSchema = z.object({
  warningThreshold: z.number().positive(),
  criticalThreshold: z.number().positive(),
  emergencyThreshold: z.number().positive(),
});

/**
 * GET /reports/cash-threshold - Get cash threshold config
 */
reportsRoutes.get('/cash-threshold', async (c) => {
  const db = c.get('db');

  const result = await db.select().from(cashThresholdConfig).limit(1);

  if (result.length === 0) {
    return c.json({
      success: true,
      data: {
        warningThreshold: 300_000_000,
        criticalThreshold: 275_000_000,
        emergencyThreshold: 250_000_000,
        updatedAt: new Date().toISOString(),
        updatedBy: 'system',
      },
    });
  }

  return c.json({
    success: true,
    data: {
      warningThreshold: result[0].warningThreshold,
      criticalThreshold: result[0].criticalThreshold,
      emergencyThreshold: result[0].emergencyThreshold,
      updatedAt: result[0].updatedAt,
      updatedBy: result[0].updatedBy,
    },
  });
});

/**
 * PUT /reports/cash-threshold - Update cash threshold config
 */
reportsRoutes.put('/cash-threshold', zValidator('json', updateThresholdSchema), async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');
  const body = c.req.valid('json');

  // Validate threshold order
  if (body.warningThreshold <= body.criticalThreshold) {
    return c.json({ success: false, error: 'Warning threshold must be greater than critical threshold' }, 400);
  }
  if (body.criticalThreshold <= body.emergencyThreshold) {
    return c.json({ success: false, error: 'Critical threshold must be greater than emergency threshold' }, 400);
  }

  const now = new Date().toISOString();

  // Upsert the config
  await db
    .insert(cashThresholdConfig)
    .values({
      id: 'default',
      name: 'Default Cash Threshold',
      warningThreshold: body.warningThreshold,
      criticalThreshold: body.criticalThreshold,
      emergencyThreshold: body.emergencyThreshold,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    })
    .onConflictDoUpdate({
      target: cashThresholdConfig.id,
      set: {
        warningThreshold: body.warningThreshold,
        criticalThreshold: body.criticalThreshold,
        emergencyThreshold: body.emergencyThreshold,
        updatedAt: now,
        updatedBy: userId,
      },
    });

  return c.json({
    success: true,
    data: {
      warningThreshold: body.warningThreshold,
      criticalThreshold: body.criticalThreshold,
      emergencyThreshold: body.emergencyThreshold,
      updatedAt: now,
      updatedBy: userId,
    },
  });
});

export { reportsRoutes };
