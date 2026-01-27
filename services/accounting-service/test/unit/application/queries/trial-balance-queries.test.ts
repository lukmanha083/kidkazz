import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  GetTrialBalanceHandler,
  type GetTrialBalanceQuery,
  type TrialBalanceDependencies,
} from '@/application/queries/trial-balance.queries';
import { FiscalPeriodStatus } from '@/domain/value-objects';

describe('Trial Balance Queries', () => {
  let mockDependencies: TrialBalanceDependencies;

  beforeEach(() => {
    mockDependencies = {
      getPeriodStatus: vi.fn(),
      getAccountBalances: vi.fn(),
      getAccountInfo: vi.fn(),
      getRealTimeBalances: vi.fn(),
    };
  });

  describe('GetTrialBalanceHandler', () => {
    let handler: GetTrialBalanceHandler;

    beforeEach(() => {
      handler = new GetTrialBalanceHandler(mockDependencies);
    });

    describe('for closed periods (from account_balances table)', () => {
      it('should return trial balance from account balances', async () => {
        vi.mocked(mockDependencies.getPeriodStatus).mockResolvedValue(
          FiscalPeriodStatus.CLOSED
        );

        vi.mocked(mockDependencies.getAccountBalances).mockResolvedValue([
          {
            accountId: 'acc-001',
            openingBalance: 0,
            debitTotal: 100000,
            creditTotal: 0,
            closingBalance: 100000,
          },
          {
            accountId: 'acc-002',
            openingBalance: 0,
            debitTotal: 0,
            creditTotal: 100000,
            closingBalance: 100000,
          },
        ]);

        vi.mocked(mockDependencies.getAccountInfo).mockResolvedValue(
          new Map([
            ['acc-001', { code: '1010', name: 'Cash', accountType: 'Asset', normalBalance: 'Debit' }],
            ['acc-002', { code: '4010', name: 'Sales', accountType: 'Revenue', normalBalance: 'Credit' }],
          ])
        );

        const query: GetTrialBalanceQuery = {
          fiscalYear: 2025,
          fiscalMonth: 1,
        };

        const result = await handler.execute(query);

        expect(result.fiscalYear).toBe(2025);
        expect(result.fiscalMonth).toBe(1);
        expect(result.periodStatus).toBe(FiscalPeriodStatus.CLOSED);
        expect(result.accounts).toHaveLength(2);
        expect(result.totalDebits).toBe(100000);
        expect(result.totalCredits).toBe(100000);
        expect(result.isBalanced).toBe(true);
        expect(result.difference).toBe(0);
      });

      it('should detect unbalanced trial balance', async () => {
        vi.mocked(mockDependencies.getPeriodStatus).mockResolvedValue(
          FiscalPeriodStatus.CLOSED
        );

        vi.mocked(mockDependencies.getAccountBalances).mockResolvedValue([
          {
            accountId: 'acc-001',
            openingBalance: 0,
            debitTotal: 100000,
            creditTotal: 0,
            closingBalance: 100000,
          },
          {
            accountId: 'acc-002',
            openingBalance: 0,
            debitTotal: 0,
            creditTotal: 90000,
            closingBalance: 90000,
          },
        ]);

        vi.mocked(mockDependencies.getAccountInfo).mockResolvedValue(
          new Map([
            ['acc-001', { code: '1010', name: 'Cash', accountType: 'Asset', normalBalance: 'Debit' }],
            ['acc-002', { code: '4010', name: 'Sales', accountType: 'Revenue', normalBalance: 'Credit' }],
          ])
        );

        const query: GetTrialBalanceQuery = {
          fiscalYear: 2025,
          fiscalMonth: 1,
        };

        const result = await handler.execute(query);

        expect(result.isBalanced).toBe(false);
        expect(result.difference).toBe(10000);
      });

      it('should sort accounts by code', async () => {
        vi.mocked(mockDependencies.getPeriodStatus).mockResolvedValue(
          FiscalPeriodStatus.CLOSED
        );

        vi.mocked(mockDependencies.getAccountBalances).mockResolvedValue([
          { accountId: 'acc-003', openingBalance: 0, debitTotal: 30000, creditTotal: 0, closingBalance: 30000 },
          { accountId: 'acc-001', openingBalance: 0, debitTotal: 10000, creditTotal: 0, closingBalance: 10000 },
          { accountId: 'acc-002', openingBalance: 0, debitTotal: 20000, creditTotal: 0, closingBalance: 20000 },
        ]);

        vi.mocked(mockDependencies.getAccountInfo).mockResolvedValue(
          new Map([
            ['acc-001', { code: '1010', name: 'Cash', accountType: 'Asset', normalBalance: 'Debit' }],
            ['acc-002', { code: '1020', name: 'Bank', accountType: 'Asset', normalBalance: 'Debit' }],
            ['acc-003', { code: '1030', name: 'AR', accountType: 'Asset', normalBalance: 'Debit' }],
          ])
        );

        const query: GetTrialBalanceQuery = {
          fiscalYear: 2025,
          fiscalMonth: 1,
        };

        const result = await handler.execute(query);

        expect(result.accounts[0].accountCode).toBe('1010');
        expect(result.accounts[1].accountCode).toBe('1020');
        expect(result.accounts[2].accountCode).toBe('1030');
      });
    });

    describe('for open periods (real-time from journal_lines)', () => {
      it('should return trial balance from real-time calculation', async () => {
        vi.mocked(mockDependencies.getPeriodStatus).mockResolvedValue(
          FiscalPeriodStatus.OPEN
        );

        vi.mocked(mockDependencies.getRealTimeBalances).mockResolvedValue([
          { accountId: 'acc-001', debitTotal: 50000, creditTotal: 0 },
          { accountId: 'acc-002', debitTotal: 0, creditTotal: 50000 },
        ]);

        vi.mocked(mockDependencies.getAccountInfo).mockResolvedValue(
          new Map([
            ['acc-001', { code: '1010', name: 'Cash', accountType: 'Asset', normalBalance: 'Debit' }],
            ['acc-002', { code: '4010', name: 'Sales', accountType: 'Revenue', normalBalance: 'Credit' }],
          ])
        );

        const query: GetTrialBalanceQuery = {
          fiscalYear: 2025,
          fiscalMonth: 1,
        };

        const result = await handler.execute(query);

        expect(result.periodStatus).toBe(FiscalPeriodStatus.OPEN);
        expect(result.accounts).toHaveLength(2);
        expect(result.totalDebits).toBe(50000);
        expect(result.totalCredits).toBe(50000);
        expect(result.isBalanced).toBe(true);
      });
    });

    describe('for non-existent periods', () => {
      it('should return empty trial balance when period does not exist', async () => {
        vi.mocked(mockDependencies.getPeriodStatus).mockResolvedValue(null);
        vi.mocked(mockDependencies.getRealTimeBalances).mockResolvedValue([]);
        vi.mocked(mockDependencies.getAccountInfo).mockResolvedValue(new Map());

        const query: GetTrialBalanceQuery = {
          fiscalYear: 2025,
          fiscalMonth: 1,
        };

        const result = await handler.execute(query);

        expect(result.accounts).toHaveLength(0);
        expect(result.totalDebits).toBe(0);
        expect(result.totalCredits).toBe(0);
        expect(result.isBalanced).toBe(true);
      });
    });

    describe('balance direction based on account type', () => {
      it('should show debit balance for asset accounts', async () => {
        vi.mocked(mockDependencies.getPeriodStatus).mockResolvedValue(
          FiscalPeriodStatus.CLOSED
        );

        vi.mocked(mockDependencies.getAccountBalances).mockResolvedValue([
          {
            accountId: 'acc-001',
            openingBalance: 0,
            debitTotal: 100000,
            creditTotal: 30000,
            closingBalance: 70000,
          },
        ]);

        vi.mocked(mockDependencies.getAccountInfo).mockResolvedValue(
          new Map([
            ['acc-001', { code: '1010', name: 'Cash', accountType: 'Asset', normalBalance: 'Debit' }],
          ])
        );

        const query: GetTrialBalanceQuery = {
          fiscalYear: 2025,
          fiscalMonth: 1,
        };

        const result = await handler.execute(query);

        // Debit account: positive closing balance shows in debit column
        expect(result.accounts[0].debitBalance).toBe(70000);
        expect(result.accounts[0].creditBalance).toBe(0);
      });

      it('should show credit balance for liability accounts', async () => {
        vi.mocked(mockDependencies.getPeriodStatus).mockResolvedValue(
          FiscalPeriodStatus.CLOSED
        );

        vi.mocked(mockDependencies.getAccountBalances).mockResolvedValue([
          {
            accountId: 'acc-001',
            openingBalance: 0,
            debitTotal: 20000,
            creditTotal: 100000,
            closingBalance: 80000,
          },
        ]);

        vi.mocked(mockDependencies.getAccountInfo).mockResolvedValue(
          new Map([
            ['acc-001', { code: '2010', name: 'AP', accountType: 'Liability', normalBalance: 'Credit' }],
          ])
        );

        const query: GetTrialBalanceQuery = {
          fiscalYear: 2025,
          fiscalMonth: 1,
        };

        const result = await handler.execute(query);

        // Credit account: positive closing balance shows in credit column
        expect(result.accounts[0].debitBalance).toBe(0);
        expect(result.accounts[0].creditBalance).toBe(80000);
      });
    });
  });
});
