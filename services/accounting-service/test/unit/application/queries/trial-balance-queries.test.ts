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
      getPriorPeriodBalances: vi.fn(),
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

        vi.mocked(mockDependencies.getPriorPeriodBalances).mockResolvedValue(
          new Map()
        );

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

      it('should include opening balances from prior period (cumulative balance)', async () => {
        // Scenario: Owner injected capital with inventory in prior period
        // Prior period had: Inventory +100,000 (debit), Capital +100,000 (credit)
        // Current period: sold inventory, received cash
        vi.mocked(mockDependencies.getPeriodStatus).mockResolvedValue(
          FiscalPeriodStatus.OPEN
        );

        // Prior period closing balances become opening balances
        vi.mocked(mockDependencies.getPriorPeriodBalances).mockResolvedValue(
          new Map([
            ['acc-inventory', 100000],  // Inventory from capital injection
            ['acc-capital', 100000],    // Owner's capital
          ])
        );

        // Current period activity: sold inventory for cash
        vi.mocked(mockDependencies.getRealTimeBalances).mockResolvedValue([
          { accountId: 'acc-cash', debitTotal: 150000, creditTotal: 0 },       // Received cash
          { accountId: 'acc-inventory', debitTotal: 0, creditTotal: 80000 },   // Reduced inventory (COGS)
          { accountId: 'acc-cogs', debitTotal: 80000, creditTotal: 0 },        // Cost of goods sold
          { accountId: 'acc-sales', debitTotal: 0, creditTotal: 150000 },      // Sales revenue
        ]);

        vi.mocked(mockDependencies.getAccountInfo).mockResolvedValue(
          new Map([
            ['acc-cash', { code: '1010', name: 'Cash', accountType: 'Asset', normalBalance: 'Debit' }],
            ['acc-inventory', { code: '1050', name: 'Inventory', accountType: 'Asset', normalBalance: 'Debit' }],
            ['acc-capital', { code: '3010', name: 'Owner Capital', accountType: 'Equity', normalBalance: 'Credit' }],
            ['acc-cogs', { code: '5010', name: 'Cost of Goods Sold', accountType: 'Expense', normalBalance: 'Debit' }],
            ['acc-sales', { code: '4010', name: 'Sales', accountType: 'Revenue', normalBalance: 'Credit' }],
          ])
        );

        const query: GetTrialBalanceQuery = {
          fiscalYear: 2025,
          fiscalMonth: 2,
        };

        const result = await handler.execute(query);

        expect(result.periodStatus).toBe(FiscalPeriodStatus.OPEN);
        expect(result.accounts).toHaveLength(5);

        // Find specific accounts
        const cash = result.accounts.find(a => a.accountCode === '1010');
        const inventory = result.accounts.find(a => a.accountCode === '1050');
        const capital = result.accounts.find(a => a.accountCode === '3010');
        const cogs = result.accounts.find(a => a.accountCode === '5010');
        const sales = result.accounts.find(a => a.accountCode === '4010');

        // Cash: no opening + 150,000 debit = 150,000 debit balance
        expect(cash?.debitBalance).toBe(150000);

        // Inventory: 100,000 opening + 0 debit - 80,000 credit = 20,000 debit balance
        expect(inventory?.debitBalance).toBe(20000);

        // Capital: 100,000 opening (credit account) = 100,000 credit balance
        expect(capital?.creditBalance).toBe(100000);

        // COGS: 0 opening + 80,000 debit = 80,000 debit balance
        expect(cogs?.debitBalance).toBe(80000);

        // Sales: 0 opening + 150,000 credit = 150,000 credit balance
        expect(sales?.creditBalance).toBe(150000);

        // Total debits: 150,000 + 20,000 + 80,000 = 250,000
        // Total credits: 100,000 + 150,000 = 250,000
        expect(result.totalDebits).toBe(250000);
        expect(result.totalCredits).toBe(250000);
        expect(result.isBalanced).toBe(true);
      });
    });

    describe('for non-existent periods', () => {
      it('should return empty trial balance when period does not exist', async () => {
        vi.mocked(mockDependencies.getPeriodStatus).mockResolvedValue(null);
        vi.mocked(mockDependencies.getRealTimeBalances).mockResolvedValue([]);
        vi.mocked(mockDependencies.getPriorPeriodBalances).mockResolvedValue(new Map());
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
