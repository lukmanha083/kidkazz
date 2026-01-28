import { nanoid } from 'nanoid';
import {
  type AccountCategory,
  AccountCode,
  type AccountType,
  type FinancialStatementType,
  type NormalBalance,
} from '../value-objects';

/**
 * Account status enumeration
 */
export enum AccountStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
  ARCHIVED = 'Archived',
}

/**
 * Account creation properties
 */
export interface AccountProps {
  id?: string;
  code: string;
  name: string;
  nameEn?: string;
  description?: string;
  accountType: AccountType;
  accountCategory?: AccountCategory;
  normalBalance: NormalBalance;
  financialStatementType?: FinancialStatementType;
  parentAccountId?: string | null;
  level?: number;
  isDetailAccount: boolean;
  isSystemAccount: boolean;
  status?: AccountStatus;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * Account Entity
 * Represents an account in the Chart of Accounts
 */
export class Account {
  private _id: string;
  private _code: AccountCode;
  private _name: string;
  private _nameEn: string;
  private _description: string;
  private _accountType: AccountType;
  private _accountCategory: AccountCategory;
  private _normalBalance: NormalBalance;
  private _financialStatementType: FinancialStatementType;
  private _parentAccountId: string | null;
  private _level: number;
  private _isDetailAccount: boolean;
  private _isSystemAccount: boolean;
  private _status: AccountStatus;
  private _hasTransactions: boolean;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _createdBy?: string;
  private _updatedBy?: string;

  private constructor(props: AccountProps) {
    this._id = props.id || nanoid();
    this._code = new AccountCode(props.code);
    this._name = props.name;
    this._nameEn = props.nameEn || '';
    this._description = props.description || '';
    this._accountType = props.accountType;
    this._accountCategory = props.accountCategory ?? this._code.getAccountCategory();
    this._normalBalance = props.normalBalance;
    this._financialStatementType =
      props.financialStatementType ?? this._code.getFinancialStatementType();
    this._parentAccountId = props.parentAccountId ?? null;
    this._level = props.level ?? 0;
    this._isDetailAccount = props.isDetailAccount;
    this._isSystemAccount = props.isSystemAccount;
    this._status = props.status ?? AccountStatus.ACTIVE;
    this._hasTransactions = false;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
    this._createdBy = props.createdBy;
    this._updatedBy = props.updatedBy;
  }

  /**
   * Factory method to create a new Account
   */
  static create(props: AccountProps): Account {
    // Validate name
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('Account name is required');
    }
    if (props.name.length > 255) {
      throw new Error('Account name must not exceed 255 characters');
    }

    return new Account(props);
  }

  /**
   * Reconstitute Account from persistence (no validation)
   */
  static fromPersistence(props: AccountProps & { hasTransactions?: boolean }): Account {
    const account = new Account(props);
    if (props.hasTransactions) {
      account._hasTransactions = true;
    }
    return account;
  }

  // Getters
  get id(): string {
    return this._id;
  }
  get code(): string {
    return this._code.value;
  }
  get name(): string {
    return this._name;
  }
  get nameEn(): string {
    return this._nameEn;
  }
  get description(): string {
    return this._description;
  }
  get accountType(): AccountType {
    return this._accountType;
  }
  get accountCategory(): AccountCategory {
    return this._accountCategory;
  }
  get normalBalance(): NormalBalance {
    return this._normalBalance;
  }
  get financialStatementType(): FinancialStatementType {
    return this._financialStatementType;
  }
  get parentAccountId(): string | null {
    return this._parentAccountId;
  }
  get level(): number {
    return this._level;
  }
  get isDetailAccount(): boolean {
    return this._isDetailAccount;
  }
  get isSystemAccount(): boolean {
    return this._isSystemAccount;
  }
  get status(): AccountStatus {
    return this._status;
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

  /**
   * Check if transactions can be posted to this account
   */
  canPost(): boolean {
    return this._isDetailAccount && this._status === AccountStatus.ACTIVE;
  }

  /**
   * Check if account can be deleted
   */
  canDelete(): boolean {
    return !this._isSystemAccount && !this._hasTransactions;
  }

  /**
   * Mark account as having transactions (prevents deletion)
   */
  markHasTransactions(): void {
    this._hasTransactions = true;
  }

  /**
   * Activate account (only from INACTIVE status)
   */
  activate(): void {
    if (this._status === AccountStatus.ARCHIVED) {
      throw new Error('Cannot activate archived account. Use unarchive first.');
    }
    this._status = AccountStatus.ACTIVE;
    this._updatedAt = new Date();
  }

  /**
   * Deactivate account
   */
  deactivate(): void {
    if (this._isSystemAccount) {
      throw new Error('Cannot deactivate system account');
    }
    this._status = AccountStatus.INACTIVE;
    this._updatedAt = new Date();
  }

  /**
   * Archive account (must be inactive first)
   */
  archive(): void {
    if (this._status !== AccountStatus.INACTIVE) {
      throw new Error('Can only archive inactive accounts');
    }
    this._status = AccountStatus.ARCHIVED;
    this._updatedAt = new Date();
  }

  /**
   * Update account name
   */
  updateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Account name is required');
    }
    if (name.length > 255) {
      throw new Error('Account name must not exceed 255 characters');
    }
    this._name = name;
    this._updatedAt = new Date();
  }

  /**
   * Update account description
   */
  updateDescription(description: string): void {
    this._description = description;
    this._updatedAt = new Date();
  }

  /**
   * Set parent account (for hierarchy)
   */
  setParentAccount(parentId: string | null, level: number): void {
    this._parentAccountId = parentId;
    this._level = level;
    this._updatedAt = new Date();
  }

  /**
   * Update English name
   */
  updateNameEn(nameEn: string): void {
    this._nameEn = nameEn;
    this._updatedAt = new Date();
  }

  /**
   * Update account code (only for non-system accounts)
   */
  updateCode(code: string): void {
    if (this._isSystemAccount) {
      throw new Error('Cannot change code of system account');
    }
    this._code = new AccountCode(code);
    this._updatedAt = new Date();
  }

  /**
   * Serialize to plain object
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this._id,
      code: this._code.value,
      name: this._name,
      nameEn: this._nameEn,
      description: this._description,
      accountType: this._accountType,
      accountCategory: this._accountCategory,
      normalBalance: this._normalBalance,
      financialStatementType: this._financialStatementType,
      parentAccountId: this._parentAccountId,
      level: this._level,
      isDetailAccount: this._isDetailAccount,
      isSystemAccount: this._isSystemAccount,
      status: this._status,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}
