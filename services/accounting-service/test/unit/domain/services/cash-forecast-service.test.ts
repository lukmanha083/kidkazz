import { describe, it, expect, beforeEach } from 'vitest';
import {
  CashForecastService,
  type CashForecastInput,
  type WeeklyForecast,
} from '@/domain/services/CashForecastService';
import { CashAlertLevel } from '@/domain/value-objects';

describe('CashForecastService', () => {
  let service: CashForecastService;

  beforeEach(() => {
    service = new CashForecastService();
  });

  describe('calculateForecast (Rule 31)', () => {
    it('should calculate 4-week forecast', () => {
      const input: CashForecastInput = {
        startingCash: 300_000_000,
        // AR collections expected
        expectedARCollections: [
          { weekNumber: 1, amount: 50_000_000 },
          { weekNumber: 2, amount: 45_000_000 },
          { weekNumber: 3, amount: 40_000_000 },
          { weekNumber: 4, amount: 35_000_000 },
        ],
        // AP payments scheduled
        scheduledAPPayments: [
          { weekNumber: 1, amount: 30_000_000 },
          { weekNumber: 2, amount: 35_000_000 },
          { weekNumber: 3, amount: 25_000_000 },
          { weekNumber: 4, amount: 30_000_000 },
        ],
        // Recurring payments
        recurringPayments: {
          payroll: 80_000_000, // Paid week 4
          rent: 15_000_000, // Paid week 1
          utilities: 5_000_000, // Paid week 2
        },
        // Average daily sales (converted to weekly)
        averageDailySales: 10_000_000,
      };

      const result = service.calculateForecast(input, 4);

      expect(result.weeks).toHaveLength(4);
      expect(result.startingCash).toBe(300_000_000);

      // Week 1:
      // Starting: 300M
      // + AR: 50M
      // - AP: 30M
      // - Rent: 15M
      // + Sales: 70M (10M * 7)
      // = 300 + 50 - 30 - 15 + 70 = 375M
      expect(result.weeks[0].endingCash).toBe(375_000_000);
    });

    it('should project 30-day forecast (default)', () => {
      const input: CashForecastInput = {
        startingCash: 280_000_000,
        expectedARCollections: [],
        scheduledAPPayments: [],
        recurringPayments: {},
        averageDailySales: 5_000_000,
      };

      const result = service.calculateForecast(input);

      // Default is 4 weeks (approximately 30 days)
      expect(result.weeks.length).toBe(4);
      expect(result.forecastPeriodDays).toBe(28);
    });

    it('should identify weeks with cash alerts (Rule 35)', () => {
      const input: CashForecastInput = {
        startingCash: 280_000_000,
        expectedARCollections: [],
        scheduledAPPayments: [
          { weekNumber: 1, amount: 20_000_000 },
          { weekNumber: 2, amount: 30_000_000 },
        ],
        recurringPayments: {
          payroll: 50_000_000, // Week 4
        },
        averageDailySales: 0,
      };

      const thresholds = {
        warningThreshold: 300_000_000,
        criticalThreshold: 275_000_000,
        emergencyThreshold: 250_000_000,
      };

      const result = service.calculateForecast(input, 4, thresholds);

      // Week 1: 280M - 20M = 260M (CRITICAL - below 275M)
      expect(result.weeks[0].alertLevel).toBe(CashAlertLevel.CRITICAL);

      // Week 2: 260M - 30M = 230M (EMERGENCY - below 250M)
      expect(result.weeks[1].alertLevel).toBe(CashAlertLevel.EMERGENCY);
    });
  });

  describe('calculateWeeklyInflows', () => {
    it('should sum AR collections and sales for a week', () => {
      const input: CashForecastInput = {
        startingCash: 100_000_000,
        expectedARCollections: [
          { weekNumber: 1, amount: 25_000_000 },
        ],
        scheduledAPPayments: [],
        recurringPayments: {},
        averageDailySales: 5_000_000,
      };

      const result = service.calculateForecast(input, 1);

      // AR: 25M + Sales: 35M (5M * 7) = 60M
      expect(result.weeks[0].inflows.total).toBe(60_000_000);
    });
  });

  describe('calculateWeeklyOutflows', () => {
    it('should sum AP payments and recurring payments for a week', () => {
      const input: CashForecastInput = {
        startingCash: 100_000_000,
        expectedARCollections: [],
        scheduledAPPayments: [
          { weekNumber: 1, amount: 20_000_000 },
        ],
        recurringPayments: {
          rent: 10_000_000, // Week 1
        },
        averageDailySales: 0,
      };

      const result = service.calculateForecast(input, 1);

      // AP: 20M + Rent: 10M = 30M
      expect(result.weeks[0].outflows.total).toBe(30_000_000);
    });

    it('should apply payroll in week 4', () => {
      const input: CashForecastInput = {
        startingCash: 500_000_000,
        expectedARCollections: [],
        scheduledAPPayments: [],
        recurringPayments: {
          payroll: 100_000_000,
        },
        averageDailySales: 0,
      };

      const result = service.calculateForecast(input, 4);

      // Payroll only in week 4
      expect(result.weeks[0].outflows.payroll).toBe(0);
      expect(result.weeks[1].outflows.payroll).toBe(0);
      expect(result.weeks[2].outflows.payroll).toBe(0);
      expect(result.weeks[3].outflows.payroll).toBe(100_000_000);
    });
  });

  describe('getLowestProjectedCash', () => {
    it('should identify lowest projected cash point', () => {
      const input: CashForecastInput = {
        startingCash: 300_000_000,
        expectedARCollections: [
          { weekNumber: 3, amount: 100_000_000 }, // Big collection week 3
        ],
        scheduledAPPayments: [
          { weekNumber: 1, amount: 50_000_000 },
          { weekNumber: 2, amount: 100_000_000 }, // Big payment week 2
        ],
        recurringPayments: {},
        averageDailySales: 0,
      };

      const result = service.calculateForecast(input, 4);

      expect(result.lowestCashPoint.weekNumber).toBe(2);
      expect(result.lowestCashPoint.amount).toBe(150_000_000); // 300 - 50 - 100
    });
  });

  describe('getSummary', () => {
    it('should provide forecast summary with totals', () => {
      const input: CashForecastInput = {
        startingCash: 300_000_000,
        expectedARCollections: [
          { weekNumber: 1, amount: 50_000_000 },
          { weekNumber: 2, amount: 50_000_000 },
        ],
        scheduledAPPayments: [
          { weekNumber: 1, amount: 30_000_000 },
          { weekNumber: 2, amount: 30_000_000 },
        ],
        recurringPayments: {},
        averageDailySales: 10_000_000,
      };

      const result = service.calculateForecast(input, 2);

      expect(result.summary.totalInflows).toBeGreaterThan(0);
      expect(result.summary.totalOutflows).toBeGreaterThan(0);
      expect(result.summary.netChange).toBe(result.endingCash - result.startingCash);
    });
  });
});
