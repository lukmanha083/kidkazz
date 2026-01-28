import type { FixedAsset } from '@/domain/entities';
import { JournalEntry, JournalEntryType } from '@/domain/entities';
import type {
  DepreciationRun,
  DepreciationSchedule,
  IAssetCategoryRepository,
  IDepreciationRunRepository,
  IDepreciationScheduleRepository,
  IFixedAssetRepository,
} from '@/domain/repositories';
import type { IJournalEntryRepository } from '@/domain/repositories/journal-entry.repository';
import { DepreciationCalculatorFactory } from '@/domain/services/DepreciationCalculator';
import {
  DepreciationRunStatus,
  DepreciationScheduleStatus,
  FiscalPeriod,
} from '@/domain/value-objects';
import { nanoid } from 'nanoid';

// ============================================================================
// Calculate Depreciation Command
// ============================================================================

export interface CalculateDepreciationCommand {
  fiscalYear: number;
  fiscalMonth: number;
}

export interface DepreciationCalculationResult {
  runId: string;
  fiscalYear: number;
  fiscalMonth: number;
  totalAssets: number;
  assetsDepreciated: number;
  assetsSkipped: number;
  totalDepreciation: number;
  schedules: DepreciationScheduleItem[];
}

export interface DepreciationScheduleItem {
  scheduleId: string;
  assetId: string;
  assetNumber: string;
  assetName: string;
  categoryId: string;
  openingBookValue: number;
  depreciationAmount: number;
  closingBookValue: number;
  accumulatedDepreciation: number;
}

export class CalculateDepreciationHandler {
  constructor(
    private readonly assetRepo: IFixedAssetRepository,
    private readonly categoryRepo: IAssetCategoryRepository,
    private readonly scheduleRepo: IDepreciationScheduleRepository,
    private readonly runRepo: IDepreciationRunRepository
  ) {}

  async execute(command: CalculateDepreciationCommand): Promise<DepreciationCalculationResult> {
    const { fiscalYear, fiscalMonth } = command;

    // Check if already calculated for this period
    const existingRun = await this.runRepo.findByPeriod(fiscalYear, fiscalMonth);
    if (existingRun && existingRun.status === DepreciationRunStatus.POSTED) {
      throw new Error(
        `Depreciation already posted for ${fiscalYear}-${fiscalMonth.toString().padStart(2, '0')}`
      );
    }

    // If there's an existing calculated run, delete it and recalculate
    if (existingRun) {
      // Delete existing schedules for this period
      const existingSchedules = await this.scheduleRepo.findByPeriod(fiscalYear, fiscalMonth);
      for (const schedule of existingSchedules) {
        await this.scheduleRepo.delete(schedule.id);
      }
      await this.runRepo.delete(existingRun.id);
    }

    // Get all depreciable assets
    const depreciableAssets = await this.assetRepo.findDepreciable();

    // Filter assets that should be depreciated this period
    const periodEndDate = new Date(fiscalYear, fiscalMonth - 1, 28); // Last day approximation
    const assetsToDepreciate = depreciableAssets.filter((asset) => {
      // Asset's depreciation start date should be on or before period end
      return asset.depreciationStartDate <= periodEndDate;
    });

    const schedules: DepreciationScheduleItem[] = [];
    let totalDepreciation = 0;
    let assetsDepreciated = 0;
    let assetsSkipped = 0;

    const runId = `run-${nanoid(8)}`;
    const now = new Date();

    for (const asset of assetsToDepreciate) {
      try {
        // Check if already depreciated for this exact period
        const existingSchedule = await this.scheduleRepo.findByAssetAndPeriod(
          asset.id,
          fiscalYear,
          fiscalMonth
        );
        if (existingSchedule && existingSchedule.status === DepreciationScheduleStatus.POSTED) {
          assetsSkipped++;
          continue;
        }

        // Calculate depreciation
        const calculator = DepreciationCalculatorFactory.getCalculator(asset.depreciationMethod);
        const depreciationAmount = calculator.calculate({
          acquisitionCost: asset.acquisitionCost,
          salvageValue: asset.salvageValue,
          usefulLifeMonths: asset.usefulLifeMonths,
          bookValue: asset.bookValue,
          accumulatedDepreciation: asset.accumulatedDepreciation,
          periodMonths: 1,
        });

        if (depreciationAmount <= 0) {
          assetsSkipped++;
          continue;
        }

        const scheduleId = `dep-${nanoid(8)}`;
        const openingBookValue = asset.bookValue;
        const closingBookValue = openingBookValue - depreciationAmount;
        const newAccumulatedDepreciation = asset.accumulatedDepreciation + depreciationAmount;

        // Create schedule record
        const schedule: DepreciationSchedule = {
          id: scheduleId,
          assetId: asset.id,
          fiscalYear,
          fiscalMonth,
          openingBookValue,
          depreciationAmount,
          closingBookValue,
          accumulatedDepreciation: newAccumulatedDepreciation,
          status: DepreciationScheduleStatus.CALCULATED,
          calculatedAt: now,
        };

        await this.scheduleRepo.save(schedule);

        schedules.push({
          scheduleId,
          assetId: asset.id,
          assetNumber: asset.assetNumber,
          assetName: asset.name,
          categoryId: asset.categoryId,
          openingBookValue,
          depreciationAmount,
          closingBookValue,
          accumulatedDepreciation: newAccumulatedDepreciation,
        });

        totalDepreciation += depreciationAmount;
        assetsDepreciated++;
      } catch (error) {
        console.error(`Error calculating depreciation for asset ${asset.id}:`, error);
        assetsSkipped++;
      }
    }

    // Create depreciation run record
    const run: DepreciationRun = {
      id: runId,
      fiscalYear,
      fiscalMonth,
      totalAssets: assetsToDepreciate.length,
      assetsDepreciated,
      assetsSkipped,
      totalDepreciation,
      status: DepreciationRunStatus.CALCULATED,
      calculatedAt: now,
    };

    await this.runRepo.save(run);

    return {
      runId,
      fiscalYear,
      fiscalMonth,
      totalAssets: assetsToDepreciate.length,
      assetsDepreciated,
      assetsSkipped,
      totalDepreciation,
      schedules,
    };
  }
}

