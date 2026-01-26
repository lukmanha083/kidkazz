import { describe, it, expect } from 'vitest';
import {
  AccountCode,
  AccountType,
  AccountCategory,
  FinancialStatementType,
} from '@/domain/value-objects/account-code.vo';

describe('AccountCode', () => {
  describe('constructor', () => {
    it('should create valid 4-digit account code', () => {
      const code = new AccountCode('1000');
      expect(code.value).toBe('1000');
    });

    it('should throw error for non-4-digit code', () => {
      expect(() => new AccountCode('100')).toThrow('Account code must be 4 digits');
      expect(() => new AccountCode('10000')).toThrow('Account code must be 4 digits');
      expect(() => new AccountCode('abcd')).toThrow('Account code must be 4 digits');
    });

    it('should throw error for empty code', () => {
      expect(() => new AccountCode('')).toThrow('Account code must be 4 digits');
    });
  });

  describe('getAccountType', () => {
    it('should return Asset for codes 1000-1999', () => {
      expect(new AccountCode('1000').getAccountType()).toBe(AccountType.ASSET);
      expect(new AccountCode('1500').getAccountType()).toBe(AccountType.ASSET);
      expect(new AccountCode('1999').getAccountType()).toBe(AccountType.ASSET);
    });

    it('should return Liability for codes 2000-2999', () => {
      expect(new AccountCode('2000').getAccountType()).toBe(AccountType.LIABILITY);
      expect(new AccountCode('2500').getAccountType()).toBe(AccountType.LIABILITY);
      expect(new AccountCode('2999').getAccountType()).toBe(AccountType.LIABILITY);
    });

    it('should return Equity for codes 3000-3999', () => {
      expect(new AccountCode('3000').getAccountType()).toBe(AccountType.EQUITY);
      expect(new AccountCode('3500').getAccountType()).toBe(AccountType.EQUITY);
      expect(new AccountCode('3999').getAccountType()).toBe(AccountType.EQUITY);
    });

    it('should return Revenue for codes 4000-4999', () => {
      expect(new AccountCode('4000').getAccountType()).toBe(AccountType.REVENUE);
      expect(new AccountCode('4500').getAccountType()).toBe(AccountType.REVENUE);
      expect(new AccountCode('4999').getAccountType()).toBe(AccountType.REVENUE);
    });

    it('should return COGS for codes 5000-5999', () => {
      expect(new AccountCode('5000').getAccountType()).toBe(AccountType.COGS);
      expect(new AccountCode('5500').getAccountType()).toBe(AccountType.COGS);
      expect(new AccountCode('5999').getAccountType()).toBe(AccountType.COGS);
    });

    it('should return Expense for codes 6000-7999', () => {
      expect(new AccountCode('6000').getAccountType()).toBe(AccountType.EXPENSE);
      expect(new AccountCode('6500').getAccountType()).toBe(AccountType.EXPENSE);
      expect(new AccountCode('7000').getAccountType()).toBe(AccountType.EXPENSE);
      expect(new AccountCode('7999').getAccountType()).toBe(AccountType.EXPENSE);
    });

    it('should return Expense for codes 8000-9999 (other expenses)', () => {
      expect(new AccountCode('8000').getAccountType()).toBe(AccountType.EXPENSE);
      expect(new AccountCode('9999').getAccountType()).toBe(AccountType.EXPENSE);
    });

    it('should return ASSET for codes 0000-0999 (default)', () => {
      expect(new AccountCode('0000').getAccountType()).toBe(AccountType.ASSET);
      expect(new AccountCode('0999').getAccountType()).toBe(AccountType.ASSET);
    });
  });

  describe('getNormalBalance', () => {
    it('should return Debit for Asset accounts', () => {
      expect(new AccountCode('1000').getNormalBalance()).toBe('Debit');
    });

    it('should return Credit for Liability accounts', () => {
      expect(new AccountCode('2000').getNormalBalance()).toBe('Credit');
    });

    it('should return Credit for Equity accounts', () => {
      expect(new AccountCode('3000').getNormalBalance()).toBe('Credit');
    });

    it('should return Credit for Revenue accounts', () => {
      expect(new AccountCode('4000').getNormalBalance()).toBe('Credit');
    });

    it('should return Debit for COGS accounts', () => {
      expect(new AccountCode('5000').getNormalBalance()).toBe('Debit');
    });

    it('should return Debit for Expense accounts', () => {
      expect(new AccountCode('6000').getNormalBalance()).toBe('Debit');
    });
  });

  describe('equals', () => {
    it('should return true for same code', () => {
      const c1 = new AccountCode('1000');
      const c2 = new AccountCode('1000');
      expect(c1.equals(c2)).toBe(true);
    });

    it('should return false for different codes', () => {
      const c1 = new AccountCode('1000');
      const c2 = new AccountCode('2000');
      expect(c1.equals(c2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the code value as string', () => {
      const code = new AccountCode('1234');
      expect(code.toString()).toBe('1234');
    });
  });

  describe('getAccountCategory', () => {
    it('should return CURRENT_ASSET for codes 1000-1399', () => {
      expect(new AccountCode('1000').getAccountCategory()).toBe(AccountCategory.CURRENT_ASSET);
      expect(new AccountCode('1100').getAccountCategory()).toBe(AccountCategory.CURRENT_ASSET);
      expect(new AccountCode('1200').getAccountCategory()).toBe(AccountCategory.CURRENT_ASSET);
      expect(new AccountCode('1300').getAccountCategory()).toBe(AccountCategory.CURRENT_ASSET);
      expect(new AccountCode('1399').getAccountCategory()).toBe(AccountCategory.CURRENT_ASSET);
    });

    it('should return FIXED_ASSET for codes 1400-1499', () => {
      expect(new AccountCode('1400').getAccountCategory()).toBe(AccountCategory.FIXED_ASSET);
      expect(new AccountCode('1450').getAccountCategory()).toBe(AccountCategory.FIXED_ASSET);
      expect(new AccountCode('1499').getAccountCategory()).toBe(AccountCategory.FIXED_ASSET);
    });

    it('should return OTHER_NON_CURRENT_ASSET for codes 1500-1999', () => {
      expect(new AccountCode('1500').getAccountCategory()).toBe(AccountCategory.OTHER_NON_CURRENT_ASSET);
      expect(new AccountCode('1750').getAccountCategory()).toBe(AccountCategory.OTHER_NON_CURRENT_ASSET);
      expect(new AccountCode('1999').getAccountCategory()).toBe(AccountCategory.OTHER_NON_CURRENT_ASSET);
    });

    it('should return CURRENT_LIABILITY for codes 2000-2399', () => {
      expect(new AccountCode('2000').getAccountCategory()).toBe(AccountCategory.CURRENT_LIABILITY);
      expect(new AccountCode('2100').getAccountCategory()).toBe(AccountCategory.CURRENT_LIABILITY);
      expect(new AccountCode('2200').getAccountCategory()).toBe(AccountCategory.CURRENT_LIABILITY);
      expect(new AccountCode('2399').getAccountCategory()).toBe(AccountCategory.CURRENT_LIABILITY);
    });

    it('should return LONG_TERM_LIABILITY for codes 2400-2999', () => {
      expect(new AccountCode('2400').getAccountCategory()).toBe(AccountCategory.LONG_TERM_LIABILITY);
      expect(new AccountCode('2500').getAccountCategory()).toBe(AccountCategory.LONG_TERM_LIABILITY);
      expect(new AccountCode('2999').getAccountCategory()).toBe(AccountCategory.LONG_TERM_LIABILITY);
    });

    it('should return EQUITY for codes 3000-3999', () => {
      expect(new AccountCode('3000').getAccountCategory()).toBe(AccountCategory.EQUITY);
      expect(new AccountCode('3500').getAccountCategory()).toBe(AccountCategory.EQUITY);
      expect(new AccountCode('3999').getAccountCategory()).toBe(AccountCategory.EQUITY);
    });

    it('should return REVENUE for codes 4000-4299', () => {
      expect(new AccountCode('4000').getAccountCategory()).toBe(AccountCategory.REVENUE);
      expect(new AccountCode('4100').getAccountCategory()).toBe(AccountCategory.REVENUE);
      expect(new AccountCode('4299').getAccountCategory()).toBe(AccountCategory.REVENUE);
    });

    it('should return COGS for codes 5000-5399', () => {
      expect(new AccountCode('5000').getAccountCategory()).toBe(AccountCategory.COGS);
      expect(new AccountCode('5200').getAccountCategory()).toBe(AccountCategory.COGS);
      expect(new AccountCode('5399').getAccountCategory()).toBe(AccountCategory.COGS);
    });

    it('should return OPERATING_EXPENSE for codes 6000-6999', () => {
      expect(new AccountCode('6000').getAccountCategory()).toBe(AccountCategory.OPERATING_EXPENSE);
      expect(new AccountCode('6500').getAccountCategory()).toBe(AccountCategory.OPERATING_EXPENSE);
      expect(new AccountCode('6999').getAccountCategory()).toBe(AccountCategory.OPERATING_EXPENSE);
    });

    it('should return OTHER_INCOME_EXPENSE for codes 7000-7199', () => {
      expect(new AccountCode('7000').getAccountCategory()).toBe(AccountCategory.OTHER_INCOME_EXPENSE);
      expect(new AccountCode('7100').getAccountCategory()).toBe(AccountCategory.OTHER_INCOME_EXPENSE);
      expect(new AccountCode('7199').getAccountCategory()).toBe(AccountCategory.OTHER_INCOME_EXPENSE);
    });

    it('should return TAX for codes 8000-8999', () => {
      expect(new AccountCode('8000').getAccountCategory()).toBe(AccountCategory.TAX);
      expect(new AccountCode('8500').getAccountCategory()).toBe(AccountCategory.TAX);
      expect(new AccountCode('8999').getAccountCategory()).toBe(AccountCategory.TAX);
    });
  });

  describe('getFinancialStatementType', () => {
    it('should return BALANCE_SHEET for codes 1000-3999', () => {
      expect(new AccountCode('1000').getFinancialStatementType()).toBe(
        FinancialStatementType.BALANCE_SHEET
      );
      expect(new AccountCode('2000').getFinancialStatementType()).toBe(
        FinancialStatementType.BALANCE_SHEET
      );
      expect(new AccountCode('3000').getFinancialStatementType()).toBe(
        FinancialStatementType.BALANCE_SHEET
      );
      expect(new AccountCode('3999').getFinancialStatementType()).toBe(
        FinancialStatementType.BALANCE_SHEET
      );
    });

    it('should return INCOME_STATEMENT for codes 4000+', () => {
      expect(new AccountCode('4000').getFinancialStatementType()).toBe(
        FinancialStatementType.INCOME_STATEMENT
      );
      expect(new AccountCode('5000').getFinancialStatementType()).toBe(
        FinancialStatementType.INCOME_STATEMENT
      );
      expect(new AccountCode('6000').getFinancialStatementType()).toBe(
        FinancialStatementType.INCOME_STATEMENT
      );
      expect(new AccountCode('7000').getFinancialStatementType()).toBe(
        FinancialStatementType.INCOME_STATEMENT
      );
      expect(new AccountCode('8000').getFinancialStatementType()).toBe(
        FinancialStatementType.INCOME_STATEMENT
      );
    });
  });
});
