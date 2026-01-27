import { nanoid } from 'nanoid';

/**
 * Normal balance direction for accounts
 */
export type NormalBalance = 'Debit' | 'Credit';

/**
 * Props for creating a new AccountBalance
 */
export interface AccountBalanceProps {
  accountId: string;
  fiscalYear: number;
  fiscalMonth: number;
  openingBalance?: number;
  debitTotal?: number;
  creditTotal?: number;
  closingBalance?: number;
}

/**
 * Props for reconstituting from persistence
 */
export interface AccountBalancePersistenceProps {
  id: string;
  accountId: string;
  fiscalYear: number;
  fiscalMonth: number;
  openingBalance: number;
  debitTotal: number;
  creditTotal: number;
  closingBalance: number;
  lastUpdatedAt: Date;
}

/**
 * AccountBalance Entity
 * Represents the balance snapshot of an account for a fiscal period
 *
 * Balance calculation rules:
 * - Debit normal accounts (Assets, Expenses, COGS):
 *   Closing = Opening + Debits - Credits
 * - Credit normal accounts (Liabilities, Equity, Revenue):
 *   Closing = Opening + Credits - Debits
 */
export class AccountBalance {
  private _id: string;
  private _accountId: string;
  private _fiscalYear: number;
  private _fiscalMonth: number;
  private _openingBalance: number;
  private _debitTotal: number;
  private _creditTotal: number;
  private _closingBalance: number;
  private _lastUpdatedAt: Date;

  private constructor(props: AccountBalancePersistenceProps) {
    this._id = props.id;
    this._accountId = props.accountId;
    this._fiscalYear = props.fiscalYear;
    this._fiscalMonth = props.fiscalMonth;
    this._openingBalance = props.openingBalance;
    this._debitTotal = props.debitTotal;
    this._creditTotal = props.creditTotal;
    this._closingBalance = props.closingBalance;
    this._lastUpdatedAt = props.lastUpdatedAt;
  }

  /**
   * Create a new AccountBalance
   */
  static create(props: AccountBalanceProps): AccountBalance {
    const now = new Date();

    return new AccountBalance({
      id: `ab-${nanoid(12)}`,
      accountId: props.accountId,
      fiscalYear: props.fiscalYear,
      fiscalMonth: props.fiscalMonth,
      openingBalance: props.openingBalance ?? 0,
      debitTotal: props.debitTotal ?? 0,
      creditTotal: props.creditTotal ?? 0,
      closingBalance: props.closingBalance ?? 0,
      lastUpdatedAt: now,
    });
  }

  /**
   * Reconstitute from persistence
   */
  static fromPersistence(props: AccountBalancePersistenceProps): AccountBalance {
    return new AccountBalance(props);
  }

  /**
   * Calculate closing balance from opening, debits, and credits
   * @param normalBalance - The normal balance direction of the account
   */
  calculateClosingBalance(normalBalance: NormalBalance): void {
    if (normalBalance === 'Debit') {
      // Assets, Expenses, COGS: increase with debits
      this._closingBalance = this._openingBalance + this._debitTotal - this._creditTotal;
    } else {
      // Liabilities, Equity, Revenue: increase with credits
      this._closingBalance = this._openingBalance + this._creditTotal - this._debitTotal;
    }
    this._lastUpdatedAt = new Date();
  }

  /**
   * Update the balance with transaction totals
   * @param debitTotal - Total debit amount for the period
   * @param creditTotal - Total credit amount for the period
   * @param normalBalance - The normal balance direction of the account
   */
  updateFromTransactions(
    debitTotal: number,
    creditTotal: number,
    normalBalance: NormalBalance
  ): void {
    this._debitTotal = debitTotal;
    this._creditTotal = creditTotal;
    this.calculateClosingBalance(normalBalance);
  }

  /**
   * Set the opening balance (usually from previous period's closing)
   * @param openingBalance - The opening balance
   * @param normalBalance - The normal balance direction for recalculation
   */
  setOpeningBalance(openingBalance: number, normalBalance: NormalBalance): void {
    this._openingBalance = openingBalance;
    this.calculateClosingBalance(normalBalance);
  }

  /**
   * Get the net change for the period
   */
  get netChange(): number {
    return this._debitTotal - this._creditTotal;
  }

  /**
   * Get the period string (YYYY-MM)
   */
  get periodString(): string {
    return `${this._fiscalYear}-${String(this._fiscalMonth).padStart(2, '0')}`;
  }

  // Getters
  get id(): string {
    return this._id;
  }
  get accountId(): string {
    return this._accountId;
  }
  get fiscalYear(): number {
    return this._fiscalYear;
  }
  get fiscalMonth(): number {
    return this._fiscalMonth;
  }
  get openingBalance(): number {
    return this._openingBalance;
  }
  get debitTotal(): number {
    return this._debitTotal;
  }
  get creditTotal(): number {
    return this._creditTotal;
  }
  get closingBalance(): number {
    return this._closingBalance;
  }
  get lastUpdatedAt(): Date {
    return this._lastUpdatedAt;
  }
}
