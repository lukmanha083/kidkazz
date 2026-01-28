import { z } from 'zod';

/**
 * Audit action enum for validation
 */
export const AuditActionSchema = z.enum([
  'CREATE',
  'UPDATE',
  'DELETE',
  'VOID',
  'APPROVE',
  'POST',
  'CLOSE',
  'REOPEN',
]);

/**
 * Tax type enum for validation
 */
export const TaxTypeSchema = z.enum(['PPN', 'PPH21', 'PPH23', 'PPH4_2']);

/**
 * Archive type enum for validation
 */
export const ArchiveTypeSchema = z.enum(['journal_entries', 'audit_logs']);

/**
 * Query audit logs request
 */
export const QueryAuditLogsSchema = z.object({
  userId: z.string().optional(),
  action: AuditActionSchema.optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().min(1).max(1000).default(100),
  offset: z.coerce.number().min(0).default(0),
});

export type QueryAuditLogsRequest = z.infer<typeof QueryAuditLogsSchema>;

/**
 * Get entity audit history request
 */
export const GetEntityHistorySchema = z.object({
  entityType: z.string(),
  entityId: z.string(),
});

export type GetEntityHistoryRequest = z.infer<typeof GetEntityHistorySchema>;

/**
 * Calculate tax summary request
 */
export const CalculateTaxSummarySchema = z.object({
  fiscalYear: z.coerce.number().min(2000).max(2100),
  fiscalMonth: z.coerce.number().min(1).max(12),
});

export type CalculateTaxSummaryRequest = z.infer<typeof CalculateTaxSummarySchema>;

/**
 * Get tax summary report request
 */
export const GetTaxSummarySchema = z.object({
  fiscalYear: z.coerce.number().min(2000).max(2100),
  fiscalMonth: z.coerce.number().min(1).max(12).optional(),
});

export type GetTaxSummaryRequest = z.infer<typeof GetTaxSummarySchema>;

/**
 * Archive data request
 */
export const ArchiveDataSchema = z.object({
  archiveType: ArchiveTypeSchema,
  fiscalYear: z.coerce.number().min(2000).max(2100),
});

export type ArchiveDataRequest = z.infer<typeof ArchiveDataSchema>;

/**
 * Audit log response DTO
 */
export interface AuditLogResponse {
  id: string;
  timestamp: string;
  userId: string;
  userName: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  changedFields: string[];
  ipAddress: string | null;
  metadata: Record<string, unknown> | null;
  summary: string;
}

/**
 * Tax summary response DTO
 */
export interface TaxSummaryResponse {
  id: string;
  fiscalYear: number;
  fiscalMonth: number;
  taxType: string;
  taxTypeDescription: string;
  grossAmount: number;
  taxAmount: number;
  netAmount: number;
  transactionCount: number;
  effectiveRate: number;
  calculatedAt: string;
}

/**
 * Period tax report response DTO
 */
export interface PeriodTaxReportResponse {
  fiscalYear: number;
  fiscalMonth: number;
  summaries: TaxSummaryResponse[];
  totalGross: number;
  totalTax: number;
  totalNet: number;
  totalTransactions: number;
}

/**
 * Archive status response DTO
 */
export interface ArchiveStatusResponse {
  archives: {
    id: string;
    archiveType: string;
    fiscalYear: number;
    recordCount: number;
    archivedAt: string;
    archivedBy: string;
    checksum: string;
    isStored: boolean;
  }[];
  eligible: {
    journalEntries: number[];
    auditLogs: number[];
  };
}

/**
 * Archive result response DTO
 */
export interface ArchiveResultResponse {
  archiveType: string;
  fiscalYear: number;
  recordCount: number;
  success: boolean;
  archiveId?: string;
  error?: string;
}
