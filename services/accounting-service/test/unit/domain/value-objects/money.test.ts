import { describe, it, expect } from 'vitest';
import { Money } from '@/domain/value-objects/money.vo';

describe('Money', () => {
  describe('constructor', () => {
    it('should create money with amount and default currency IDR', () => {
      const money = new Money(100000);
      expect(money.amount).toBe(100000);
      expect(money.currency).toBe('IDR');
    });

    it('should create money with specified currency', () => {
      const money = new Money(100, 'USD');
      expect(money.amount).toBe(100);
      expect(money.currency).toBe('USD');
    });

    it('should throw error for negative amount', () => {
      expect(() => new Money(-100)).toThrow('Amount cannot be negative');
    });

    it('should throw error for non-finite amount', () => {
      expect(() => new Money(Infinity)).toThrow('Amount must be a finite number');
      expect(() => new Money(NaN)).toThrow('Amount must be a finite number');
    });

    it('should allow zero amount', () => {
      const money = new Money(0);
      expect(money.amount).toBe(0);
    });
  });

  describe('add', () => {
    it('should add two money values with same currency', () => {
      const m1 = new Money(100000);
      const m2 = new Money(50000);
      const result = m1.add(m2);
      expect(result.amount).toBe(150000);
      expect(result.currency).toBe('IDR');
    });

    it('should throw error when adding different currencies', () => {
      const m1 = new Money(100000, 'IDR');
      const m2 = new Money(100, 'USD');
      expect(() => m1.add(m2)).toThrow('Cannot add money with different currencies');
    });
  });

  describe('subtract', () => {
    it('should subtract two money values with same currency', () => {
      const m1 = new Money(100000);
      const m2 = new Money(30000);
      const result = m1.subtract(m2);
      expect(result.amount).toBe(70000);
    });

    it('should throw error when result would be negative', () => {
      const m1 = new Money(30000);
      const m2 = new Money(100000);
      expect(() => m1.subtract(m2)).toThrow('Subtraction would result in negative amount');
    });

    it('should throw error when subtracting different currencies', () => {
      const m1 = new Money(100000, 'IDR');
      const m2 = new Money(100, 'USD');
      expect(() => m1.subtract(m2)).toThrow('Cannot subtract money with different currencies');
    });
  });

  describe('multiply', () => {
    it('should multiply money by a factor', () => {
      const money = new Money(100000);
      const result = money.multiply(3);
      expect(result.amount).toBe(300000);
    });

    it('should throw error for negative factor', () => {
      const money = new Money(100000);
      expect(() => money.multiply(-2)).toThrow('Factor cannot be negative');
    });
  });

  describe('equals', () => {
    it('should return true for equal money values', () => {
      const m1 = new Money(100000, 'IDR');
      const m2 = new Money(100000, 'IDR');
      expect(m1.equals(m2)).toBe(true);
    });

    it('should return false for different amounts', () => {
      const m1 = new Money(100000);
      const m2 = new Money(50000);
      expect(m1.equals(m2)).toBe(false);
    });

    it('should return false for different currencies', () => {
      const m1 = new Money(100, 'IDR');
      const m2 = new Money(100, 'USD');
      expect(m1.equals(m2)).toBe(false);
    });
  });

  describe('isZero', () => {
    it('should return true for zero amount', () => {
      const money = new Money(0);
      expect(money.isZero()).toBe(true);
    });

    it('should return false for non-zero amount', () => {
      const money = new Money(100);
      expect(money.isZero()).toBe(false);
    });
  });

  describe('format', () => {
    it('should format IDR correctly', () => {
      const money = new Money(1500000, 'IDR');
      expect(money.format()).toBe('Rp 1.500.000');
    });

    it('should format USD correctly', () => {
      const money = new Money(1500.5, 'USD');
      expect(money.format()).toBe('$1,500.50');
    });
  });
});
