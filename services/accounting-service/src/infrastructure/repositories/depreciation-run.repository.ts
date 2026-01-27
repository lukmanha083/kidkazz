import { eq, and, desc } from 'drizzle-orm';
import { DepreciationRunStatus } from '@/domain/value-objects';
import type {
  IDepreciationRunRepository,
  DepreciationRun,
} from '@/domain/repositories';
import { depreciationRuns, type DepreciationRunRecord } from '@/infrastructure/db/schema';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDB = any;

/**
 * Drizzle ORM implementation of IDepreciationRunRepository
 */
export class DrizzleDepreciationRunRepository implements IDepreciationRunRepository {
  constructor(private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<DepreciationRun | null> {
    const result = await this.db
      .select()
      .from(depreciationRuns)
      .where(eq(depreciationRuns.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.toDomain(result[0]);
  }

  async findByPeriod(fiscalYear: number, fiscalMonth: number): Promise<DepreciationRun | null> {
    const result = await this.db
      .select()
      .from(depreciationRuns)
      .where(
        and(
          eq(depreciationRuns.fiscalYear, fiscalYear),
          eq(depreciationRuns.fiscalMonth, fiscalMonth)
        )
      )
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.toDomain(result[0]);
  }

  async findAll(): Promise<DepreciationRun[]> {
    const results = await this.db
      .select()
      .from(depreciationRuns)
      .orderBy(desc(depreciationRuns.fiscalYear), desc(depreciationRuns.fiscalMonth));

    return results.map((r: DepreciationRunRecord) => this.toDomain(r));
  }

  async save(run: DepreciationRun): Promise<void> {
    const existing = await this.db
      .select({ id: depreciationRuns.id })
      .from(depreciationRuns)
      .where(eq(depreciationRuns.id, run.id))
      .limit(1);

    const data = {
      fiscalYear: run.fiscalYear,
      fiscalMonth: run.fiscalMonth,
      totalAssets: run.totalAssets,
      assetsDepreciated: run.assetsDepreciated,
      assetsSkipped: run.assetsSkipped,
      totalDepreciation: run.totalDepreciation,
      status: run.status,
      journalEntryId: run.journalEntryId || null,
      calculatedAt: run.calculatedAt.toISOString(),
      postedAt: run.postedAt?.toISOString() || null,
      postedBy: run.postedBy || null,
    };

    if (existing.length > 0) {
      await this.db
        .update(depreciationRuns)
        .set(data)
        .where(eq(depreciationRuns.id, run.id));
    } else {
      await this.db.insert(depreciationRuns).values({
        id: run.id,
        ...data,
      });
    }
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(depreciationRuns).where(eq(depreciationRuns.id, id));
  }

  private toDomain(record: DepreciationRunRecord): DepreciationRun {
    return {
      id: record.id,
      fiscalYear: record.fiscalYear,
      fiscalMonth: record.fiscalMonth,
      totalAssets: record.totalAssets,
      assetsDepreciated: record.assetsDepreciated,
      assetsSkipped: record.assetsSkipped,
      totalDepreciation: record.totalDepreciation,
      status: record.status as DepreciationRunStatus,
      journalEntryId: record.journalEntryId || undefined,
      calculatedAt: new Date(record.calculatedAt),
      postedAt: record.postedAt ? new Date(record.postedAt) : undefined,
      postedBy: record.postedBy || undefined,
    };
  }
}
