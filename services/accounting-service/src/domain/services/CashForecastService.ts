import { CashAlertLevel } from '@/domain/value-objects';
import { CashPositionService, type CashThresholdConfig } from './CashPositionService';

/**
 * Expected AR collection for a week
 */
export interface ExpectedCollection {
  weekNumber: number;
  amount: number;
  source?: string;
}

/**
 * Scheduled AP payment for a week
 */
export interface ScheduledPayment {
  weekNumber: number;
  amount: number;
  vendor?: string;
}

/**
 * Recurring payments configuration
 */
export interface RecurringPayments {
  payroll?: number; // Typically week 4 (end of month)
  rent?: number; // Typically week 1 (beginning of month)
  utilities?: number; // Typically week 2
  insurance?: number;
  loanPayments?: number;
  other?: number;
}

/**
 * Cash forecast input
 */
export interface CashForecastInput {
  startingCash: number;
  expectedARCollections: ExpectedCollection[];
  scheduledAPPayments: ScheduledPayment[];
  recurringPayments: RecurringPayments;
  averageDailySales: number;
}

/**
 * Weekly inflows breakdown
 */
export interface WeeklyInflows {
  arCollections: number;
  sales: number;
  other: number;
  total: number;
}

/**
 * Weekly outflows breakdown
 */
export interface WeeklyOutflows {
  apPayments: number;
  payroll: number;
  rent: number;
  utilities: number;
  other: number;
  total: number;
}

/**
 * Weekly forecast data
 */
export interface WeeklyForecast {
  weekNumber: number;
  weekStartDate: Date;
  weekEndDate: Date;
  startingCash: number;
  inflows: WeeklyInflows;
  outflows: WeeklyOutflows;
  netCashFlow: number;
  endingCash: number;
  alertLevel: CashAlertLevel;
}

/**
 * Lowest cash point in forecast
 */
export interface LowestCashPoint {
  weekNumber: number;
  amount: number;
  date: Date;
}

/**
 * Forecast summary
 */
export interface ForecastSummary {
  totalInflows: number;
  totalOutflows: number;
  netChange: number;
  averageWeeklyBalance: number;
  weeksWithAlerts: number;
}

/**
 * Complete cash forecast result
 */
export interface CashForecastResult {
  forecastDate: Date;
  forecastPeriodDays: number;
  startingCash: number;
  endingCash: number;
  weeks: WeeklyForecast[];
  lowestCashPoint: LowestCashPoint;
  summary: ForecastSummary;
}

/**
 * CashForecastService
 * 30-day cash forecast projection (Rule 31, 35)
 */
export class CashForecastService {
  private readonly cashPositionService: CashPositionService;
  private readonly DAYS_PER_WEEK = 7;

  constructor() {
    this.cashPositionService = new CashPositionService();
  }

  /**
   * Calculate cash forecast for specified number of weeks (Rule 31)
   */
  calculateForecast(
    input: CashForecastInput,
    weeks: number = 4,
    thresholds?: CashThresholdConfig
  ): CashForecastResult {
    const forecastDate = new Date();
    const weeklyForecasts: WeeklyForecast[] = [];
    let currentCash = input.startingCash;
    let lowestCash = input.startingCash;
    let lowestCashWeek = 0;

    for (let week = 1; week <= weeks; week++) {
      const weekStartDate = new Date(forecastDate);
      weekStartDate.setDate(weekStartDate.getDate() + (week - 1) * this.DAYS_PER_WEEK);
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekEndDate.getDate() + this.DAYS_PER_WEEK - 1);

      // Calculate inflows
      const inflows = this.calculateWeeklyInflows(input, week);

      // Calculate outflows
      const outflows = this.calculateWeeklyOutflows(input, week);

      // Calculate net and ending cash
      const netCashFlow = inflows.total - outflows.total;
      const endingCash = currentCash + netCashFlow;

      // Check alert level
      let alertLevel = CashAlertLevel.NORMAL;
      if (thresholds) {
        const thresholdResult = this.cashPositionService.checkThresholds(endingCash, thresholds);
        alertLevel = thresholdResult.alertLevel;
      }

      // Track lowest point
      if (endingCash < lowestCash) {
        lowestCash = endingCash;
        lowestCashWeek = week;
      }

      weeklyForecasts.push({
        weekNumber: week,
        weekStartDate,
        weekEndDate,
        startingCash: currentCash,
        inflows,
        outflows,
        netCashFlow,
        endingCash,
        alertLevel,
      });

      currentCash = endingCash;
    }

    // Calculate summary
    const totalInflows = weeklyForecasts.reduce((sum, w) => sum + w.inflows.total, 0);
    const totalOutflows = weeklyForecasts.reduce((sum, w) => sum + w.outflows.total, 0);
    const weeksWithAlerts = weeklyForecasts.filter(
      (w) => w.alertLevel !== CashAlertLevel.NORMAL
    ).length;
    const averageWeeklyBalance =
      weeklyForecasts.reduce((sum, w) => sum + w.endingCash, 0) / weeks;

    // Get lowest cash point date
    const lowestCashDate = new Date(forecastDate);
    lowestCashDate.setDate(lowestCashDate.getDate() + (lowestCashWeek - 1) * this.DAYS_PER_WEEK + 6);

    return {
      forecastDate,
      forecastPeriodDays: weeks * this.DAYS_PER_WEEK,
      startingCash: input.startingCash,
      endingCash: currentCash,
      weeks: weeklyForecasts,
      lowestCashPoint: {
        weekNumber: lowestCashWeek,
        amount: lowestCash,
        date: lowestCashDate,
      },
      summary: {
        totalInflows,
        totalOutflows,
        netChange: currentCash - input.startingCash,
        averageWeeklyBalance,
        weeksWithAlerts,
      },
    };
  }

  /**
   * Calculate inflows for a specific week
   */
  private calculateWeeklyInflows(input: CashForecastInput, week: number): WeeklyInflows {
    // AR collections for this week
    const arCollections = input.expectedARCollections
      .filter((c) => c.weekNumber === week)
      .reduce((sum, c) => sum + c.amount, 0);

    // Average daily sales * 7 days
    const sales = input.averageDailySales * this.DAYS_PER_WEEK;

    const total = arCollections + sales;

    return {
      arCollections,
      sales,
      other: 0,
      total,
    };
  }

  /**
   * Calculate outflows for a specific week
   */
  private calculateWeeklyOutflows(input: CashForecastInput, week: number): WeeklyOutflows {
    const recurring = input.recurringPayments;

    // AP payments for this week
    const apPayments = input.scheduledAPPayments
      .filter((p) => p.weekNumber === week)
      .reduce((sum, p) => sum + p.amount, 0);

    // Recurring payments by week
    // Week 1: Rent
    // Week 2: Utilities
    // Week 4: Payroll
    const rent = week === 1 ? (recurring.rent ?? 0) : 0;
    const utilities = week === 2 ? (recurring.utilities ?? 0) : 0;
    const payroll = week === 4 ? (recurring.payroll ?? 0) : 0;

    // Other recurring (distributed or specific weeks)
    const insurance = week === 1 ? (recurring.insurance ?? 0) : 0;
    const loanPayments = week === 1 ? (recurring.loanPayments ?? 0) : 0;
    const otherRecurring = recurring.other ?? 0;
    const other = insurance + loanPayments + (week === 1 ? otherRecurring : 0);

    const total = apPayments + payroll + rent + utilities + other;

    return {
      apPayments,
      payroll,
      rent,
      utilities,
      other,
      total,
    };
  }
}
