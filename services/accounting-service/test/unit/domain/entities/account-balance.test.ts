import { describe, it, expect } from 'vitest';
import { AccountBalance } from '@/domain/entities/account-balance.entity';

describe('AccountBalance', () => {
  describe('create', () => {
    it('should create a new account balance with defaults', () => {
      const balance = AccountBalance.create({
        accountId: 'acc-001',
        fiscalYear: 2025,
        fiscalMonth: 1,
      });

      expect(balance.id).toBeDefined();
      expect(balance.id).toMatch(/^ab-/);
      expect(balance.accountId).toBe('acc-001');
      expect(balance.fiscalYear).toBe(2025);
      expect(balance.fiscalMonth).toBe(1);
      expect(balance.openingBalance).toBe(0);
      expect(balance.debitTotal).toBe(0);
      expect(balance.creditTotal).toBe(0);
      expect(balance.closingBalance).toBe(0);
      expect(balance.lastUpdatedAt).toBeDefined();
    });

    it('should create account balance with initial values', () => {
      const balance = AccountBalance.create({
        accountId: 'acc-001',
        fiscalYear: 2025,
        fiscalMonth: 1,
        openingBalance: 100000,
        debitTotal: 50000,
        creditTotal: 20000,
        closingBalance: 130000,
      });

      expect(balance.openingBalance).toBe(100000);
      expect(balance.debitTotal).toBe(50000);
      expect(balance.creditTotal).toBe(20000);
      expect(balance.closingBalance).toBe(130000);
    });
  });

  describe('calculateClosingBalance', () => {
    describe('Debit normal accounts (Assets, Expenses, COGS)', () => {
      it('should calculate closing = opening + debits - credits', () => {
        const balance = AccountBalance.create({
          accountId: 'acc-001',
          fiscalYear: 2025,
          fiscalMonth: 1,
          openingBalance: 100000,
          debitTotal: 50000,
          creditTotal: 20000,
        });

        balance.calculateClosingBalance('Debit');

        // 100000 + 50000 - 20000 = 130000
        expect(balance.closingBalance).toBe(130000);
      });

      it('should handle negative closing balance for debit accounts', () => {
        const balance = AccountBalance.create({
          accountId: 'acc-001',
          fiscalYear: 2025,
          fiscalMonth: 1,
          openingBalance: 10000,
          debitTotal: 5000,
          creditTotal: 20000,
        });

        balance.calculateClosingBalance('Debit');

        // 10000 + 5000 - 20000 = -5000
        expect(balance.closingBalance).toBe(-5000);
      });

      it('should handle zero balances', () => {
        const balance = AccountBalance.create({
          accountId: 'acc-001',
          fiscalYear: 2025,
          fiscalMonth: 1,
          openingBalance: 0,
          debitTotal: 0,
          creditTotal: 0,
        });

        balance.calculateClosingBalance('Debit');

        expect(balance.closingBalance).toBe(0);
      });
    });

    describe('Credit normal accounts (Liabilities, Equity, Revenue)', () => {
      it('should calculate closing = opening + credits - debits', () => {
        const balance = AccountBalance.create({
          accountId: 'acc-002',
          fiscalYear: 2025,
          fiscalMonth: 1,
          openingBalance: 100000,
          debitTotal: 20000,
          creditTotal: 50000,
        });

        balance.calculateClosingBalance('Credit');

        // 100000 + 50000 - 20000 = 130000
        expect(balance.closingBalance).toBe(130000);
      });

      it('should handle negative closing balance for credit accounts', () => {
        const balance = AccountBalance.create({
          accountId: 'acc-002',
          fiscalYear: 2025,
          fiscalMonth: 1,
          openingBalance: 10000,
          debitTotal: 20000,
          creditTotal: 5000,
        });

        balance.calculateClosingBalance('Credit');

        // 10000 + 5000 - 20000 = -5000
        expect(balance.closingBalance).toBe(-5000);
      });
    });
  });

  describe('updateFromTransactions', () => {
    it('should update debit/credit totals and recalculate closing for debit account', () => {
      const balance = AccountBalance.create({
        accountId: 'acc-001',
        fiscalYear: 2025,
        fiscalMonth: 1,
        openingBalance: 100000,
      });

      balance.updateFromTransactions(75000, 25000, 'Debit');

      expect(balance.debitTotal).toBe(75000);
      expect(balance.creditTotal).toBe(25000);
      // 100000 + 75000 - 25000 = 150000
      expect(balance.closingBalance).toBe(150000);
    });

    it('should update debit/credit totals and recalculate closing for credit account', () => {
      const balance = AccountBalance.create({
        accountId: 'acc-002',
        fiscalYear: 2025,
        fiscalMonth: 1,
        openingBalance: 50000,
      });

      balance.updateFromTransactions(10000, 30000, 'Credit');

      expect(balance.debitTotal).toBe(10000);
      expect(balance.creditTotal).toBe(30000);
      // 50000 + 30000 - 10000 = 70000
      expect(balance.closingBalance).toBe(70000);
    });
  });

  describe('setOpeningBalance', () => {
    it('should set opening balance and recalculate closing for debit account', () => {
      const balance = AccountBalance.create({
        accountId: 'acc-001',
        fiscalYear: 2025,
        fiscalMonth: 2,
        debitTotal: 20000,
        creditTotal: 5000,
      });

      balance.setOpeningBalance(100000, 'Debit');

      expect(balance.openingBalance).toBe(100000);
      // 100000 + 20000 - 5000 = 115000
      expect(balance.closingBalance).toBe(115000);
    });

    it('should set opening balance and recalculate closing for credit account', () => {
      const balance = AccountBalance.create({
        accountId: 'acc-002',
        fiscalYear: 2025,
        fiscalMonth: 2,
        debitTotal: 5000,
        creditTotal: 20000,
      });

      balance.setOpeningBalance(80000, 'Credit');

      expect(balance.openingBalance).toBe(80000);
      // 80000 + 20000 - 5000 = 95000
      expect(balance.closingBalance).toBe(95000);
    });
  });

  describe('netChange', () => {
    it('should return positive net change when debits > credits', () => {
      const balance = AccountBalance.create({
        accountId: 'acc-001',
        fiscalYear: 2025,
        fiscalMonth: 1,
        debitTotal: 50000,
        creditTotal: 20000,
      });

      expect(balance.netChange).toBe(30000);
    });

    it('should return negative net change when credits > debits', () => {
      const balance = AccountBalance.create({
        accountId: 'acc-001',
        fiscalYear: 2025,
        fiscalMonth: 1,
        debitTotal: 20000,
        creditTotal: 50000,
      });

      expect(balance.netChange).toBe(-30000);
    });

    it('should return zero when debits equal credits', () => {
      const balance = AccountBalance.create({
        accountId: 'acc-001',
        fiscalYear: 2025,
        fiscalMonth: 1,
        debitTotal: 30000,
        creditTotal: 30000,
      });

      expect(balance.netChange).toBe(0);
    });
  });

  describe('periodString', () => {
    it('should return formatted period string', () => {
      const balance = AccountBalance.create({
        accountId: 'acc-001',
        fiscalYear: 2025,
        fiscalMonth: 1,
      });

      expect(balance.periodString).toBe('2025-01');
    });

    it('should pad month with zero', () => {
      const balance = AccountBalance.create({
        accountId: 'acc-001',
        fiscalYear: 2025,
        fiscalMonth: 9,
      });

      expect(balance.periodString).toBe('2025-09');
    });

    it('should not pad two-digit month', () => {
      const balance = AccountBalance.create({
        accountId: 'acc-001',
        fiscalYear: 2025,
        fiscalMonth: 12,
      });

      expect(balance.periodString).toBe('2025-12');
    });
  });

  describe('fromPersistence', () => {
    it('should reconstitute entity from persistence', () => {
      const lastUpdatedAt = new Date('2025-01-31T23:59:59Z');
      const balance = AccountBalance.fromPersistence({
        id: 'ab-123456789012',
        accountId: 'acc-001',
        fiscalYear: 2025,
        fiscalMonth: 1,
        openingBalance: 100000,
        debitTotal: 50000,
        creditTotal: 20000,
        closingBalance: 130000,
        lastUpdatedAt,
      });

      expect(balance.id).toBe('ab-123456789012');
      expect(balance.accountId).toBe('acc-001');
      expect(balance.fiscalYear).toBe(2025);
      expect(balance.fiscalMonth).toBe(1);
      expect(balance.openingBalance).toBe(100000);
      expect(balance.debitTotal).toBe(50000);
      expect(balance.creditTotal).toBe(20000);
      expect(balance.closingBalance).toBe(130000);
      expect(balance.lastUpdatedAt).toEqual(lastUpdatedAt);
    });
  });

  describe('real-world scenarios', () => {
    it('should handle cash account (debit normal) with sales and expenses', () => {
      // Cash account starts with 1,000,000
      const balance = AccountBalance.create({
        accountId: 'cash-001',
        fiscalYear: 2025,
        fiscalMonth: 1,
        openingBalance: 1000000,
      });

      // During month: received 500,000 (debit), paid out 200,000 (credit)
      balance.updateFromTransactions(500000, 200000, 'Debit');

      // Closing: 1,000,000 + 500,000 - 200,000 = 1,300,000
      expect(balance.closingBalance).toBe(1300000);
    });

    it('should handle accounts payable (credit normal) with purchases and payments', () => {
      // AP starts with 500,000 owed
      const balance = AccountBalance.create({
        accountId: 'ap-001',
        fiscalYear: 2025,
        fiscalMonth: 1,
        openingBalance: 500000,
      });

      // During month: paid 300,000 (debit), new purchases 400,000 (credit)
      balance.updateFromTransactions(300000, 400000, 'Credit');

      // Closing: 500,000 + 400,000 - 300,000 = 600,000
      expect(balance.closingBalance).toBe(600000);
    });

    it('should handle revenue account (credit normal)', () => {
      // Revenue account starts at 0 (new year)
      const balance = AccountBalance.create({
        accountId: 'revenue-001',
        fiscalYear: 2025,
        fiscalMonth: 1,
        openingBalance: 0,
      });

      // Sales for the month: 1,500,000 (credit), refunds 50,000 (debit)
      balance.updateFromTransactions(50000, 1500000, 'Credit');

      // Closing: 0 + 1,500,000 - 50,000 = 1,450,000
      expect(balance.closingBalance).toBe(1450000);
    });

    it('should handle expense account (debit normal)', () => {
      // Expense account starts at 0 (new year)
      const balance = AccountBalance.create({
        accountId: 'expense-001',
        fiscalYear: 2025,
        fiscalMonth: 1,
        openingBalance: 0,
      });

      // Expenses for the month: 800,000 (debit), reversals 20,000 (credit)
      balance.updateFromTransactions(800000, 20000, 'Debit');

      // Closing: 0 + 800,000 - 20,000 = 780,000
      expect(balance.closingBalance).toBe(780000);
    });
  });
});
