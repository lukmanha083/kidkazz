import type { AssetCategory } from '@/domain/entities/asset-category.entity';
import type { FixedAsset } from '@/domain/entities/fixed-asset.entity';
import type { AssetStatus, DepreciationScheduleStatus, DepreciationRunStatus } from '@/domain/value-objects';
import type { PaginationOptions, PaginatedResult } from './journal-entry.repository';

/**
 * Asset Category Repository Interface
 */
export interface IAssetCategoryRepository {
  findById(id: string): Promise<AssetCategory | null>;
  findByCode(code: string): Promise<AssetCategory | null>;
  findAll(includeInactive?: boolean): Promise<AssetCategory[]>;
  save(category: AssetCategory): Promise<void>;
  delete(id: string): Promise<void>;
}

/**
 * Fixed Asset Filter
 */
export interface FixedAssetFilter {
  categoryId?: string;
  status?: AssetStatus;
  locationId?: string;
  departmentId?: string;
  assignedToUserId?: string;
  acquisitionDateFrom?: Date;
  acquisitionDateTo?: Date;
  search?: string;
}

/**
 * Fixed Asset Repository Interface
 */
export interface IFixedAssetRepository {
  findById(id: string): Promise<FixedAsset | null>;
  findByAssetNumber(assetNumber: string): Promise<FixedAsset | null>;
  findByBarcode(barcode: string): Promise<FixedAsset | null>;
  findAll(filter?: FixedAssetFilter, pagination?: PaginationOptions): Promise<PaginatedResult<FixedAsset>>;
  findByStatus(status: AssetStatus): Promise<FixedAsset[]>;
  findDepreciable(): Promise<FixedAsset[]>;
  findByCategory(categoryId: string): Promise<FixedAsset[]>;
  findByLocation(locationId: string): Promise<FixedAsset[]>;
  save(asset: FixedAsset): Promise<void>;
  delete(id: string): Promise<void>;
  generateAssetNumber(categoryCode: string, date: Date): Promise<string>;
}

/**
 * Depreciation Schedule entity (simplified for repository interface)
 */
export interface DepreciationSchedule {
  id: string;
  assetId: string;
  fiscalYear: number;
  fiscalMonth: number;
  openingBookValue: number;
  depreciationAmount: number;
  closingBookValue: number;
  accumulatedDepreciation: number;
  status: DepreciationScheduleStatus;
  journalEntryId?: string;
  calculatedAt: Date;
  postedAt?: Date;
}

/**
 * Depreciation Schedule Repository Interface
 */
export interface IDepreciationScheduleRepository {
  findById(id: string): Promise<DepreciationSchedule | null>;
  findByAsset(assetId: string): Promise<DepreciationSchedule[]>;
  findByPeriod(fiscalYear: number, fiscalMonth: number): Promise<DepreciationSchedule[]>;
  findByAssetAndPeriod(assetId: string, fiscalYear: number, fiscalMonth: number): Promise<DepreciationSchedule | null>;
  findByRunId(runId: string): Promise<DepreciationSchedule[]>;
  save(schedule: DepreciationSchedule): Promise<void>;
  saveMany(schedules: DepreciationSchedule[]): Promise<void>;
  delete(id: string): Promise<void>;
}

/**
 * Depreciation Run entity (simplified for repository interface)
 */
export interface DepreciationRun {
  id: string;
  fiscalYear: number;
  fiscalMonth: number;
  totalAssets: number;
  assetsDepreciated: number;
  assetsSkipped: number;
  totalDepreciation: number;
  status: DepreciationRunStatus;
  journalEntryId?: string;
  calculatedAt: Date;
  postedAt?: Date;
  postedBy?: string;
}

/**
 * Depreciation Run Repository Interface
 */
export interface IDepreciationRunRepository {
  findById(id: string): Promise<DepreciationRun | null>;
  findByPeriod(fiscalYear: number, fiscalMonth: number): Promise<DepreciationRun | null>;
  findAll(): Promise<DepreciationRun[]>;
  save(run: DepreciationRun): Promise<void>;
  delete(id: string): Promise<void>;
}

/**
 * Asset Movement entity (simplified for repository interface)
 */
export interface AssetMovement {
  id: string;
  assetId: string;
  movementType: string;
  fromLocationId?: string;
  toLocationId?: string;
  fromDepartmentId?: string;
  toDepartmentId?: string;
  fromUserId?: string;
  toUserId?: string;
  movementDate: Date;
  reason?: string;
  notes?: string;
  performedBy: string;
  createdAt: Date;
}

/**
 * Asset Movement Repository Interface
 */
export interface IAssetMovementRepository {
  findById(id: string): Promise<AssetMovement | null>;
  findByAsset(assetId: string): Promise<AssetMovement[]>;
  findByDateRange(from: Date, to: Date): Promise<AssetMovement[]>;
  save(movement: AssetMovement): Promise<void>;
}

/**
 * Asset Maintenance entity (simplified for repository interface)
 */
export interface AssetMaintenance {
  id: string;
  assetId: string;
  maintenanceType: string;
  description: string;
  scheduledDate?: Date;
  performedDate?: Date;
  nextScheduledDate?: Date;
  cost: number;
  isCapitalized: boolean;
  extendsUsefulLifeMonths: number;
  vendorId?: string;
  vendorName?: string;
  invoiceNumber?: string;
  status: string;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Asset Maintenance Repository Interface
 */
export interface IAssetMaintenanceRepository {
  findById(id: string): Promise<AssetMaintenance | null>;
  findByAsset(assetId: string): Promise<AssetMaintenance[]>;
  findScheduled(): Promise<AssetMaintenance[]>;
  findOverdue(): Promise<AssetMaintenance[]>;
  save(maintenance: AssetMaintenance): Promise<void>;
  delete(id: string): Promise<void>;
}
