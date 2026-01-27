import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { eq, and, sql } from 'drizzle-orm';
import { FiscalPeriod, FiscalPeriodStatus } from '@/domain/value-objects';
import { GetTrialBalanceHandler, type TrialBalanceDependencies } from '@/application/queries/trial-balance.queries';
import { GetIncomeStatementHandler, type IncomeStatementDependencies } from '@/application/queries/income-statement.queries';
import { GetBalanceSheetHandler, type BalanceSheetDependencies } from '@/application/queries/balance-sheet.queries';
import { PeriodCloseService, type PeriodCloseServiceDependencies } from '@/domain/services/PeriodCloseService';
import {
  trialBalanceQuerySchema,
  incomeStatementQuerySchema,
  balanceSheetQuerySchema,
  closeChecklistQuerySchema,
} from '@/application/dtos/report.dto';
import {
  chartOfAccounts,
  journalEntries,
  journalLines,
  accountBalances,
  fiscalPeriods,
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
        .where(sql`${chartOfAccounts.id} IN ${accountIds}`);

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

export { reportsRoutes };
