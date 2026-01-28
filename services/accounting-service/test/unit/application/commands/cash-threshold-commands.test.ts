import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  UpdateCashThresholdCommand,
  UpdateCashThresholdHandler,
  GetCashThresholdHandler,
  type ICashThresholdRepository,
  type CashThresholdConfig,
} from '@/application/commands/cash-threshold.commands';

// Mock repository
const mockThresholdRepository: ICashThresholdRepository = {
  findCurrent: vi.fn(),
  save: vi.fn(),
};

describe('Cash Threshold Commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('UpdateCashThresholdHandler', () => {
    let handler: UpdateCashThresholdHandler;

    beforeEach(() => {
      handler = new UpdateCashThresholdHandler(mockThresholdRepository);
    });

    it('should update cash thresholds successfully', async () => {
      vi.mocked(mockThresholdRepository.save).mockResolvedValue(undefined);

      const command: UpdateCashThresholdCommand = {
        warningThreshold: 350_000_000,
        criticalThreshold: 300_000_000,
        emergencyThreshold: 250_000_000,
        updatedBy: 'admin-001',
      };

      const result = await handler.execute(command);

      expect(result.warningThreshold).toBe(350_000_000);
      expect(result.criticalThreshold).toBe(300_000_000);
      expect(result.emergencyThreshold).toBe(250_000_000);
      expect(result.updatedAt).toBeDefined();
      expect(mockThresholdRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should throw error if warning <= critical threshold', async () => {
      const command: UpdateCashThresholdCommand = {
        warningThreshold: 250_000_000, // Less than critical
        criticalThreshold: 300_000_000,
        emergencyThreshold: 200_000_000,
        updatedBy: 'admin-001',
      };

      await expect(handler.execute(command)).rejects.toThrow(
        'Warning threshold must be greater than critical threshold'
      );
    });

    it('should throw error if critical <= emergency threshold', async () => {
      const command: UpdateCashThresholdCommand = {
        warningThreshold: 350_000_000,
        criticalThreshold: 200_000_000, // Less than emergency
        emergencyThreshold: 250_000_000,
        updatedBy: 'admin-001',
      };

      await expect(handler.execute(command)).rejects.toThrow(
        'Critical threshold must be greater than emergency threshold'
      );
    });
  });

  describe('GetCashThresholdHandler', () => {
    let handler: GetCashThresholdHandler;

    beforeEach(() => {
      handler = new GetCashThresholdHandler(mockThresholdRepository);
    });

    it('should return configured thresholds', async () => {
      const config: CashThresholdConfig = {
        id: 'default',
        warningThreshold: 400_000_000,
        criticalThreshold: 350_000_000,
        emergencyThreshold: 300_000_000,
        updatedAt: new Date('2025-01-15'),
        updatedBy: 'admin-001',
      };
      vi.mocked(mockThresholdRepository.findCurrent).mockResolvedValue(config);

      const result = await handler.execute();

      expect(result.warningThreshold).toBe(400_000_000);
      expect(result.criticalThreshold).toBe(350_000_000);
      expect(result.emergencyThreshold).toBe(300_000_000);
      expect(result.updatedBy).toBe('admin-001');
    });

    it('should return default thresholds if not configured', async () => {
      vi.mocked(mockThresholdRepository.findCurrent).mockResolvedValue(null);

      const result = await handler.execute();

      expect(result.warningThreshold).toBe(300_000_000); // Default Rp 300M
      expect(result.criticalThreshold).toBe(275_000_000); // Default Rp 275M
      expect(result.emergencyThreshold).toBe(250_000_000); // Default Rp 250M
      expect(result.updatedBy).toBe('system');
    });
  });
});
