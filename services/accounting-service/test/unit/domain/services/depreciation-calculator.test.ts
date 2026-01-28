import { describe, it, expect } from 'vitest';
import {
  StraightLineDepreciation,
  DecliningBalanceDepreciation,
  DepreciationCalculatorFactory,
} from '@/domain/services/DepreciationCalculator';
import { DepreciationMethod } from '@/domain/value-objects';

describe('DepreciationCalculator', () => {
  describe('StraightLineDepreciation', () => {
    const calculator = new StraightLineDepreciation();

    it('should calculate monthly depreciation correctly', () => {
      // Asset: Rp 12,000,000, salvage Rp 2,000,000, 60 months
      // Depreciable: Rp 10,000,000, Monthly: Rp 166,666.67
      const result = calculator.calculate({
        acquisitionCost: 12_000_000,
        salvageValue: 2_000_000,
        usefulLifeMonths: 60,
        bookValue: 12_000_000,
        accumulatedDepreciation: 0,
      });

      expect(result).toBeCloseTo(166_666.67, 0);
    });

    it('should calculate depreciation for multiple months', () => {
      const result = calculator.calculate({
        acquisitionCost: 12_000_000,
        salvageValue: 2_000_000,
        usefulLifeMonths: 60,
        bookValue: 12_000_000,
        accumulatedDepreciation: 0,
        periodMonths: 3,
      });

      expect(result).toBeCloseTo(500_000, 0);
    });

    it('should not depreciate below salvage value', () => {
      // Asset almost fully depreciated - book value close to salvage
      const result = calculator.calculate({
        acquisitionCost: 12_000_000,
        salvageValue: 2_000_000,
        usefulLifeMonths: 60,
        bookValue: 2_100_000, // Only Rp 100,000 left to depreciate
        accumulatedDepreciation: 9_900_000,
      });

      expect(result).toBe(100_000); // Should only depreciate remaining amount
    });

    it('should return 0 when already at salvage value', () => {
      const result = calculator.calculate({
        acquisitionCost: 12_000_000,
        salvageValue: 2_000_000,
        usefulLifeMonths: 60,
        bookValue: 2_000_000,
        accumulatedDepreciation: 10_000_000,
      });

      expect(result).toBe(0);
    });

    it('should handle zero salvage value', () => {
      const result = calculator.calculate({
        acquisitionCost: 6_000_000,
        salvageValue: 0,
        usefulLifeMonths: 48,
        bookValue: 6_000_000,
        accumulatedDepreciation: 0,
      });

      expect(result).toBe(125_000); // 6,000,000 / 48
    });

    it('should throw error when salvage exceeds acquisition cost', () => {
      expect(() =>
        calculator.calculate({
          acquisitionCost: 1_000_000,
          salvageValue: 2_000_000,
          usefulLifeMonths: 60,
          bookValue: 1_000_000,
          accumulatedDepreciation: 0,
        })
      ).toThrow('Salvage value cannot exceed acquisition cost');
    });

    it('should throw error for zero useful life', () => {
      expect(() =>
        calculator.calculate({
          acquisitionCost: 1_000_000,
          salvageValue: 100_000,
          usefulLifeMonths: 0,
          bookValue: 1_000_000,
          accumulatedDepreciation: 0,
        })
      ).toThrow('Useful life must be positive');
    });
  });

  describe('DecliningBalanceDepreciation', () => {
    it('should calculate first month depreciation correctly (double declining)', () => {
      const calculator = new DecliningBalanceDepreciation(2); // Double declining

      // Asset: Rp 12,000,000, 60 months (5 years)
      // Annual straight-line rate: 20%, Double declining: 40%
      // First year annual: 12,000,000 * 40% = 4,800,000
      // First month: 4,800,000 / 12 = 400,000
      const result = calculator.calculate({
        acquisitionCost: 12_000_000,
        salvageValue: 2_000_000,
        usefulLifeMonths: 60,
        bookValue: 12_000_000,
        accumulatedDepreciation: 0,
      });

      expect(result).toBe(400_000);
    });

    it('should calculate depreciation based on current book value', () => {
      const calculator = new DecliningBalanceDepreciation(2);

      // After some depreciation, book value is lower
      const result = calculator.calculate({
        acquisitionCost: 12_000_000,
        salvageValue: 2_000_000,
        usefulLifeMonths: 60,
        bookValue: 8_000_000, // After Rp 4,000,000 depreciation
        accumulatedDepreciation: 4_000_000,
      });

      // 8,000,000 * 40% / 12 = 266,666.67
      expect(result).toBeCloseTo(266_666.67, 0);
    });

    it('should not depreciate below salvage value', () => {
      const calculator = new DecliningBalanceDepreciation(2);

      // Book value: 2,100,000, Salvage: 2,000,000
      // Max depreciable: 100,000
      // Declining balance would calculate: 2,100,000 * 40% / 12 = 70,000
      // Since 70,000 < 100,000, we get 70,000
      const result = calculator.calculate({
        acquisitionCost: 12_000_000,
        salvageValue: 2_000_000,
        usefulLifeMonths: 60,
        bookValue: 2_100_000,
        accumulatedDepreciation: 9_900_000,
      });

      expect(result).toBe(70_000); // Declining balance calculation
    });

    it('should cap depreciation at remaining depreciable amount', () => {
      const calculator = new DecliningBalanceDepreciation(2);

      // Book value: 2,010,000, Salvage: 2,000,000
      // Max depreciable: 10,000
      // Declining would be: 2,010,000 * 40% / 12 = 67,000
      // Should cap at 10,000
      const result = calculator.calculate({
        acquisitionCost: 12_000_000,
        salvageValue: 2_000_000,
        usefulLifeMonths: 60,
        bookValue: 2_010_000,
        accumulatedDepreciation: 9_990_000,
      });

      expect(result).toBe(10_000);
    });

    it('should support 150% declining balance', () => {
      const calculator = new DecliningBalanceDepreciation(1.5);

      // 60 months = 5 years, straight-line rate 20%
      // 150% declining: 30% annual rate
      // Monthly: 12,000,000 * 30% / 12 = 300,000
      const result = calculator.calculate({
        acquisitionCost: 12_000_000,
        salvageValue: 2_000_000,
        usefulLifeMonths: 60,
        bookValue: 12_000_000,
        accumulatedDepreciation: 0,
      });

      expect(result).toBeCloseTo(300_000, 0);
    });
  });

  describe('DepreciationCalculatorFactory', () => {
    it('should return StraightLineDepreciation for STRAIGHT_LINE method', () => {
      const calculator = DepreciationCalculatorFactory.getCalculator(
        DepreciationMethod.STRAIGHT_LINE
      );
      expect(calculator).toBeInstanceOf(StraightLineDepreciation);
    });

    it('should return DecliningBalanceDepreciation for DECLINING_BALANCE method', () => {
      const calculator = DepreciationCalculatorFactory.getCalculator(
        DepreciationMethod.DECLINING_BALANCE
      );
      expect(calculator).toBeInstanceOf(DecliningBalanceDepreciation);
    });

    it('should throw error for unsupported method', () => {
      expect(() =>
        DepreciationCalculatorFactory.getCalculator('UNKNOWN' as DepreciationMethod)
      ).toThrow('Unsupported depreciation method');
    });

    it('should calculate correctly using factory', () => {
      const calculator = DepreciationCalculatorFactory.getCalculator(
        DepreciationMethod.STRAIGHT_LINE
      );

      const result = calculator.calculate({
        acquisitionCost: 10_000_000,
        salvageValue: 1_000_000,
        usefulLifeMonths: 36,
        bookValue: 10_000_000,
        accumulatedDepreciation: 0,
      });

      expect(result).toBe(250_000); // 9,000,000 / 36
    });
  });
});
