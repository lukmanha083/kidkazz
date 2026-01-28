import { describe, it, expect } from 'vitest';
import { BankStatement, type BankStatementProps } from '@/domain/entities/bank-statement.entity';

describe('BankStatement', () => {
  const validProps: BankStatementProps = {
    bankAccountId: 'ba-123',
    statementDate: new Date('2026-01-31'),
    periodStart: new Date('2026-01-01'),
    periodEnd: new Date('2026-01-31'),
    openingBalance: 100_000_000,
    closingBalance: 150_000_000,
    totalDebits: 30_000_000,
    totalCredits: 80_000_000,
    transactionCount: 25,
    importSource: 'CSV',
    importedBy: 'user-123',
  };

  describe('create', () => {
    it('should create a bank statement with valid props', () => {
      const statement = BankStatement.create(validProps);

      expect(statement.bankAccountId).toBe('ba-123');
      expect(statement.statementDate).toEqual(new Date('2026-01-31'));
      expect(statement.periodStart).toEqual(new Date('2026-01-01'));
      expect(statement.periodEnd).toEqual(new Date('2026-01-31'));
      expect(statement.openingBalance).toBe(100_000_000);
      expect(statement.closingBalance).toBe(150_000_000);
      expect(statement.totalDebits).toBe(30_000_000);
      expect(statement.totalCredits).toBe(80_000_000);
      expect(statement.transactionCount).toBe(25);
      expect(statement.importSource).toBe('CSV');
      expect(statement.importedBy).toBe('user-123');
    });

    it('should generate unique ID with bst- prefix', () => {
      const statement1 = BankStatement.create(validProps);
      const statement2 = BankStatement.create(validProps);

      expect(statement1.id).toMatch(/^bst-/);
      expect(statement2.id).toMatch(/^bst-/);
      expect(statement1.id).not.toBe(statement2.id);
    });

    it('should default totals to zero if not provided', () => {
      const statement = BankStatement.create({
        bankAccountId: 'ba-123',
        statementDate: new Date('2026-01-31'),
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
        openingBalance: 100_000_000,
        closingBalance: 100_000_000,
      });

      expect(statement.totalDebits).toBe(0);
      expect(statement.totalCredits).toBe(0);
      expect(statement.transactionCount).toBe(0);
    });

    it('should set importedAt to current time', () => {
      const before = new Date();
      const statement = BankStatement.create(validProps);
      const after = new Date();

      expect(statement.importedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(statement.importedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should throw error if bank account ID is empty', () => {
      expect(() =>
        BankStatement.create({
          ...validProps,
          bankAccountId: '',
        })
      ).toThrow('Bank account ID is required');
    });

    it('should throw error if period end is before period start', () => {
      expect(() =>
        BankStatement.create({
          ...validProps,
          periodStart: new Date('2026-01-31'),
          periodEnd: new Date('2026-01-01'),
        })
      ).toThrow('Period end date must be after period start date');
    });
  });

  describe('updateCounts', () => {
    it('should update transaction counts and totals', () => {
      const statement = BankStatement.create({
        ...validProps,
        totalDebits: 0,
        totalCredits: 0,
        transactionCount: 0,
      });

      statement.updateCounts(30, 50_000_000, 100_000_000);

      expect(statement.transactionCount).toBe(30);
      expect(statement.totalDebits).toBe(50_000_000);
      expect(statement.totalCredits).toBe(100_000_000);
    });

    it('should update updatedAt timestamp', () => {
      const statement = BankStatement.create(validProps);
      const beforeUpdate = statement.updatedAt;

      // Small delay to ensure timestamp difference
      statement.updateCounts(10, 1000, 2000);

      expect(statement.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });
  });

  describe('validateTotals', () => {
    it('should return valid when closing balance matches calculated', () => {
      const statement = BankStatement.create({
        ...validProps,
        openingBalance: 100_000_000,
        closingBalance: 150_000_000,
        totalDebits: 30_000_000,
        totalCredits: 80_000_000,
        // Calculated: 100M + 80M - 30M = 150M ✓
      });

      const result = statement.validateTotals();

      expect(result.isValid).toBe(true);
      expect(result.calculatedClosing).toBe(150_000_000);
      expect(result.difference).toBeLessThan(0.01);
    });

    it('should return invalid when closing balance does not match', () => {
      const statement = BankStatement.create({
        ...validProps,
        openingBalance: 100_000_000,
        closingBalance: 160_000_000, // Wrong!
        totalDebits: 30_000_000,
        totalCredits: 80_000_000,
        // Calculated: 100M + 80M - 30M = 150M ≠ 160M
      });

      const result = statement.validateTotals();

      expect(result.isValid).toBe(false);
      expect(result.calculatedClosing).toBe(150_000_000);
      expect(result.difference).toBe(10_000_000);
    });

    it('should handle floating point precision', () => {
      const statement = BankStatement.create({
        ...validProps,
        openingBalance: 100.001,
        closingBalance: 150.002,
        totalDebits: 30.0005,
        totalCredits: 80.0015,
        // Small difference due to floating point
      });

      const result = statement.validateTotals();
      // Should be valid within 0.01 tolerance
      expect(result.difference).toBeLessThan(0.01);
    });
  });

  describe('fromPersistence', () => {
    it('should reconstitute bank statement from persistence data', () => {
      const statement = BankStatement.fromPersistence({
        id: 'bst-123',
        bankAccountId: 'ba-123',
        statementDate: new Date('2026-01-31'),
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
        openingBalance: 100_000_000,
        closingBalance: 150_000_000,
        totalDebits: 30_000_000,
        totalCredits: 80_000_000,
        transactionCount: 25,
        importSource: 'CSV',
        importedAt: new Date('2026-02-01'),
        importedBy: 'user-123',
        createdAt: new Date('2026-02-01'),
        updatedAt: new Date('2026-02-01'),
      });

      expect(statement.id).toBe('bst-123');
      expect(statement.bankAccountId).toBe('ba-123');
      expect(statement.openingBalance).toBe(100_000_000);
      expect(statement.closingBalance).toBe(150_000_000);
      expect(statement.transactionCount).toBe(25);
    });
  });
});
