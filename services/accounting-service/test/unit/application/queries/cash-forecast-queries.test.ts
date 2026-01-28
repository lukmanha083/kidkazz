import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  GetCashForecastHandler,
  type CashForecastDependencies,
  type GetCashForecastQuery,
} from '@/application/queries/cash-forecast.queries';
import type {
  ExpectedCollection,
  ScheduledPayment,
  RecurringPayments,
} from '@/domain/services';
import type { CashThresholdConfig } from '@/domain/services/CashPositionService';

describe('Cash Forecast Queries', () => {
  describe('GetCashForecastHandler', () => {
    let handler: GetCashForecastHandler;
    let mockDeps: CashForecastDependencies;

    beforeEach(() => {
      mockDeps = {
        getCurrentCashBalance: vi.fn(),
        getExpectedARCollections: vi.fn(),
        getScheduledAPPayments: vi.fn(),
        getRecurringPayments: vi.fn(),
        getAverageDailySales: vi.fn(),
        getThresholdConfig: vi.fn(),
      };
      handler = new GetCashForecastHandler(mockDeps);
    });

    it('should calculate cash forecast for 4 weeks by default', async () => {
      vi.mocked(mockDeps.getCurrentCashBalance).mockResolvedValue(300_000_000);
      vi.mocked(mockDeps.getExpectedARCollections).mockResolvedValue([
        { weekNumber: 1, amount: 50_000_000 },
        { weekNumber: 2, amount: 40_000_000 },
        { weekNumber: 3, amount: 35_000_000 },
        { weekNumber: 4, amount: 45_000_000 },
      ] as ExpectedCollection[]);
      vi.mocked(mockDeps.getScheduledAPPayments).mockResolvedValue([
        { weekNumber: 1, amount: 30_000_000 },
        { weekNumber: 2, amount: 25_000_000 },
        { weekNumber: 3, amount: 20_000_000 },
        { weekNumber: 4, amount: 35_000_000 },
      ] as ScheduledPayment[]);
      vi.mocked(mockDeps.getRecurringPayments).mockResolvedValue({
        payroll: 15_000_000,
        rent: 10_000_000,
        utilities: 5_000_000,
      } as RecurringPayments);
      vi.mocked(mockDeps.getAverageDailySales).mockResolvedValue(5_000_000);
      vi.mocked(mockDeps.getThresholdConfig).mockResolvedValue({
        warningThreshold: 300_000_000,
        criticalThreshold: 275_000_000,
        emergencyThreshold: 250_000_000,
      });

      const query: GetCashForecastQuery = {};

      const result = await handler.execute(query);

      expect(result.weeks).toHaveLength(4);
      expect(result.startingCash).toBe(300_000_000);
      expect(result.generatedAt).toBeDefined();
      expect(result.weeks[0].weekNumber).toBe(1);
    });

    it('should calculate cash forecast without threshold alerts', async () => {
      vi.mocked(mockDeps.getCurrentCashBalance).mockResolvedValue(300_000_000);
      vi.mocked(mockDeps.getExpectedARCollections).mockResolvedValue([]);
      vi.mocked(mockDeps.getScheduledAPPayments).mockResolvedValue([]);
      vi.mocked(mockDeps.getRecurringPayments).mockResolvedValue({} as RecurringPayments);
      vi.mocked(mockDeps.getAverageDailySales).mockResolvedValue(0);

      const query: GetCashForecastQuery = {
        weeks: 2,
        includeThresholdAlerts: false,
      };

      const result = await handler.execute(query);

      expect(result.weeks).toHaveLength(2);
      expect(mockDeps.getThresholdConfig).not.toHaveBeenCalled();
    });

    it('should include threshold alerts when requested', async () => {
      vi.mocked(mockDeps.getCurrentCashBalance).mockResolvedValue(260_000_000);
      vi.mocked(mockDeps.getExpectedARCollections).mockResolvedValue([]);
      vi.mocked(mockDeps.getScheduledAPPayments).mockResolvedValue([]);
      vi.mocked(mockDeps.getRecurringPayments).mockResolvedValue({
        payroll: 50_000_000, // Week 4 will have a big hit
      } as RecurringPayments);
      vi.mocked(mockDeps.getAverageDailySales).mockResolvedValue(0);
      vi.mocked(mockDeps.getThresholdConfig).mockResolvedValue({
        warningThreshold: 300_000_000,
        criticalThreshold: 275_000_000,
        emergencyThreshold: 250_000_000,
      });

      const query: GetCashForecastQuery = {
        weeks: 4,
        includeThresholdAlerts: true,
      };

      const result = await handler.execute(query);

      expect(mockDeps.getThresholdConfig).toHaveBeenCalled();
      // Cash will drop below thresholds
      expect(result.summary.weeksWithAlerts).toBeGreaterThan(0);
    });

    it('should fetch all dependencies in parallel', async () => {
      // Set up promises that resolve immediately
      vi.mocked(mockDeps.getCurrentCashBalance).mockResolvedValue(100_000_000);
      vi.mocked(mockDeps.getExpectedARCollections).mockResolvedValue([]);
      vi.mocked(mockDeps.getScheduledAPPayments).mockResolvedValue([]);
      vi.mocked(mockDeps.getRecurringPayments).mockResolvedValue({} as RecurringPayments);
      vi.mocked(mockDeps.getAverageDailySales).mockResolvedValue(0);
      vi.mocked(mockDeps.getThresholdConfig).mockResolvedValue(null);

      await handler.execute({});

      // All dependencies should have been called once
      expect(mockDeps.getCurrentCashBalance).toHaveBeenCalledTimes(1);
      expect(mockDeps.getExpectedARCollections).toHaveBeenCalledTimes(1);
      expect(mockDeps.getScheduledAPPayments).toHaveBeenCalledTimes(1);
      expect(mockDeps.getRecurringPayments).toHaveBeenCalledTimes(1);
      expect(mockDeps.getAverageDailySales).toHaveBeenCalledTimes(1);
    });

    it('should handle different week configurations', async () => {
      vi.mocked(mockDeps.getCurrentCashBalance).mockResolvedValue(500_000_000);
      vi.mocked(mockDeps.getExpectedARCollections).mockResolvedValue([
        { weekNumber: 1, amount: 100_000_000 },
        { weekNumber: 2, amount: 100_000_000 },
        { weekNumber: 3, amount: 100_000_000 },
        { weekNumber: 4, amount: 100_000_000 },
        { weekNumber: 5, amount: 100_000_000 },
        { weekNumber: 6, amount: 100_000_000 },
      ] as ExpectedCollection[]);
      vi.mocked(mockDeps.getScheduledAPPayments).mockResolvedValue([
        { weekNumber: 1, amount: 80_000_000 },
        { weekNumber: 2, amount: 80_000_000 },
        { weekNumber: 3, amount: 80_000_000 },
        { weekNumber: 4, amount: 80_000_000 },
        { weekNumber: 5, amount: 80_000_000 },
        { weekNumber: 6, amount: 80_000_000 },
      ] as ScheduledPayment[]);
      vi.mocked(mockDeps.getRecurringPayments).mockResolvedValue({
        payroll: 20_000_000,
        rent: 15_000_000,
        utilities: 5_000_000,
      } as RecurringPayments);
      vi.mocked(mockDeps.getAverageDailySales).mockResolvedValue(10_000_000);
      vi.mocked(mockDeps.getThresholdConfig).mockResolvedValue(null);

      const result = await handler.execute({ weeks: 6 });

      expect(result.weeks).toHaveLength(6);
      expect(mockDeps.getExpectedARCollections).toHaveBeenCalledWith(6);
      expect(mockDeps.getScheduledAPPayments).toHaveBeenCalledWith(6);
    });

    it('should calculate summary correctly', async () => {
      vi.mocked(mockDeps.getCurrentCashBalance).mockResolvedValue(200_000_000);
      vi.mocked(mockDeps.getExpectedARCollections).mockResolvedValue([
        { weekNumber: 1, amount: 20_000_000 },
        { weekNumber: 2, amount: 30_000_000 },
      ] as ExpectedCollection[]);
      vi.mocked(mockDeps.getScheduledAPPayments).mockResolvedValue([
        { weekNumber: 1, amount: 10_000_000 },
        { weekNumber: 2, amount: 15_000_000 },
      ] as ScheduledPayment[]);
      vi.mocked(mockDeps.getRecurringPayments).mockResolvedValue({
        rent: 5_000_000, // Week 1
        utilities: 3_000_000, // Week 2
      } as RecurringPayments);
      vi.mocked(mockDeps.getAverageDailySales).mockResolvedValue(1_000_000);
      vi.mocked(mockDeps.getThresholdConfig).mockResolvedValue(null);

      const result = await handler.execute({ weeks: 2 });

      expect(result.summary).toBeDefined();
      expect(result.summary.totalInflows).toBeGreaterThan(0);
      expect(result.summary.totalOutflows).toBeGreaterThan(0);
      expect(result.summary.netChange).toBeDefined();
    });

    it('should identify lowest cash point', async () => {
      vi.mocked(mockDeps.getCurrentCashBalance).mockResolvedValue(300_000_000);
      vi.mocked(mockDeps.getExpectedARCollections).mockResolvedValue([]);
      vi.mocked(mockDeps.getScheduledAPPayments).mockResolvedValue([
        { weekNumber: 2, amount: 200_000_000 }, // Big outflow week 2
      ] as ScheduledPayment[]);
      vi.mocked(mockDeps.getRecurringPayments).mockResolvedValue({} as RecurringPayments);
      vi.mocked(mockDeps.getAverageDailySales).mockResolvedValue(0);
      vi.mocked(mockDeps.getThresholdConfig).mockResolvedValue(null);

      const result = await handler.execute({ weeks: 4 });

      expect(result.lowestCashPoint).toBeDefined();
      // Week 2 should be the lowest due to big outflow
      expect(result.lowestCashPoint.weekNumber).toBe(2);
      expect(result.lowestCashPoint.amount).toBeLessThan(result.startingCash);
    });
  });
});