// ============================================================================
// Post Depreciation Command
// ============================================================================

export interface PostDepreciationCommand {
  runId: string;
  postedBy: string;
}

export interface PostDepreciationResult {
  runId: string;
  journalEntryId: string;
  journalEntryNumber: string;
  totalDepreciation: number;
  assetsUpdated: number;
}

export class PostDepreciationHandler {
  constructor(
    private readonly assetRepo: IFixedAssetRepository,
    private readonly categoryRepo: IAssetCategoryRepository,
    private readonly scheduleRepo: IDepreciationScheduleRepository,
    private readonly runRepo: IDepreciationRunRepository,
    private readonly journalEntryRepo: IJournalEntryRepository
  ) {}

  async execute(command: PostDepreciationCommand): Promise<PostDepreciationResult> {
    const { runId, postedBy } = command;

    // Get the depreciation run
    const run = await this.runRepo.findById(runId);
    if (!run) {
      throw new Error('Depreciation run not found');
    }

    if (run.status === DepreciationRunStatus.POSTED) {
      throw new Error('Depreciation run already posted');
    }

    // Get all schedules for this period
    const schedules = await this.scheduleRepo.findByPeriod(run.fiscalYear, run.fiscalMonth);
    const calculatedSchedules = schedules.filter(
      (s) => s.status === DepreciationScheduleStatus.CALCULATED
    );

    if (calculatedSchedules.length === 0) {
      throw new Error('No calculated depreciation schedules to post');
    }

    // Group depreciation by category for journal entry
    const categoryTotals = new Map<string, { total: number; assetIds: string[] }>();

    for (const schedule of calculatedSchedules) {
      const asset = await this.assetRepo.findById(schedule.assetId);
      if (!asset) continue;

      const existing = categoryTotals.get(asset.categoryId) || { total: 0, assetIds: [] };
      existing.total += schedule.depreciationAmount;
      existing.assetIds.push(asset.id);
      categoryTotals.set(asset.categoryId, existing);
    }

    // Build journal entry lines
    const lines: {
      accountId: string;
      direction: 'Debit' | 'Credit';
      amount: number;
      memo: string;
    }[] = [];

    for (const [categoryId, data] of categoryTotals) {
      const category = await this.categoryRepo.findById(categoryId);
      if (!category) continue;

      // Debit: Depreciation Expense
      lines.push({
        accountId: category.depreciationExpenseAccountId,
        direction: 'Debit',
        amount: data.total,
        memo: `Depreciation expense for ${category.name}`,
      });

      // Credit: Accumulated Depreciation
      lines.push({
        accountId: category.accumulatedDepreciationAccountId,
        direction: 'Credit',
        amount: data.total,
        memo: `Accumulated depreciation for ${category.name}`,
      });
    }

    // Create journal entry
    const entryDate = new Date(run.fiscalYear, run.fiscalMonth - 1, 28); // Last day of period
    const fiscalPeriod = FiscalPeriod.create(run.fiscalYear, run.fiscalMonth);
    const entryNumber = await this.journalEntryRepo.generateEntryNumber(fiscalPeriod);

    const journalEntry = JournalEntry.create({
      entryNumber,
      entryDate,
      description: `Monthly depreciation for ${run.fiscalYear}-${run.fiscalMonth.toString().padStart(2, '0')}`,
      reference: `DEP-${run.fiscalYear}${run.fiscalMonth.toString().padStart(2, '0')}`,
      entryType: JournalEntryType.SYSTEM,
      sourceService: 'depreciation',
      sourceReferenceId: runId,
      lines: lines.map((line) => ({
        accountId: line.accountId,
        direction: line.direction,
        amount: line.amount,
        memo: line.memo,
      })),
      createdBy: postedBy,
    });

    // Post the journal entry
    journalEntry.post(postedBy);
    await this.journalEntryRepo.save(journalEntry);

    const now = new Date();

    // Update all schedules to posted
    for (const schedule of calculatedSchedules) {
      schedule.status = DepreciationScheduleStatus.POSTED;
      schedule.journalEntryId = journalEntry.id;
      schedule.postedAt = now;
      await this.scheduleRepo.save(schedule);
    }

    // Update assets with new depreciation values
    let assetsUpdated = 0;
    for (const schedule of calculatedSchedules) {
      const asset = await this.assetRepo.findById(schedule.assetId);
      if (!asset) continue;

      // Apply depreciation to asset
      asset.applyDepreciation(schedule.depreciationAmount, {
        year: run.fiscalYear,
        month: run.fiscalMonth,
      });
      await this.assetRepo.save(asset);
      assetsUpdated++;
    }

    // Update run to posted
    run.status = DepreciationRunStatus.POSTED;
    run.journalEntryId = journalEntry.id;
    run.postedAt = now;
    run.postedBy = postedBy;
    await this.runRepo.save(run);

    return {
      runId,
      journalEntryId: journalEntry.id,
      journalEntryNumber: journalEntry.entryNumber,
      totalDepreciation: run.totalDepreciation,
      assetsUpdated,
    };
  }
}

