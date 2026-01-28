import {
  type CashAccountBalance,
  type CashPositionResult,
  CashPositionService,
  type CashThresholdConfig,
} from '@/domain/services';

// ============================================================================
// Types
// ============================================================================

/**
 * Dependencies for cash position query
 */
export interface CashPositionDependencies {
  /**
   * Get all cash account balances (codes 1010-1039)
   */
  getCashAccountBalances(asOfDate: Date): Promise<CashAccountBalance[]>;

  /**
   * Get current threshold configuration
   */
  getThresholdConfig(): Promise<CashThresholdConfig | null>;
}

// ============================================================================
// Query and Result Types
// ============================================================================

export interface GetCashPositionQuery {
  asOfDate?: Date;
  includeThresholdCheck?: boolean;
}

export interface CashPositionQueryResult extends CashPositionResult {
  asOfDateStr: string;
}

// ============================================================================
// Handler
// ============================================================================

export class GetCashPositionHandler {
  private readonly service: CashPositionService;

  constructor(private readonly deps: CashPositionDependencies) {
    this.service = new CashPositionService();
  }

  async execute(query: GetCashPositionQuery): Promise<CashPositionQueryResult> {
    const asOfDate = query.asOfDate ?? new Date();
    const includeThresholdCheck = query.includeThresholdCheck ?? true;

    // Get account balances
    const accountBalances = await this.deps.getCashAccountBalances(asOfDate);

    // Get thresholds if needed
    let thresholds: CashThresholdConfig | undefined;
    if (includeThresholdCheck) {
      thresholds = (await this.deps.getThresholdConfig()) ?? undefined;
    }

    // Calculate cash position
    const result = this.service.calculateCashPosition(accountBalances, asOfDate, thresholds);

    return {
      ...result,
      asOfDateStr: asOfDate.toISOString(),
    };
  }
}
