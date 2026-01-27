import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PeriodCloseService,
  type PeriodCloseServiceDependencies,
  type CloseChecklistResult,
} from '@/domain/services/PeriodCloseService';
import { FiscalPeriod, FiscalPeriodStatus } from '@/domain/value-objects';

describe('PeriodCloseService', () => {
  let service: PeriodCloseService;
  let mockDependencies: PeriodCloseServiceDependencies;

  beforeEach(() => {
    mockDependencies = {
      getPeriodStatus: vi.fn(),
      getPreviousPeriodStatus: vi.fn(),
      getDraftEntriesCount: vi.fn(),
      getTrialBalanceValidation: vi.fn(),
      calculateAndSaveAccountBalances: vi.fn(),
      closePeriod: vi.fn(),
    };
    service = new PeriodCloseService(mockDependencies);
  });

  describe('getCloseChecklist', () => {
    const testPeriod = FiscalPeriod.create(2025, 2);

    it('should return checklist with all checks passing', async () => {
      vi.mocked(mockDependencies.getPeriodStatus).mockResolvedValue(FiscalPeriodStatus.OPEN);
      vi.mocked(mockDependencies.getPreviousPeriodStatus).mockResolvedValue(FiscalPeriodStatus.CLOSED);
      vi.mocked(mockDependencies.getDraftEntriesCount).mockResolvedValue(0);
      vi.mocked(mockDependencies.getTrialBalanceValidation).mockResolvedValue({
        isBalanced: true,
        difference: 0,
      });

      const result = await service.getCloseChecklist(testPeriod);

      expect(result.previousPeriodClosed).toBe(true);
      expect(result.noDraftEntries).toBe(true);
      expect(result.draftEntriesCount).toBe(0);
      expect(result.trialBalanceBalanced).toBe(true);
      expect(result.canClose).toBe(true);
      expect(result.blockers).toHaveLength(0);
    });

    it('should allow closing first period without checking previous', async () => {
      const firstPeriod = FiscalPeriod.create(2025, 1);

      vi.mocked(mockDependencies.getPeriodStatus).mockResolvedValue(FiscalPeriodStatus.OPEN);
      vi.mocked(mockDependencies.getPreviousPeriodStatus).mockResolvedValue(null); // No previous period
      vi.mocked(mockDependencies.getDraftEntriesCount).mockResolvedValue(0);
      vi.mocked(mockDependencies.getTrialBalanceValidation).mockResolvedValue({
        isBalanced: true,
        difference: 0,
      });

      const result = await service.getCloseChecklist(firstPeriod);

      expect(result.previousPeriodClosed).toBe(true); // First period exception
      expect(result.canClose).toBe(true);
    });

    it('should block when previous period is open', async () => {
      vi.mocked(mockDependencies.getPeriodStatus).mockResolvedValue(FiscalPeriodStatus.OPEN);
      vi.mocked(mockDependencies.getPreviousPeriodStatus).mockResolvedValue(FiscalPeriodStatus.OPEN);
      vi.mocked(mockDependencies.getDraftEntriesCount).mockResolvedValue(0);
      vi.mocked(mockDependencies.getTrialBalanceValidation).mockResolvedValue({
        isBalanced: true,
        difference: 0,
      });

      const result = await service.getCloseChecklist(testPeriod);

      expect(result.previousPeriodClosed).toBe(false);
      expect(result.canClose).toBe(false);
      expect(result.blockers).toContain('Previous period (2025-01) must be closed first');
    });

    it('should block when draft entries exist', async () => {
      vi.mocked(mockDependencies.getPeriodStatus).mockResolvedValue(FiscalPeriodStatus.OPEN);
      vi.mocked(mockDependencies.getPreviousPeriodStatus).mockResolvedValue(FiscalPeriodStatus.CLOSED);
      vi.mocked(mockDependencies.getDraftEntriesCount).mockResolvedValue(5);
      vi.mocked(mockDependencies.getTrialBalanceValidation).mockResolvedValue({
        isBalanced: true,
        difference: 0,
      });

      const result = await service.getCloseChecklist(testPeriod);

      expect(result.noDraftEntries).toBe(false);
      expect(result.draftEntriesCount).toBe(5);
      expect(result.canClose).toBe(false);
      expect(result.blockers).toContain('5 draft journal entries must be posted or deleted');
    });

    it('should block when trial balance is unbalanced', async () => {
      vi.mocked(mockDependencies.getPeriodStatus).mockResolvedValue(FiscalPeriodStatus.OPEN);
      vi.mocked(mockDependencies.getPreviousPeriodStatus).mockResolvedValue(FiscalPeriodStatus.CLOSED);
      vi.mocked(mockDependencies.getDraftEntriesCount).mockResolvedValue(0);
      vi.mocked(mockDependencies.getTrialBalanceValidation).mockResolvedValue({
        isBalanced: false,
        difference: 10000,
      });

      const result = await service.getCloseChecklist(testPeriod);

      expect(result.trialBalanceBalanced).toBe(false);
      expect(result.canClose).toBe(false);
      expect(result.blockers).toContain('Trial balance is out of balance by 10000');
    });

    it('should report multiple blockers', async () => {
      vi.mocked(mockDependencies.getPeriodStatus).mockResolvedValue(FiscalPeriodStatus.OPEN);
      vi.mocked(mockDependencies.getPreviousPeriodStatus).mockResolvedValue(FiscalPeriodStatus.OPEN);
      vi.mocked(mockDependencies.getDraftEntriesCount).mockResolvedValue(3);
      vi.mocked(mockDependencies.getTrialBalanceValidation).mockResolvedValue({
        isBalanced: false,
        difference: 5000,
      });

      const result = await service.getCloseChecklist(testPeriod);

      expect(result.canClose).toBe(false);
      expect(result.blockers).toHaveLength(3);
    });

    it('should report period already closed', async () => {
      vi.mocked(mockDependencies.getPeriodStatus).mockResolvedValue(FiscalPeriodStatus.CLOSED);

      const result = await service.getCloseChecklist(testPeriod);

      expect(result.canClose).toBe(false);
      expect(result.blockers).toContain('Period is already closed');
    });
  });

  describe('closePeriod', () => {
    const testPeriod = FiscalPeriod.create(2025, 2);

    it('should close period when all checks pass', async () => {
      vi.mocked(mockDependencies.getPeriodStatus).mockResolvedValue(FiscalPeriodStatus.OPEN);
      vi.mocked(mockDependencies.getPreviousPeriodStatus).mockResolvedValue(FiscalPeriodStatus.CLOSED);
      vi.mocked(mockDependencies.getDraftEntriesCount).mockResolvedValue(0);
      vi.mocked(mockDependencies.getTrialBalanceValidation).mockResolvedValue({
        isBalanced: true,
        difference: 0,
      });
      vi.mocked(mockDependencies.calculateAndSaveAccountBalances).mockResolvedValue(undefined);
      vi.mocked(mockDependencies.closePeriod).mockResolvedValue(undefined);

      await service.closePeriod(testPeriod, 'admin-user');

      expect(mockDependencies.calculateAndSaveAccountBalances).toHaveBeenCalledWith(testPeriod);
      expect(mockDependencies.closePeriod).toHaveBeenCalledWith(testPeriod, 'admin-user');
    });

    it('should throw error when checks fail', async () => {
      vi.mocked(mockDependencies.getPeriodStatus).mockResolvedValue(FiscalPeriodStatus.OPEN);
      vi.mocked(mockDependencies.getPreviousPeriodStatus).mockResolvedValue(FiscalPeriodStatus.OPEN);
      vi.mocked(mockDependencies.getDraftEntriesCount).mockResolvedValue(0);
      vi.mocked(mockDependencies.getTrialBalanceValidation).mockResolvedValue({
        isBalanced: true,
        difference: 0,
      });

      await expect(service.closePeriod(testPeriod, 'admin-user')).rejects.toThrow(
        'Cannot close period'
      );

      expect(mockDependencies.calculateAndSaveAccountBalances).not.toHaveBeenCalled();
      expect(mockDependencies.closePeriod).not.toHaveBeenCalled();
    });

    it('should not allow closing already closed period', async () => {
      vi.mocked(mockDependencies.getPeriodStatus).mockResolvedValue(FiscalPeriodStatus.CLOSED);

      await expect(service.closePeriod(testPeriod, 'admin-user')).rejects.toThrow(
        'Cannot close period'
      );
    });
  });
});
