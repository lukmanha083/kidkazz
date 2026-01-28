import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import {
  auditLogs,
  taxSummary,
  archivedData,
  type AuditLogRecord,
  type TaxSummaryRecord,
  type ArchivedDataRecord,
} from '../db/schema';
import type {
  IAuditLogRepository,
  ITaxSummaryRepository,
  IArchivedDataRepository,
  AuditLogFilter,
} from '@/domain/repositories/audit.repository';
import { AuditLog, type AuditAction } from '@/domain/entities/audit-log.entity';
import { TaxSummary, type TaxType } from '@/domain/entities/tax-summary.entity';
import { ArchivedData, type ArchiveType } from '@/domain/entities/archived-data.entity';

// Generic database type that works with both D1 and SQLite
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDB = any;

/**
 * Drizzle implementation of IAuditLogRepository
 */
export class DrizzleAuditLogRepository implements IAuditLogRepository {
  constructor(private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<AuditLog | null> {
    const results = await this.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.id, id))
      .limit(1);

    if (results.length === 0) return null;
    return this.toDomain(results[0]);
  }

  async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    const results = await this.db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.entityType, entityType), eq(auditLogs.entityId, entityId)))
      .orderBy(desc(auditLogs.timestamp));

    return results.map((r: AuditLogRecord) => this.toDomain(r));
  }

  async findByUser(userId: string, limit: number = 100): Promise<AuditLog[]> {
    const results = await this.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);

    return results.map((r: AuditLogRecord) => this.toDomain(r));
  }

  async findByAction(action: AuditAction, limit: number = 100): Promise<AuditLog[]> {
    const results = await this.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, action))
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);

    return results.map((r: AuditLogRecord) => this.toDomain(r));
  }

  async findByYear(fiscalYear: number): Promise<AuditLog[]> {
    const startDate = `${fiscalYear}-01-01`;
    const endDate = `${fiscalYear}-12-31`;

    const results = await this.db
      .select()
      .from(auditLogs)
      .where(and(gte(auditLogs.timestamp, startDate), lte(auditLogs.timestamp, endDate + 'T23:59:59')))
      .orderBy(desc(auditLogs.timestamp));

    return results.map((r: AuditLogRecord) => this.toDomain(r));
  }

  async findRecent(limit: number): Promise<AuditLog[]> {
    const results = await this.db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);

    return results.map((r: AuditLogRecord) => this.toDomain(r));
  }

  async findByFilter(filter: AuditLogFilter): Promise<AuditLog[]> {
    const conditions = [];

    if (filter.userId) {
      conditions.push(eq(auditLogs.userId, filter.userId));
    }
    if (filter.action) {
      conditions.push(eq(auditLogs.action, filter.action));
    }
    if (filter.entityType) {
      conditions.push(eq(auditLogs.entityType, filter.entityType));
    }
    if (filter.entityId) {
      conditions.push(eq(auditLogs.entityId, filter.entityId));
    }
    if (filter.startDate) {
      conditions.push(gte(auditLogs.timestamp, filter.startDate.toISOString()));
    }
    if (filter.endDate) {
      conditions.push(lte(auditLogs.timestamp, filter.endDate.toISOString()));
    }

    const query =
      conditions.length > 0
        ? this.db.select().from(auditLogs).where(and(...conditions))
        : this.db.select().from(auditLogs);

    let results = await query.orderBy(desc(auditLogs.timestamp));

    if (filter.offset) {
      results = results.slice(filter.offset);
    }
    if (filter.limit) {
      results = results.slice(0, filter.limit);
    }

    return results.map((r: AuditLogRecord) => this.toDomain(r));
  }

  async save(auditLog: AuditLog): Promise<void> {
    await this.db.insert(auditLogs).values({
      id: auditLog.id,
      timestamp: auditLog.timestamp.toISOString(),
      userId: auditLog.userId,
      userName: auditLog.userName,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      oldValues: auditLog.oldValues ? JSON.stringify(auditLog.oldValues) : null,
      newValues: auditLog.newValues ? JSON.stringify(auditLog.newValues) : null,
      ipAddress: auditLog.ipAddress,
      userAgent: auditLog.userAgent,
      metadata: auditLog.metadata ? JSON.stringify(auditLog.metadata) : null,
      createdAt: auditLog.createdAt.toISOString(),
    });
  }

  async count(filter?: AuditLogFilter): Promise<number> {
    const conditions = [];

    if (filter?.userId) {
      conditions.push(eq(auditLogs.userId, filter.userId));
    }
    if (filter?.action) {
      conditions.push(eq(auditLogs.action, filter.action));
    }
    if (filter?.entityType) {
      conditions.push(eq(auditLogs.entityType, filter.entityType));
    }

    const query =
      conditions.length > 0
        ? this.db
            .select({ count: sql<number>`count(*)` })
            .from(auditLogs)
            .where(and(...conditions))
        : this.db.select({ count: sql<number>`count(*)` }).from(auditLogs);

    const result = await query;
    return result[0]?.count || 0;
  }

  private toDomain(record: AuditLogRecord): AuditLog {
    return AuditLog.fromPersistence({
      id: record.id,
      timestamp: new Date(record.timestamp),
      userId: record.userId,
      userName: record.userName,
      action: record.action as AuditAction,
      entityType: record.entityType,
      entityId: record.entityId,
      oldValues: record.oldValues ? JSON.parse(record.oldValues) : null,
      newValues: record.newValues ? JSON.parse(record.newValues) : null,
      ipAddress: record.ipAddress,
      userAgent: record.userAgent,
      metadata: record.metadata ? JSON.parse(record.metadata) : null,
      createdAt: new Date(record.createdAt),
    });
  }
}

