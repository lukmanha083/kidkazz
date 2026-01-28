import { CashAlertLevel } from '@/domain/value-objects';

/**
 * Cash account balance information
 */
export interface CashAccountBalance {
  accountCode: string;
  accountName: string;
  balance: number;
  lastReconciledDate?: Date;
  bankAccountId?: string;
}

/**
 * Cash account section (cash on hand, bank accounts, cash equivalents)
 */
export interface CashAccountSection {
  accounts: CashAccountBalance[];
  total: number;
}

/**
 * Cash position result
 */
export interface CashPositionResult {
  asOfDate: Date;
  cashOnHand: CashAccountSection; // Codes 1010-1014
  bankAccounts: CashAccountSection; // Codes 1020-1027
  cashEquivalents: CashAccountSection; // Codes 1030-1031
  totalCashPosition: number;
  alertStatus?: ThresholdCheckResult;
  unreconciledAccounts: CashAccountBalance[];
}

/**
 * Threshold configuration
 */
export interface CashThresholdConfig {
  warningThreshold: number; // e.g., Rp 300M
  criticalThreshold: number; // e.g., Rp 275M
  emergencyThreshold: number; // e.g., Rp 250M
}

/**
 * Threshold check result
 */
export interface ThresholdCheckResult {
  alertLevel: CashAlertLevel;
  isAlert: boolean;
  message: string;
  currentBalance: number;
  threshold: number;
}

/**
 * CashPositionService
 * Real-time cash position aggregation and threshold alerts (Rule 30, 35)
 */
export class CashPositionService {
  // Account code ranges for cash categories
  private readonly CASH_ON_HAND_CODES = ['1010', '1011', '1012', '1013', '1014'];
  private readonly BANK_ACCOUNT_CODES = [
    '1020',
    '1021',
    '1022',
    '1023',
    '1024',
    '1025',
    '1026',
    '1027',
  ];
  private readonly CASH_EQUIVALENT_CODES = ['1030', '1031'];

  /**
   * Calculate cash position from account balances (Rule 30)
   */
  calculateCashPosition(
    accounts: CashAccountBalance[],
    asOfDate: Date = new Date(),
    thresholds?: CashThresholdConfig
  ): CashPositionResult {
    // Categorize accounts
    const cashOnHandAccounts = accounts.filter((a) =>
      this.CASH_ON_HAND_CODES.some((code) => a.accountCode.startsWith(code.substring(0, 4)))
    );
    const bankAccountAccounts = accounts.filter((a) =>
      this.BANK_ACCOUNT_CODES.some((code) => a.accountCode.startsWith(code.substring(0, 4)))
    );
    const cashEquivalentAccounts = accounts.filter((a) =>
      this.CASH_EQUIVALENT_CODES.some((code) => a.accountCode.startsWith(code.substring(0, 4)))
    );

    // Calculate totals
    const cashOnHandTotal = cashOnHandAccounts.reduce((sum, a) => sum + a.balance, 0);
    const bankAccountsTotal = bankAccountAccounts.reduce((sum, a) => sum + a.balance, 0);
    const cashEquivalentsTotal = cashEquivalentAccounts.reduce((sum, a) => sum + a.balance, 0);
    const totalCashPosition = cashOnHandTotal + bankAccountsTotal + cashEquivalentsTotal;

    // Identify unreconciled accounts
    const unreconciledAccounts = this.identifyUnreconciledAccounts(
      [...bankAccountAccounts],
      asOfDate
    );

    // Check thresholds if provided
    let alertStatus: ThresholdCheckResult | undefined;
    if (thresholds) {
      alertStatus = this.checkThresholds(totalCashPosition, thresholds);
    }

    return {
      asOfDate,
      cashOnHand: {
        accounts: cashOnHandAccounts,
        total: cashOnHandTotal,
      },
      bankAccounts: {
        accounts: bankAccountAccounts,
        total: bankAccountsTotal,
      },
      cashEquivalents: {
        accounts: cashEquivalentAccounts,
        total: cashEquivalentsTotal,
      },
      totalCashPosition,
      alertStatus,
      unreconciledAccounts,
    };
  }

  /**
   * Check cash balance against thresholds (Rule 35)
   */
  checkThresholds(currentBalance: number, thresholds: CashThresholdConfig): ThresholdCheckResult {
    if (currentBalance < thresholds.emergencyThreshold) {
      return {
        alertLevel: CashAlertLevel.EMERGENCY,
        isAlert: true,
        message: `Emergency: Cash position (Rp ${this.formatCurrency(currentBalance)}) is below emergency threshold (Rp ${this.formatCurrency(thresholds.emergencyThreshold)})`,
        currentBalance,
        threshold: thresholds.emergencyThreshold,
      };
    }

    if (currentBalance < thresholds.criticalThreshold) {
      return {
        alertLevel: CashAlertLevel.CRITICAL,
        isAlert: true,
        message: `Critical: Cash position (Rp ${this.formatCurrency(currentBalance)}) is below critical threshold (Rp ${this.formatCurrency(thresholds.criticalThreshold)})`,
        currentBalance,
        threshold: thresholds.criticalThreshold,
      };
    }

    if (currentBalance < thresholds.warningThreshold) {
      return {
        alertLevel: CashAlertLevel.WARNING,
        isAlert: true,
        message: `Warning: Cash position (Rp ${this.formatCurrency(currentBalance)}) is below warning threshold (Rp ${this.formatCurrency(thresholds.warningThreshold)})`,
        currentBalance,
        threshold: thresholds.warningThreshold,
      };
    }

    return {
      alertLevel: CashAlertLevel.NORMAL,
      isAlert: false,
      message: 'Cash position is within normal range',
      currentBalance,
      threshold: thresholds.warningThreshold,
    };
  }

  /**
   * Identify accounts that need reconciliation
   */
  identifyUnreconciledAccounts(
    accounts: CashAccountBalance[],
    currentDate: Date
  ): CashAccountBalance[] {
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    return accounts.filter((account) => {
      if (!account.lastReconciledDate) {
        return true; // Never reconciled
      }

      const reconciledMonth = account.lastReconciledDate.getMonth();
      const reconciledYear = account.lastReconciledDate.getFullYear();

      // Not reconciled in current month
      return (
        reconciledYear < currentYear ||
        (reconciledYear === currentYear && reconciledMonth < currentMonth)
      );
    });
  }

  /**
   * Format currency for display
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID').format(amount);
  }
}
