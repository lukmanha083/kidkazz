import { FiscalPeriod } from '@/domain/value-objects';
import {
  CashFlowCalculationService,
  type CashFlowStatement,
  type CashFlowInput,
} from '@/domain/services';

// ============================================================================
// Types
// ============================================================================

/**
 * Dependencies for cash flow statement calculation
 */
export interface CashFlowStatementDependencies {
  /**
   * Get net income for the period from income statement
   */
  getNetIncome(year: number, month: number): Promise<number>;

  /**
   * Get depreciation expense for the period
   */
  getDepreciationExpense(year: number, month: number): Promise<number>;

  /**
   * Get amortization expense for the period
   */
  getAmortizationExpense(year: number, month: number): Promise<number>;

  /**
   * Get gain/loss on asset disposal for the period
   */
  getGainLossOnDisposal(year: number, month: number): Promise<{ gain: number; loss: number }>;

  /**
   * Get working capital changes for the period
   */
  getWorkingCapitalChanges(year: number, month: number): Promise<WorkingCapitalData>;

  /**
   * Get investing activities for the period
   */
  getInvestingActivities(year: number, month: number): Promise<InvestingActivityData>;

  /**
   * Get financing activities for the period
   */
  getFinancingActivities(year: number, month: number): Promise<FinancingActivityData>;

  /**
   * Get cash balance at beginning of year
   */
  getBeginningCashBalance(year: number): Promise<number>;

  /**
   * Get actual cash balance at end of period (for reconciliation)
   */
  getActualCashBalance(year: number, month: number): Promise<number>;
}

export interface WorkingCapitalData {
  accountsReceivableChange: number;
  inventoryChange: number;
  prepaidExpenseChange: number;
  accountsPayableChange: number;
  accruedLiabilitiesChange: number;
}

export interface InvestingActivityData {
  capitalExpenditures: number;
  proceedsFromAssetSales: number;
}

export interface FinancingActivityData {
  newLoans: number;
  loanRepayments: number;
  dividendsPaid: number;
  capitalInjections: number;
}

// ============================================================================
// Query and Result Types
// ============================================================================

export interface GetCashFlowStatementQuery {
  fiscalYear: number;
  fiscalMonth: number;
}

export interface CashFlowStatementResult extends CashFlowStatement {
  periodDescription: string;
  periodStart: Date;
  periodEnd: Date;
  // Reconciliation check (Rule 34)
  reconciliation: {
    isReconciled: boolean;
    calculatedEndingCash: number;
    actualEndingCash: number;
    difference: number;
  };
}

// ============================================================================
// Handler
// ============================================================================

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export class GetCashFlowStatementHandler {
  private readonly calculationService: CashFlowCalculationService;

  constructor(private readonly deps: CashFlowStatementDependencies) {
    this.calculationService = new CashFlowCalculationService();
  }

  async execute(query: GetCashFlowStatementQuery): Promise<CashFlowStatementResult> {
    const { fiscalYear, fiscalMonth } = query;

    // Gather all input data in parallel
    const [
      netIncome,
      depreciation,
      amortization,
      gainLoss,
      workingCapital,
      investing,
      financing,
      beginningCash,
      actualEndingCash,
    ] = await Promise.all([
      this.deps.getNetIncome(fiscalYear, fiscalMonth),
      this.deps.getDepreciationExpense(fiscalYear, fiscalMonth),
      this.deps.getAmortizationExpense(fiscalYear, fiscalMonth),
      this.deps.getGainLossOnDisposal(fiscalYear, fiscalMonth),
      this.deps.getWorkingCapitalChanges(fiscalYear, fiscalMonth),
      this.deps.getInvestingActivities(fiscalYear, fiscalMonth),
      this.deps.getFinancingActivities(fiscalYear, fiscalMonth),
      this.deps.getBeginningCashBalance(fiscalYear),
      this.deps.getActualCashBalance(fiscalYear, fiscalMonth),
    ]);

    // Build input for calculation service
    // Normalize signs: outflows are negative, inflows are positive
    const input: CashFlowInput = {
      fiscalYear,
      fiscalMonth,
      netIncome,
      depreciation: Math.abs(depreciation), // Non-cash add-back (positive)
      amortization: Math.abs(amortization), // Non-cash add-back (positive)
      gainOnAssetDisposal: -Math.abs(gainLoss.gain), // Gain is subtracted (shown negative)
      lossOnAssetDisposal: Math.abs(gainLoss.loss), // Loss is added back (positive)
      accountsReceivableChange: workingCapital.accountsReceivableChange,
      inventoryChange: workingCapital.inventoryChange,
      prepaidExpenseChange: workingCapital.prepaidExpenseChange,
      accountsPayableChange: workingCapital.accountsPayableChange,
      accruedLiabilitiesChange: workingCapital.accruedLiabilitiesChange,
      // Investing activities: outflows are negative
      capitalExpenditures: -Math.abs(investing.capitalExpenditures), // Cash outflow (negative)
      proceedsFromAssetSales: Math.abs(investing.proceedsFromAssetSales), // Cash inflow (positive)
      // Financing activities: outflows are negative
      newLoans: Math.abs(financing.newLoans), // Cash inflow (positive)
      loanRepayments: -Math.abs(financing.loanRepayments), // Cash outflow (negative)
      dividendsPaid: -Math.abs(financing.dividendsPaid), // Cash outflow (negative)
      capitalInjections: Math.abs(financing.capitalInjections), // Cash inflow (positive)
      beginningCash,
    };

    // Calculate cash flow statement
    const statement = this.calculationService.calculateIndirectMethod(input);

    // Validate reconciliation (Rule 34)
    const reconciliation = this.calculationService.validateReconciliation(
      statement,
      actualEndingCash
    );

    // Build period description
    const periodDescription = fiscalMonth === 1
      ? `${MONTH_NAMES[0]} ${fiscalYear}`
      : `${MONTH_NAMES[0]} - ${MONTH_NAMES[fiscalMonth - 1]} ${fiscalYear}`;

    // Calculate period dates
    const periodStart = new Date(fiscalYear, 0, 1); // January 1
    const periodEnd = FiscalPeriod.create(fiscalYear, fiscalMonth).getEndDate();

    return {
      ...statement,
      periodDescription,
      periodStart,
      periodEnd,
      reconciliation: {
        isReconciled: reconciliation.isValid,
        calculatedEndingCash: reconciliation.calculatedEndingCash,
        actualEndingCash: reconciliation.actualEndingCash,
        difference: reconciliation.difference,
      },
    };
  }
}
