import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  GetCashPositionHandler,
  type CashPositionDependencies,
  type GetCashPositionQuery,
} from '@/application/queries/cash-position.queries';
import type { CashAccountBalance, CashThresholdConfig } from '@/domain/services';

describe('Cash Position Queries', () => {
  describe('GetCashPositionHandler', () => {
    let handler: GetCashPositionHandler;
    let mockDeps: CashPositionDependencies;

    beforeEach(() => {
      mockDeps = {
        getCashAccountBalances: vi.fn(),
        getThresholdConfig: vi.fn(),
      };
      handler = new GetCashPositionHandler(mockDeps);
    });

    it('should calculate cash position with threshold check', async () => {
      const accountBalances: CashAccountBalance[] = [
        {
          accountCode: '1010',
          accountName: 'Petty Cash',
          balance: 5_000_000,
          lastReconciledDate: new Date('2025-01-15'),
        },
        {
          accountCode: '1020',
          accountName: 'Bank BCA',
          balance: 250_000_000,
          lastReconciledDate: new Date('2025-01-20'),
        },
      ];
      const thresholds: CashThresholdConfig = {
        warningThreshold: 300_000_000,
        criticalThreshold: 275_000_000,
        emergencyThreshold: 250_000_000,
      };

      vi.mocked(mockDeps.getCashAccountBalances).mockResolvedValue(accountBalances);
      vi.mocked(mockDeps.getThresholdConfig).mockResolvedValue(thresholds);

      const query: GetCashPositionQuery = {
        asOfDate: new Date('2025-01-25'),
        includeThresholdCheck: true,
      };

      const result = await handler.execute(query);

      expect(result.totalCashPosition).toBe(255_000_000);
      expect(result.cashOnHand.accounts).toHaveLength(1);
      expect(result.bankAccounts.accounts).toHaveLength(1);
      expect(result.asOfDateStr).toBeDefined();
      expect(result.alertStatus).toBeDefined();
      expect(mockDeps.getThresholdConfig).toHaveBeenCalled();
    });

    it('should calculate cash position without threshold check', async () => {
      const accountBalances: CashAccountBalance[] = [
        {
          accountCode: '1010',
          accountName: 'Petty Cash',
          balance: 10_000_000,
        },
      ];

      vi.mocked(mockDeps.getCashAccountBalances).mockResolvedValue(accountBalances);
      vi.mocked(mockDeps.getThresholdConfig).mockResolvedValue(null);

      const query: GetCashPositionQuery = {
        includeThresholdCheck: false,
      };

      const result = await handler.execute(query);

      expect(result.totalCashPosition).toBe(10_000_000);
      expect(result.alertStatus).toBeUndefined();
      expect(mockDeps.getThresholdConfig).not.toHaveBeenCalled();
    });

    it('should use current date if asOfDate not provided', async () => {
      const accountBalances: CashAccountBalance[] = [];
      vi.mocked(mockDeps.getCashAccountBalances).mockResolvedValue(accountBalances);
      vi.mocked(mockDeps.getThresholdConfig).mockResolvedValue(null);

      const query: GetCashPositionQuery = {};

      const result = await handler.execute(query);

      expect(result.asOfDateStr).toBeDefined();
      // The date should be close to now
      const resultDate = new Date(result.asOfDateStr);
      const now = new Date();
      expect(resultDate.getTime()).toBeCloseTo(now.getTime(), -3); // Within ~1 second
    });

    it('should categorize accounts correctly', async () => {
      const accountBalances: CashAccountBalance[] = [
        {
          accountCode: '1010',
          accountName: 'Petty Cash Main',
          balance: 5_000_000,
        },
        {
          accountCode: '1011',
          accountName: 'POS Drawer',
          balance: 2_000_000,
        },
        {
          accountCode: '1020',
          accountName: 'Bank BCA',
          balance: 100_000_000,
        },
        {
          accountCode: '1030',
          accountName: 'Money Market',
          balance: 50_000_000,
        },
      ];

      vi.mocked(mockDeps.getCashAccountBalances).mockResolvedValue(accountBalances);
      vi.mocked(mockDeps.getThresholdConfig).mockResolvedValue(null);

      const result = await handler.execute({});

      expect(result.cashOnHand.total).toBe(7_000_000); // 1010 + 1011
      expect(result.bankAccounts.total).toBe(100_000_000); // 1020
      expect(result.cashEquivalents.total).toBe(50_000_000); // 1030
      expect(result.totalCashPosition).toBe(157_000_000);
    });

    it('should identify unreconciled bank accounts', async () => {
      const now = new Date('2025-01-25');
      const accountBalances: CashAccountBalance[] = [
        {
          accountCode: '1020',
          accountName: 'Bank BCA',
          balance: 100_000_000,
          // No lastReconciledDate - unreconciled
        },
        {
          accountCode: '1021',
          accountName: 'Bank Mandiri',
          balance: 50_000_000,
          lastReconciledDate: new Date('2024-12-15'), // Last month - unreconciled
        },
        {
          accountCode: '1022',
          accountName: 'Bank BRI',
          balance: 75_000_000,
          lastReconciledDate: new Date('2025-01-20'), // This month - reconciled
        },
      ];

      vi.mocked(mockDeps.getCashAccountBalances).mockResolvedValue(accountBalances);
      vi.mocked(mockDeps.getThresholdConfig).mockResolvedValue(null);

      const result = await handler.execute({ asOfDate: now });

      expect(result.unreconciledAccounts.length).toBe(2); // BCA and Mandiri
    });
  });
});