// ============================================================================
// Reverse Depreciation Command
// ============================================================================

export interface ReverseDepreciationCommand {
  runId: string;
  reason: string;
  reversedBy: string;
}

export interface ReverseDepreciationResult {
  runId: string;
  reversalJournalEntryId: string;
  assetsReversed: number;
}

export class ReverseDepreciationHandler {
  constructor(
    private readonly assetRepo: IFixedAssetRepository,
    private readonly scheduleRepo: IDepreciationScheduleRepository,
    private readonly runRepo: IDepreciationRunRepository,
    private readonly journalEntryRepo: IJournalEntryRepository
  ) {}

  async execute(command: ReverseDepreciationCommand): Promise<ReverseDepreciationResult> {
    const { runId, reason, reversedBy } = command;

    const run = await this.runRepo.findById(runId);
    if (!run) {
      throw new Error('Depreciation run not found');
    }

    if (run.status !== DepreciationRunStatus.POSTED) {
      throw new Error('Can only reverse posted depreciation runs');
    }

    if (!run.journalEntryId) {
      throw new Error('Depreciation run has no associated journal entry');
    }

    // Void the original journal entry
    const originalEntry = await this.journalEntryRepo.findById(run.journalEntryId);
    if (originalEntry) {
      originalEntry.void(reason, reversedBy);
      await this.journalEntryRepo.save(originalEntry);
    }

    // Update schedules to reversed
    const schedules = await this.scheduleRepo.findByPeriod(run.fiscalYear, run.fiscalMonth);
    let assetsReversed = 0;

    for (const schedule of schedules) {
      if (schedule.status === DepreciationScheduleStatus.POSTED) {
        // Reverse the asset's accumulated depreciation
        const asset = await this.assetRepo.findById(schedule.assetId);
        if (asset) {
          // Note: In a real implementation, you'd have a reverseDepreciation method
          // For now, we'll mark the schedule as reversed
          assetsReversed++;
        }

        schedule.status = DepreciationScheduleStatus.REVERSED;
        await this.scheduleRepo.save(schedule);
      }
    }

    // Update run to reversed
    run.status = DepreciationRunStatus.REVERSED;
    await this.runRepo.save(run);

    return {
      runId,
      reversalJournalEntryId: run.journalEntryId,
      assetsReversed,
    };
  }
}
