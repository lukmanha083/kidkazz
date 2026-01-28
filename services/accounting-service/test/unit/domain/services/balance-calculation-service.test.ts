import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BalanceCalculationService,
  type BalanceCalculationDependencies,
  type AccountInfo,
  type JournalLineSummary,
} from '@/domain/services/BalanceCalculationService';
import { AccountBalance } from '@/domain/entities/account-balance.entity';
import { FiscalPeriod } from '@/domain/value-objects';

describe('BalanceCalculationService', () => {
  let service: BalanceCalculationService;
  let mockDependencies: BalanceCalculationDependencies;

  beforeEach(() => {
    mockDependencies = {
      getAccountsWithActivity: vi.fn(),
      getJournalLineSummary: vi.fn(),
      getPreviousPeriodClosingBalance: vi.fn(),
    };
    service = new BalanceCalculationService(mockDependencies);
  });

  describe('calculatePeriodBalances', () => {
    const testPeriod = FiscalPeriod.create(2025, 1);

    it('should calculate balances for accounts with activity', async () => {
      const accounts: AccountInfo[] = [
        { id: 'acc-001', code: '1010', name: 'Cash', normalBalance: 'Debit' },
        { id: 'acc-002', code: '4010', name: 'Sales Revenue', normalBalance: 'Credit' },
      ];

      const journalSummaries: JournalLineSummary[] = [
        { accountId: 'acc-001', debitTotal: 100000, creditTotal: 30000 },
        { accountId: 'acc-002', debitTotal: 0, creditTotal: 70000 },
      ];

      vi.mocked(mockDependencies.getAccountsWithActivity).mockResolvedValue(accounts);
      vi.mocked(mockDependencies.getJournalLineSummary).mockResolvedValue(journalSummaries);
      vi.mocked(mockDependencies.getPreviousPeriodClosingBalance).mockResolvedValue(null);

      const balances = await service.calculatePeriodBalances(testPeriod);

      expect(balances).toHaveLength(2);

      // Cash account (debit normal): opening 0 + 100000 - 30000 = 70000
      const cashBalance = balances.find((b) => b.accountId === 'acc-001');
      expect(cashBalance).toBeDefined();
      expect(cashBalance!.openingBalance).toBe(0);
      expect(cashBalance!.debitTotal).toBe(100000);
      expect(cashBalance!.creditTotal).toBe(30000);
      expect(cashBalance!.closingBalance).toBe(70000);

      // Revenue account (credit normal): opening 0 + 70000 - 0 = 70000
      const revenueBalance = balances.find((b) => b.accountId === 'acc-002');
      expect(revenueBalance).toBeDefined();
      expect(revenueBalance!.closingBalance).toBe(70000);
    });

    it('should use previous period closing balance as opening balance', async () => {
      const accounts: AccountInfo[] = [
        { id: 'acc-001', code: '1010', name: 'Cash', normalBalance: 'Debit' },
      ];

      const journalSummaries: JournalLineSummary[] = [
        { accountId: 'acc-001', debitTotal: 50000, creditTotal: 20000 },
      ];

      const previousBalance = AccountBalance.create({
        accountId: 'acc-001',
        fiscalYear: 2024,
        fiscalMonth: 12,
        openingBalance: 80000,
        debitTotal: 100000,
        creditTotal: 30000,
        closingBalance: 150000,
      });

      vi.mocked(mockDependencies.getAccountsWithActivity).mockResolvedValue(accounts);
      vi.mocked(mockDependencies.getJournalLineSummary).mockResolvedValue(journalSummaries);
      vi.mocked(mockDependencies.getPreviousPeriodClosingBalance).mockResolvedValue(
        previousBalance.closingBalance
      );

      const balances = await service.calculatePeriodBalances(testPeriod);

      expect(balances).toHaveLength(1);
      const balance = balances[0];

      // Opening from previous: 150000
      // New period: 150000 + 50000 - 20000 = 180000
      expect(balance.openingBalance).toBe(150000);
      expect(balance.closingBalance).toBe(180000);
    });

    it('should handle accounts with no previous balance', async () => {
      const accounts: AccountInfo[] = [
        { id: 'acc-new', code: '1030', name: 'New Account', normalBalance: 'Debit' },
      ];

      const journalSummaries: JournalLineSummary[] = [
        { accountId: 'acc-new', debitTotal: 25000, creditTotal: 0 },
      ];

      vi.mocked(mockDependencies.getAccountsWithActivity).mockResolvedValue(accounts);
      vi.mocked(mockDependencies.getJournalLineSummary).mockResolvedValue(journalSummaries);
      vi.mocked(mockDependencies.getPreviousPeriodClosingBalance).mockResolvedValue(null);

      const balances = await service.calculatePeriodBalances(testPeriod);

      expect(balances).toHaveLength(1);
      expect(balances[0].openingBalance).toBe(0);
      expect(balances[0].closingBalance).toBe(25000);
    });

    it('should return empty array when no accounts have activity', async () => {
      vi.mocked(mockDependencies.getAccountsWithActivity).mockResolvedValue([]);
      vi.mocked(mockDependencies.getJournalLineSummary).mockResolvedValue([]);

      const balances = await service.calculatePeriodBalances(testPeriod);

      expect(balances).toHaveLength(0);
    });

    it('should handle credit normal accounts correctly', async () => {
      const accounts: AccountInfo[] = [
        { id: 'acc-ap', code: '2010', name: 'Accounts Payable', normalBalance: 'Credit' },
      ];

      const journalSummaries: JournalLineSummary[] = [
        { accountId: 'acc-ap', debitTotal: 40000, creditTotal: 100000 },
      ];

      vi.mocked(mockDependencies.getAccountsWithActivity).mockResolvedValue(accounts);
      vi.mocked(mockDependencies.getJournalLineSummary).mockResolvedValue(journalSummaries);
      vi.mocked(mockDependencies.getPreviousPeriodClosingBalance).mockResolvedValue(50000);

      const balances = await service.calculatePeriodBalances(testPeriod);

      // Credit normal: opening 50000 + 100000 credits - 40000 debits = 110000
      expect(balances[0].openingBalance).toBe(50000);
      expect(balances[0].closingBalance).toBe(110000);
    });

    it('should handle expense accounts (debit normal, income statement)', async () => {
      const accounts: AccountInfo[] = [
        { id: 'acc-exp', code: '6010', name: 'Rent Expense', normalBalance: 'Debit' },
      ];

      const journalSummaries: JournalLineSummary[] = [
        { accountId: 'acc-exp', debitTotal: 5000000, creditTotal: 0 },
      ];

      vi.mocked(mockDependencies.getAccountsWithActivity).mockResolvedValue(accounts);
      vi.mocked(mockDependencies.getJournalLineSummary).mockResolvedValue(journalSummaries);
      vi.mocked(mockDependencies.getPreviousPeriodClosingBalance).mockResolvedValue(0);

      const balances = await service.calculatePeriodBalances(testPeriod);

      // Debit normal: 0 + 5000000 - 0 = 5000000
      expect(balances[0].closingBalance).toBe(5000000);
    });
  });

  describe('calculateTrialBalance', () => {
    const testPeriod = FiscalPeriod.create(2025, 1);

    it('should calculate trial balance from account balances', async () => {
      const balances = [
        AccountBalance.fromPersistence({
          id: 'ab-1',
          accountId: 'acc-001',
          fiscalYear: 2025,
          fiscalMonth: 1,
          openingBalance: 0,
          debitTotal: 100000,
          creditTotal: 0,
          closingBalance: 100000,
          lastUpdatedAt: new Date(),
        }),
        AccountBalance.fromPersistence({
          id: 'ab-2',
          accountId: 'acc-002',
          fiscalYear: 2025,
          fiscalMonth: 1,
          openingBalance: 0,
          debitTotal: 0,
          creditTotal: 100000,
          closingBalance: 100000,
          lastUpdatedAt: new Date(),
        }),
      ];

      const result = service.validateTrialBalance(balances);

      expect(result.totalDebits).toBe(100000);
      expect(result.totalCredits).toBe(100000);
      expect(result.isBalanced).toBe(true);
      expect(result.difference).toBe(0);
    });

    it('should detect unbalanced trial balance', async () => {
      const balances = [
        AccountBalance.fromPersistence({
          id: 'ab-1',
          accountId: 'acc-001',
          fiscalYear: 2025,
          fiscalMonth: 1,
          openingBalance: 0,
          debitTotal: 100000,
          creditTotal: 0,
          closingBalance: 100000,
          lastUpdatedAt: new Date(),
        }),
        AccountBalance.fromPersistence({
          id: 'ab-2',
          accountId: 'acc-002',
          fiscalYear: 2025,
          fiscalMonth: 1,
          openingBalance: 0,
          debitTotal: 0,
          creditTotal: 90000,
          closingBalance: 90000,
          lastUpdatedAt: new Date(),
        }),
      ];

      const result = service.validateTrialBalance(balances);

      expect(result.totalDebits).toBe(100000);
      expect(result.totalCredits).toBe(90000);
      expect(result.isBalanced).toBe(false);
      expect(result.difference).toBe(10000);
    });

    it('should handle empty balances array', async () => {
      const result = service.validateTrialBalance([]);

      expect(result.totalDebits).toBe(0);
      expect(result.totalCredits).toBe(0);
      expect(result.isBalanced).toBe(true);
      expect(result.difference).toBe(0);
    });

    it('should handle floating point precision', async () => {
      const balances = [
        AccountBalance.fromPersistence({
          id: 'ab-1',
          accountId: 'acc-001',
          fiscalYear: 2025,
          fiscalMonth: 1,
          openingBalance: 0,
          debitTotal: 100.33,
          creditTotal: 0,
          closingBalance: 100.33,
          lastUpdatedAt: new Date(),
        }),
        AccountBalance.fromPersistence({
          id: 'ab-2',
          accountId: 'acc-002',
          fiscalYear: 2025,
          fiscalMonth: 1,
          openingBalance: 0,
          debitTotal: 0,
          creditTotal: 100.33,
          closingBalance: 100.33,
          lastUpdatedAt: new Date(),
        }),
      ];

      const result = service.validateTrialBalance(balances);

      expect(result.isBalanced).toBe(true);
    });
  });
});
