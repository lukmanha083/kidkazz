import type { ArchiveType, ArchivedData } from '@/domain/entities/archived-data.entity';
import type { AuditAction, AuditLog } from '@/domain/entities/audit-log.entity';
import type { TaxSummary, TaxType } from '@/domain/entities/tax-summary.entity';

/**
 * Filter for audit log queries
 */
export interface AuditLogFilter {
  userId?: string;
  action?: AuditAction;
  entityType?: string;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Repository interface for AuditLog
 */
export interface IAuditLogRepository {
  /**
   * Find audit log by ID
   */
  findById(id: string): Promise<AuditLog | null>;

  /**
   * Find audit logs by entity
   */
  findByEntity(entityType: string, entityId: string): Promise<AuditLog[]>;

  /**
   * Find audit logs by user
   */
  findByUser(userId: string, limit?: number): Promise<AuditLog[]>;

  /**
   * Find audit logs by action
   */
  findByAction(action: AuditAction, limit?: number): Promise<AuditLog[]>;

  /**
   * Find audit logs for a fiscal year
   */
  findByYear(fiscalYear: number): Promise<AuditLog[]>;

  /**
   * Find recent audit logs
   */
  findRecent(limit: number): Promise<AuditLog[]>;

  /**
   * Find audit logs with filter
   */
  findByFilter(filter: AuditLogFilter): Promise<AuditLog[]>;

  /**
   * Save an audit log
   */
  save(auditLog: AuditLog): Promise<void>;

  /**
   * Count audit logs by filter
   */
  count(filter?: AuditLogFilter): Promise<number>;
}

/**
 * Repository interface for TaxSummary
 */
export interface ITaxSummaryRepository {
  /**
   * Find tax summary by ID
   */
  findById(id: string): Promise<TaxSummary | null>;

  /**
   * Find tax summary by period and type
   */
  findByPeriodAndType(
    fiscalYear: number,
    fiscalMonth: number,
    taxType: TaxType
  ): Promise<TaxSummary | null>;

  /**
   * Find all tax summaries for a period
   */
  findByPeriod(fiscalYear: number, fiscalMonth: number): Promise<TaxSummary[]>;

  /**
   * Find all tax summaries for a year
   */
  findByYear(fiscalYear: number): Promise<TaxSummary[]>;

  /**
   * Save a tax summary
   */
  save(taxSummary: TaxSummary): Promise<void>;
}

/**
 * Repository interface for ArchivedData
 */
export interface IArchivedDataRepository {
  /**
   * Find archived data by ID
   */
  findById(id: string): Promise<ArchivedData | null>;

  /**
   * Find archived data by type and year
   */
  findByTypeAndYear(archiveType: ArchiveType, fiscalYear: number): Promise<ArchivedData | null>;

  /**
   * Find all archived data
   */
  findAll(): Promise<ArchivedData[]>;

  /**
   * Find archived data by type
   */
  findByType(archiveType: ArchiveType): Promise<ArchivedData[]>;

  /**
   * Save archived data record
   */
  save(archivedData: ArchivedData): Promise<void>;
}
