import { nanoid } from 'nanoid';

/**
 * Props for creating a new BankStatement
 */
export interface BankStatementProps {
  bankAccountId: string;
  statementDate: Date;
  periodStart: Date;
  periodEnd: Date;
  openingBalance: number;
  closingBalance: number;
  totalDebits?: number;
  totalCredits?: number;
  transactionCount?: number;
  importSource?: string;
  importedBy?: string;
}

/**
 * Props for reconstituting from persistence
 */
export interface BankStatementPersistenceProps extends BankStatementProps {
  id: string;
  importedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * BankStatement Entity
 * Imported bank statement header
 */
export class BankStatement {
  private _id: string;
  private _bankAccountId: string;
  private _statementDate: Date;
  private _periodStart: Date;
  private _periodEnd: Date;
  private _openingBalance: number;
  private _closingBalance: number;
  private _totalDebits: number;
  private _totalCredits: number;
  private _transactionCount: number;
  private _importSource?: string;
  private _importedAt: Date;
  private _importedBy?: string;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: BankStatementPersistenceProps) {
    this._id = props.id;
    this._bankAccountId = props.bankAccountId;
    this._statementDate = props.statementDate;
    this._periodStart = props.periodStart;
    this._periodEnd = props.periodEnd;
    this._openingBalance = props.openingBalance;
    this._closingBalance = props.closingBalance;
    this._totalDebits = props.totalDebits ?? 0;
    this._totalCredits = props.totalCredits ?? 0;
    this._transactionCount = props.transactionCount ?? 0;
    this._importSource = props.importSource;
    this._importedAt = props.importedAt;
    this._importedBy = props.importedBy;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  /**
   * Create a new BankStatement
   */
  static create(props: BankStatementProps): BankStatement {
    // Validation
    if (!props.bankAccountId || props.bankAccountId.trim().length === 0) {
      throw new Error('Bank account ID is required');
    }
    if (props.periodEnd < props.periodStart) {
      throw new Error('Period end date must be after period start date');
    }

    const now = new Date();

    return new BankStatement({
      ...props,
      id: `bst-${nanoid(12)}`,
      importedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Reconstitute from persistence
   */
  static fromPersistence(props: BankStatementPersistenceProps): BankStatement {
    return new BankStatement(props);
  }

  /**
   * Update transaction counts (called after importing transactions)
   */
  updateCounts(transactionCount: number, totalDebits: number, totalCredits: number): void {
    this._transactionCount = transactionCount;
    this._totalDebits = totalDebits;
    this._totalCredits = totalCredits;
    this._updatedAt = new Date();
  }

  /**
   * Validate statement totals match calculated totals
   */
  validateTotals(): { isValid: boolean; calculatedClosing: number; difference: number } {
    const calculatedClosing = this._openingBalance + this._totalCredits - this._totalDebits;
    const difference = Math.abs(this._closingBalance - calculatedClosing);
    const isValid = difference < 0.01; // Allow for floating point precision

    return { isValid, calculatedClosing, difference };
  }

  // Getters
  get id(): string {
    return this._id;
  }
  get bankAccountId(): string {
    return this._bankAccountId;
  }
  get statementDate(): Date {
    return this._statementDate;
  }
  get periodStart(): Date {
    return this._periodStart;
  }
  get periodEnd(): Date {
    return this._periodEnd;
  }
  get openingBalance(): number {
    return this._openingBalance;
  }
  get closingBalance(): number {
    return this._closingBalance;
  }
  get totalDebits(): number {
    return this._totalDebits;
  }
  get totalCredits(): number {
    return this._totalCredits;
  }
  get transactionCount(): number {
    return this._transactionCount;
  }
  get importSource(): string | undefined {
    return this._importSource;
  }
  get importedAt(): Date {
    return this._importedAt;
  }
  get importedBy(): string | undefined {
    return this._importedBy;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }
}
