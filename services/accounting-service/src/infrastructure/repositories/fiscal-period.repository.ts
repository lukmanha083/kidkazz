import { FiscalPeriodEntity } from '@/domain/entities/fiscal-period.entity';
import type {
  FiscalPeriodFilter,
  IFiscalPeriodRepository,
} from '@/domain/repositories/fiscal-period.repository';
import { FiscalPeriod, FiscalPeriodStatus } from '@/domain/value-objects';
import { type FiscalPeriodRecord, fiscalPeriods } from '@/infrastructure/db/schema';
import { and, desc, eq, sql } from 'drizzle-orm';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDB = any;

/**
 * Drizzle ORM implementation of IFiscalPeriodRepository
 */
export class DrizzleFiscalPeriodRepository implements IFiscalPeriodRepository {
  constructor(private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<FiscalPeriodEntity | null> {
    const result = await this.db
      .select()
      .from(fiscalPeriods)
      .where(eq(fiscalPeriods.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.toDomain(result[0]);
  }

  async findByPeriod(year: number, month: number): Promise<FiscalPeriodEntity | null> {
    const result = await this.db
      .select()
      .from(fiscalPeriods)
      .where(and(eq(fiscalPeriods.fiscalYear, year), eq(fiscalPeriods.fiscalMonth, month)))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.toDomain(result[0]);
  }

  async findByDate(date: Date): Promise<FiscalPeriodEntity | null> {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return this.findByPeriod(year, month);
  }

  async findAll(filter?: FiscalPeriodFilter): Promise<FiscalPeriodEntity[]> {
    const conditions = [];

    if (filter?.status) {
      conditions.push(eq(fiscalPeriods.status, filter.status));
    }
    if (filter?.fiscalYear) {
      conditions.push(eq(fiscalPeriods.fiscalYear, filter.fiscalYear));
    }
    if (filter?.fromPeriod) {
      // Year-month comparison: year * 100 + month
      const fromValue = filter.fromPeriod.year * 100 + filter.fromPeriod.month;
      conditions.push(
        sql`(${fiscalPeriods.fiscalYear} * 100 + ${fiscalPeriods.fiscalMonth}) >= ${fromValue}`
      );
    }
    if (filter?.toPeriod) {
      const toValue = filter.toPeriod.year * 100 + filter.toPeriod.month;
      conditions.push(
        sql`(${fiscalPeriods.fiscalYear} * 100 + ${fiscalPeriods.fiscalMonth}) <= ${toValue}`
      );
    }

    const query =
      conditions.length > 0
        ? this.db
            .select()
            .from(fiscalPeriods)
            .where(and(...conditions))
            .orderBy(desc(fiscalPeriods.fiscalYear), desc(fiscalPeriods.fiscalMonth))
        : this.db
            .select()
            .from(fiscalPeriods)
            .orderBy(desc(fiscalPeriods.fiscalYear), desc(fiscalPeriods.fiscalMonth));

    const results = await query;
    return results.map((r: FiscalPeriodRecord) => this.toDomain(r));
  }

  async findPrevious(year: number, month: number): Promise<FiscalPeriodEntity | null> {
    const period = FiscalPeriod.create(year, month);
    const previous = period.previous();

    if (!previous) {
      return null;
    }

    return this.findByPeriod(previous.year, previous.month);
  }

  async findOpen(): Promise<FiscalPeriodEntity[]> {
    const results = await this.db
      .select()
      .from(fiscalPeriods)
      .where(eq(fiscalPeriods.status, FiscalPeriodStatus.OPEN))
      .orderBy(desc(fiscalPeriods.fiscalYear), desc(fiscalPeriods.fiscalMonth));

    return results.map((r: FiscalPeriodRecord) => this.toDomain(r));
  }

  async findCurrentOpen(): Promise<FiscalPeriodEntity | null> {
    // Get the most recent open period
    const result = await this.db
      .select()
      .from(fiscalPeriods)
      .where(eq(fiscalPeriods.status, FiscalPeriodStatus.OPEN))
      .orderBy(desc(fiscalPeriods.fiscalYear), desc(fiscalPeriods.fiscalMonth))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.toDomain(result[0]);
  }

  async save(period: FiscalPeriodEntity): Promise<void> {
    const now = new Date().toISOString();

    const existing = await this.db
      .select({ id: fiscalPeriods.id })
      .from(fiscalPeriods)
      .where(eq(fiscalPeriods.id, period.id))
      .limit(1);

    const data = {
      fiscalYear: period.fiscalYear,
      fiscalMonth: period.fiscalMonth,
      status: period.status,
      closedAt: period.closedAt?.toISOString() || null,
      closedBy: period.closedBy || null,
      reopenedAt: period.reopenedAt?.toISOString() || null,
      reopenedBy: period.reopenedBy || null,
      reopenReason: period.reopenReason || null,
      updatedAt: now,
    };

    if (existing.length > 0) {
      await this.db.update(fiscalPeriods).set(data).where(eq(fiscalPeriods.id, period.id));
    } else {
      await this.db.insert(fiscalPeriods).values({
        id: period.id,
        ...data,
        createdAt: now,
      });
    }
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(fiscalPeriods).where(eq(fiscalPeriods.id, id));
  }

  async periodExists(year: number, month: number): Promise<boolean> {
    const result = await this.db
      .select({ id: fiscalPeriods.id })
      .from(fiscalPeriods)
      .where(and(eq(fiscalPeriods.fiscalYear, year), eq(fiscalPeriods.fiscalMonth, month)))
      .limit(1);

    return result.length > 0;
  }

  private toDomain(record: FiscalPeriodRecord): FiscalPeriodEntity {
    return FiscalPeriodEntity.fromPersistence({
      id: record.id,
      fiscalYear: record.fiscalYear,
      fiscalMonth: record.fiscalMonth,
      status: record.status as FiscalPeriodStatus,
      closedAt: record.closedAt ? new Date(record.closedAt) : undefined,
      closedBy: record.closedBy || undefined,
      reopenedAt: record.reopenedAt ? new Date(record.reopenedAt) : undefined,
      reopenedBy: record.reopenedBy || undefined,
      reopenReason: record.reopenReason || undefined,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
    });
  }
}
