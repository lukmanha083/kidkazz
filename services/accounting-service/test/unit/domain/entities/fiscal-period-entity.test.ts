import { describe, it, expect } from 'vitest';
import { FiscalPeriodEntity } from '@/domain/entities/fiscal-period.entity';
import { FiscalPeriodStatus } from '@/domain/value-objects';

describe('FiscalPeriodEntity', () => {
  describe('create', () => {
    it('should create a new fiscal period in OPEN status', () => {
      const entity = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 1,
      });

      expect(entity.id).toBeDefined();
      expect(entity.id).toMatch(/^fp-/);
      expect(entity.fiscalYear).toBe(2025);
      expect(entity.fiscalMonth).toBe(1);
      expect(entity.status).toBe(FiscalPeriodStatus.OPEN);
      expect(entity.isOpen).toBe(true);
      expect(entity.isClosed).toBe(false);
      expect(entity.isLocked).toBe(false);
    });

    it('should throw error for invalid year', () => {
      expect(() =>
        FiscalPeriodEntity.create({
          fiscalYear: 1800,
          fiscalMonth: 1,
        })
      ).toThrow('Year must be 1900 or later');
    });

    it('should throw error for invalid month', () => {
      expect(() =>
        FiscalPeriodEntity.create({
          fiscalYear: 2025,
          fiscalMonth: 13,
        })
      ).toThrow('Month must be between 1 and 12');
    });

    it('should throw error for month 0', () => {
      expect(() =>
        FiscalPeriodEntity.create({
          fiscalYear: 2025,
          fiscalMonth: 0,
        })
      ).toThrow('Month must be between 1 and 12');
    });
  });

  describe('close', () => {
    it('should close an open period', () => {
      const entity = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 1,
      });

      entity.close('admin-user');

      expect(entity.status).toBe(FiscalPeriodStatus.CLOSED);
      expect(entity.isClosed).toBe(true);
      expect(entity.isOpen).toBe(false);
      expect(entity.closedAt).toBeDefined();
      expect(entity.closedBy).toBe('admin-user');
    });

    it('should throw error when closing already closed period', () => {
      const entity = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 1,
      });
      entity.close('admin-user');

      expect(() => entity.close('another-user')).toThrow(
        'Cannot close period: current status is Closed'
      );
    });

    it('should throw error when closedBy is empty', () => {
      const entity = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 1,
      });

      expect(() => entity.close('')).toThrow('closedBy is required');
    });

    it('should throw error when closedBy is whitespace', () => {
      const entity = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 1,
      });

      expect(() => entity.close('   ')).toThrow('closedBy is required');
    });
  });

  describe('reopen', () => {
    it('should reopen a closed period with valid reason', () => {
      const entity = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 1,
      });
      entity.close('admin-user');

      entity.reopen('manager-user', 'Need to add missing invoice entries');

      expect(entity.status).toBe(FiscalPeriodStatus.OPEN);
      expect(entity.isOpen).toBe(true);
      expect(entity.isClosed).toBe(false);
      expect(entity.reopenedAt).toBeDefined();
      expect(entity.reopenedBy).toBe('manager-user');
      expect(entity.reopenReason).toBe('Need to add missing invoice entries');
      // closedAt and closedBy should be cleared
      expect(entity.closedAt).toBeUndefined();
      expect(entity.closedBy).toBeUndefined();
    });

    it('should throw error when reopening an already open period', () => {
      const entity = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 1,
      });

      expect(() =>
        entity.reopen('user', 'Some reason here')
      ).toThrow('Period is already open');
    });

    it('should throw error when reason is too short (Rule 15)', () => {
      const entity = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 1,
      });
      entity.close('admin-user');

      expect(() => entity.reopen('manager', 'Short')).toThrow(
        'Reopen reason must be at least 10 characters'
      );
    });

    it('should throw error when reason is empty', () => {
      const entity = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 1,
      });
      entity.close('admin-user');

      expect(() => entity.reopen('manager', '')).toThrow(
        'Reopen reason must be at least 10 characters'
      );
    });

    it('should throw error when reopenedBy is empty', () => {
      const entity = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 1,
      });
      entity.close('admin-user');

      expect(() =>
        entity.reopen('', 'Valid reason that is long enough')
      ).toThrow('reopenedBy is required');
    });

    it('should throw error when reopening a locked period', () => {
      const entity = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 1,
      });
      entity.close('admin-user');
      entity.lock('admin-user');

      expect(() =>
        entity.reopen('manager', 'Need to reopen for audit')
      ).toThrow('Cannot reopen a locked period');
    });
  });

  describe('lock', () => {
    it('should lock a closed period', () => {
      const entity = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 1,
      });
      entity.close('admin-user');

      entity.lock('admin-user');

      expect(entity.status).toBe(FiscalPeriodStatus.LOCKED);
      expect(entity.isLocked).toBe(true);
      expect(entity.isOpen).toBe(false);
      expect(entity.isClosed).toBe(false);
    });

    it('should throw error when locking an open period', () => {
      const entity = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 1,
      });

      expect(() => entity.lock('admin-user')).toThrow(
        'Cannot lock an open period - close it first'
      );
    });

    it('should throw error when locking already locked period', () => {
      const entity = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 1,
      });
      entity.close('admin-user');
      entity.lock('admin-user');

      expect(() => entity.lock('another-user')).toThrow(
        'Period is already locked'
      );
    });

    it('should throw error when lockedBy is empty', () => {
      const entity = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 1,
      });
      entity.close('admin-user');

      expect(() => entity.lock('')).toThrow('lockedBy is required');
    });
  });

  describe('canPostEntries', () => {
    it('should return true for open period', () => {
      const entity = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 1,
      });

      expect(entity.canPostEntries()).toBe(true);
    });

    it('should return false for closed period', () => {
      const entity = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 1,
      });
      entity.close('admin-user');

      expect(entity.canPostEntries()).toBe(false);
    });

    it('should return false for locked period', () => {
      const entity = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 1,
      });
      entity.close('admin-user');
      entity.lock('admin-user');

      expect(entity.canPostEntries()).toBe(false);
    });
  });

  describe('canClose', () => {
    it('should return true for open period', () => {
      const entity = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 1,
      });

      expect(entity.canClose()).toBe(true);
    });

    it('should return false for closed period', () => {
      const entity = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 1,
      });
      entity.close('admin-user');

      expect(entity.canClose()).toBe(false);
    });
  });

  describe('canReopen', () => {
    it('should return true for closed period', () => {
      const entity = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 1,
      });
      entity.close('admin-user');

      expect(entity.canReopen()).toBe(true);
    });

    it('should return false for open period', () => {
      const entity = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 1,
      });

      expect(entity.canReopen()).toBe(false);
    });

    it('should return false for locked period', () => {
      const entity = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 1,
      });
      entity.close('admin-user');
      entity.lock('admin-user');

      expect(entity.canReopen()).toBe(false);
    });
  });

  describe('canLock', () => {
    it('should return true for closed period', () => {
      const entity = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 1,
      });
      entity.close('admin-user');

      expect(entity.canLock()).toBe(true);
    });

    it('should return false for open period', () => {
      const entity = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 1,
      });

      expect(entity.canLock()).toBe(false);
    });

    it('should return false for locked period', () => {
      const entity = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 1,
      });
      entity.close('admin-user');
      entity.lock('admin-user');

      expect(entity.canLock()).toBe(false);
    });
  });

  describe('period navigation', () => {
    it('should return the correct FiscalPeriod value object', () => {
      const entity = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 6,
      });

      const period = entity.period;
      expect(period.year).toBe(2025);
      expect(period.month).toBe(6);
      expect(period.toString()).toBe('2025-06');
    });

    it('should return the previous period', () => {
      const entity = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 3,
      });

      const previous = entity.previousPeriod;
      expect(previous).not.toBeNull();
      expect(previous!.year).toBe(2025);
      expect(previous!.month).toBe(2);
    });

    it('should return previous period across year boundary', () => {
      const entity = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 1,
      });

      const previous = entity.previousPeriod;
      expect(previous).not.toBeNull();
      expect(previous!.year).toBe(2024);
      expect(previous!.month).toBe(12);
    });

    it('should return the next period', () => {
      const entity = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 6,
      });

      const next = entity.nextPeriod;
      expect(next.year).toBe(2025);
      expect(next.month).toBe(7);
    });

    it('should return next period across year boundary', () => {
      const entity = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 12,
      });

      const next = entity.nextPeriod;
      expect(next.year).toBe(2026);
      expect(next.month).toBe(1);
    });
  });

  describe('fromPersistence', () => {
    it('should reconstitute entity from persistence', () => {
      const now = new Date();
      const entity = FiscalPeriodEntity.fromPersistence({
        id: 'fp-123456789012',
        fiscalYear: 2025,
        fiscalMonth: 1,
        status: FiscalPeriodStatus.CLOSED,
        closedAt: now,
        closedBy: 'admin-user',
        createdAt: new Date('2025-01-01'),
        updatedAt: now,
      });

      expect(entity.id).toBe('fp-123456789012');
      expect(entity.fiscalYear).toBe(2025);
      expect(entity.fiscalMonth).toBe(1);
      expect(entity.status).toBe(FiscalPeriodStatus.CLOSED);
      expect(entity.closedAt).toEqual(now);
      expect(entity.closedBy).toBe('admin-user');
    });

    it('should reconstitute reopened period', () => {
      const entity = FiscalPeriodEntity.fromPersistence({
        id: 'fp-123456789012',
        fiscalYear: 2025,
        fiscalMonth: 1,
        status: FiscalPeriodStatus.OPEN,
        reopenedAt: new Date(),
        reopenedBy: 'manager-user',
        reopenReason: 'Need to add missing entries',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date(),
      });

      expect(entity.status).toBe(FiscalPeriodStatus.OPEN);
      expect(entity.reopenedBy).toBe('manager-user');
      expect(entity.reopenReason).toBe('Need to add missing entries');
    });
  });
});
