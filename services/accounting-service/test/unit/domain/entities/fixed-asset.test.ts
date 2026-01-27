import { describe, it, expect } from 'vitest';
import { FixedAsset, type FixedAssetProps } from '@/domain/entities/fixed-asset.entity';
import {
  AssetStatus,
  DepreciationMethod,
  AcquisitionMethod,
  DisposalMethod,
} from '@/domain/value-objects';

describe('FixedAsset', () => {
  const validProps: FixedAssetProps = {
    assetNumber: 'AST-IT-2026-0001',
    name: 'Dell Server',
    categoryId: 'cat-it',
    acquisitionDate: new Date('2026-01-15'),
    acquisitionMethod: AcquisitionMethod.PURCHASE,
    acquisitionCost: 50_000_000,
    usefulLifeMonths: 48,
    salvageValue: 5_000_000,
    depreciationMethod: DepreciationMethod.STRAIGHT_LINE,
    depreciationStartDate: new Date('2026-02-01'),
    createdBy: 'user-123',
  };

  describe('create', () => {
    it('should create a draft asset with valid props', () => {
      const asset = FixedAsset.create(validProps);

      expect(asset.assetNumber).toBe('AST-IT-2026-0001');
      expect(asset.name).toBe('Dell Server');
      expect(asset.categoryId).toBe('cat-it');
      expect(asset.acquisitionCost).toBe(50_000_000);
      expect(asset.bookValue).toBe(50_000_000);
      expect(asset.accumulatedDepreciation).toBe(0);
      expect(asset.status).toBe(AssetStatus.DRAFT);
      expect(asset.version).toBe(1);
    });

    it('should generate unique ID', () => {
      const asset1 = FixedAsset.create(validProps);
      const asset2 = FixedAsset.create(validProps);

      expect(asset1.id).not.toBe(asset2.id);
    });

    it('should throw error if salvage value exceeds acquisition cost', () => {
      expect(() =>
        FixedAsset.create({
          ...validProps,
          acquisitionCost: 1_000_000,
          salvageValue: 2_000_000,
        })
      ).toThrow('Salvage value cannot exceed acquisition cost');
    });

    it('should throw error if acquisition cost is zero or negative', () => {
      expect(() =>
        FixedAsset.create({
          ...validProps,
          acquisitionCost: 0,
        })
      ).toThrow('Acquisition cost must be positive');
    });

    it('should throw error if useful life is zero or negative', () => {
      expect(() =>
        FixedAsset.create({
          ...validProps,
          usefulLifeMonths: 0,
        })
      ).toThrow('Useful life must be positive');
    });

    it('should allow zero salvage value', () => {
      const asset = FixedAsset.create({
        ...validProps,
        salvageValue: 0,
      });

      expect(asset.salvageValue).toBe(0);
    });
  });

  describe('activate', () => {
    it('should activate a draft asset', () => {
      const asset = FixedAsset.create(validProps);

      asset.activate();

      expect(asset.status).toBe(AssetStatus.ACTIVE);
    });

    it('should throw error if asset is not in draft status', () => {
      const asset = FixedAsset.create(validProps);
      asset.activate();

      expect(() => asset.activate()).toThrow('Can only activate draft assets');
    });

    it('should increment version', () => {
      const asset = FixedAsset.create(validProps);
      const initialVersion = asset.version;

      asset.activate();

      expect(asset.version).toBe(initialVersion + 1);
    });
  });

  describe('applyDepreciation', () => {
    it('should apply depreciation to active asset', () => {
      const asset = FixedAsset.create(validProps);
      asset.activate();

      const depreciationAmount = 937_500; // (50M - 5M) / 48
      asset.applyDepreciation(depreciationAmount, { year: 2026, month: 2 });

      expect(asset.accumulatedDepreciation).toBe(937_500);
      expect(asset.bookValue).toBe(49_062_500);
      expect(asset.lastDepreciationDate).toEqual(new Date(2026, 1, 28)); // Feb 2026
    });

    it('should throw error if asset is not active', () => {
      const asset = FixedAsset.create(validProps);

      expect(() =>
        asset.applyDepreciation(100_000, { year: 2026, month: 2 })
      ).toThrow('Can only depreciate active assets');
    });

    it('should mark as fully depreciated when book value reaches salvage', () => {
      const asset = FixedAsset.create({
        ...validProps,
        acquisitionCost: 1_000_000,
        salvageValue: 100_000,
        usefulLifeMonths: 9,
      });
      asset.activate();

      // Apply depreciation that brings book value to salvage
      asset.applyDepreciation(900_000, { year: 2026, month: 2 });

      expect(asset.status).toBe(AssetStatus.FULLY_DEPRECIATED);
      expect(asset.bookValue).toBe(100_000);
    });

    it('should not depreciate below salvage value', () => {
      const asset = FixedAsset.create({
        ...validProps,
        acquisitionCost: 1_000_000,
        salvageValue: 100_000,
      });
      asset.activate();

      // Try to apply more depreciation than allowed
      asset.applyDepreciation(1_000_000, { year: 2026, month: 2 });

      expect(asset.bookValue).toBe(100_000); // Capped at salvage
      expect(asset.accumulatedDepreciation).toBe(900_000);
    });
  });

  describe('dispose', () => {
    it('should dispose an active asset with gain', () => {
      const asset = FixedAsset.create({
        ...validProps,
        acquisitionCost: 10_000_000,
        salvageValue: 1_000_000,
      });
      asset.activate();
      asset.applyDepreciation(5_000_000, { year: 2026, month: 6 }); // Book value: 5M

      const result = asset.dispose({
        method: DisposalMethod.SALE,
        value: 6_000_000,
        reason: 'Upgrading to newer model',
        disposedBy: 'user-123',
      });

      expect(asset.status).toBe(AssetStatus.DISPOSED);
      expect(result.bookValueAtDisposal).toBe(5_000_000);
      expect(result.disposalValue).toBe(6_000_000);
      expect(result.gainLoss).toBe(1_000_000); // Gain
      expect(result.isGain).toBe(true);
    });

    it('should dispose an active asset with loss', () => {
      const asset = FixedAsset.create({
        ...validProps,
        acquisitionCost: 10_000_000,
        salvageValue: 1_000_000,
      });
      asset.activate();
      asset.applyDepreciation(3_000_000, { year: 2026, month: 6 }); // Book value: 7M

      const result = asset.dispose({
        method: DisposalMethod.SCRAP,
        value: 500_000,
        reason: 'Damaged beyond repair',
        disposedBy: 'user-123',
      });

      expect(result.bookValueAtDisposal).toBe(7_000_000);
      expect(result.disposalValue).toBe(500_000);
      expect(result.gainLoss).toBe(-6_500_000); // Loss
      expect(result.isGain).toBe(false);
    });

    it('should throw error if asset is already disposed', () => {
      const asset = FixedAsset.create(validProps);
      asset.activate();
      asset.dispose({
        method: DisposalMethod.SALE,
        value: 1_000_000,
        reason: 'Sold',
        disposedBy: 'user-123',
      });

      expect(() =>
        asset.dispose({
          method: DisposalMethod.SALE,
          value: 1_000_000,
          reason: 'Sold again',
          disposedBy: 'user-123',
        })
      ).toThrow('Asset is already disposed');
    });

    it('should throw error if disposal value is negative', () => {
      const asset = FixedAsset.create(validProps);
      asset.activate();

      expect(() =>
        asset.dispose({
          method: DisposalMethod.SALE,
          value: -1_000_000,
          reason: 'Invalid',
          disposedBy: 'user-123',
        })
      ).toThrow('Disposal value cannot be negative');
    });
  });

  describe('isDepreciable', () => {
    it('should return true for active asset above salvage value', () => {
      const asset = FixedAsset.create({
        ...validProps,
        depreciationStartDate: new Date('2026-01-01'), // Past date
      });
      asset.activate();

      expect(asset.isDepreciable()).toBe(true);
    });

    it('should return false for draft asset', () => {
      const asset = FixedAsset.create(validProps);

      expect(asset.isDepreciable()).toBe(false);
    });

    it('should return false for fully depreciated asset', () => {
      const asset = FixedAsset.create({
        ...validProps,
        acquisitionCost: 1_000_000,
        salvageValue: 100_000,
      });
      asset.activate();
      asset.applyDepreciation(900_000, { year: 2026, month: 2 });

      expect(asset.isDepreciable()).toBe(false);
    });

    it('should return false before depreciation start date', () => {
      const asset = FixedAsset.create({
        ...validProps,
        depreciationStartDate: new Date('2030-01-01'), // Future date
      });
      asset.activate();

      expect(asset.isDepreciable()).toBe(false);
    });
  });

  describe('calculateMonthlyDepreciation', () => {
    it('should calculate straight-line depreciation', () => {
      const asset = FixedAsset.create({
        ...validProps,
        acquisitionCost: 10_000_000,
        salvageValue: 1_000_000,
        usefulLifeMonths: 36,
        depreciationMethod: DepreciationMethod.STRAIGHT_LINE,
      });
      asset.activate();

      const monthly = asset.calculateMonthlyDepreciation();

      expect(monthly).toBe(250_000); // (10M - 1M) / 36
    });

    it('should calculate declining balance depreciation', () => {
      const asset = FixedAsset.create({
        ...validProps,
        acquisitionCost: 12_000_000,
        salvageValue: 2_000_000,
        usefulLifeMonths: 60,
        depreciationMethod: DepreciationMethod.DECLINING_BALANCE,
      });
      asset.activate();

      const monthly = asset.calculateMonthlyDepreciation();

      expect(monthly).toBe(400_000); // 12M * 40% / 12
    });
  });

  describe('fromPersistence', () => {
    it('should reconstitute asset from persistence data', () => {
      const asset = FixedAsset.fromPersistence({
        id: 'ast-123',
        assetNumber: 'AST-IT-2026-0001',
        name: 'Dell Server',
        categoryId: 'cat-it',
        acquisitionDate: new Date('2026-01-15'),
        acquisitionMethod: AcquisitionMethod.PURCHASE,
        acquisitionCost: 50_000_000,
        usefulLifeMonths: 48,
        salvageValue: 5_000_000,
        depreciationMethod: DepreciationMethod.STRAIGHT_LINE,
        depreciationStartDate: new Date('2026-02-01'),
        accumulatedDepreciation: 937_500,
        bookValue: 49_062_500,
        status: AssetStatus.ACTIVE,
        createdBy: 'user-123',
        createdAt: new Date('2026-01-15'),
        updatedAt: new Date('2026-02-28'),
        version: 3,
      });

      expect(asset.id).toBe('ast-123');
      expect(asset.accumulatedDepreciation).toBe(937_500);
      expect(asset.bookValue).toBe(49_062_500);
      expect(asset.status).toBe(AssetStatus.ACTIVE);
      expect(asset.version).toBe(3);
    });
  });
});
