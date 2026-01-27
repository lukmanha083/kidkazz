import { FiscalPeriod, FiscalPeriodStatus } from '@/domain/value-objects';

// ============================================================================
// Types
// ============================================================================

export interface AccountBalanceData {
  accountId: string;
  openingBalance: number;
  debitTotal: number;
  creditTotal: number;
  closingBalance: number;
}

export interface RealTimeBalanceData {
  accountId: string;
  debitTotal: number;
  creditTotal: number;
}

export interface AccountInfoData {
  code: string;
  name: string;
  accountType: string;
  normalBalance: 'Debit' | 'Credit';
}

/**
 * Dependencies for trial balance calculation
 */
export interface TrialBalanceDependencies {
  /**
   * Get the status of a fiscal period
   * Returns null if period doesn't exist
   */
  getPeriodStatus(year: number, month: number): Promise<FiscalPeriodStatus | null>;

  /**
   * Get account balances for a closed period (from account_balances table)
   */
  getAccountBalances(year: number, month: number): Promise<AccountBalanceData[]>;

  /**
   * Get account info for a list of account IDs
   */
  getAccountInfo(accountIds: string[]): Promise<Map<string, AccountInfoData>>;

  /**
   * Get real-time balances from posted journal lines for an open period
   */
  getRealTimeBalances(year: number, month: number): Promise<RealTimeBalanceData[]>;
}

// ============================================================================
// Query and Result Types
// ============================================================================

export interface GetTrialBalanceQuery {
  fiscalYear: number;
  fiscalMonth: number;
}

export interface TrialBalanceAccount {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  debitBalance: number;
  creditBalance: number;
}

export interface TrialBalanceResult {
  fiscalYear: number;
  fiscalMonth: number;
  periodString: string;
  periodStatus: FiscalPeriodStatus | null;
  asOfDate: Date;
  accounts: TrialBalanceAccount[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  difference: number;
}

// ============================================================================
// Handler
// ============================================================================

export class GetTrialBalanceHandler {
  constructor(private readonly deps: TrialBalanceDependencies) {}

  async execute(query: GetTrialBalanceQuery): Promise<TrialBalanceResult> {
    const { fiscalYear, fiscalMonth } = query;
    const period = FiscalPeriod.create(fiscalYear, fiscalMonth);

    // Get period status
    const periodStatus = await this.deps.getPeriodStatus(fiscalYear, fiscalMonth);

    // Get balances based on period status
    let balanceData: { accountId: string; debitTotal: number; creditTotal: number; closingBalance?: number }[];

    if (periodStatus === FiscalPeriodStatus.CLOSED || periodStatus === FiscalPeriodStatus.LOCKED) {
      // Use pre-calculated account balances
      const accountBalances = await this.deps.getAccountBalances(fiscalYear, fiscalMonth);
      balanceData = accountBalances.map((b) => ({
        accountId: b.accountId,
        debitTotal: b.debitTotal,
        creditTotal: b.creditTotal,
        closingBalance: b.closingBalance,
      }));
    } else {
      // Calculate real-time from journal lines
      const realTimeBalances = await this.deps.getRealTimeBalances(fiscalYear, fiscalMonth);
      balanceData = realTimeBalances.map((b) => ({
        accountId: b.accountId,
        debitTotal: b.debitTotal,
        creditTotal: b.creditTotal,
      }));
    }

    // Get account info for all accounts
    const accountIds = balanceData.map((b) => b.accountId);
    const accountInfoMap = await this.deps.getAccountInfo(accountIds);

    // Build trial balance accounts
    const accounts: TrialBalanceAccount[] = [];

    for (const balance of balanceData) {
      const accountInfo = accountInfoMap.get(balance.accountId);
      if (!accountInfo) continue;

      // Calculate the balance to show in trial balance columns
      // For closed periods, use closing balance
      // For open periods, calculate net from debits/credits
      let closingBalance: number;
      if (balance.closingBalance !== undefined) {
        closingBalance = balance.closingBalance;
      } else {
        // Calculate based on normal balance direction
        if (accountInfo.normalBalance === 'Debit') {
          closingBalance = balance.debitTotal - balance.creditTotal;
        } else {
          closingBalance = balance.creditTotal - balance.debitTotal;
        }
      }

      // Determine which column to show the balance in
      let debitBalance = 0;
      let creditBalance = 0;

      if (closingBalance >= 0) {
        if (accountInfo.normalBalance === 'Debit') {
          debitBalance = closingBalance;
        } else {
          creditBalance = closingBalance;
        }
      } else {
        // Negative balance goes to opposite column
        if (accountInfo.normalBalance === 'Debit') {
          creditBalance = Math.abs(closingBalance);
        } else {
          debitBalance = Math.abs(closingBalance);
        }
      }

      accounts.push({
        accountId: balance.accountId,
        accountCode: accountInfo.code,
        accountName: accountInfo.name,
        accountType: accountInfo.accountType,
        debitBalance,
        creditBalance,
      });
    }

    // Sort by account code
    accounts.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    // Calculate totals
    const totalDebits = accounts.reduce((sum, a) => sum + a.debitBalance, 0);
    const totalCredits = accounts.reduce((sum, a) => sum + a.creditBalance, 0);

    // Check if balanced (with tolerance for floating point)
    const tolerance = 0.01;
    const difference = Math.abs(totalDebits - totalCredits);
    const isBalanced = difference < tolerance;

    return {
      fiscalYear,
      fiscalMonth,
      periodString: period.toString(),
      periodStatus,
      asOfDate: period.getEndDate(),
      accounts,
      totalDebits,
      totalCredits,
      isBalanced,
      difference: isBalanced ? 0 : totalDebits - totalCredits,
    };
  }
}
