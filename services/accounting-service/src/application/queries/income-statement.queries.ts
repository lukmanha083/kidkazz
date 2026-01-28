import { FiscalPeriod } from '@/domain/value-objects';

// ============================================================================
// Types
// ============================================================================

export interface AccountBalanceItem {
  accountId: string;
  accountCode: string;
  accountName: string;
  balance: number;
}

export interface OtherIncomeExpenseItem extends AccountBalanceItem {
  isIncome: boolean;
}

/**
 * Dependencies for income statement calculation
 */
export interface IncomeStatementDependencies {
  /**
   * Get revenue accounts with balances for the period
   * (accountType = 'Revenue')
   */
  getRevenueAccounts(year: number, month: number): Promise<AccountBalanceItem[]>;

  /**
   * Get COGS accounts with balances for the period
   * (accountType = 'COGS')
   */
  getCOGSAccounts(year: number, month: number): Promise<AccountBalanceItem[]>;

  /**
   * Get operating expense accounts with balances for the period
   * (accountType = 'Expense')
   */
  getExpenseAccounts(year: number, month: number): Promise<AccountBalanceItem[]>;

  /**
   * Get other income/expense accounts with balances for the period
   * (accountCategory = 'OTHER_INCOME_EXPENSE')
   */
  getOtherIncomeExpenseAccounts(year: number, month: number): Promise<OtherIncomeExpenseItem[]>;
}

// ============================================================================
// Query and Result Types
// ============================================================================

export interface GetIncomeStatementQuery {
  fiscalYear: number;
  fiscalMonth: number;
}

export interface AccountSection {
  accounts: AccountBalanceItem[];
  total: number;
}

export interface OtherIncomeExpenseSection {
  accounts: OtherIncomeExpenseItem[];
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
}

export interface IncomeStatementResult {
  fiscalYear: number;
  fiscalMonth: number;
  periodDescription: string;
  periodStart: Date;
  periodEnd: Date;

  // Revenue Section
  revenue: AccountSection;

  // Cost of Goods Sold Section
  cogs: AccountSection;

  // Gross Profit = Revenue - COGS
  grossProfit: number;
  grossProfitMargin: number;

  // Operating Expenses Section
  operatingExpenses: AccountSection;

  // Operating Income = Gross Profit - Operating Expenses
  operatingIncome: number;
  operatingMargin: number;

  // Other Income/Expenses Section
  otherIncomeExpenses: OtherIncomeExpenseSection;

  // Net Income = Operating Income + Net Other Income/Expenses
  netIncome: number;
  netProfitMargin: number;
  isProfit: boolean;
}

// ============================================================================
// Handler
// ============================================================================

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export class GetIncomeStatementHandler {
  constructor(private readonly deps: IncomeStatementDependencies) {}

  async execute(query: GetIncomeStatementQuery): Promise<IncomeStatementResult> {
    const { fiscalYear, fiscalMonth } = query;

    // Get all account data in parallel
    const [revenueAccounts, cogsAccounts, expenseAccounts, otherAccounts] = await Promise.all([
      this.deps.getRevenueAccounts(fiscalYear, fiscalMonth),
      this.deps.getCOGSAccounts(fiscalYear, fiscalMonth),
      this.deps.getExpenseAccounts(fiscalYear, fiscalMonth),
      this.deps.getOtherIncomeExpenseAccounts(fiscalYear, fiscalMonth),
    ]);

    // Calculate section totals
    const revenueTotal = revenueAccounts.reduce((sum, a) => sum + a.balance, 0);
    const cogsTotal = cogsAccounts.reduce((sum, a) => sum + a.balance, 0);
    const expenseTotal = expenseAccounts.reduce((sum, a) => sum + a.balance, 0);

    // Calculate other income/expenses
    const otherIncome = otherAccounts
      .filter((a) => a.isIncome)
      .reduce((sum, a) => sum + a.balance, 0);
    const otherExpense = otherAccounts
      .filter((a) => !a.isIncome)
      .reduce((sum, a) => sum + a.balance, 0);
    const netOther = otherIncome - otherExpense;

    // Calculate key metrics
    const grossProfit = revenueTotal - cogsTotal;
    const operatingIncome = grossProfit - expenseTotal;
    const netIncome = operatingIncome + netOther;

    // Calculate margins (avoid division by zero)
    const grossProfitMargin = revenueTotal > 0 ? (grossProfit / revenueTotal) * 100 : 0;
    const operatingMargin = revenueTotal > 0 ? (operatingIncome / revenueTotal) * 100 : 0;
    const netProfitMargin = revenueTotal > 0 ? (netIncome / revenueTotal) * 100 : 0;

    // Build period description
    const periodDescription = fiscalMonth === 1
      ? `${MONTH_NAMES[0]} ${fiscalYear}`
      : `${MONTH_NAMES[0]} - ${MONTH_NAMES[fiscalMonth - 1]} ${fiscalYear}`;

    // Calculate period dates
    const periodStart = new Date(fiscalYear, 0, 1); // January 1
    const periodEnd = FiscalPeriod.create(fiscalYear, fiscalMonth).getEndDate();

    return {
      fiscalYear,
      fiscalMonth,
      periodDescription,
      periodStart,
      periodEnd,

      revenue: {
        accounts: revenueAccounts,
        total: revenueTotal,
      },

      cogs: {
        accounts: cogsAccounts,
        total: cogsTotal,
      },

      grossProfit,
      grossProfitMargin,

      operatingExpenses: {
        accounts: expenseAccounts,
        total: expenseTotal,
      },

      operatingIncome,
      operatingMargin,

      otherIncomeExpenses: {
        accounts: otherAccounts,
        totalIncome: otherIncome,
        totalExpense: otherExpense,
        netAmount: netOther,
      },

      netIncome,
      netProfitMargin,
      isProfit: netIncome >= 0,
    };
  }
}
