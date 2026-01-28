import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  GetBalanceSheetHandler,
  type GetBalanceSheetQuery,
  type BalanceSheetDependencies,
} from '@/application/queries/balance-sheet.queries';

describe('Balance Sheet Queries', () => {
  let mockDependencies: BalanceSheetDependencies;

  beforeEach(() => {
    mockDependencies = {
      getCurrentAssets: vi.fn(),
      getFixedAssets: vi.fn(),
      getOtherAssets: vi.fn(),
      getCurrentLiabilities: vi.fn(),
      getLongTermLiabilities: vi.fn(),
      getEquityAccounts: vi.fn(),
      getRetainedEarnings: vi.fn(),
      getCurrentYearNetIncome: vi.fn(),
    };
  });

  describe('GetBalanceSheetHandler', () => {
    let handler: GetBalanceSheetHandler;

    beforeEach(() => {
      handler = new GetBalanceSheetHandler(mockDependencies);
    });

    it('should calculate balance sheet correctly', async () => {
      // Current Assets: 500,000
      vi.mocked(mockDependencies.getCurrentAssets).mockResolvedValue([
        { accountId: 'acc-1', accountCode: '1010', accountName: 'Cash', balance: 300000 },
        { accountId: 'acc-2', accountCode: '1100', accountName: 'Accounts Receivable', balance: 200000 },
      ]);

      // Fixed Assets: 1,000,000
      vi.mocked(mockDependencies.getFixedAssets).mockResolvedValue([
        { accountId: 'acc-3', accountCode: '1410', accountName: 'Equipment', balance: 1000000 },
      ]);

      // Other Assets: 100,000
      vi.mocked(mockDependencies.getOtherAssets).mockResolvedValue([
        { accountId: 'acc-4', accountCode: '1510', accountName: 'Prepaid Insurance', balance: 100000 },
      ]);

      // Current Liabilities: 300,000
      vi.mocked(mockDependencies.getCurrentLiabilities).mockResolvedValue([
        { accountId: 'acc-5', accountCode: '2010', accountName: 'Accounts Payable', balance: 300000 },
      ]);

      // Long-term Liabilities: 500,000
      vi.mocked(mockDependencies.getLongTermLiabilities).mockResolvedValue([
        { accountId: 'acc-6', accountCode: '2410', accountName: 'Bank Loan', balance: 500000 },
      ]);

      // Equity: 700,000
      vi.mocked(mockDependencies.getEquityAccounts).mockResolvedValue([
        { accountId: 'acc-7', accountCode: '3010', accountName: 'Share Capital', balance: 700000 },
      ]);

      // Retained Earnings: 50,000
      vi.mocked(mockDependencies.getRetainedEarnings).mockResolvedValue(50000);

      // Current Year Net Income: 50,000
      vi.mocked(mockDependencies.getCurrentYearNetIncome).mockResolvedValue(50000);

      const query: GetBalanceSheetQuery = {
        asOfDate: new Date('2025-01-31'),
      };

      const result = await handler.execute(query);

      // Assets
      expect(result.assets.currentAssets.accounts).toHaveLength(2);
      expect(result.assets.currentAssets.total).toBe(500000);
      expect(result.assets.fixedAssets.accounts).toHaveLength(1);
      expect(result.assets.fixedAssets.total).toBe(1000000);
      expect(result.assets.otherAssets.accounts).toHaveLength(1);
      expect(result.assets.otherAssets.total).toBe(100000);
      expect(result.assets.totalAssets).toBe(1600000);

      // Liabilities
      expect(result.liabilities.currentLiabilities.accounts).toHaveLength(1);
      expect(result.liabilities.currentLiabilities.total).toBe(300000);
      expect(result.liabilities.longTermLiabilities.accounts).toHaveLength(1);
      expect(result.liabilities.longTermLiabilities.total).toBe(500000);
      expect(result.liabilities.totalLiabilities).toBe(800000);

      // Equity
      expect(result.equity.accounts).toHaveLength(1);
      expect(result.equity.retainedEarnings).toBe(50000);
      expect(result.equity.currentYearNetIncome).toBe(50000);
      expect(result.equity.totalEquity).toBe(800000); // 700,000 + 50,000 + 50,000

      // Accounting Equation: Assets = Liabilities + Equity
      // 1,600,000 = 800,000 + 800,000
      expect(result.isBalanced).toBe(true);
      expect(result.difference).toBe(0);
    });

    it('should detect unbalanced balance sheet', async () => {
      vi.mocked(mockDependencies.getCurrentAssets).mockResolvedValue([
        { accountId: 'acc-1', accountCode: '1010', accountName: 'Cash', balance: 100000 },
      ]);
      vi.mocked(mockDependencies.getFixedAssets).mockResolvedValue([]);
      vi.mocked(mockDependencies.getOtherAssets).mockResolvedValue([]);
      vi.mocked(mockDependencies.getCurrentLiabilities).mockResolvedValue([
        { accountId: 'acc-2', accountCode: '2010', accountName: 'AP', balance: 30000 },
      ]);
      vi.mocked(mockDependencies.getLongTermLiabilities).mockResolvedValue([]);
      vi.mocked(mockDependencies.getEquityAccounts).mockResolvedValue([
        { accountId: 'acc-3', accountCode: '3010', accountName: 'Capital', balance: 50000 },
      ]);
      vi.mocked(mockDependencies.getRetainedEarnings).mockResolvedValue(0);
      vi.mocked(mockDependencies.getCurrentYearNetIncome).mockResolvedValue(0);

      const query: GetBalanceSheetQuery = {
        asOfDate: new Date('2025-01-31'),
      };

      const result = await handler.execute(query);

      // Assets: 100,000
      // Liabilities + Equity: 30,000 + 50,000 = 80,000
      // Difference: 20,000
      expect(result.isBalanced).toBe(false);
      expect(result.difference).toBe(20000);
    });

    it('should handle empty balance sheet', async () => {
      vi.mocked(mockDependencies.getCurrentAssets).mockResolvedValue([]);
      vi.mocked(mockDependencies.getFixedAssets).mockResolvedValue([]);
      vi.mocked(mockDependencies.getOtherAssets).mockResolvedValue([]);
      vi.mocked(mockDependencies.getCurrentLiabilities).mockResolvedValue([]);
      vi.mocked(mockDependencies.getLongTermLiabilities).mockResolvedValue([]);
      vi.mocked(mockDependencies.getEquityAccounts).mockResolvedValue([]);
      vi.mocked(mockDependencies.getRetainedEarnings).mockResolvedValue(0);
      vi.mocked(mockDependencies.getCurrentYearNetIncome).mockResolvedValue(0);

      const query: GetBalanceSheetQuery = {
        asOfDate: new Date('2025-01-31'),
      };

      const result = await handler.execute(query);

      expect(result.assets.totalAssets).toBe(0);
      expect(result.liabilities.totalLiabilities).toBe(0);
      expect(result.equity.totalEquity).toBe(0);
      expect(result.isBalanced).toBe(true);
    });

    it('should format as of date correctly', async () => {
      vi.mocked(mockDependencies.getCurrentAssets).mockResolvedValue([]);
      vi.mocked(mockDependencies.getFixedAssets).mockResolvedValue([]);
      vi.mocked(mockDependencies.getOtherAssets).mockResolvedValue([]);
      vi.mocked(mockDependencies.getCurrentLiabilities).mockResolvedValue([]);
      vi.mocked(mockDependencies.getLongTermLiabilities).mockResolvedValue([]);
      vi.mocked(mockDependencies.getEquityAccounts).mockResolvedValue([]);
      vi.mocked(mockDependencies.getRetainedEarnings).mockResolvedValue(0);
      vi.mocked(mockDependencies.getCurrentYearNetIncome).mockResolvedValue(0);

      const asOfDate = new Date('2025-03-31');
      const query: GetBalanceSheetQuery = {
        asOfDate,
      };

      const result = await handler.execute(query);

      expect(result.asOfDate).toEqual(asOfDate);
      expect(result.asOfDateString).toBe('March 31, 2025');
    });

    it('should handle negative net income (loss)', async () => {
      vi.mocked(mockDependencies.getCurrentAssets).mockResolvedValue([
        { accountId: 'acc-1', accountCode: '1010', accountName: 'Cash', balance: 100000 },
      ]);
      vi.mocked(mockDependencies.getFixedAssets).mockResolvedValue([]);
      vi.mocked(mockDependencies.getOtherAssets).mockResolvedValue([]);
      vi.mocked(mockDependencies.getCurrentLiabilities).mockResolvedValue([
        { accountId: 'acc-2', accountCode: '2010', accountName: 'AP', balance: 50000 },
      ]);
      vi.mocked(mockDependencies.getLongTermLiabilities).mockResolvedValue([]);
      vi.mocked(mockDependencies.getEquityAccounts).mockResolvedValue([
        { accountId: 'acc-3', accountCode: '3010', accountName: 'Capital', balance: 100000 },
      ]);
      vi.mocked(mockDependencies.getRetainedEarnings).mockResolvedValue(0);
      vi.mocked(mockDependencies.getCurrentYearNetIncome).mockResolvedValue(-50000); // Loss

      const query: GetBalanceSheetQuery = {
        asOfDate: new Date('2025-01-31'),
      };

      const result = await handler.execute(query);

      // Assets: 100,000
      // Liabilities: 50,000
      // Equity: 100,000 + 0 + (-50,000) = 50,000
      // Total L+E: 100,000
      expect(result.equity.currentYearNetIncome).toBe(-50000);
      expect(result.equity.totalEquity).toBe(50000);
      expect(result.isBalanced).toBe(true);
    });
  });
});
