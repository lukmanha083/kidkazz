import { FiscalPeriod, FiscalPeriodStatus } from '@/domain/value-objects';

// ============================================================================
// Types
// ============================================================================

export interface TrialBalanceValidation {
  isBalanced: boolean;
  difference: number;
}

/**
 * Dependencies for period close service
 */
export interface PeriodCloseServiceDependencies {
  /**
   * Get the status of a fiscal period
   */
  getPeriodStatus(period: FiscalPeriod): Promise<FiscalPeriodStatus | null>;

  /**
   * Get the status of the previous fiscal period
   */
  getPreviousPeriodStatus(period: FiscalPeriod): Promise<FiscalPeriodStatus | null>;

  /**
   * Get count of draft journal entries in the period
   */
  getDraftEntriesCount(period: FiscalPeriod): Promise<number>;

  /**
   * Validate trial balance for the period
   */
  getTrialBalanceValidation(period: FiscalPeriod): Promise<TrialBalanceValidation>;

  /**
   * Calculate and save account balances for the period
   */
  calculateAndSaveAccountBalances(period: FiscalPeriod): Promise<void>;

  /**
   * Close the fiscal period
   */
  closePeriod(period: FiscalPeriod, closedBy: string): Promise<void>;
}

// ============================================================================
// Result Types
// ============================================================================

export interface CloseChecklistResult {
  fiscalYear: number;
  fiscalMonth: number;
  periodString: string;
  previousPeriodClosed: boolean;
  noDraftEntries: boolean;
  draftEntriesCount: number;
  trialBalanceBalanced: boolean;
  trialBalanceDifference: number;
  canClose: boolean;
  blockers: string[];
}

// ============================================================================
// Service
// ============================================================================

/**
 * Period Close Service
 *
 * Manages the fiscal period close workflow:
 * 1. Validate previous period is closed (Rule 14)
 * 2. Validate no draft entries in period
 * 3. Validate trial balance is balanced
 * 4. Calculate and persist account balances
 * 5. Update period status to Closed
 */
export class PeriodCloseService {
  constructor(private readonly deps: PeriodCloseServiceDependencies) {}

  /**
   * Get the close checklist for a fiscal period
   * Returns validation status and any blockers
   */
  async getCloseChecklist(period: FiscalPeriod): Promise<CloseChecklistResult> {
    const blockers: string[] = [];

    // Check current period status
    const periodStatus = await this.deps.getPeriodStatus(period);

    if (periodStatus === FiscalPeriodStatus.CLOSED || periodStatus === FiscalPeriodStatus.LOCKED) {
      blockers.push('Period is already closed');
      return {
        fiscalYear: period.year,
        fiscalMonth: period.month,
        periodString: period.toString(),
        previousPeriodClosed: true,
        noDraftEntries: true,
        draftEntriesCount: 0,
        trialBalanceBalanced: true,
        trialBalanceDifference: 0,
        canClose: false,
        blockers,
      };
    }

    // Check 1: Previous period must be closed (Rule 14)
    const previousPeriod = period.previous();
    let previousPeriodClosed = true;

    if (previousPeriod) {
      const previousStatus = await this.deps.getPreviousPeriodStatus(period);
      if (previousStatus === FiscalPeriodStatus.OPEN) {
        previousPeriodClosed = false;
        blockers.push(`Previous period (${previousPeriod.toString()}) must be closed first`);
      }
    }
    // First period has no previous - always passes

    // Check 2: No draft entries
    const draftEntriesCount = await this.deps.getDraftEntriesCount(period);
    const noDraftEntries = draftEntriesCount === 0;

    if (!noDraftEntries) {
      blockers.push(`${draftEntriesCount} draft journal entries must be posted or deleted`);
    }

    // Check 3: Trial balance must be balanced
    const tbValidation = await this.deps.getTrialBalanceValidation(period);
    const trialBalanceBalanced = tbValidation.isBalanced;

    if (!trialBalanceBalanced) {
      blockers.push(`Trial balance is out of balance by ${tbValidation.difference}`);
    }

    // Can close if all checks pass
    const canClose = previousPeriodClosed && noDraftEntries && trialBalanceBalanced;

    return {
      fiscalYear: period.year,
      fiscalMonth: period.month,
      periodString: period.toString(),
      previousPeriodClosed,
      noDraftEntries,
      draftEntriesCount,
      trialBalanceBalanced,
      trialBalanceDifference: tbValidation.difference,
      canClose,
      blockers,
    };
  }

  /**
   * Close a fiscal period
   * Validates all checks pass, calculates balances, and closes the period
   *
   * @param period - The fiscal period to close
   * @param closedBy - User ID closing the period
   * @throws Error if any close checks fail
   */
  async closePeriod(period: FiscalPeriod, closedBy: string): Promise<void> {
    // Get and validate checklist
    const checklist = await this.getCloseChecklist(period);

    if (!checklist.canClose) {
      const reasons = checklist.blockers.join('; ');
      throw new Error(`Cannot close period: ${reasons}`);
    }

    // Calculate and save account balances
    await this.deps.calculateAndSaveAccountBalances(period);

    // Close the period
    await this.deps.closePeriod(period, closedBy);
  }
}
