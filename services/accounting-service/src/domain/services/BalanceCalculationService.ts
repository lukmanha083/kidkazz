import { AccountBalance, type NormalBalance } from '@/domain/entities/account-balance.entity';
import type { FiscalPeriod } from '@/domain/value-objects';

/**
 * Account info needed for balance calculation
 */
export interface AccountInfo {
  id: string;
  code: string;
  name: string;
  normalBalance: NormalBalance;
}

/**
 * Summary of journal line totals for an account
 */
export interface JournalLineSummary {
  accountId: string;
  debitTotal: number;
  creditTotal: number;
}

/**
 * Trial balance validation result
 */
export interface TrialBalanceValidation {
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  difference: number;
}

/**
 * Dependencies for balance calculation
 * Injected to allow for testing and flexibility
 */
export interface BalanceCalculationDependencies {
  /**
   * Get all accounts that have journal activity in the period
   */
  getAccountsWithActivity(period: FiscalPeriod): Promise<AccountInfo[]>;

  /**
   * Get aggregated debit/credit totals from posted journal lines for the period
   */
  getJournalLineSummary(period: FiscalPeriod): Promise<JournalLineSummary[]>;

  /**
   * Get the closing balance from the previous period for an account
   * Returns null if no previous balance exists
   */
  getPreviousPeriodClosingBalance(accountId: string, period: FiscalPeriod): Promise<number | null>;
}

/**
 * Balance Calculation Service
 *
 * Calculates account balances for a fiscal period from journal entries.
 * Uses the following formula based on normal balance direction:
 *
 * Debit normal (Assets, Expenses, COGS):
 *   Closing = Opening + Debits - Credits
 *
 * Credit normal (Liabilities, Equity, Revenue):
 *   Closing = Opening + Credits - Debits
 */
export class BalanceCalculationService {
  constructor(private readonly deps: BalanceCalculationDependencies) {}

  /**
   * Calculate account balances for a fiscal period
   *
   * 1. Get all accounts with posted journal entries in the period
   * 2. For each account, get the previous period's closing balance as opening
   * 3. Aggregate debits and credits from posted journal lines
   * 4. Calculate closing balance based on normal balance direction
   *
   * @param period - The fiscal period to calculate balances for
   * @returns Array of AccountBalance entities
   */
  async calculatePeriodBalances(period: FiscalPeriod): Promise<AccountBalance[]> {
    // Get accounts with activity
    const accounts = await this.deps.getAccountsWithActivity(period);

    if (accounts.length === 0) {
      return [];
    }

    // Get journal line summaries
    const summaries = await this.deps.getJournalLineSummary(period);
    const summaryMap = new Map(summaries.map((s) => [s.accountId, s]));

    // Calculate balances for each account
    const balances: AccountBalance[] = [];

    for (const account of accounts) {
      // Get previous period closing balance as opening
      const previousClosing = await this.deps.getPreviousPeriodClosingBalance(account.id, period);
      const openingBalance = previousClosing ?? 0;

      // Get journal line summary for this account
      const summary = summaryMap.get(account.id);
      const debitTotal = summary?.debitTotal ?? 0;
      const creditTotal = summary?.creditTotal ?? 0;

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

    return balances;
  }

  /**
   * Validate that a trial balance is balanced (debits = credits)
   *
   * @param balances - Array of account balances to validate
   * @returns Validation result with totals and balance status
   */
  validateTrialBalance(balances: AccountBalance[]): TrialBalanceValidation {
    const totalDebits = balances.reduce((sum, b) => sum + b.debitTotal, 0);
    const totalCredits = balances.reduce((sum, b) => sum + b.creditTotal, 0);

    // Use tolerance for floating point comparison
    const tolerance = 0.01;
    const difference = Math.abs(totalDebits - totalCredits);
    const isBalanced = difference < tolerance;

    return {
      totalDebits,
      totalCredits,
      isBalanced,
      difference: isBalanced ? 0 : totalDebits - totalCredits,
    };
  }
}
