import { CashFlowActivityType } from '@/domain/value-objects';

/**
 * Input for cash flow calculation
 */
export interface CashFlowInput {
  fiscalYear: number;
  fiscalMonth: number;
  // Income Statement
  netIncome: number;
  // Non-cash adjustments
  depreciation?: number;
  amortization?: number;
  gainOnAssetDisposal?: number;
  lossOnAssetDisposal?: number;
  // Working capital changes (positive = source, negative = use)
  accountsReceivableChange?: number;
  inventoryChange?: number;
  prepaidExpenseChange?: number;
  accountsPayableChange?: number;
  accruedLiabilitiesChange?: number;
  // Investing activities
  capitalExpenditures?: number;
  proceedsFromAssetSales?: number;
  investmentPurchases?: number;
  investmentSales?: number;
  // Financing activities
  newLoans?: number;
  loanRepayments?: number;
  dividendsPaid?: number;
  capitalInjections?: number;
  shareRepurchases?: number;
  // Beginning cash balance
  beginningCash: number;
}

/**
 * Working capital changes section
 */
export interface WorkingCapitalChanges {
  accountsReceivable: number;
  inventory: number;
  prepaidExpenses: number;
  accountsPayable: number;
  accruedLiabilities: number;
}

/**
 * Operating activities section
 */
export interface OperatingActivities {
  netIncome: number;
  depreciation: number;
  amortization: number;
  gainLossOnDisposal: number;
  workingCapitalChanges: WorkingCapitalChanges;
  netCashFromOperating: number;
}

/**
 * Investing activities section
 */
export interface InvestingActivities {
  capitalExpenditures: number;
  proceedsFromAssetSales: number;
  investmentPurchases?: number;
  investmentSales?: number;
  netCashFromInvesting: number;
}

/**
 * Financing activities section
 */
export interface FinancingActivities {
  newLoans: number;
  loanRepayments: number;
  dividendsPaid: number;
  capitalInjections: number;
  shareRepurchases?: number;
  netCashFromFinancing: number;
}

/**
 * Complete cash flow statement
 */
export interface CashFlowStatement {
  fiscalYear: number;
  fiscalMonth: number;
  operatingActivities: OperatingActivities;
  investingActivities: InvestingActivities;
  financingActivities: FinancingActivities;
  netChangeInCash: number;
  beginningCash: number;
  endingCash: number;
}

/**
 * Reconciliation validation result (Rule 34)
 */
export interface ReconciliationValidation {
  isValid: boolean;
  difference: number;
  calculatedEndingCash: number;
  actualEndingCash: number;
}

/**
 * Transaction classification input
 */
export interface TransactionClassificationInput {
  accountCode: string;
  transactionType: 'collection' | 'payment' | 'purchase' | 'sale' | 'proceeds' | 'repayment' | 'dividend' | 'other';
  description?: string;
}

/**
 * CashFlowCalculationService
 * Implements PSAK 2 Indirect Method for Cash Flow Statement (Rule 28)
 */
export class CashFlowCalculationService {
  /**
   * Calculate cash flow statement using indirect method (Rule 28)
   */
  calculateIndirectMethod(input: CashFlowInput): CashFlowStatement {
    // Calculate Operating Activities
    const operatingActivities = this.calculateOperatingActivities(input);

    // Calculate Investing Activities
    const investingActivities = this.calculateInvestingActivities(input);

    // Calculate Financing Activities
    const financingActivities = this.calculateFinancingActivities(input);

    // Calculate totals
    const netChangeInCash =
      operatingActivities.netCashFromOperating +
      investingActivities.netCashFromInvesting +
      financingActivities.netCashFromFinancing;

    const endingCash = input.beginningCash + netChangeInCash;

    return {
      fiscalYear: input.fiscalYear,
      fiscalMonth: input.fiscalMonth,
      operatingActivities,
      investingActivities,
      financingActivities,
      netChangeInCash,
      beginningCash: input.beginningCash,
      endingCash,
    };
  }

