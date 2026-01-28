/**
 * Account Type enumeration
 * Follows standard chart of accounts classification
 */
export enum AccountType {
  ASSET = 'Asset',
  LIABILITY = 'Liability',
  EQUITY = 'Equity',
  REVENUE = 'Revenue',
  COGS = 'COGS',
  EXPENSE = 'Expense',
}

/**
 * Account Category enumeration (PSAK-compliant)
 * Provides detailed classification for financial reporting
 */
export enum AccountCategory {
  CURRENT_ASSET = 'CURRENT_ASSET',
  FIXED_ASSET = 'FIXED_ASSET',
  OTHER_NON_CURRENT_ASSET = 'OTHER_NON_CURRENT_ASSET',
  CURRENT_LIABILITY = 'CURRENT_LIABILITY',
  LONG_TERM_LIABILITY = 'LONG_TERM_LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  COGS = 'COGS',
  OPERATING_EXPENSE = 'OPERATING_EXPENSE',
  OTHER_INCOME_EXPENSE = 'OTHER_INCOME_EXPENSE',
  TAX = 'TAX',
}

/**
 * Financial Statement Type
 */
export enum FinancialStatementType {
  BALANCE_SHEET = 'BALANCE_SHEET',
  INCOME_STATEMENT = 'INCOME_STATEMENT',
}

/**
 * Normal balance direction for account types
 */
export type NormalBalance = 'Debit' | 'Credit';

/**
 * Account Code Value Object
 * Represents a 4-digit account code following standard chart of accounts
 *
 * Code ranges:
 * - 0000-1999: Assets
 * - 2000-2999: Liabilities
 * - 3000-3999: Equity
 * - 4000-4999: Revenue
 * - 5000-5999: Cost of Goods Sold (COGS)
 * - 6000-9999: Expenses
 */
export class AccountCode {
  readonly value: string;

  constructor(code: string) {
    if (!/^\d{4}$/.test(code)) {
      throw new Error('Account code must be 4 digits');
    }
    this.value = code;
  }

  /**
   * Get account type based on code range
   */
  getAccountType(): AccountType {
    const codeNum = Number.parseInt(this.value, 10);

    if (codeNum >= 0 && codeNum <= 1999) {
      return AccountType.ASSET;
    }
    if (codeNum >= 2000 && codeNum <= 2999) {
      return AccountType.LIABILITY;
    }
    if (codeNum >= 3000 && codeNum <= 3999) {
      return AccountType.EQUITY;
    }
    if (codeNum >= 4000 && codeNum <= 4999) {
      return AccountType.REVENUE;
    }
    if (codeNum >= 5000 && codeNum <= 5999) {
      return AccountType.COGS;
    }
    // 6000-9999 are expenses
    return AccountType.EXPENSE;
  }

  /**
   * Get normal balance direction for this account type
   * - Debit normal: Assets, Expenses, COGS
   * - Credit normal: Liabilities, Equity, Revenue
   */
  getNormalBalance(): NormalBalance {
    const accountType = this.getAccountType();

    switch (accountType) {
      case AccountType.ASSET:
      case AccountType.EXPENSE:
      case AccountType.COGS:
        return 'Debit';
      case AccountType.LIABILITY:
      case AccountType.EQUITY:
      case AccountType.REVENUE:
        return 'Credit';
    }
  }

  /**
   * Get account category based on code range (PSAK-compliant)
   */
  getAccountCategory(): AccountCategory {
    const codeNum = Number.parseInt(this.value, 10);

    // Assets (1000-1999)
    if (codeNum >= 1000 && codeNum <= 1399) {
      return AccountCategory.CURRENT_ASSET;
    }
    if (codeNum >= 1400 && codeNum <= 1499) {
      return AccountCategory.FIXED_ASSET;
    }
    if (codeNum >= 1500 && codeNum <= 1999) {
      return AccountCategory.OTHER_NON_CURRENT_ASSET;
    }

    // Liabilities (2000-2999)
    if (codeNum >= 2000 && codeNum <= 2399) {
      return AccountCategory.CURRENT_LIABILITY;
    }
    if (codeNum >= 2400 && codeNum <= 2999) {
      return AccountCategory.LONG_TERM_LIABILITY;
    }

    // Equity (3000-3999)
    if (codeNum >= 3000 && codeNum <= 3999) {
      return AccountCategory.EQUITY;
    }

    // Revenue (4000-4299)
    if (codeNum >= 4000 && codeNum <= 4299) {
      return AccountCategory.REVENUE;
    }

    // COGS (5000-5399)
    if (codeNum >= 5000 && codeNum <= 5399) {
      return AccountCategory.COGS;
    }

    // Operating Expenses (6000-6999)
    if (codeNum >= 6000 && codeNum <= 6999) {
      return AccountCategory.OPERATING_EXPENSE;
    }

    // Other Income/Expense (7000-7199)
    if (codeNum >= 7000 && codeNum <= 7199) {
      return AccountCategory.OTHER_INCOME_EXPENSE;
    }

    // Tax (8000-8999)
    if (codeNum >= 8000 && codeNum <= 8999) {
      return AccountCategory.TAX;
    }

    // Default fallback based on account type
    const accountType = this.getAccountType();
    switch (accountType) {
      case AccountType.ASSET:
        return AccountCategory.CURRENT_ASSET;
      case AccountType.LIABILITY:
        return AccountCategory.CURRENT_LIABILITY;
      case AccountType.EQUITY:
        return AccountCategory.EQUITY;
      case AccountType.REVENUE:
        return AccountCategory.REVENUE;
      case AccountType.COGS:
        return AccountCategory.COGS;
      case AccountType.EXPENSE:
        return AccountCategory.OPERATING_EXPENSE;
    }
  }

  /**
   * Get financial statement type based on code range
   * 0000-3999: Balance Sheet (Assets, Liabilities, Equity)
   * 4000-9999: Income Statement (Revenue, COGS, Expenses)
   */
  getFinancialStatementType(): FinancialStatementType {
    const codeNum = Number.parseInt(this.value, 10);

    if (codeNum >= 0 && codeNum <= 3999) {
      return FinancialStatementType.BALANCE_SHEET;
    }
    return FinancialStatementType.INCOME_STATEMENT;
  }

  /**
   * Check equality with another AccountCode
   */
  equals(other: AccountCode): boolean {
    return this.value === other.value;
  }

  /**
   * Get string representation
   */
  toString(): string {
    return this.value;
  }

  /**
   * Create AccountCode from string (factory method)
   */
  static fromString(code: string): AccountCode {
    return new AccountCode(code);
  }
}
