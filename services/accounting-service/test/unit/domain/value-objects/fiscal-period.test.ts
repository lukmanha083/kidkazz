import { describe, it, expect } from 'vitest';
import { FiscalPeriod, FiscalPeriodStatus } from '@/domain/value-objects/fiscal-period.vo';

describe('FiscalPeriod', () => {
  describe('constructor', () => {
    it('should create valid fiscal period', () => {
      const period = new FiscalPeriod(2025, 1);
      expect(period.year).toBe(2025);
      expect(period.month).toBe(1);
    });

    it('should throw error for invalid month < 1', () => {
      expect(() => new FiscalPeriod(2025, 0)).toThrow('Month must be between 1 and 12');
    });

    it('should throw error for invalid month > 12', () => {
      expect(() => new FiscalPeriod(2025, 13)).toThrow('Month must be between 1 and 12');
    });

    it('should throw error for invalid year', () => {
      expect(() => new FiscalPeriod(1899, 1)).toThrow('Year must be 1900 or later');
    });
  });

  describe('fromDate', () => {
    it('should create fiscal period from date', () => {
      const date = new Date('2025-06-15');
      const period = FiscalPeriod.fromDate(date);
      expect(period.year).toBe(2025);
      expect(period.month).toBe(6);
    });
  });

  describe('current', () => {
    it('should return current fiscal period', () => {
      const period = FiscalPeriod.current();
      const now = new Date();
      expect(period.year).toBe(now.getFullYear());
      expect(period.month).toBe(now.getMonth() + 1);
    });
  });

  describe('next', () => {
    it('should return next month in same year', () => {
      const period = new FiscalPeriod(2025, 6);
      const next = period.next();
      expect(next.year).toBe(2025);
      expect(next.month).toBe(7);
    });

    it('should return January of next year when current is December', () => {
      const period = new FiscalPeriod(2025, 12);
      const next = period.next();
      expect(next.year).toBe(2026);
      expect(next.month).toBe(1);
    });
  });

  describe('previous', () => {
    it('should return previous month in same year', () => {
      const period = new FiscalPeriod(2025, 6);
      const prev = period.previous();
      expect(prev.year).toBe(2025);
      expect(prev.month).toBe(5);
    });

    it('should return December of previous year when current is January', () => {
      const period = new FiscalPeriod(2025, 1);
      const prev = period.previous();
      expect(prev.year).toBe(2024);
      expect(prev.month).toBe(12);
    });
  });

  describe('toString', () => {
    it('should format as YYYY-MM', () => {
      expect(new FiscalPeriod(2025, 1).toString()).toBe('2025-01');
      expect(new FiscalPeriod(2025, 12).toString()).toBe('2025-12');
    });
  });

  describe('toDisplayString', () => {
    it('should format as Month Year', () => {
      expect(new FiscalPeriod(2025, 1).toDisplayString()).toBe('January 2025');
      expect(new FiscalPeriod(2025, 12).toDisplayString()).toBe('December 2025');
    });
  });

  describe('equals', () => {
    it('should return true for same year and month', () => {
      const p1 = new FiscalPeriod(2025, 6);
      const p2 = new FiscalPeriod(2025, 6);
      expect(p1.equals(p2)).toBe(true);
    });

    it('should return false for different year', () => {
      const p1 = new FiscalPeriod(2025, 6);
      const p2 = new FiscalPeriod(2024, 6);
      expect(p1.equals(p2)).toBe(false);
    });

    it('should return false for different month', () => {
      const p1 = new FiscalPeriod(2025, 6);
      const p2 = new FiscalPeriod(2025, 7);
      expect(p1.equals(p2)).toBe(false);
    });
  });

  describe('isBefore', () => {
    it('should return true when before another period', () => {
      const p1 = new FiscalPeriod(2025, 1);
      const p2 = new FiscalPeriod(2025, 6);
      expect(p1.isBefore(p2)).toBe(true);
    });

    it('should return true for earlier year', () => {
      const p1 = new FiscalPeriod(2024, 12);
      const p2 = new FiscalPeriod(2025, 1);
      expect(p1.isBefore(p2)).toBe(true);
    });

    it('should return false when same period', () => {
      const p1 = new FiscalPeriod(2025, 6);
      const p2 = new FiscalPeriod(2025, 6);
      expect(p1.isBefore(p2)).toBe(false);
    });

    it('should return false when after', () => {
      const p1 = new FiscalPeriod(2025, 6);
      const p2 = new FiscalPeriod(2025, 1);
      expect(p1.isBefore(p2)).toBe(false);
    });
  });

  describe('isAfter', () => {
    it('should return true when after another period', () => {
      const p1 = new FiscalPeriod(2025, 6);
      const p2 = new FiscalPeriod(2025, 1);
      expect(p1.isAfter(p2)).toBe(true);
    });

    it('should return false when before', () => {
      const p1 = new FiscalPeriod(2025, 1);
      const p2 = new FiscalPeriod(2025, 6);
      expect(p1.isAfter(p2)).toBe(false);
    });
  });

  describe('getStartDate', () => {
    it('should return first day of the month', () => {
      const period = new FiscalPeriod(2025, 6);
      const startDate = period.getStartDate();
      expect(startDate.getFullYear()).toBe(2025);
      expect(startDate.getMonth()).toBe(5); // 0-indexed
      expect(startDate.getDate()).toBe(1);
    });
  });

  describe('getEndDate', () => {
    it('should return last day of the month', () => {
      const period = new FiscalPeriod(2025, 1);
      const endDate = period.getEndDate();
      expect(endDate.getFullYear()).toBe(2025);
      expect(endDate.getMonth()).toBe(0); // 0-indexed
      expect(endDate.getDate()).toBe(31);
    });

    it('should handle February correctly', () => {
      const period = new FiscalPeriod(2025, 2);
      const endDate = period.getEndDate();
      expect(endDate.getDate()).toBe(28);
    });

    it('should handle leap year February correctly', () => {
      const period = new FiscalPeriod(2024, 2);
      const endDate = period.getEndDate();
      expect(endDate.getDate()).toBe(29);
    });
  });

  describe('containsDate', () => {
    it('should return true for date within period', () => {
      const period = new FiscalPeriod(2025, 6);
      expect(period.containsDate(new Date('2025-06-15'))).toBe(true);
      expect(period.containsDate(new Date('2025-06-01'))).toBe(true);
      expect(period.containsDate(new Date('2025-06-30'))).toBe(true);
    });

    it('should return false for date outside period', () => {
      const period = new FiscalPeriod(2025, 6);
      expect(period.containsDate(new Date('2025-05-31'))).toBe(false);
      expect(period.containsDate(new Date('2025-07-01'))).toBe(false);
    });
  });
});