/**
 * Drizzle implementation of ITaxSummaryRepository
 */
export class DrizzleTaxSummaryRepository implements ITaxSummaryRepository {
  constructor(private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<TaxSummary | null> {
    const results = await this.db
      .select()
      .from(taxSummary)
      .where(eq(taxSummary.id, id))
      .limit(1);

    if (results.length === 0) return null;
    return this.toDomain(results[0]);
  }

  async findByPeriodAndType(
    fiscalYear: number,
    fiscalMonth: number,
    taxType: TaxType
  ): Promise<TaxSummary | null> {
    const results = await this.db
      .select()
      .from(taxSummary)
      .where(
        and(
          eq(taxSummary.fiscalYear, fiscalYear),
          eq(taxSummary.fiscalMonth, fiscalMonth),
          eq(taxSummary.taxType, taxType)
        )
      )
      .limit(1);

    if (results.length === 0) return null;
    return this.toDomain(results[0]);
  }

  async findByPeriod(fiscalYear: number, fiscalMonth: number): Promise<TaxSummary[]> {
    const results = await this.db
      .select()
      .from(taxSummary)
      .where(and(eq(taxSummary.fiscalYear, fiscalYear), eq(taxSummary.fiscalMonth, fiscalMonth)));

    return results.map((r: TaxSummaryRecord) => this.toDomain(r));
  }

  async findByYear(fiscalYear: number): Promise<TaxSummary[]> {
    const results = await this.db
      .select()
      .from(taxSummary)
      .where(eq(taxSummary.fiscalYear, fiscalYear))
      .orderBy(taxSummary.fiscalMonth);

    return results.map((r: TaxSummaryRecord) => this.toDomain(r));
  }

  async save(summary: TaxSummary): Promise<void> {
    const data = {
      id: summary.id,
      fiscalYear: summary.fiscalYear,
      fiscalMonth: summary.fiscalMonth,
      taxType: summary.taxType,
      grossAmount: summary.grossAmount,
      taxAmount: summary.taxAmount,
      netAmount: summary.netAmount,
      transactionCount: summary.transactionCount,
      calculatedAt: summary.calculatedAt.toISOString(),
      createdAt: summary.createdAt.toISOString(),
      updatedAt: summary.updatedAt.toISOString(),
    };

    await this.db
      .insert(taxSummary)
      .values(data)
      .onConflictDoUpdate({
        target: [taxSummary.fiscalYear, taxSummary.fiscalMonth, taxSummary.taxType],
        set: {
          grossAmount: data.grossAmount,
          taxAmount: data.taxAmount,
          netAmount: data.netAmount,
          transactionCount: data.transactionCount,
          calculatedAt: data.calculatedAt,
          updatedAt: data.updatedAt,
        },
      });
  }

  private toDomain(record: TaxSummaryRecord): TaxSummary {
    return TaxSummary.fromPersistence({
      id: record.id,
      fiscalYear: record.fiscalYear,
      fiscalMonth: record.fiscalMonth,
      taxType: record.taxType as TaxType,
      grossAmount: record.grossAmount,
      taxAmount: record.taxAmount,
      netAmount: record.netAmount,
      transactionCount: record.transactionCount,
      calculatedAt: new Date(record.calculatedAt),
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
    });
  }
}

/**
 * Drizzle implementation of IArchivedDataRepository
 */
export class DrizzleArchivedDataRepository implements IArchivedDataRepository {
  constructor(private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<ArchivedData | null> {
    const results = await this.db
      .select()
      .from(archivedData)
      .where(eq(archivedData.id, id))
      .limit(1);

    if (results.length === 0) return null;
    return this.toDomain(results[0]);
  }

  async findByTypeAndYear(archiveType: ArchiveType, fiscalYear: number): Promise<ArchivedData | null> {
    const results = await this.db
      .select()
      .from(archivedData)
      .where(and(eq(archivedData.archiveType, archiveType), eq(archivedData.fiscalYear, fiscalYear)))
      .limit(1);

    if (results.length === 0) return null;
    return this.toDomain(results[0]);
  }

  async findAll(): Promise<ArchivedData[]> {
    const results = await this.db
      .select()
      .from(archivedData)
      .orderBy(desc(archivedData.archivedAt));

    return results.map((r: ArchivedDataRecord) => this.toDomain(r));
  }

  async findByType(archiveType: ArchiveType): Promise<ArchivedData[]> {
    const results = await this.db
      .select()
      .from(archivedData)
      .where(eq(archivedData.archiveType, archiveType))
      .orderBy(desc(archivedData.fiscalYear));

    return results.map((r: ArchivedDataRecord) => this.toDomain(r));
  }

  async save(archive: ArchivedData): Promise<void> {
    await this.db.insert(archivedData).values({
      id: archive.id,
      archiveType: archive.archiveType,
      fiscalYear: archive.fiscalYear,
      recordCount: archive.recordCount,
      archivePath: archive.archivePath,
      archivedAt: archive.archivedAt.toISOString(),
      archivedBy: archive.archivedBy,
      checksum: archive.checksum,
      createdAt: archive.createdAt.toISOString(),
    });
  }

  private toDomain(record: ArchivedDataRecord): ArchivedData {
    return ArchivedData.fromPersistence({
      id: record.id,
      archiveType: record.archiveType as ArchiveType,
      fiscalYear: record.fiscalYear,
      recordCount: record.recordCount,
      archivePath: record.archivePath,
      archivedAt: new Date(record.archivedAt),
      archivedBy: record.archivedBy,
      checksum: record.checksum,
      createdAt: new Date(record.createdAt),
    });
  }
}
