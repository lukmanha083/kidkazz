import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CreateFiscalPeriodHandler,
  CloseFiscalPeriodHandler,
  ReopenFiscalPeriodHandler,
  LockFiscalPeriodHandler,
  type CreateFiscalPeriodCommand,
  type CloseFiscalPeriodCommand,
  type ReopenFiscalPeriodCommand,
  type LockFiscalPeriodCommand,
} from '@/application/commands/fiscal-period.commands';
import { FiscalPeriodEntity } from '@/domain/entities/fiscal-period.entity';
import { FiscalPeriodStatus } from '@/domain/value-objects';
import type { IFiscalPeriodRepository } from '@/domain/repositories/fiscal-period.repository';

describe('Fiscal Period Commands', () => {
  let mockRepository: IFiscalPeriodRepository;

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      findByPeriod: vi.fn(),
      findByDate: vi.fn(),
      findAll: vi.fn(),
      findPrevious: vi.fn(),
      findOpen: vi.fn(),
      findCurrentOpen: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      periodExists: vi.fn(),
    };
  });

  describe('CreateFiscalPeriodHandler', () => {
    let handler: CreateFiscalPeriodHandler;

    beforeEach(() => {
      handler = new CreateFiscalPeriodHandler(mockRepository);
    });

    it('should create a new fiscal period', async () => {
      vi.mocked(mockRepository.periodExists).mockResolvedValue(false);
      vi.mocked(mockRepository.save).mockResolvedValue(undefined);

      const command: CreateFiscalPeriodCommand = {
        fiscalYear: 2025,
        fiscalMonth: 1,
      };

      const result = await handler.execute(command);

      expect(result.id).toBeDefined();
      expect(result.fiscalYear).toBe(2025);
      expect(result.fiscalMonth).toBe(1);
      expect(result.status).toBe(FiscalPeriodStatus.OPEN);
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should throw error if period already exists', async () => {
      vi.mocked(mockRepository.periodExists).mockResolvedValue(true);

      const command: CreateFiscalPeriodCommand = {
        fiscalYear: 2025,
        fiscalMonth: 1,
      };

      await expect(handler.execute(command)).rejects.toThrow(
        'Fiscal period 2025-01 already exists'
      );
    });

    it('should throw error for invalid month', async () => {
      vi.mocked(mockRepository.periodExists).mockResolvedValue(false);

      const command: CreateFiscalPeriodCommand = {
        fiscalYear: 2025,
        fiscalMonth: 13,
      };

      await expect(handler.execute(command)).rejects.toThrow(
        'Month must be between 1 and 12'
      );
    });
  });

  describe('CloseFiscalPeriodHandler', () => {
    let handler: CloseFiscalPeriodHandler;

    beforeEach(() => {
      handler = new CloseFiscalPeriodHandler(mockRepository);
    });

    it('should close an open fiscal period', async () => {
      const period = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 1,
      });

      // Mock previous period as closed
      const previousPeriod = FiscalPeriodEntity.create({
        fiscalYear: 2024,
        fiscalMonth: 12,
      });
      previousPeriod.close('admin');

      vi.mocked(mockRepository.findById).mockResolvedValue(period);
      vi.mocked(mockRepository.findPrevious).mockResolvedValue(previousPeriod);
      vi.mocked(mockRepository.save).mockResolvedValue(undefined);

      const command: CloseFiscalPeriodCommand = {
        periodId: period.id,
        closedBy: 'admin-user',
      };

      const result = await handler.execute(command);

      expect(result.status).toBe(FiscalPeriodStatus.CLOSED);
      expect(result.closedBy).toBe('admin-user');
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should close first period without checking previous (Rule 14 exception)', async () => {
      const period = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 1,
      });

      vi.mocked(mockRepository.findById).mockResolvedValue(period);
      vi.mocked(mockRepository.findPrevious).mockResolvedValue(null); // No previous period
      vi.mocked(mockRepository.save).mockResolvedValue(undefined);

      const command: CloseFiscalPeriodCommand = {
        periodId: period.id,
        closedBy: 'admin-user',
      };

      const result = await handler.execute(command);

      expect(result.status).toBe(FiscalPeriodStatus.CLOSED);
    });

    it('should throw error if period not found', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      const command: CloseFiscalPeriodCommand = {
        periodId: 'non-existent',
        closedBy: 'admin-user',
      };

      await expect(handler.execute(command)).rejects.toThrow(
        'Fiscal period not found'
      );
    });

    it('should throw error if previous period is still open (Rule 14)', async () => {
      const period = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 2,
      });

      const previousPeriod = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 1,
      });
      // Previous period is still OPEN

      vi.mocked(mockRepository.findById).mockResolvedValue(period);
      vi.mocked(mockRepository.findPrevious).mockResolvedValue(previousPeriod);

      const command: CloseFiscalPeriodCommand = {
        periodId: period.id,
        closedBy: 'admin-user',
      };

      await expect(handler.execute(command)).rejects.toThrow(
        'Cannot close period: previous period (2025-01) must be closed first'
      );
    });

    it('should throw error if period is already closed', async () => {
      const period = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 1,
      });
      period.close('someone');

      vi.mocked(mockRepository.findById).mockResolvedValue(period);

      const command: CloseFiscalPeriodCommand = {
        periodId: period.id,
        closedBy: 'admin-user',
      };

      await expect(handler.execute(command)).rejects.toThrow(
        'Cannot close period: current status is Closed'
      );
    });
  });

  describe('ReopenFiscalPeriodHandler', () => {
    let handler: ReopenFiscalPeriodHandler;

    beforeEach(() => {
      handler = new ReopenFiscalPeriodHandler(mockRepository);
    });

    it('should reopen a closed fiscal period with valid reason', async () => {
      const period = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 1,
      });
      period.close('admin');

      vi.mocked(mockRepository.findById).mockResolvedValue(period);
      vi.mocked(mockRepository.save).mockResolvedValue(undefined);

      const command: ReopenFiscalPeriodCommand = {
        periodId: period.id,
        reopenedBy: 'manager-user',
        reason: 'Need to add missing invoice entries for audit',
      };

      const result = await handler.execute(command);

      expect(result.status).toBe(FiscalPeriodStatus.OPEN);
      expect(result.reopenedBy).toBe('manager-user');
      expect(result.reopenReason).toBe('Need to add missing invoice entries for audit');
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should throw error if period not found', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      const command: ReopenFiscalPeriodCommand = {
        periodId: 'non-existent',
        reopenedBy: 'manager-user',
        reason: 'Valid reason here',
      };

      await expect(handler.execute(command)).rejects.toThrow(
        'Fiscal period not found'
      );
    });

    it('should throw error if reason is too short (Rule 15)', async () => {
      const period = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 1,
      });
      period.close('admin');

      vi.mocked(mockRepository.findById).mockResolvedValue(period);

      const command: ReopenFiscalPeriodCommand = {
        periodId: period.id,
        reopenedBy: 'manager-user',
        reason: 'Short',
      };

      await expect(handler.execute(command)).rejects.toThrow(
        'Reopen reason must be at least 10 characters'
      );
    });

    it('should throw error if period is locked', async () => {
      const period = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 1,
      });
      period.close('admin');
      period.lock('admin');

      vi.mocked(mockRepository.findById).mockResolvedValue(period);

      const command: ReopenFiscalPeriodCommand = {
        periodId: period.id,
        reopenedBy: 'manager-user',
        reason: 'Valid reason for reopening',
      };

      await expect(handler.execute(command)).rejects.toThrow(
        'Cannot reopen a locked period'
      );
    });
  });

  describe('LockFiscalPeriodHandler', () => {
    let handler: LockFiscalPeriodHandler;

    beforeEach(() => {
      handler = new LockFiscalPeriodHandler(mockRepository);
    });

    it('should lock a closed fiscal period', async () => {
      const period = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 1,
      });
      period.close('admin');

      vi.mocked(mockRepository.findById).mockResolvedValue(period);
      vi.mocked(mockRepository.save).mockResolvedValue(undefined);

      const command: LockFiscalPeriodCommand = {
        periodId: period.id,
        lockedBy: 'admin-user',
      };

      const result = await handler.execute(command);

      expect(result.status).toBe(FiscalPeriodStatus.LOCKED);
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should throw error if period not found', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      const command: LockFiscalPeriodCommand = {
        periodId: 'non-existent',
        lockedBy: 'admin-user',
      };

      await expect(handler.execute(command)).rejects.toThrow(
        'Fiscal period not found'
      );
    });

    it('should throw error if period is still open', async () => {
      const period = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 1,
      });

      vi.mocked(mockRepository.findById).mockResolvedValue(period);

      const command: LockFiscalPeriodCommand = {
        periodId: period.id,
        lockedBy: 'admin-user',
      };

      await expect(handler.execute(command)).rejects.toThrow(
        'Cannot lock an open period - close it first'
      );
    });

    it('should throw error if period is already locked', async () => {
      const period = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 1,
      });
      period.close('admin');
      period.lock('admin');

      vi.mocked(mockRepository.findById).mockResolvedValue(period);

      const command: LockFiscalPeriodCommand = {
        periodId: period.id,
        lockedBy: 'admin-user',
      };

      await expect(handler.execute(command)).rejects.toThrow(
        'Period is already locked'
      );
    });
  });
});
