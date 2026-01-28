import {
  type CashForecastInput,
  type CashForecastResult,
  CashForecastService,
  type ExpectedCollection,
  type RecurringPayments,
  type ScheduledPayment,
} from '@/domain/services';
import type { CashThresholdConfig } from '@/domain/services/CashPositionService';

// ============================================================================
// Types
// ============================================================================

/**
 * Dependencies for cash forecast query
 */
export interface CashForecastDependencies {
  /**
   * Get current total cash balance
   */
  getCurrentCashBalance(): Promise<number>;

  /**
   * Get expected AR collections for the next N weeks
   */
  getExpectedARCollections(weeks: number): Promise<ExpectedCollection[]>;

  /**
   * Get scheduled AP payments for the next N weeks
   */
  getScheduledAPPayments(weeks: number): Promise<ScheduledPayment[]>;

  /**
   * Get recurring payments configuration
   */
  getRecurringPayments(): Promise<RecurringPayments>;

  /**
   * Get average daily sales (last 30 days)
   */
  getAverageDailySales(): Promise<number>;

  /**
   * Get current threshold configuration
   */
  getThresholdConfig(): Promise<CashThresholdConfig | null>;
}

// ============================================================================
// Query and Result Types
// ============================================================================

export interface GetCashForecastQuery {
  weeks?: number;
  includeThresholdAlerts?: boolean;
}

export interface CashForecastQueryResult extends CashForecastResult {
  generatedAt: string;
}

// ============================================================================
// Handler
// ============================================================================

export class GetCashForecastHandler {
  private readonly service: CashForecastService;

  constructor(private readonly deps: CashForecastDependencies) {
    this.service = new CashForecastService();
  }

  async execute(query: GetCashForecastQuery): Promise<CashForecastQueryResult> {
    const weeks = query.weeks ?? 4;
    const includeThresholdAlerts = query.includeThresholdAlerts ?? true;

    // Gather all input data in parallel
    const [currentCash, arCollections, apPayments, recurringPayments, avgDailySales, thresholds] =
      await Promise.all([
        this.deps.getCurrentCashBalance(),
        this.deps.getExpectedARCollections(weeks),
        this.deps.getScheduledAPPayments(weeks),
        this.deps.getRecurringPayments(),
        this.deps.getAverageDailySales(),
        includeThresholdAlerts ? this.deps.getThresholdConfig() : Promise.resolve(null),
      ]);

    // Build input for forecast service
    const input: CashForecastInput = {
      startingCash: currentCash,
      expectedARCollections: arCollections,
      scheduledAPPayments: apPayments,
      recurringPayments,
      averageDailySales: avgDailySales,
    };

    // Calculate forecast
    const result = this.service.calculateForecast(input, weeks, thresholds ?? undefined);

    return {
      ...result,
      generatedAt: new Date().toISOString(),
    };
  }
}
