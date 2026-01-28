import {
  ArchiveDataSchema,
  type ArchiveResultResponse,
  type ArchiveStatusResponse,
  type AuditLogResponse,
  CalculateTaxSummarySchema,
  GetTaxSummarySchema,
  type PeriodTaxReportResponse,
  QueryAuditLogsSchema,
  type TaxSummaryResponse,
} from '@/application/dtos/audit.dto';
import type { AuditLog } from '@/domain/entities/audit-log.entity';
import type { TaxSummary } from '@/domain/entities/tax-summary.entity';
import { AuditService } from '@/domain/services/AuditService';
import { DataArchivalService } from '@/domain/services/DataArchivalService';
import { TaxSummaryService } from '@/domain/services/TaxSummaryService';
import * as schema from '@/infrastructure/db/schema';
import { DrizzleAccountRepository } from '@/infrastructure/repositories/account.repository';
import {
  DrizzleArchivedDataRepository,
  DrizzleAuditLogRepository,
  DrizzleTaxSummaryRepository,
} from '@/infrastructure/repositories/audit.repository';
import { DrizzleJournalEntryRepository } from '@/infrastructure/repositories/journal-entry.repository';
import { zValidator } from '@hono/zod-validator';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
};

type Variables = {
  userId: string;
};

export const auditRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * Map AuditLog entity to response DTO
 */
function mapAuditLogToResponse(log: AuditLog): AuditLogResponse {
  return {
    id: log.id,
    timestamp: log.timestamp.toISOString(),
    userId: log.userId,
    userName: log.userName,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    oldValues: log.oldValues,
    newValues: log.newValues,
    changedFields: log.getChangedFields(),
    ipAddress: log.ipAddress,
    metadata: log.metadata,
    summary: log.summary,
  };
}

/**
 * Map TaxSummary entity to response DTO
 */
function mapTaxSummaryToResponse(summary: TaxSummary): TaxSummaryResponse {
  return {
    id: summary.id,
    fiscalYear: summary.fiscalYear,
    fiscalMonth: summary.fiscalMonth,
    taxType: summary.taxType,
    taxTypeDescription: summary.taxTypeDescription,
    grossAmount: summary.grossAmount,
    taxAmount: summary.taxAmount,
    netAmount: summary.netAmount,
    transactionCount: summary.transactionCount,
    effectiveRate: summary.effectiveRate,
    calculatedAt: summary.calculatedAt.toISOString(),
  };
}

// ==================== AUDIT LOGS ====================

/**
 * GET /audit-logs - Query audit logs
 */
auditRoutes.get('/audit-logs', zValidator('query', QueryAuditLogsSchema), async (c) => {
  const query = c.req.valid('query');
  const db = drizzle(c.env.DB, { schema });
  const auditLogRepository = new DrizzleAuditLogRepository(db);

  const logs = await auditLogRepository.findByFilter({
    ...query,
    startDate: query.startDate ? new Date(query.startDate) : undefined,
    endDate: query.endDate ? new Date(query.endDate) : undefined,
  });

  const count = await auditLogRepository.count({
    userId: query.userId,
    action: query.action,
    entityType: query.entityType,
    entityId: query.entityId,
  });

  return c.json({
    success: true,
    data: logs.map(mapAuditLogToResponse),
    pagination: {
      total: count,
      limit: query.limit,
      offset: query.offset,
    },
  });
});

/**
 * GET /audit-logs/entity/:entityType/:entityId - Get entity audit history
 */
auditRoutes.get('/audit-logs/entity/:entityType/:entityId', async (c) => {
  const entityType = c.req.param('entityType');
  const entityId = c.req.param('entityId');

  const db = drizzle(c.env.DB, { schema });
  const auditLogRepository = new DrizzleAuditLogRepository(db);
  const auditService = new AuditService(auditLogRepository);

  const logs = await auditService.getEntityHistory(entityType, entityId);

  return c.json({
    success: true,
    data: logs.map(mapAuditLogToResponse),
  });
});

/**
 * GET /audit-logs/recent - Get recent audit logs
 */
auditRoutes.get('/audit-logs/recent', async (c) => {
  const limit = Number.parseInt(c.req.query('limit') || '100', 10);
  const db = drizzle(c.env.DB, { schema });
  const auditLogRepository = new DrizzleAuditLogRepository(db);
  const auditService = new AuditService(auditLogRepository);

  const logs = await auditService.getRecentLogs(limit);

  return c.json({
    success: true,
    data: logs.map(mapAuditLogToResponse),
  });
});

// ==================== TAX SUMMARY ====================

/**
 * POST /tax-summary/calculate - Calculate tax summary for a period
 */
