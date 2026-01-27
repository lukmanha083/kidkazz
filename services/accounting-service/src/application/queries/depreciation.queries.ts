import type {
  IFixedAssetRepository,
  IAssetCategoryRepository,
  IDepreciationScheduleRepository,
  IDepreciationRunRepository,
  DepreciationSchedule,
  DepreciationRun,
} from '@/domain/repositories';
import { DepreciationCalculatorFactory } from '@/domain/services/DepreciationCalculator';

// ============================================================================
// Get Depreciation Preview Query
// ============================================================================

export interface GetDepreciationPreviewQuery {
  fiscalYear: number;
  fiscalMonth: number;
}

export interface DepreciationPreviewItem {
  assetId: string;
  assetNumber: string;
  assetName: string;
  categoryId: string;
  categoryName: string;
  depreciationMethod: string;
  currentBookValue: number;
  salvageValue: number;
  estimatedDepreciation: number;
  newBookValue: number;
  isFullyDepreciated: boolean;
}

export interface DepreciationPreviewResult {
  fiscalYear: number;
  fiscalMonth: number;
  totalAssets: number;
  totalDepreciation: number;
  assets: DepreciationPreviewItem[];
  alreadyCalculated: boolean;
  alreadyPosted: boolean;
}

export class GetDepreciationPreviewHandler {
  constructor(
    private readonly assetRepo: IFixedAssetRepository,
    private readonly categoryRepo: IAssetCategoryRepository,
    private readonly runRepo: IDepreciationRunRepository
  ) {}

  async execute(query: GetDepreciationPreviewQuery): Promise<DepreciationPreviewResult> {
    const { fiscalYear, fiscalMonth } = query;

    // Check existing run status
    const existingRun = await this.runRepo.findByPeriod(fiscalYear, fiscalMonth);
    const alreadyCalculated = !!existingRun;
    const alreadyPosted = existingRun?.status === 'POSTED';

    // Get depreciable assets
    const depreciableAssets = await this.assetRepo.findDepreciable();

    // Filter assets eligible for this period
    const periodEndDate = new Date(fiscalYear, fiscalMonth - 1, 28);
    const eligibleAssets = depreciableAssets.filter(
      (asset) => asset.depreciationStartDate <= periodEndDate
    );

    const assets: DepreciationPreviewItem[] = [];
    let totalDepreciation = 0;

    // Get all categories for lookup
    const categories = await this.categoryRepo.findAll(true);
    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    for (const asset of eligibleAssets) {
      const category = categoryMap.get(asset.categoryId);
      if (!category) continue;

      try {
        const calculator = DepreciationCalculatorFactory.getCalculator(asset.depreciationMethod);
        const estimatedDepreciation = calculator.calculate({
          acquisitionCost: asset.acquisitionCost,
          salvageValue: asset.salvageValue,
          usefulLifeMonths: asset.usefulLifeMonths,
          bookValue: asset.bookValue,
          accumulatedDepreciation: asset.accumulatedDepreciation,
          periodMonths: 1,
        });

        const newBookValue = asset.bookValue - estimatedDepreciation;
        const isFullyDepreciated = newBookValue <= asset.salvageValue;

        assets.push({
          assetId: asset.id,
          assetNumber: asset.assetNumber,
          assetName: asset.name,
          categoryId: asset.categoryId,
          categoryName: category.name,
          depreciationMethod: asset.depreciationMethod,
          currentBookValue: asset.bookValue,
          salvageValue: asset.salvageValue,
          estimatedDepreciation,
          newBookValue: Math.max(newBookValue, asset.salvageValue),
          isFullyDepreciated,
        });

        totalDepreciation += estimatedDepreciation;
      } catch (error) {
        // Skip assets with calculation errors
        continue;
      }
    }

    return {
      fiscalYear,
      fiscalMonth,
      totalAssets: assets.length,
      totalDepreciation,
      assets,
      alreadyCalculated,
      alreadyPosted,
    };
  }
}

// ============================================================================
// Get Asset Depreciation Schedule Query
// ============================================================================

export interface GetAssetDepreciationScheduleQuery {
  assetId: string;
}

export interface AssetDepreciationScheduleItem {
  id: string;
  fiscalYear: number;
  fiscalMonth: number;
  period: string;
  openingBookValue: number;
  depreciationAmount: number;
  closingBookValue: number;
  accumulatedDepreciation: number;
  status: string;
  postedAt?: string;
}

export interface AssetDepreciationScheduleResult {
  assetId: string;
  assetNumber: string;
  assetName: string;
  acquisitionCost: number;
  salvageValue: number;
  usefulLifeMonths: number;
  depreciationMethod: string;
  currentBookValue: number;
  totalAccumulatedDepreciation: number;
  schedules: AssetDepreciationScheduleItem[];
}

export class GetAssetDepreciationScheduleHandler {
  constructor(
    private readonly assetRepo: IFixedAssetRepository,
    private readonly scheduleRepo: IDepreciationScheduleRepository
  ) {}

