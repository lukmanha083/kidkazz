import { z } from 'zod';

/**
 * Trial Balance Query Schema
 */
export const trialBalanceQuerySchema = z.object({
  fiscalYear: z
    .string()
    .transform((v) => Number.parseInt(v, 10))
    .pipe(z.number().int().min(2020).max(2100)),
  fiscalMonth: z
    .string()
    .transform((v) => Number.parseInt(v, 10))
    .pipe(z.number().int().min(1).max(12)),
});

export type TrialBalanceQueryParams = z.infer<typeof trialBalanceQuerySchema>;

/**
 * Income Statement Query Schema
 */
export const incomeStatementQuerySchema = z.object({
  fiscalYear: z
    .string()
    .transform((v) => Number.parseInt(v, 10))
    .pipe(z.number().int().min(2020).max(2100)),
  fiscalMonth: z
    .string()
    .transform((v) => Number.parseInt(v, 10))
    .pipe(z.number().int().min(1).max(12)),
});

export type IncomeStatementQueryParams = z.infer<typeof incomeStatementQuerySchema>;

/**
 * Balance Sheet Query Schema
 */
export const balanceSheetQuerySchema = z.object({
  asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
});

export type BalanceSheetQueryParams = z.infer<typeof balanceSheetQuerySchema>;

/**
 * Close Checklist Query Schema
 */
export const closeChecklistQuerySchema = z.object({
  fiscalYear: z
    .string()
    .transform((v) => Number.parseInt(v, 10))
    .pipe(z.number().int().min(2020).max(2100)),
  fiscalMonth: z
    .string()
    .transform((v) => Number.parseInt(v, 10))
    .pipe(z.number().int().min(1).max(12)),
});

export type CloseChecklistQueryParams = z.infer<typeof closeChecklistQuerySchema>;

// ============================================================================
// Response DTOs
// ============================================================================

/**
 * Trial Balance Account DTO
 */
export interface TrialBalanceAccountDto {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  debitBalance: number;
  creditBalance: number;
}

/**
 * Trial Balance Response DTO
 */
export interface TrialBalanceResponseDto {
  fiscalYear: number;
  fiscalMonth: number;
  periodString: string;
  periodStatus: string | null;
  asOfDate: string;
  accounts: TrialBalanceAccountDto[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  difference: number;
}

/**
 * Account Balance Item DTO
 */
export interface AccountBalanceItemDto {
  accountId: string;
  accountCode: string;
  accountName: string;
  balance: number;
}

/**
 * Income Statement Response DTO
 */
export interface IncomeStatementResponseDto {
  fiscalYear: number;
  fiscalMonth: number;
  periodDescription: string;
  periodStart: string;
  periodEnd: string;

  revenue: {
    accounts: AccountBalanceItemDto[];
    total: number;
  };

  cogs: {
    accounts: AccountBalanceItemDto[];
    total: number;
  };

  grossProfit: number;
  grossProfitMargin: number;

  operatingExpenses: {
    accounts: AccountBalanceItemDto[];
    total: number;
  };

  operatingIncome: number;
  operatingMargin: number;

  otherIncomeExpenses: {
    accounts: (AccountBalanceItemDto & { isIncome: boolean })[];
    totalIncome: number;
    totalExpense: number;
    netAmount: number;
  };

  netIncome: number;
  netProfitMargin: number;
  isProfit: boolean;
}

/**
 * Balance Sheet Response DTO
 */
export interface BalanceSheetResponseDto {
  asOfDate: string;
  asOfDateString: string;

  assets: {
    currentAssets: {
      accounts: AccountBalanceItemDto[];
      total: number;
    };
    fixedAssets: {
      accounts: AccountBalanceItemDto[];
      total: number;
    };
    otherAssets: {
      accounts: AccountBalanceItemDto[];
      total: number;
    };
    totalCurrentAssets: number;
    totalFixedAssets: number;
    totalOtherAssets: number;
    totalAssets: number;
  };

  liabilities: {
    currentLiabilities: {
      accounts: AccountBalanceItemDto[];
      total: number;
    };
    longTermLiabilities: {
      accounts: AccountBalanceItemDto[];
      total: number;
    };
    totalCurrentLiabilities: number;
    totalLongTermLiabilities: number;
    totalLiabilities: number;
  };

  equity: {
    accounts: AccountBalanceItemDto[];
    accountsTotal: number;
    retainedEarnings: number;
    currentYearNetIncome: number;
    totalEquity: number;
  };

  isBalanced: boolean;
  difference: number;
}

/**
 * Close Checklist Response DTO
 */
export interface CloseChecklistResponseDto {
  fiscalYear: number;
  fiscalMonth: number;
  periodString: string;
  checks: {
    previousPeriodClosed: boolean;
    noDraftEntries: boolean;
    draftEntriesCount: number;
    trialBalanceBalanced: boolean;
    trialBalanceDifference: number;
  };
  canClose: boolean;
  blockers: string[];
}
