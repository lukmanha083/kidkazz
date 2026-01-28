import { nanoid } from 'nanoid';
import {
  ReconciliationStatus,
  ReconciliationItemType,
  ReconciliationItemStatus,
} from '@/domain/value-objects';

/**
 * Reconciling Item - outstanding checks, deposits in transit, adjustments
 */
export interface ReconcilingItem {
  id: string;
  reconciliationId: string;
  itemType: ReconciliationItemType;
  description: string;
  amount: number;
  transactionDate: Date;
  reference?: string;
  requiresJournalEntry: boolean;
  journalEntryId?: string;
  status: ReconciliationItemStatus;
  clearedAt?: Date;
  clearedInReconciliationId?: string;
  createdAt: Date;
  createdBy?: string;
  updatedAt: Date;
}

/**
 * Props for adding a reconciling item
 */
export interface AddReconcilingItemProps {
  itemType: ReconciliationItemType;
  description: string;
  amount: number;
  transactionDate: Date;
  reference?: string;
  requiresJournalEntry?: boolean;
  createdBy: string;
}

/**
 * Props for creating a new BankReconciliation
 */
export interface BankReconciliationProps {
  bankAccountId: string;
  fiscalYear: number;
  fiscalMonth: number;
  statementEndingBalance: number;
  bookEndingBalance: number;
  notes?: string;
  createdBy: string;
}

/**
 * Props for reconstituting from persistence
 */
export interface BankReconciliationPersistenceProps extends BankReconciliationProps {
  id: string;
  adjustedBankBalance?: number;
  adjustedBookBalance?: number;
  totalTransactions: number;
  matchedTransactions: number;
  unmatchedTransactions: number;
  status: ReconciliationStatus;
  completedAt?: Date;
  completedBy?: string;
  approvedAt?: Date;
  approvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  updatedBy?: string;
  reconcilingItems: ReconcilingItem[];
}

/**
 * BankReconciliation Entity (Aggregate Root)
 * Manages the reconciliation process for a bank account for a specific period
 */
export class BankReconciliation {
  private _id: string;
  private _bankAccountId: string;
  private _fiscalYear: number;
  private _fiscalMonth: number;
  private _statementEndingBalance: number;
  private _bookEndingBalance: number;
  private _adjustedBankBalance?: number;
  private _adjustedBookBalance?: number;
  private _totalTransactions: number;
  private _matchedTransactions: number;
  private _unmatchedTransactions: number;
  private _status: ReconciliationStatus;
  private _completedAt?: Date;
  private _completedBy?: string;
  private _approvedAt?: Date;
  private _approvedBy?: string;
  private _notes?: string;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _createdBy: string;
  private _updatedBy?: string;
  private _reconcilingItems: ReconcilingItem[];

  private constructor(props: BankReconciliationPersistenceProps) {
    this._id = props.id;
    this._bankAccountId = props.bankAccountId;
    this._fiscalYear = props.fiscalYear;
    this._fiscalMonth = props.fiscalMonth;
    this._statementEndingBalance = props.statementEndingBalance;
    this._bookEndingBalance = props.bookEndingBalance;
    this._adjustedBankBalance = props.adjustedBankBalance;
    this._adjustedBookBalance = props.adjustedBookBalance;
    this._totalTransactions = props.totalTransactions;
    this._matchedTransactions = props.matchedTransactions;
    this._unmatchedTransactions = props.unmatchedTransactions;
    this._status = props.status;
    this._completedAt = props.completedAt;
    this._completedBy = props.completedBy;
    this._approvedAt = props.approvedAt;
    this._approvedBy = props.approvedBy;
    this._notes = props.notes;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
    this._createdBy = props.createdBy;
    this._updatedBy = props.updatedBy;
    this._reconcilingItems = props.reconcilingItems;
  }

  /**
   * Create a new BankReconciliation in DRAFT status
   */
  static create(props: BankReconciliationProps): BankReconciliation {
    // Validation
    if (!props.bankAccountId || props.bankAccountId.trim().length === 0) {
      throw new Error('Bank account ID is required');
    }
    if (props.fiscalYear < 2000 || props.fiscalYear > 2100) {
      throw new Error('Invalid fiscal year');
    }
    if (props.fiscalMonth < 1 || props.fiscalMonth > 12) {
      throw new Error('Fiscal month must be between 1 and 12');
    }

    const now = new Date();

    return new BankReconciliation({
      ...props,
      id: `rec-${nanoid(12)}`,
      totalTransactions: 0,
      matchedTransactions: 0,
      unmatchedTransactions: 0,
      status: ReconciliationStatus.DRAFT,
      createdAt: now,
      updatedAt: now,
      reconcilingItems: [],
    });
  }

  /**
   * Reconstitute from persistence
   */
  static fromPersistence(props: BankReconciliationPersistenceProps): BankReconciliation {
    return new BankReconciliation(props);
  }

  /**
   * Start the reconciliation process
   */
  startReconciliation(): void {
    if (this._status !== ReconciliationStatus.DRAFT) {
      throw new Error('Can only start reconciliation from DRAFT status');
    }

    this._status = ReconciliationStatus.IN_PROGRESS;
    this._updatedAt = new Date();
  }

  /**
   * Update transaction counts
   */
  updateTransactionCounts(total: number, matched: number, unmatched: number): void {
    this._totalTransactions = total;
    this._matchedTransactions = matched;
    this._unmatchedTransactions = unmatched;
    this._updatedAt = new Date();
  }

