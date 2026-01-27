import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  GetIncomeStatementHandler,
  type GetIncomeStatementQuery,
  type IncomeStatementDependencies,
} from '@/application/queries/income-statement.queries';

describe('Income Statement Queries', () => {
  let mockDependencies: IncomeStatementDependencies;

  beforeEach(() => {
    mockDependencies = {
      getRevenueAccounts: vi.fn(),
      getCOGSAccounts: vi.fn(),
      getExpenseAccounts: vi.fn(),
      getOtherIncomeExpenseAccounts: vi.fn(),
    };
  });

  describe('GetIncomeStatementHandler', () => {
    let handler: GetIncomeStatementHandler;

    beforeEach(() => {
      handler = new GetIncomeStatementHandler(mockDependencies);
    });

    it('should calculate income statement correctly', async () => {
      // Revenue: 1,000,000
      vi.mocked(mockDependencies.getRevenueAccounts).mockResolvedValue([
        { accountId: 'acc-rev-1', accountCode: '4010', accountName: 'Product Sales', balance: 800000 },
        { accountId: 'acc-rev-2', accountCode: '4020', accountName: 'Service Revenue', balance: 200000 },
      ]);

      // COGS: 400,000
      vi.mocked(mockDependencies.getCOGSAccounts).mockResolvedValue([
        { accountId: 'acc-cogs-1', accountCode: '5010', accountName: 'Cost of Goods Sold', balance: 400000 },
      ]);

      // Operating Expenses: 300,000
      vi.mocked(mockDependencies.getExpenseAccounts).mockResolvedValue([
        { accountId: 'acc-exp-1', accountCode: '6010', accountName: 'Salaries', balance: 200000 },
        { accountId: 'acc-exp-2', accountCode: '6020', accountName: 'Rent', balance: 100000 },
      ]);

      // Other Income/Expenses: 50,000 income
      vi.mocked(mockDependencies.getOtherIncomeExpenseAccounts).mockResolvedValue([
        { accountId: 'acc-oth-1', accountCode: '7010', accountName: 'Interest Income', balance: 50000, isIncome: true },
      ]);

      const query: GetIncomeStatementQuery = {
        fiscalYear: 2025,
        fiscalMonth: 1,
      };

      const result = await handler.execute(query);

      expect(result.fiscalYear).toBe(2025);
      expect(result.fiscalMonth).toBe(1);

      // Revenue
      expect(result.revenue.accounts).toHaveLength(2);
      expect(result.revenue.total).toBe(1000000);

      // COGS
      expect(result.cogs.accounts).toHaveLength(1);
      expect(result.cogs.total).toBe(400000);

      // Gross Profit = Revenue - COGS = 1,000,000 - 400,000 = 600,000
      expect(result.grossProfit).toBe(600000);

      // Operating Expenses
      expect(result.operatingExpenses.accounts).toHaveLength(2);
      expect(result.operatingExpenses.total).toBe(300000);

      // Operating Income = Gross Profit - Operating Expenses = 600,000 - 300,000 = 300,000
      expect(result.operatingIncome).toBe(300000);

      // Other Income/Expenses
      expect(result.otherIncomeExpenses.accounts).toHaveLength(1);
      expect(result.otherIncomeExpenses.netAmount).toBe(50000);

      // Net Income = Operating Income + Other Income = 300,000 + 50,000 = 350,000
      expect(result.netIncome).toBe(350000);
    });

    it('should handle zero revenue', async () => {
      vi.mocked(mockDependencies.getRevenueAccounts).mockResolvedValue([]);
      vi.mocked(mockDependencies.getCOGSAccounts).mockResolvedValue([]);
      vi.mocked(mockDependencies.getExpenseAccounts).mockResolvedValue([
        { accountId: 'acc-exp-1', accountCode: '6010', accountName: 'Salaries', balance: 50000 },
      ]);
      vi.mocked(mockDependencies.getOtherIncomeExpenseAccounts).mockResolvedValue([]);

      const query: GetIncomeStatementQuery = {
        fiscalYear: 2025,
        fiscalMonth: 1,
      };

      const result = await handler.execute(query);

      expect(result.revenue.total).toBe(0);
      expect(result.grossProfit).toBe(0);
      expect(result.operatingIncome).toBe(-50000);
      expect(result.netIncome).toBe(-50000);
    });

    it('should handle net loss scenario', async () => {
      vi.mocked(mockDependencies.getRevenueAccounts).mockResolvedValue([
        { accountId: 'acc-rev-1', accountCode: '4010', accountName: 'Sales', balance: 100000 },
      ]);
      vi.mocked(mockDependencies.getCOGSAccounts).mockResolvedValue([
        { accountId: 'acc-cogs-1', accountCode: '5010', accountName: 'COGS', balance: 60000 },
      ]);
      vi.mocked(mockDependencies.getExpenseAccounts).mockResolvedValue([
        { accountId: 'acc-exp-1', accountCode: '6010', accountName: 'Salaries', balance: 80000 },
      ]);
      vi.mocked(mockDependencies.getOtherIncomeExpenseAccounts).mockResolvedValue([
        { accountId: 'acc-oth-1', accountCode: '7020', accountName: 'Interest Expense', balance: 10000, isIncome: false },
      ]);

      const query: GetIncomeStatementQuery = {
        fiscalYear: 2025,
        fiscalMonth: 1,
      };

      const result = await handler.execute(query);

      // Revenue: 100,000
      // COGS: 60,000
      // Gross Profit: 40,000
      // Operating Expenses: 80,000
      // Operating Income: -40,000
      // Other Expense: -10,000
      // Net Income: -50,000
      expect(result.grossProfit).toBe(40000);
      expect(result.operatingIncome).toBe(-40000);
      expect(result.netIncome).toBe(-50000);
      expect(result.isProfit).toBe(false);
    });

    it('should calculate year-to-date when month is specified', async () => {
      vi.mocked(mockDependencies.getRevenueAccounts).mockResolvedValue([
        { accountId: 'acc-rev-1', accountCode: '4010', accountName: 'Sales', balance: 500000 },
      ]);
      vi.mocked(mockDependencies.getCOGSAccounts).mockResolvedValue([]);
      vi.mocked(mockDependencies.getExpenseAccounts).mockResolvedValue([]);
      vi.mocked(mockDependencies.getOtherIncomeExpenseAccounts).mockResolvedValue([]);

      const query: GetIncomeStatementQuery = {
        fiscalYear: 2025,
        fiscalMonth: 3, // January through March
      };

      const result = await handler.execute(query);

      expect(result.fiscalYear).toBe(2025);
      expect(result.fiscalMonth).toBe(3);
      expect(result.periodDescription).toBe('January - March 2025');
    });

    it('should handle single month period', async () => {
      vi.mocked(mockDependencies.getRevenueAccounts).mockResolvedValue([]);
      vi.mocked(mockDependencies.getCOGSAccounts).mockResolvedValue([]);
      vi.mocked(mockDependencies.getExpenseAccounts).mockResolvedValue([]);
      vi.mocked(mockDependencies.getOtherIncomeExpenseAccounts).mockResolvedValue([]);

      const query: GetIncomeStatementQuery = {
        fiscalYear: 2025,
        fiscalMonth: 1,
      };

      const result = await handler.execute(query);

      expect(result.periodDescription).toBe('January 2025');
    });
  });
});