  /**
   * Calculate operating activities section
   */
  private calculateOperatingActivities(input: CashFlowInput): OperatingActivities {
    const depreciation = input.depreciation ?? 0;
    const amortization = input.amortization ?? 0;
    // Gain on disposal is already negative (subtracted), loss is positive (added)
    const gainOnDisposal = input.gainOnAssetDisposal ?? 0;
    const lossOnDisposal = input.lossOnAssetDisposal ?? 0;
    const gainLossOnDisposal = gainOnDisposal + lossOnDisposal;

    const workingCapitalChanges: WorkingCapitalChanges = {
      accountsReceivable: input.accountsReceivableChange ?? 0,
      inventory: input.inventoryChange ?? 0,
      prepaidExpenses: input.prepaidExpenseChange ?? 0,
      accountsPayable: input.accountsPayableChange ?? 0,
      accruedLiabilities: input.accruedLiabilitiesChange ?? 0,
    };

    const totalWorkingCapitalChange =
      workingCapitalChanges.accountsReceivable +
      workingCapitalChanges.inventory +
      workingCapitalChanges.prepaidExpenses +
      workingCapitalChanges.accountsPayable +
      workingCapitalChanges.accruedLiabilities;

    const netCashFromOperating =
      input.netIncome +
      depreciation +
      amortization +
      gainLossOnDisposal +
      totalWorkingCapitalChange;

    return {
      netIncome: input.netIncome,
      depreciation,
      amortization,
      gainLossOnDisposal,
      workingCapitalChanges,
      netCashFromOperating,
    };
  }

  /**
   * Calculate investing activities section
   */
  private calculateInvestingActivities(input: CashFlowInput): InvestingActivities {
    const capitalExpenditures = input.capitalExpenditures ?? 0;
    const proceedsFromAssetSales = input.proceedsFromAssetSales ?? 0;
    const investmentPurchases = input.investmentPurchases ?? 0;
    const investmentSales = input.investmentSales ?? 0;

    const netCashFromInvesting =
      capitalExpenditures + // Already negative
      proceedsFromAssetSales +
      investmentPurchases + // Already negative
      investmentSales;

    return {
      capitalExpenditures,
      proceedsFromAssetSales,
      investmentPurchases,
      investmentSales,
      netCashFromInvesting,
    };
  }

  /**
   * Calculate financing activities section
   */
  private calculateFinancingActivities(input: CashFlowInput): FinancingActivities {
    const newLoans = input.newLoans ?? 0;
    const loanRepayments = input.loanRepayments ?? 0;
    const dividendsPaid = input.dividendsPaid ?? 0;
    const capitalInjections = input.capitalInjections ?? 0;
    const shareRepurchases = input.shareRepurchases ?? 0;

    const netCashFromFinancing =
      newLoans +
      loanRepayments + // Already negative
      dividendsPaid + // Already negative
      capitalInjections +
      shareRepurchases; // Already negative

    return {
      newLoans,
      loanRepayments,
      dividendsPaid,
      capitalInjections,
      shareRepurchases,
      netCashFromFinancing,
    };
  }

  /**
   * Validate cash flow reconciliation (Rule 34)
   * Net Change in Cash must equal actual cash account change
   */
  validateReconciliation(
    statement: CashFlowStatement,
    actualEndingCash: number
  ): ReconciliationValidation {
    const difference = Math.abs(statement.endingCash - actualEndingCash);
    const isValid = difference < 0.01; // Allow for floating point precision

    return {
      isValid,
      difference,
      calculatedEndingCash: statement.endingCash,
      actualEndingCash,
    };
  }

  /**
   * Classify a transaction into cash flow activity type (Rules 29-33)
   */
  classifyTransaction(input: TransactionClassificationInput): CashFlowActivityType {
    const { accountCode, transactionType } = input;
    const codePrefix = accountCode.substring(0, 2);

    // Operating Activities (Rule 29, 30)
    // - Current assets (11xx - AR, Inventory, Prepaid)
    // - Current liabilities (21xx - AP, Accrued)
    // - Revenue and expense related
    if (['11', '21'].includes(codePrefix)) {
      if (['collection', 'payment'].includes(transactionType)) {
        return CashFlowActivityType.OPERATING;
      }
    }

    // Investing Activities (Rule 31, 32)
    // - Fixed assets (15xx)
    // - Investments (16xx)
    if (['15', '16'].includes(codePrefix)) {
      if (['purchase', 'sale'].includes(transactionType)) {
        return CashFlowActivityType.INVESTING;
      }
    }

    // Financing Activities (Rule 33)
    // - Long-term debt (23xx)
    // - Equity (31xx, 32xx)
    if (['23', '31', '32'].includes(codePrefix)) {
      if (['proceeds', 'repayment', 'dividend'].includes(transactionType)) {
        return CashFlowActivityType.FINANCING;
      }
    }

    // Default to operating for unclassified transactions
    return CashFlowActivityType.OPERATING;
  }
}
