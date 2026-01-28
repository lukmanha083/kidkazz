import { z } from 'zod';
import {
  BankAccountType,
  BankAccountStatus,
  ReconciliationItemType,
} from '@/domain/value-objects';

// ============================================================================
// Bank Account DTOs
// ============================================================================

/**
 * Create Bank Account Request Schema
 */
export const createBankAccountSchema = z.object({
  accountId: z.string().min(1),
  bankName: z.string().min(1).max(255),
  accountNumber: z.string().min(1).max(50),
  accountType: z.nativeEnum(BankAccountType),
  currency: z.string().length(3).default('IDR'),
});

export type CreateBankAccountRequest = z.infer<typeof createBankAccountSchema>;

/**
 * Update Bank Account Request Schema
 */
export const updateBankAccountSchema = z.object({
  bankName: z.string().min(1).max(255).optional(),
  accountNumber: z.string().min(1).max(50).optional(),
  accountType: z.nativeEnum(BankAccountType).optional(),
  currency: z.string().length(3).optional(),
});

export type UpdateBankAccountRequest = z.infer<typeof updateBankAccountSchema>;

/**
 * List Bank Accounts Query Schema
 */
export const listBankAccountsQuerySchema = z.object({
  status: z.nativeEnum(BankAccountStatus).optional(),
  accountType: z.nativeEnum(BankAccountType).optional(),
  includeInactive: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
});

export type ListBankAccountsQueryParams = z.infer<typeof listBankAccountsQuerySchema>;

// ============================================================================
// Bank Statement Import DTOs
// ============================================================================

/**
 * Bank Statement Transaction Entry Schema
 */
export const bankStatementTransactionSchema = z.object({
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  valueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  description: z.string().min(1).max(500),
  reference: z.string().max(100).optional(),
  amount: z.number(),
  checkNumber: z.string().max(50).optional(),
});

export type BankStatementTransactionEntry = z.infer<typeof bankStatementTransactionSchema>;

/**
 * Import Bank Statement Request Schema
 */
export const importBankStatementSchema = z.object({
  bankAccountId: z.string().min(1),
  statementDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  openingBalance: z.number(),
  closingBalance: z.number(),
  transactions: z.array(bankStatementTransactionSchema),
});

export type ImportBankStatementRequest = z.infer<typeof importBankStatementSchema>;

// ============================================================================
// Bank Reconciliation DTOs
// ============================================================================

/**
 * Create Reconciliation Request Schema
 */
export const createReconciliationSchema = z.object({
  bankAccountId: z.string().min(1),
  fiscalYear: z.number().int().min(2020).max(2100),
  fiscalMonth: z.number().int().min(1).max(12),
  statementBalance: z.number(),
  statementDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type CreateReconciliationRequest = z.infer<typeof createReconciliationSchema>;

/**
 * Match Transaction Request Schema
 */
export const matchTransactionSchema = z.object({
  bankTransactionId: z.string().min(1),
  journalLineId: z.string().min(1),
});

export type MatchTransactionRequest = z.infer<typeof matchTransactionSchema>;

/**
 * Auto-Match Transactions Request Schema
 */
export const autoMatchTransactionsSchema = z.object({
  dateTolerance: z.number().int().min(0).max(7).default(3),
});

export type AutoMatchTransactionsRequest = z.infer<typeof autoMatchTransactionsSchema>;

/**
 * Add Reconciling Item Request Schema
 */
export const addReconcilingItemSchema = z.object({
  type: z.nativeEnum(ReconciliationItemType),
  description: z.string().min(1).max(500),
  amount: z.number(),
  referenceNumber: z.string().max(100).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type AddReconcilingItemRequest = z.infer<typeof addReconcilingItemSchema>;

/**
 * Complete Reconciliation Request Schema
 */
export const completeReconciliationSchema = z.object({
  completedBy: z.string().min(1),
});

export type CompleteReconciliationRequest = z.infer<typeof completeReconciliationSchema>;

/**
 * Approve Reconciliation Request Schema
 */
export const approveReconciliationSchema = z.object({
  approvedBy: z.string().min(1),
});

export type ApproveReconciliationRequest = z.infer<typeof approveReconciliationSchema>;

// ============================================================================
// Cash Threshold DTOs
// ============================================================================

/**
 * Update Cash Threshold Config Request Schema
 */
export const updateCashThresholdSchema = z.object({
  warningThreshold: z.number().positive(),
  criticalThreshold: z.number().positive(),
  emergencyThreshold: z.number().positive(),
}).refine(
  (data) => data.warningThreshold > data.criticalThreshold,
  { message: 'Warning threshold must be greater than critical threshold' }
).refine(
  (data) => data.criticalThreshold > data.emergencyThreshold,
  { message: 'Critical threshold must be greater than emergency threshold' }
);

export type UpdateCashThresholdRequest = z.infer<typeof updateCashThresholdSchema>;

// ============================================================================
// Cash Report Query DTOs
// ============================================================================

/**
 * Cash Flow Statement Query Schema
 */
export const cashFlowStatementQuerySchema = z.object({
  fiscalYear: z.string().transform((v) => parseInt(v, 10)).pipe(z.number().int().min(2020).max(2100)),
  fiscalMonth: z.string().transform((v) => parseInt(v, 10)).pipe(z.number().int().min(1).max(12)),
});

export type CashFlowStatementQueryParams = z.infer<typeof cashFlowStatementQuerySchema>;

/**
 * Cash Position Query Schema
 */
export const cashPositionQuerySchema = z.object({
  asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  includeThresholdCheck: z.enum(['true', 'false']).transform((v) => v === 'true').default('true'),
});

export type CashPositionQueryParams = z.infer<typeof cashPositionQuerySchema>;

/**
 * Cash Forecast Query Schema
 */
export const cashForecastQuerySchema = z.object({
  weeks: z.string().transform((v) => parseInt(v, 10)).pipe(z.number().int().min(1).max(12)).default('4'),
  includeThresholdAlerts: z.enum(['true', 'false']).transform((v) => v === 'true').default('true'),
});

export type CashForecastQueryParams = z.infer<typeof cashForecastQuerySchema>;
