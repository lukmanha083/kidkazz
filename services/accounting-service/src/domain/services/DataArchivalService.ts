import { ArchivedData, type ArchiveType } from '@/domain/entities/archived-data.entity';
import type { JournalEntry } from '@/domain/entities/journal-entry.entity';
import type { IArchivedDataRepository } from '@/domain/repositories/audit.repository';
import type { IJournalEntryRepository } from '@/domain/repositories/journal-entry.repository';
import type { IAuditLogRepository } from '@/domain/repositories/audit.repository';
import { FiscalPeriod } from '@/domain/value-objects';

/**
 * Retention policy configuration
 */
export interface RetentionPolicy {
  journal_entries: number; // Years to retain journal entries
  audit_logs: number; // Years to retain audit logs
}

/**
 * Default Indonesian accounting retention policy
 * Based on PSAK and tax regulations (10 years for tax records)
 */
export const DEFAULT_RETENTION_POLICY: RetentionPolicy = {
  journal_entries: 10, // 10 years for tax compliance
  audit_logs: 5, // 5 years for audit trails
};

/**
 * Archive result
 */
export interface ArchiveResult {
  archiveType: ArchiveType;
  fiscalYear: number;
  recordCount: number;
  success: boolean;
  archiveId?: string;
  error?: string;
}

/**
 * DataArchivalService
 * Domain service for data retention and archival
 */
export class DataArchivalService {
  constructor(
    private readonly archivedDataRepository: IArchivedDataRepository,
    private readonly journalEntryRepository: IJournalEntryRepository,
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly retentionPolicy: RetentionPolicy = DEFAULT_RETENTION_POLICY
  ) {}

  /**
   * Get data eligible for archival based on retention policy
   */
  getArchivableYears(): { journalEntries: number[]; auditLogs: number[] } {
    const currentYear = new Date().getFullYear();

    // Calculate cutoff years based on retention policy
    const journalCutoffYear = currentYear - this.retentionPolicy.journal_entries;
    const auditCutoffYear = currentYear - this.retentionPolicy.audit_logs;

    // Generate list of years that can be archived
    const journalEntries: number[] = [];
    const auditLogs: number[] = [];

    // Look back 20 years for potential archivable data
    for (let year = currentYear - 20; year <= journalCutoffYear; year++) {
      journalEntries.push(year);
    }

    for (let year = currentYear - 20; year <= auditCutoffYear; year++) {
      auditLogs.push(year);
    }

    return { journalEntries, auditLogs };
  }

  /**
   * Archive journal entries for a fiscal year
   */
  async archiveJournalEntries(fiscalYear: number, archivedBy: string): Promise<ArchiveResult> {
    try {
      // Check if already archived
      const existing = await this.archivedDataRepository.findByTypeAndYear('journal_entries', fiscalYear);
      if (existing) {
        return {
          archiveType: 'journal_entries',
          fiscalYear,
          recordCount: existing.recordCount,
          success: false,
          error: 'Data already archived',
        };
      }

      // Check retention policy
      if (!this.canArchive('journal_entries', fiscalYear)) {
        return {
          archiveType: 'journal_entries',
          fiscalYear,
          recordCount: 0,
          success: false,
          error: `Cannot archive: fiscal year ${fiscalYear} is within retention period`,
        };
      }

      // Get journal entries for all months in the year
      const allEntries: JournalEntry[] = [];
      for (let month = 1; month <= 12; month++) {
        const fiscalPeriod = FiscalPeriod.create(fiscalYear, month);
        const entries = await this.journalEntryRepository.findByFiscalPeriod(fiscalPeriod);
        allEntries.push(...entries);
      }

      if (allEntries.length === 0) {
        return {
          archiveType: 'journal_entries',
          fiscalYear,
          recordCount: 0,
          success: false,
          error: 'No entries found for the specified year',
        };
      }

      // Serialize data for archival
      const data = JSON.stringify(allEntries.map((e: JournalEntry) => ({
        id: e.id,
        entryNumber: e.entryNumber,
        entryDate: e.entryDate.toISOString(),
        description: e.description,
        status: e.status,
        lines: e.lines,
      })));

      // Calculate checksum
      const checksum = await ArchivedData.calculateChecksum(data);

      // Create archive record
      const archivedData = ArchivedData.create({
        archiveType: 'journal_entries',
        fiscalYear,
        recordCount: allEntries.length,
        archivedBy,
        checksum,
      });

      await this.archivedDataRepository.save(archivedData);

      return {
        archiveType: 'journal_entries',
        fiscalYear,
        recordCount: allEntries.length,
        success: true,
        archiveId: archivedData.id,
      };
    } catch (error) {
      return {
        archiveType: 'journal_entries',
        fiscalYear,
        recordCount: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Archive audit logs for a fiscal year
   */
  async archiveAuditLogs(fiscalYear: number, archivedBy: string): Promise<ArchiveResult> {
    try {
      // Check if already archived
      const existing = await this.archivedDataRepository.findByTypeAndYear('audit_logs', fiscalYear);
      if (existing) {
        return {
          archiveType: 'audit_logs',
          fiscalYear,
          recordCount: existing.recordCount,
          success: false,
          error: 'Data already archived',
        };
      }

      // Check retention policy
      if (!this.canArchive('audit_logs', fiscalYear)) {
        return {
          archiveType: 'audit_logs',
          fiscalYear,
          recordCount: 0,
          success: false,
          error: `Cannot archive: fiscal year ${fiscalYear} is within retention period`,
        };
      }

      // Get audit logs for the year
      const logs = await this.auditLogRepository.findByYear(fiscalYear);

      if (logs.length === 0) {
        return {
          archiveType: 'audit_logs',
          fiscalYear,
          recordCount: 0,
          success: false,
          error: 'No audit logs found for the specified year',
        };
      }

      // Serialize data for archival
      const data = JSON.stringify(logs.map((log) => ({
        id: log.id,
        timestamp: log.timestamp.toISOString(),
        userId: log.userId,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        oldValues: log.oldValues,
        newValues: log.newValues,
      })));

      // Calculate checksum
      const checksum = await ArchivedData.calculateChecksum(data);

      // Create archive record
      const archivedData = ArchivedData.create({
        archiveType: 'audit_logs',
        fiscalYear,
        recordCount: logs.length,
        archivedBy,
        checksum,
      });

      await this.archivedDataRepository.save(archivedData);

      return {
        archiveType: 'audit_logs',
        fiscalYear,
        recordCount: logs.length,
        success: true,
        archiveId: archivedData.id,
      };
    } catch (error) {
      return {
        archiveType: 'audit_logs',
        fiscalYear,
        recordCount: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check if data can be archived based on retention policy
   */
  canArchive(archiveType: ArchiveType, fiscalYear: number): boolean {
    const currentYear = new Date().getFullYear();
    const retentionYears = this.retentionPolicy[archiveType];
    const cutoffYear = currentYear - retentionYears;
    return fiscalYear <= cutoffYear;
  }

  /**
   * Get archive status for all years
   */
  async getArchiveStatus(): Promise<{
    archives: ArchivedData[];
    eligible: { journalEntries: number[]; auditLogs: number[] };
  }> {
    const archives = await this.archivedDataRepository.findAll();
    const eligible = this.getArchivableYears();

    return { archives, eligible };
  }

  /**
   * Verify archive integrity
   */
  async verifyArchiveIntegrity(archiveId: string, data: string): Promise<boolean> {
    const archive = await this.archivedDataRepository.findById(archiveId);
    if (!archive) return false;
    return archive.verifyIntegrity(data);
  }
}
