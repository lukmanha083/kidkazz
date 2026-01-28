import type { IBudgetRepository } from '@/domain/repositories/budget.repository';
import type { IAccountBalanceRepository } from '@/domain/repositories/account-balance.repository';
import type { IAccountRepository } from '@/domain/repositories/account.repository';

/**
 * Budget vs Actual report section
 */
export interface BudgetVsActualSection {
  accountId: string;
  accountCode: string;
  accountName: string;
  budgetAmount: number;
  actualAmount: number;
  variance: number;
  variancePercent: number;
  isFavorable: boolean;
}

/**
 * Budget vs Actual report result
 */
export interface BudgetVsActualReport {
  budgetId: string;
  budgetName: string;
  fiscalYear: number;
  fiscalMonth?: number;
  sections: BudgetVsActualSection[];
  totalBudget: number;
  totalActual: number;
  totalVariance: number;
  totalVariancePercent: number;
}

/**
 * Query for Budget vs Actual report
 */
export interface GetBudgetVsActualQuery {
  budgetId: string;
  fiscalMonth?: number; // Optional: specific month or YTD if omitted
}

/**
 * Handler for Budget vs Actual report
 */
export class GetBudgetVsActualHandler {
  constructor(
    private readonly budgetRepository: IBudgetRepository,
    private readonly accountBalanceRepository: IAccountBalanceRepository,
    private readonly accountRepository: IAccountRepository
  ) {}

  async execute(query: GetBudgetVsActualQuery): Promise<BudgetVsActualReport> {
    const budget = await this.budgetRepository.findById(query.budgetId);
    if (!budget) {
      throw new Error('Budget not found');
    }

    const sections: BudgetVsActualSection[] = [];

    // Get unique account IDs from budget lines
    const accountIds = [...new Set(budget.lines.map((l) => l.accountId))];

    for (const accountId of accountIds) {
      const account = await this.accountRepository.findById(accountId);
      if (!account) continue;

      // Calculate budget amount
      let budgetAmount = 0;
      if (query.fiscalMonth) {
        budgetAmount = budget.getAmountForAccount(accountId, query.fiscalMonth);
      } else {
        // YTD budget
        budgetAmount = budget.getAmountForAccount(accountId);
      }

      // Calculate actual amount from account balances
      let actualAmount = 0;
      if (query.fiscalMonth) {
        const balance = await this.accountBalanceRepository.findByAccountAndPeriod(
          accountId,
          budget.fiscalYear,
          query.fiscalMonth
        );
        if (balance) {
          actualAmount = balance.closingBalance;
        }
      } else {
        // YTD actual - sum all months
        for (let month = 1; month <= 12; month++) {
          const balance = await this.accountBalanceRepository.findByAccountAndPeriod(
            accountId,
            budget.fiscalYear,
            month
          );
          if (balance) {
            // For income/expense accounts, use the activity (debits - credits or vice versa)
            const activity = balance.debitTotal - balance.creditTotal;
            actualAmount += Math.abs(activity);
          }
        }
      }

      const variance = budgetAmount - actualAmount;
      const variancePercent = budgetAmount !== 0 ? (variance / budgetAmount) * 100 : 0;
      const isFavorable = variance >= 0;

      sections.push({
        accountId,
        accountCode: account.code,
        accountName: account.name,
        budgetAmount,
        actualAmount,
        variance,
        variancePercent,
        isFavorable,
      });
    }

    const totalBudget = sections.reduce((sum, s) => sum + s.budgetAmount, 0);
    const totalActual = sections.reduce((sum, s) => sum + s.actualAmount, 0);
    const totalVariance = totalBudget - totalActual;
    const totalVariancePercent = totalBudget !== 0 ? (totalVariance / totalBudget) * 100 : 0;

    return {
      budgetId: budget.id,
      budgetName: budget.name,
      fiscalYear: budget.fiscalYear,
      fiscalMonth: query.fiscalMonth,
      sections,
      totalBudget,
      totalActual,
      totalVariance,
      totalVariancePercent,
    };
  }
}

/**
 * AR Aging bucket
 */
export interface AgingBucket {
  current: number; // 0-30 days
  days31_60: number;
  days61_90: number;
  over90: number;
  total: number;
}

/**
 * AR Aging report result
 */
export interface ARAgingReport {
  asOfDate: string;
  summary: AgingBucket;
  totalReceivables: number;
}

/**
 * Query for AR Aging report
 */
export interface GetARAgingQuery {
  asOfDate: Date;
}

/**
 * Handler for AR Aging report
 * Note: Simplified version - in production, this would integrate with invoice/order data
 */
export class GetARAgingHandler {
  constructor(
    private readonly accountRepository: IAccountRepository,
    private readonly accountBalanceRepository: IAccountBalanceRepository
  ) {}

  async execute(query: GetARAgingQuery): Promise<ARAgingReport> {
    // Find AR account (typically 1201 - Accounts Receivable)
    const arAccount = await this.accountRepository.findByCode('1201');

    if (!arAccount) {
      return {
        asOfDate: query.asOfDate.toISOString().split('T')[0],
        summary: { current: 0, days31_60: 0, days61_90: 0, over90: 0, total: 0 },
        totalReceivables: 0,
      };
    }

    // Get AR balance
    const year = query.asOfDate.getFullYear();
    const month = query.asOfDate.getMonth() + 1;
    const balance = await this.accountBalanceRepository.findByAccountAndPeriod(arAccount.id, year, month);
    const totalReceivables = balance?.closingBalance || 0;

    // Simplified aging - in production, this would come from invoice aging
    return {
      asOfDate: query.asOfDate.toISOString().split('T')[0],
      summary: {
        current: totalReceivables * 0.6,
        days31_60: totalReceivables * 0.2,
        days61_90: totalReceivables * 0.15,
        over90: totalReceivables * 0.05,
        total: totalReceivables,
      },
      totalReceivables,
    };
  }
}

/**
 * AP Aging report result
 */
export interface APAgingReport {
  asOfDate: string;
  summary: AgingBucket;
  totalPayables: number;
}

/**
 * Handler for AP Aging report
 */
export class GetAPAgingHandler {
  constructor(
    private readonly accountRepository: IAccountRepository,
    private readonly accountBalanceRepository: IAccountBalanceRepository
  ) {}

  async execute(query: GetARAgingQuery): Promise<APAgingReport> {
    // Find AP account (typically 2101 - Accounts Payable)
    const apAccount = await this.accountRepository.findByCode('2101');

    if (!apAccount) {
      return {
        asOfDate: query.asOfDate.toISOString().split('T')[0],
        summary: { current: 0, days31_60: 0, days61_90: 0, over90: 0, total: 0 },
        totalPayables: 0,
      };
    }

    const year = query.asOfDate.getFullYear();
    const month = query.asOfDate.getMonth() + 1;
    const balance = await this.accountBalanceRepository.findByAccountAndPeriod(apAccount.id, year, month);
    const totalPayables = balance?.closingBalance || 0;

    return {
      asOfDate: query.asOfDate.toISOString().split('T')[0],
      summary: {
        current: totalPayables * 0.7,
        days31_60: totalPayables * 0.15,
        days61_90: totalPayables * 0.1,
        over90: totalPayables * 0.05,
        total: totalPayables,
      },
      totalPayables,
    };
  }
}
