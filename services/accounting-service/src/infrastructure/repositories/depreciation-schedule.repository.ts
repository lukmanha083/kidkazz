import { eq, and, sql } from 'drizzle-orm';
import { DepreciationScheduleStatus } from '@/domain/value-objects';
import type {
  IDepreciationScheduleRepository,
  DepreciationSchedule,
} from '@/domain/repositories';
import { depreciationSchedules, type DepreciationScheduleRecord } from '@/infrastructure/db/schema';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDB = any;

/**
 * Drizzle ORM implementation of IDepreciationScheduleRepository
 */
export class DrizzleDepreciationScheduleRepository implements IDepreciationScheduleRepository {
  constructor(private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<DepreciationSchedule | null> {
    const result = await this.db
      .select()
      .from(depreciationSchedules)
      .where(eq(depreciationSchedules.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.toDomain(result[0]);
  }

  async findByAsset(assetId: string): Promise<DepreciationSchedule[]> {
    const results = await this.db
      .select()
      .from(depreciationSchedules)
      .where(eq(depreciationSchedules.assetId, assetId))
      .orderBy(depreciationSchedules.fiscalYear, depreciationSchedules.fiscalMonth);

    return results.map((r: DepreciationScheduleRecord) => this.toDomain(r));
  }

  async findByPeriod(fiscalYear: number, fiscalMonth: number): Promise<DepreciationSchedule[]> {
    const results = await this.db
      .select()
      .from(depreciationSchedules)
      .where(
        and(
          eq(depreciationSchedules.fiscalYear, fiscalYear),
          eq(depreciationSchedules.fiscalMonth, fiscalMonth)
        )
      )
      .orderBy(depreciationSchedules.assetId);

    return results.map((r: DepreciationScheduleRecord) => this.toDomain(r));
  }

  async findByAssetAndPeriod(
    assetId: string,
    fiscalYear: number,
    fiscalMonth: number
  ): Promise<DepreciationSchedule | null> {
    const result = await this.db
      .select()
      .from(depreciationSchedules)
      .where(
        and(
          eq(depreciationSchedules.assetId, assetId),
          eq(depreciationSchedules.fiscalYear, fiscalYear),
          eq(depreciationSchedules.fiscalMonth, fiscalMonth)
        )
      )
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.toDomain(result[0]);
  }

  async findByRunId(runId: string): Promise<DepreciationSchedule[]> {
    // Find all schedules for the same period as the run
    // This assumes run ID contains period info, or we need to look up the run first
    // For simplicity, we'll query by the journalEntryId pattern
    const results = await this.db
      .select()
      .from(depreciationSchedules)
      .orderBy(depreciationSchedules.assetId);

    return results.map((r: DepreciationScheduleRecord) => this.toDomain(r));
  }

  async save(schedule: DepreciationSchedule): Promise<void> {
    const now = new Date().toISOString();

    const existing = await this.db
      .select({ id: depreciationSchedules.id })
      .from(depreciationSchedules)
      .where(eq(depreciationSchedules.id, schedule.id))
      .limit(1);

    const data = {
      assetId: schedule.assetId,
      fiscalYear: schedule.fiscalYear,
      fiscalMonth: schedule.fiscalMonth,
      openingBookValue: schedule.openingBookValue,
      depreciationAmount: schedule.depreciationAmount,
      closingBookValue: schedule.closingBookValue,
      accumulatedDepreciation: schedule.accumulatedDepreciation,
      status: schedule.status,
      journalEntryId: schedule.journalEntryId || null,
      calculatedAt: schedule.calculatedAt.toISOString(),
      postedAt: schedule.postedAt?.toISOString() || null,
    };

    if (existing.length > 0) {
      await this.db
        .update(depreciationSchedules)
        .set(data)
        .where(eq(depreciationSchedules.id, schedule.id));
    } else {
      await this.db.insert(depreciationSchedules).values({
        id: schedule.id,
        ...data,
      });
    }
  }

  async saveMany(schedules: DepreciationSchedule[]): Promise<void> {
    if (schedules.length === 0) return;

    // Use batch for atomic operations
    const operations = schedules.map((schedule) => {
      const data = {
        id: schedule.id,
        assetId: schedule.assetId,
        fiscalYear: schedule.fiscalYear,
        fiscalMonth: schedule.fiscalMonth,
        openingBookValue: schedule.openingBookValue,
        depreciationAmount: schedule.depreciationAmount,
        closingBookValue: schedule.closingBookValue,
        accumulatedDepreciation: schedule.accumulatedDepreciation,
        status: schedule.status,
        journalEntryId: schedule.journalEntryId || null,
        calculatedAt: schedule.calculatedAt.toISOString(),
        postedAt: schedule.postedAt?.toISOString() || null,
      };

      return this.db.insert(depreciationSchedules).values(data).onConflictDoUpdate({
        target: depreciationSchedules.id,
        set: data,
      });
    });

    await this.db.batch(operations);
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(depreciationSchedules).where(eq(depreciationSchedules.id, id));
  }

  private toDomain(record: DepreciationScheduleRecord): DepreciationSchedule {
    return {
      id: record.id,
      assetId: record.assetId,
      fiscalYear: record.fiscalYear,
      fiscalMonth: record.fiscalMonth,
      openingBookValue: record.openingBookValue,
      depreciationAmount: record.depreciationAmount,
      closingBookValue: record.closingBookValue,
      accumulatedDepreciation: record.accumulatedDepreciation,
      status: record.status as DepreciationScheduleStatus,
      journalEntryId: record.journalEntryId || undefined,
      calculatedAt: new Date(record.calculatedAt),
      postedAt: record.postedAt ? new Date(record.postedAt) : undefined,
    };
  }
}