auditRoutes.post(
  '/tax-summary/calculate',
  zValidator('json', CalculateTaxSummarySchema),
  async (c) => {
    const body = c.req.valid('json');
    const db = drizzle(c.env.DB, { schema });

    const taxSummaryRepository = new DrizzleTaxSummaryRepository(db);
    const journalEntryRepository = new DrizzleJournalEntryRepository(db);
    const accountRepository = new DrizzleAccountRepository(db);

    const taxSummaryService = new TaxSummaryService(
      taxSummaryRepository,
      journalEntryRepository,
      accountRepository
    );

    const summaries = await taxSummaryService.calculatePeriodTaxSummary(
      body.fiscalYear,
      body.fiscalMonth
    );

    return c.json({
      success: true,
      data: summaries.map(mapTaxSummaryToResponse),
    });
  }
);

/**
 * GET /tax-summary - Get tax summary report
 */
auditRoutes.get('/tax-summary', zValidator('query', GetTaxSummarySchema), async (c) => {
  const query = c.req.valid('query');
  const db = drizzle(c.env.DB, { schema });

  const taxSummaryRepository = new DrizzleTaxSummaryRepository(db);
  const journalEntryRepository = new DrizzleJournalEntryRepository(db);
  const accountRepository = new DrizzleAccountRepository(db);

  const taxSummaryService = new TaxSummaryService(
    taxSummaryRepository,
    journalEntryRepository,
    accountRepository
  );

  if (query.fiscalMonth) {
    // Get specific period
    const report = await taxSummaryService.getPeriodTaxReport(query.fiscalYear, query.fiscalMonth);

    const response: PeriodTaxReportResponse = {
      fiscalYear: report.fiscalYear,
      fiscalMonth: report.fiscalMonth,
      summaries: report.summaries.map(mapTaxSummaryToResponse),
      totalGross: report.totalGross,
      totalTax: report.totalTax,
      totalNet: report.totalNet,
      totalTransactions: report.totalTransactions,
    };

    return c.json({
      success: true,
      data: response,
    });
  } else {
    // Get annual report
    const reports = await taxSummaryService.getAnnualTaxReport(query.fiscalYear);

    const response = reports.map(
      (report): PeriodTaxReportResponse => ({
        fiscalYear: report.fiscalYear,
        fiscalMonth: report.fiscalMonth,
        summaries: report.summaries.map(mapTaxSummaryToResponse),
        totalGross: report.totalGross,
        totalTax: report.totalTax,
        totalNet: report.totalNet,
        totalTransactions: report.totalTransactions,
      })
    );

    return c.json({
      success: true,
      data: response,
    });
  }
});

// ==================== DATA ARCHIVAL ====================

/**
 * GET /archive/status - Get archive status
 */
auditRoutes.get('/archive/status', async (c) => {
  const db = drizzle(c.env.DB, { schema });

  const archivedDataRepository = new DrizzleArchivedDataRepository(db);
  const journalEntryRepository = new DrizzleJournalEntryRepository(db);
  const auditLogRepository = new DrizzleAuditLogRepository(db);

  const archivalService = new DataArchivalService(
    archivedDataRepository,
    journalEntryRepository,
    auditLogRepository
  );

  const status = await archivalService.getArchiveStatus();

  const response: ArchiveStatusResponse = {
    archives: status.archives.map((a) => ({
      id: a.id,
      archiveType: a.archiveType,
      fiscalYear: a.fiscalYear,
      recordCount: a.recordCount,
      archivedAt: a.archivedAt.toISOString(),
      archivedBy: a.archivedBy,
      checksum: a.checksum,
      isStored: a.isStored,
    })),
    eligible: status.eligible,
  };

  return c.json({
    success: true,
    data: response,
  });
});

/**
 * POST /archive/execute - Execute data archival
 */
auditRoutes.post('/archive/execute', zValidator('json', ArchiveDataSchema), async (c) => {
  const body = c.req.valid('json');
  const userId = c.get('userId');
  const db = drizzle(c.env.DB, { schema });

  const archivedDataRepository = new DrizzleArchivedDataRepository(db);
  const journalEntryRepository = new DrizzleJournalEntryRepository(db);
  const auditLogRepository = new DrizzleAuditLogRepository(db);

  const archivalService = new DataArchivalService(
    archivedDataRepository,
    journalEntryRepository,
    auditLogRepository
  );

  let result;
  if (body.archiveType === 'journal_entries') {
    result = await archivalService.archiveJournalEntries(body.fiscalYear, userId);
  } else {
    result = await archivalService.archiveAuditLogs(body.fiscalYear, userId);
  }

  const response: ArchiveResultResponse = {
    archiveType: result.archiveType,
    fiscalYear: result.fiscalYear,
    recordCount: result.recordCount,
    success: result.success,
    archiveId: result.archiveId,
    error: result.error,
  };

  if (!result.success) {
    return c.json(
      {
        success: false,
        error: result.error,
        data: response,
      },
      400
    );
  }

  return c.json({
    success: true,
    data: response,
  });
});
