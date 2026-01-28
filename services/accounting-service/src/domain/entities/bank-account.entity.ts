import { BankAccountStatus, type BankAccountType } from '@/domain/value-objects';
import { nanoid } from 'nanoid';

/**
 * Props for creating a new BankAccount
 */
export interface BankAccountProps {
  accountId: string; // FK to Chart of Accounts (GL account)
  bankName: string;
  accountNumber: string;
  accountType: BankAccountType;
  currency?: string;
  createdBy?: string;
}

/**
 * Props for reconstituting from persistence
 */
export interface BankAccountPersistenceProps extends BankAccountProps {
  id: string;
  status: BankAccountStatus;
  lastReconciledDate?: Date;
  lastReconciledBalance?: number;
  createdAt: Date;
  updatedAt: Date;
  updatedBy?: string;
}

/**
 * BankAccount Entity
 * Links bank accounts to GL accounts for reconciliation
 */
export class BankAccount {
  private _id: string;
  private _accountId: string;
  private _bankName: string;
  private _accountNumber: string;
  private _accountType: BankAccountType;
  private _currency: string;
  private _status: BankAccountStatus;
  private _lastReconciledDate?: Date;
  private _lastReconciledBalance?: number;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _createdBy?: string;
  private _updatedBy?: string;

  private constructor(props: BankAccountPersistenceProps) {
    this._id = props.id;
    this._accountId = props.accountId;
    this._bankName = props.bankName;
    this._accountNumber = props.accountNumber;
    this._accountType = props.accountType;
    this._currency = props.currency ?? 'IDR';
    this._status = props.status;
    this._lastReconciledDate = props.lastReconciledDate;
    this._lastReconciledBalance = props.lastReconciledBalance;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
    this._createdBy = props.createdBy;
    this._updatedBy = props.updatedBy;
  }

  /**
   * Create a new BankAccount
   */
  static create(props: BankAccountProps): BankAccount {
    // Validation
    if (!props.accountId || props.accountId.trim().length === 0) {
      throw new Error('Account ID (GL account) is required');
    }
    if (!props.bankName || props.bankName.trim().length === 0) {
      throw new Error('Bank name is required');
    }
    if (!props.accountNumber || props.accountNumber.trim().length === 0) {
      throw new Error('Account number is required');
    }

    const now = new Date();

    return new BankAccount({
      ...props,
      id: `ba-${nanoid(12)}`,
      status: BankAccountStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Reconstitute from persistence
   */
  static fromPersistence(props: BankAccountPersistenceProps): BankAccount {
    return new BankAccount(props);
  }

  /**
   * Update bank account details
   */
  update(updates: {
    bankName?: string;
    accountNumber?: string;
    accountType?: BankAccountType;
    currency?: string;
    updatedBy?: string;
  }): void {
    if (this._status === BankAccountStatus.CLOSED) {
      throw new Error('Cannot update a closed bank account');
    }

    if (updates.bankName !== undefined) {
      if (!updates.bankName.trim()) {
        throw new Error('Bank name cannot be empty');
      }
      this._bankName = updates.bankName;
    }
    if (updates.accountNumber !== undefined) {
      if (!updates.accountNumber.trim()) {
        throw new Error('Account number cannot be empty');
      }
      this._accountNumber = updates.accountNumber;
    }
    if (updates.accountType !== undefined) {
      this._accountType = updates.accountType;
    }
    if (updates.currency !== undefined) {
      this._currency = updates.currency;
    }
    if (updates.updatedBy !== undefined) {
      this._updatedBy = updates.updatedBy;
    }
    this._updatedAt = new Date();
  }

  /**
   * Record reconciliation completion (Rule 20)
   */
  recordReconciliation(reconciledBalance: number, updatedBy?: string): void {
    if (this._status === BankAccountStatus.CLOSED) {
      throw new Error('Cannot reconcile a closed bank account');
    }

    this._lastReconciledDate = new Date();
    this._lastReconciledBalance = reconciledBalance;
    this._updatedAt = new Date();
    this._updatedBy = updatedBy;
  }

  /**
   * Deactivate the bank account
   */
  deactivate(updatedBy?: string): void {
    if (this._status === BankAccountStatus.CLOSED) {
      throw new Error('Bank account is already closed');
    }

    this._status = BankAccountStatus.INACTIVE;
    this._updatedAt = new Date();
    this._updatedBy = updatedBy;
  }

  /**
   * Reactivate the bank account
   */
  reactivate(updatedBy?: string): void {
    if (this._status === BankAccountStatus.CLOSED) {
      throw new Error('Cannot reactivate a closed bank account');
    }

    this._status = BankAccountStatus.ACTIVE;
    this._updatedAt = new Date();
    this._updatedBy = updatedBy;
  }

  /**
   * Close the bank account permanently
   */
  close(updatedBy?: string): void {
    if (this._status === BankAccountStatus.CLOSED) {
      throw new Error('Bank account is already closed');
    }

    this._status = BankAccountStatus.CLOSED;
    this._updatedAt = new Date();
    this._updatedBy = updatedBy;
  }

  /**
   * Check if the account is active
   */
  isActive(): boolean {
    return this._status === BankAccountStatus.ACTIVE;
  }

  /**
   * Check if the account needs reconciliation (Rule 21)
   * Returns true if not reconciled in the current month
   */
  needsReconciliation(currentYear: number, currentMonth: number): boolean {
    if (!this.isActive()) {
      return false;
    }

    if (!this._lastReconciledDate) {
      return true;
    }

    const reconciledYear = this._lastReconciledDate.getFullYear();
    const reconciledMonth = this._lastReconciledDate.getMonth() + 1;

    // Needs reconciliation if last reconciled date is before current period
    return (
      reconciledYear < currentYear ||
      (reconciledYear === currentYear && reconciledMonth < currentMonth)
    );
  }

  // Getters
  get id(): string {
    return this._id;
  }
  get accountId(): string {
    return this._accountId;
  }
  get bankName(): string {
    return this._bankName;
  }
  get accountNumber(): string {
    return this._accountNumber;
  }
  get accountType(): BankAccountType {
    return this._accountType;
  }
  get currency(): string {
    return this._currency;
  }
  get status(): BankAccountStatus {
    return this._status;
  }
  get lastReconciledDate(): Date | undefined {
    return this._lastReconciledDate;
  }
  get lastReconciledBalance(): number | undefined {
    return this._lastReconciledBalance;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }
  get createdBy(): string | undefined {
    return this._createdBy;
  }
  get updatedBy(): string | undefined {
    return this._updatedBy;
  }
}