  /**
   * Add a reconciling item (outstanding check, deposit in transit, adjustment, etc.)
   */
  addReconcilingItem(props: AddReconcilingItemProps): ReconcilingItem {
    if (this._status !== ReconciliationStatus.IN_PROGRESS) {
      throw new Error('Can only add items when reconciliation is in progress');
    }

    const now = new Date();
    const item: ReconcilingItem = {
      id: `ri-${nanoid(12)}`,
      reconciliationId: this._id,
      itemType: props.itemType,
      description: props.description,
      amount: props.amount,
      transactionDate: props.transactionDate,
      reference: props.reference,
      requiresJournalEntry: props.requiresJournalEntry ?? false,
      status: ReconciliationItemStatus.PENDING,
      createdAt: now,
      createdBy: props.createdBy,
      updatedAt: now,
    };

    this._reconcilingItems.push(item);
    this._updatedAt = now;

    return item;
  }

  /**
   * Calculate adjusted bank and book balances (Rule 20)
   *
   * Adjusted Bank Balance = Statement Balance
   *   - Outstanding Checks
   *   + Deposits in Transit
   *
   * Adjusted Book Balance = Book Balance
   *   - Bank Fees
   *   - NSF Checks
   *   + Bank Interest
   *   +/- Other Adjustments
   */
  calculateAdjustedBalances(): void {
    let adjustedBank = this._statementEndingBalance;
    let adjustedBook = this._bookEndingBalance;

    for (const item of this._reconcilingItems) {
      if (item.status === ReconciliationItemStatus.VOIDED) {
        continue;
      }

      switch (item.itemType) {
        // Bank balance adjustments
        case ReconciliationItemType.OUTSTANDING_CHECK:
          adjustedBank -= item.amount;
          break;
        case ReconciliationItemType.DEPOSIT_IN_TRANSIT:
          adjustedBank += item.amount;
          break;
        // Book balance adjustments
        case ReconciliationItemType.BANK_FEE:
          adjustedBook -= item.amount;
          break;
        case ReconciliationItemType.BANK_INTEREST:
          adjustedBook += item.amount;
          break;
        case ReconciliationItemType.NSF_CHECK:
          adjustedBook -= item.amount;
          break;
        case ReconciliationItemType.ADJUSTMENT:
          // Positive = increase book, Negative = decrease book
          adjustedBook += item.amount;
          break;
      }
    }

    this._adjustedBankBalance = adjustedBank;
    this._adjustedBookBalance = adjustedBook;
    this._updatedAt = new Date();
  }

  /**
   * Check if adjusted bank and book balances match (Rule 20)
   */
  isBalanced(): boolean {
    if (this._adjustedBankBalance === undefined || this._adjustedBookBalance === undefined) {
      return false;
    }

    // Allow for small floating point differences
    const difference = Math.abs(this._adjustedBankBalance - this._adjustedBookBalance);
    return difference < 0.01;
  }

  /**
   * Complete the reconciliation (Rule 20 - must be balanced)
   */
  complete(completedBy: string): void {
    if (this._status !== ReconciliationStatus.IN_PROGRESS) {
      throw new Error('Can only complete reconciliation from IN_PROGRESS status');
    }

    if (!this.isBalanced()) {
      throw new Error('Cannot complete reconciliation: adjusted bank and book balances do not match');
    }

    this._status = ReconciliationStatus.COMPLETED;
    this._completedAt = new Date();
    this._completedBy = completedBy;
    this._updatedAt = new Date();
  }

  /**
   * Approve the reconciliation
   */
  approve(approvedBy: string): void {
    if (this._status !== ReconciliationStatus.COMPLETED) {
      throw new Error('Can only approve completed reconciliations');
    }

    this._status = ReconciliationStatus.APPROVED;
    this._approvedAt = new Date();
    this._approvedBy = approvedBy;
    this._updatedAt = new Date();
  }

  /**
   * Get outstanding (pending) reconciling items
   */
  getOutstandingItems(): ReconcilingItem[] {
    return this._reconcilingItems.filter(
      (item) => item.status === ReconciliationItemStatus.PENDING
    );
  }

  /**
   * Get items that require journal entries (excludes voided items)
   */
  getItemsRequiringJournalEntries(): ReconcilingItem[] {
    return this._reconcilingItems.filter(
      (item) =>
        item.requiresJournalEntry &&
        !item.journalEntryId &&
        item.status !== ReconciliationItemStatus.VOIDED
    );
  }

  /**
   * Get the difference between adjusted balances
   */
  getBalanceDifference(): number {
    const bankBal = this._adjustedBankBalance ?? this._statementEndingBalance;
    const bookBal = this._adjustedBookBalance ?? this._bookEndingBalance;
    return bankBal - bookBal;
  }

  // Getters
  get id(): string { return this._id; }
  get bankAccountId(): string { return this._bankAccountId; }
  get fiscalYear(): number { return this._fiscalYear; }
  get fiscalMonth(): number { return this._fiscalMonth; }
  get statementEndingBalance(): number { return this._statementEndingBalance; }
  get bookEndingBalance(): number { return this._bookEndingBalance; }
  get adjustedBankBalance(): number | undefined { return this._adjustedBankBalance; }
  get adjustedBookBalance(): number | undefined { return this._adjustedBookBalance; }
  get totalTransactions(): number { return this._totalTransactions; }
  get matchedTransactions(): number { return this._matchedTransactions; }
  get unmatchedTransactions(): number { return this._unmatchedTransactions; }
  get status(): ReconciliationStatus { return this._status; }
  get completedAt(): Date | undefined { return this._completedAt; }
  get completedBy(): string | undefined { return this._completedBy; }
  get approvedAt(): Date | undefined { return this._approvedAt; }
  get approvedBy(): string | undefined { return this._approvedBy; }
  get notes(): string | undefined { return this._notes; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }
  get createdBy(): string { return this._createdBy; }
  get updatedBy(): string | undefined { return this._updatedBy; }
  get reconcilingItems(): ReconcilingItem[] { return [...this._reconcilingItems]; }
}
