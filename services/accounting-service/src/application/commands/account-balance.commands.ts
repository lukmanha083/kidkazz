import { AccountBalance, type NormalBalance } from '@/domain/entities/account-balance.entity';
import type { IAccountBalanceRepository } from '@/domain/repositories/account-balance.repository';
import { FiscalPeriod } from '@/domain/value-objects';

// ============================================================================
// Types
// ============================================================================

export interface AccountWithNormalBalance {
  id: string;
  code: string;
  name: string;
  normalBalance: NormalBalance;
}

export interface JournalLineSummary {
  accountId: string;
  debitTotal: number;
  creditTotal: number;
}

// ============================================================================
// Calculate Period Balances Command
// ============================================================================

export interface CalculatePeriodBalancesCommand {
  fiscalYear: number;
  fiscalMonth: number;
  recalculate?: boolean; // If true, delete existing balances first
}

export interface CalculatePeriodBalancesResult {
  fiscalYear: number;
  fiscalMonth: number;
  accountsProcessed: number;
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
}

export interface CalculatePeriodBalancesDependencies {
  accountBalanceRepository: IAccountBalanceRepository;

  /**
   * Get all accounts that have journal activity in the period
   */
  getAccountsWithActivity(year: number, month: number): Promise<AccountWithNormalBalance[]>;

  /**
   * Get aggregated debit/credit totals from posted journal lines for the period
   */
  getJournalLineSummary(year: number, month: number): Promise<JournalLineSummary[]>;

  /**
   * Get the closing balance from the previous period for an account
   */
  getPreviousPeriodClosingBalance(accountId: string, year: number, month: number): Promise<number>;
}

export class CalculatePeriodBalancesHandler {
  constructor(private readonly deps: CalculatePeriodBalancesDependencies) {}

  async execute(command: CalculatePeriodBalancesCommand): Promise<CalculatePeriodBalancesResult> {
    const { fiscalYear, fiscalMonth, recalculate } = command;
    const period = FiscalPeriod.create(fiscalYear, fiscalMonth);

    // Delete existing balances if recalculating
    if (recalculate) {
      await this.deps.accountBalanceRepository.deleteByPeriod(fiscalYear, fiscalMonth);
    }

    // Get all accounts with journal activity
    const accounts = await this.deps.getAccountsWithActivity(fiscalYear, fiscalMonth);

    if (accounts.length === 0) {
      return {
        fiscalYear,
        fiscalMonth,
        accountsProcessed: 0,
        totalDebits: 0,
        totalCredits: 0,
        isBalanced: true,
      };
    }

    // Get journal line summaries (aggregated debits/credits per account)
    const summaries = await this.deps.getJournalLineSummary(fiscalYear, fiscalMonth);
    const summaryMap = new Map(summaries.map((s) => [s.accountId, s]));

    // Calculate balances for each account
    const balances: AccountBalance[] = [];
    let totalDebits = 0;
    let totalCredits = 0;

    for (const account of accounts) {
      // Get previous period closing balance as opening
      const openingBalance = await this.deps.getPreviousPeriodClosingBalance(
        account.id,
        fiscalYear,
        fiscalMonth
      );

      // Get journal line summary for this account
      const summary = summaryMap.get(account.id);
      const debitTotal = summary?.debitTotal ?? 0;
      const creditTotal = summary?.creditTotal ?? 0;

      // Accumulate totals
      totalDebits += debitTotal;
      totalCredits += creditTotal;

      // Create balance entity
      const balance = AccountBalance.create({
        accountId: account.id,
        fiscalYear: period.year,
        fiscalMonth: period.month,
        openingBalance,
        debitTotal,
        creditTotal,
      });

      // Calculate closing balance based on normal balance direction
      balance.calculateClosingBalance(account.normalBalance);

      balances.push(balance);
    }

    // Save all balances
    await this.deps.accountBalanceRepository.saveMany(balances);

    // Check if balanced (with tolerance for floating point)
    const tolerance = 0.01;
    const difference = Math.abs(totalDebits - totalCredits);
    const isBalanced = difference < tolerance;

    return {
      fiscalYear,
      fiscalMonth,
      accountsProcessed: balances.length,
      totalDebits,
      totalCredits,
      isBalanced,
    };
  }
}

// ============================================================================
// Get Account Balance Query
// ============================================================================

export interface GetAccountBalanceQuery {
  accountId: string;
  fiscalYear: number;
  fiscalMonth: number;
}

export interface GetAccountBalanceResult {
  accountId: string;
  fiscalYear: number;
  fiscalMonth: number;
  openingBalance: number;
  debitTotal: number;
  creditTotal: number;
  closingBalance: number;
  lastUpdatedAt: Date;
}

export class GetAccountBalanceHandler {
  constructor(private readonly repository: IAccountBalanceRepository) {}

  async execute(query: GetAccountBalanceQuery): Promise<GetAccountBalanceResult | null> {
    const balance = await this.repository.findByAccountAndPeriod(
      query.accountId,
      query.fiscalYear,
      query.fiscalMonth
    );

    if (!balance) {
      return null;
    }

    return {
      accountId: balance.accountId,
      fiscalYear: balance.fiscalYear,
      fiscalMonth: balance.fiscalMonth,
      openingBalance: balance.openingBalance,
      debitTotal: balance.debitTotal,
      creditTotal: balance.creditTotal,
      closingBalance: balance.closingBalance,
      lastUpdatedAt: balance.lastUpdatedAt,
    };
  }
}

// ============================================================================
// Get Period Balances Query
// ============================================================================

export interface GetPeriodBalancesQuery {
  fiscalYear: number;
  fiscalMonth: number;
}

export interface PeriodBalanceItem {
  accountId: string;
  openingBalance: number;
  debitTotal: number;
  creditTotal: number;
  closingBalance: number;
}

export interface GetPeriodBalancesResult {
  fiscalYear: number;
  fiscalMonth: number;
  balances: PeriodBalanceItem[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
}

export class GetPeriodBalancesHandler {
  constructor(private readonly repository: IAccountBalanceRepository) {}

  async execute(query: GetPeriodBalancesQuery): Promise<GetPeriodBalancesResult> {
    const balances = await this.repository.findByPeriod(query.fiscalYear, query.fiscalMonth);

    const items: PeriodBalanceItem[] = balances.map((b) => ({
      accountId: b.accountId,
      openingBalance: b.openingBalance,
      debitTotal: b.debitTotal,
      creditTotal: b.creditTotal,
      closingBalance: b.closingBalance,
    }));

    const totalDebits = balances.reduce((sum, b) => sum + b.debitTotal, 0);
    const totalCredits = balances.reduce((sum, b) => sum + b.creditTotal, 0);

    const tolerance = 0.01;
    const difference = Math.abs(totalDebits - totalCredits);
    const isBalanced = difference < tolerance;

    return {
      fiscalYear: query.fiscalYear,
      fiscalMonth: query.fiscalMonth,
      balances: items,
      totalDebits,
      totalCredits,
      isBalanced,
    };
  }
}
