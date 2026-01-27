import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  GetFiscalPeriodByIdHandler,
  GetFiscalPeriodByPeriodHandler,
  ListFiscalPeriodsHandler,
  GetCurrentFiscalPeriodHandler,
  type GetFiscalPeriodByIdQuery,
  type GetFiscalPeriodByPeriodQuery,
  type ListFiscalPeriodsQuery,
} from '@/application/queries/fiscal-period.queries';
import { FiscalPeriodEntity } from '@/domain/entities/fiscal-period.entity';
import { FiscalPeriodStatus } from '@/domain/value-objects';
import type { IFiscalPeriodRepository } from '@/domain/repositories/fiscal-period.repository';

describe('Fiscal Period Queries', () => {
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

  describe('GetFiscalPeriodByIdHandler', () => {
    let handler: GetFiscalPeriodByIdHandler;

    beforeEach(() => {
      handler = new GetFiscalPeriodByIdHandler(mockRepository);
    });

    it('should return fiscal period when found', async () => {
      const period = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 1,
      });

      vi.mocked(mockRepository.findById).mockResolvedValue(period);

      const query: GetFiscalPeriodByIdQuery = { id: period.id };
      const result = await handler.execute(query);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(period.id);
      expect(result!.fiscalYear).toBe(2025);
      expect(result!.fiscalMonth).toBe(1);
    });

    it('should return null when not found', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      const query: GetFiscalPeriodByIdQuery = { id: 'non-existent' };
      const result = await handler.execute(query);

      expect(result).toBeNull();
    });
  });

  describe('GetFiscalPeriodByPeriodHandler', () => {
    let handler: GetFiscalPeriodByPeriodHandler;

    beforeEach(() => {
      handler = new GetFiscalPeriodByPeriodHandler(mockRepository);
    });

    it('should return fiscal period when found', async () => {
      const period = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 3,
      });

      vi.mocked(mockRepository.findByPeriod).mockResolvedValue(period);

      const query: GetFiscalPeriodByPeriodQuery = {
        fiscalYear: 2025,
        fiscalMonth: 3,
      };
      const result = await handler.execute(query);

      expect(result).not.toBeNull();
      expect(result!.fiscalYear).toBe(2025);
      expect(result!.fiscalMonth).toBe(3);
    });

    it('should return null when not found', async () => {
      vi.mocked(mockRepository.findByPeriod).mockResolvedValue(null);

      const query: GetFiscalPeriodByPeriodQuery = {
        fiscalYear: 2025,
        fiscalMonth: 3,
      };
      const result = await handler.execute(query);

      expect(result).toBeNull();
    });
  });

  describe('ListFiscalPeriodsHandler', () => {
    let handler: ListFiscalPeriodsHandler;

    beforeEach(() => {
      handler = new ListFiscalPeriodsHandler(mockRepository);
    });

    it('should return all fiscal periods without filter', async () => {
      const periods = [
        FiscalPeriodEntity.create({ fiscalYear: 2025, fiscalMonth: 1 }),
        FiscalPeriodEntity.create({ fiscalYear: 2025, fiscalMonth: 2 }),
        FiscalPeriodEntity.create({ fiscalYear: 2025, fiscalMonth: 3 }),
      ];

      vi.mocked(mockRepository.findAll).mockResolvedValue(periods);

      const query: ListFiscalPeriodsQuery = {};
      const result = await handler.execute(query);

      expect(result).toHaveLength(3);
      expect(mockRepository.findAll).toHaveBeenCalledWith({});
    });

    it('should filter by status', async () => {
      const openPeriod = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 3,
      });

      vi.mocked(mockRepository.findAll).mockResolvedValue([openPeriod]);

      const query: ListFiscalPeriodsQuery = {
        status: FiscalPeriodStatus.OPEN,
      };
      const result = await handler.execute(query);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(FiscalPeriodStatus.OPEN);
      expect(mockRepository.findAll).toHaveBeenCalledWith({
        status: FiscalPeriodStatus.OPEN,
      });
    });

    it('should filter by fiscal year', async () => {
      const period = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 1,
      });

      vi.mocked(mockRepository.findAll).mockResolvedValue([period]);

      const query: ListFiscalPeriodsQuery = {
        fiscalYear: 2025,
      };
      const result = await handler.execute(query);

      expect(result).toHaveLength(1);
      expect(mockRepository.findAll).toHaveBeenCalledWith({
        fiscalYear: 2025,
      });
    });
  });

  describe('GetCurrentFiscalPeriodHandler', () => {
    let handler: GetCurrentFiscalPeriodHandler;

    beforeEach(() => {
      handler = new GetCurrentFiscalPeriodHandler(mockRepository);
    });

    it('should return the current open fiscal period', async () => {
      const currentPeriod = FiscalPeriodEntity.create({
        fiscalYear: 2025,
        fiscalMonth: 1,
      });

      vi.mocked(mockRepository.findCurrentOpen).mockResolvedValue(currentPeriod);

      const result = await handler.execute();

      expect(result).not.toBeNull();
      expect(result!.fiscalYear).toBe(2025);
      expect(result!.fiscalMonth).toBe(1);
      expect(result!.status).toBe(FiscalPeriodStatus.OPEN);
    });

    it('should return null when no open period exists', async () => {
      vi.mocked(mockRepository.findCurrentOpen).mockResolvedValue(null);

      const result = await handler.execute();

      expect(result).toBeNull();
    });
  });
});