  async execute(query: GetAssetDepreciationScheduleQuery): Promise<AssetDepreciationScheduleResult | null> {
    const asset = await this.assetRepo.findById(query.assetId);
    if (!asset) {
      return null;
    }

    const schedules = await this.scheduleRepo.findByAsset(query.assetId);

    return {
      assetId: asset.id,
      assetNumber: asset.assetNumber,
      assetName: asset.name,
      acquisitionCost: asset.acquisitionCost,
      salvageValue: asset.salvageValue,
      usefulLifeMonths: asset.usefulLifeMonths,
      depreciationMethod: asset.depreciationMethod,
      currentBookValue: asset.bookValue,
      totalAccumulatedDepreciation: asset.accumulatedDepreciation,
      schedules: schedules.map((s) => ({
        id: s.id,
        fiscalYear: s.fiscalYear,
        fiscalMonth: s.fiscalMonth,
        period: `${s.fiscalYear}-${s.fiscalMonth.toString().padStart(2, '0')}`,
        openingBookValue: s.openingBookValue,
        depreciationAmount: s.depreciationAmount,
        closingBookValue: s.closingBookValue,
        accumulatedDepreciation: s.accumulatedDepreciation,
        status: s.status,
        postedAt: s.postedAt?.toISOString(),
      })),
    };
  }
}

// ============================================================================
// Get Depreciation Run Query
// ============================================================================

export interface GetDepreciationRunQuery {
  runId: string;
}

export interface DepreciationRunResult {
  id: string;
  fiscalYear: number;
  fiscalMonth: number;
  period: string;
  totalAssets: number;
  assetsDepreciated: number;
  assetsSkipped: number;
  totalDepreciation: number;
  status: string;
  journalEntryId?: string;
  calculatedAt: string;
  postedAt?: string;
  postedBy?: string;
}

export class GetDepreciationRunHandler {
  constructor(private readonly runRepo: IDepreciationRunRepository) {}

  async execute(query: GetDepreciationRunQuery): Promise<DepreciationRunResult | null> {
    const run = await this.runRepo.findById(query.runId);
    if (!run) {
      return null;
    }

    return this.toResult(run);
  }

  private toResult(run: DepreciationRun): DepreciationRunResult {
    return {
      id: run.id,
      fiscalYear: run.fiscalYear,
      fiscalMonth: run.fiscalMonth,
      period: `${run.fiscalYear}-${run.fiscalMonth.toString().padStart(2, '0')}`,
      totalAssets: run.totalAssets,
      assetsDepreciated: run.assetsDepreciated,
      assetsSkipped: run.assetsSkipped,
      totalDepreciation: run.totalDepreciation,
      status: run.status,
      journalEntryId: run.journalEntryId,
      calculatedAt: run.calculatedAt.toISOString(),
      postedAt: run.postedAt?.toISOString(),
      postedBy: run.postedBy,
    };
  }
}

// ============================================================================
// List Depreciation Runs Query
// ============================================================================

export interface ListDepreciationRunsQuery {}

export class ListDepreciationRunsHandler {
  constructor(private readonly runRepo: IDepreciationRunRepository) {}

  async execute(_query: ListDepreciationRunsQuery): Promise<DepreciationRunResult[]> {
    const runs = await this.runRepo.findAll();

    return runs.map((run) => ({
      id: run.id,
      fiscalYear: run.fiscalYear,
      fiscalMonth: run.fiscalMonth,
      period: `${run.fiscalYear}-${run.fiscalMonth.toString().padStart(2, '0')}`,
      totalAssets: run.totalAssets,
      assetsDepreciated: run.assetsDepreciated,
      assetsSkipped: run.assetsSkipped,
      totalDepreciation: run.totalDepreciation,
      status: run.status,
      journalEntryId: run.journalEntryId,
      calculatedAt: run.calculatedAt.toISOString(),
      postedAt: run.postedAt?.toISOString(),
      postedBy: run.postedBy,
    }));
  }
}

// ============================================================================
// Get Depreciation Run By Period Query
// ============================================================================

export interface GetDepreciationRunByPeriodQuery {
  fiscalYear: number;
  fiscalMonth: number;
}

export class GetDepreciationRunByPeriodHandler {
  constructor(private readonly runRepo: IDepreciationRunRepository) {}

  async execute(query: GetDepreciationRunByPeriodQuery): Promise<DepreciationRunResult | null> {
    const run = await this.runRepo.findByPeriod(query.fiscalYear, query.fiscalMonth);
    if (!run) {
      return null;
    }

    return {
      id: run.id,
      fiscalYear: run.fiscalYear,
      fiscalMonth: run.fiscalMonth,
      period: `${run.fiscalYear}-${run.fiscalMonth.toString().padStart(2, '0')}`,
      totalAssets: run.totalAssets,
      assetsDepreciated: run.assetsDepreciated,
      assetsSkipped: run.assetsSkipped,
      totalDepreciation: run.totalDepreciation,
      status: run.status,
      journalEntryId: run.journalEntryId,
      calculatedAt: run.calculatedAt.toISOString(),
      postedAt: run.postedAt?.toISOString(),
      postedBy: run.postedBy,
    };
  }
}
