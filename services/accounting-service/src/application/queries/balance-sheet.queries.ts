// ============================================================================
// Types
// ============================================================================

export interface AccountBalanceItem {
  accountId: string;
  accountCode: string;
  accountName: string;
  balance: number;
}

/**
 * Dependencies for balance sheet calculation
 */
export interface BalanceSheetDependencies {
  /**
   * Get current asset accounts with balances
   * (accountCategory = 'CURRENT_ASSET')
   */
  getCurrentAssets(asOfDate: Date): Promise<AccountBalanceItem[]>;

  /**
   * Get fixed asset accounts with balances
   * (accountCategory = 'FIXED_ASSET')
   */
  getFixedAssets(asOfDate: Date): Promise<AccountBalanceItem[]>;

  /**
   * Get other non-current asset accounts with balances
   * (accountCategory = 'OTHER_NON_CURRENT_ASSET')
   */
  getOtherAssets(asOfDate: Date): Promise<AccountBalanceItem[]>;

  /**
   * Get current liability accounts with balances
   * (accountCategory = 'CURRENT_LIABILITY')
   */
  getCurrentLiabilities(asOfDate: Date): Promise<AccountBalanceItem[]>;

  /**
   * Get long-term liability accounts with balances
   * (accountCategory = 'LONG_TERM_LIABILITY')
   */
  getLongTermLiabilities(asOfDate: Date): Promise<AccountBalanceItem[]>;

  /**
   * Get equity accounts with balances (excluding retained earnings)
   * (accountType = 'Equity')
   */
  getEquityAccounts(asOfDate: Date): Promise<AccountBalanceItem[]>;

  /**
   * Get retained earnings balance (prior years' accumulated earnings)
   */
  getRetainedEarnings(asOfDate: Date): Promise<number>;

  /**
   * Get current year net income (YTD)
   */
  getCurrentYearNetIncome(asOfDate: Date): Promise<number>;
}

// ============================================================================
// Query and Result Types
// ============================================================================

export interface GetBalanceSheetQuery {
  asOfDate: Date;
}

export interface AccountSection {
  accounts: AccountBalanceItem[];
  total: number;
}

export interface AssetsSection {
  currentAssets: AccountSection;
  fixedAssets: AccountSection;
  otherAssets: AccountSection;
  totalCurrentAssets: number;
  totalFixedAssets: number;
  totalOtherAssets: number;
  totalAssets: number;
}

export interface LiabilitiesSection {
  currentLiabilities: AccountSection;
  longTermLiabilities: AccountSection;
  totalCurrentLiabilities: number;
  totalLongTermLiabilities: number;
  totalLiabilities: number;
}

export interface EquitySection {
  accounts: AccountBalanceItem[];
  accountsTotal: number;
  retainedEarnings: number;
  currentYearNetIncome: number;
  totalEquity: number;
}

export interface BalanceSheetResult {
  asOfDate: Date;
  asOfDateString: string;

  // Assets
  assets: AssetsSection;

  // Liabilities
  liabilities: LiabilitiesSection;

  // Equity
  equity: EquitySection;

  // Validation (Rule 16: Assets = Liabilities + Equity)
  isBalanced: boolean;
  difference: number;
}

// ============================================================================
// Handler
// ============================================================================

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatDate(date: Date): string {
  const month = MONTH_NAMES[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
}

export class GetBalanceSheetHandler {
  constructor(private readonly deps: BalanceSheetDependencies) {}

  async execute(query: GetBalanceSheetQuery): Promise<BalanceSheetResult> {
    const { asOfDate } = query;

    // Get all account data in parallel
    const [
      currentAssets,
      fixedAssets,
      otherAssets,
      currentLiabilities,
      longTermLiabilities,
      equityAccounts,
      retainedEarnings,
      currentYearNetIncome,
    ] = await Promise.all([
      this.deps.getCurrentAssets(asOfDate),
      this.deps.getFixedAssets(asOfDate),
      this.deps.getOtherAssets(asOfDate),
      this.deps.getCurrentLiabilities(asOfDate),
      this.deps.getLongTermLiabilities(asOfDate),
      this.deps.getEquityAccounts(asOfDate),
      this.deps.getRetainedEarnings(asOfDate),
      this.deps.getCurrentYearNetIncome(asOfDate),
    ]);

    // Calculate asset totals
    const totalCurrentAssets = currentAssets.reduce((sum, a) => sum + a.balance, 0);
    const totalFixedAssets = fixedAssets.reduce((sum, a) => sum + a.balance, 0);
    const totalOtherAssets = otherAssets.reduce((sum, a) => sum + a.balance, 0);
    const totalAssets = totalCurrentAssets + totalFixedAssets + totalOtherAssets;

    // Calculate liability totals
    const totalCurrentLiabilities = currentLiabilities.reduce((sum, a) => sum + a.balance, 0);
    const totalLongTermLiabilities = longTermLiabilities.reduce((sum, a) => sum + a.balance, 0);
    const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities;

    // Calculate equity totals
    const accountsTotal = equityAccounts.reduce((sum, a) => sum + a.balance, 0);
    const totalEquity = accountsTotal + retainedEarnings + currentYearNetIncome;

    // Validate accounting equation (Rule 16)
    // Assets = Liabilities + Equity
    const liabilitiesPlusEquity = totalLiabilities + totalEquity;
    const tolerance = 0.01;
    const difference = Math.abs(totalAssets - liabilitiesPlusEquity);
    const isBalanced = difference < tolerance;

    return {
      asOfDate,
      asOfDateString: formatDate(asOfDate),

      assets: {
        currentAssets: {
          accounts: currentAssets,
          total: totalCurrentAssets,
        },
        fixedAssets: {
          accounts: fixedAssets,
          total: totalFixedAssets,
        },
        otherAssets: {
          accounts: otherAssets,
          total: totalOtherAssets,
        },
        totalCurrentAssets,
        totalFixedAssets,
        totalOtherAssets,
        totalAssets,
      },

      liabilities: {
        currentLiabilities: {
          accounts: currentLiabilities,
          total: totalCurrentLiabilities,
        },
        longTermLiabilities: {
          accounts: longTermLiabilities,
          total: totalLongTermLiabilities,
        },
        totalCurrentLiabilities,
        totalLongTermLiabilities,
        totalLiabilities,
      },

      equity: {
        accounts: equityAccounts,
        accountsTotal,
        retainedEarnings,
        currentYearNetIncome,
        totalEquity,
      },

      isBalanced,
      difference: isBalanced ? 0 : totalAssets - liabilitiesPlusEquity,
    };
  }
}
