import { nanoid } from 'nanoid';

/**
 * Budget status
 */
export type BudgetStatus = 'draft' | 'approved' | 'locked';

/**
 * Budget line item
 */
export interface BudgetLine {
  id: string;
  accountId: string;
  fiscalMonth: number;
  amount: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Budget line input (for creation/update)
 */
export interface BudgetLineInput {
  accountId: string;
  fiscalMonth: number;
  amount: number;
  notes?: string;
}

/**
 * Budget creation properties
 */
export interface BudgetProps {
  id?: string;
  name: string;
  fiscalYear: number;
  createdBy: string;
  lines?: BudgetLineInput[];
}

/**
 * Budget persistence properties
 */
export interface BudgetPersistenceProps {
  id: string;
  name: string;
  fiscalYear: number;
  status: BudgetStatus;
  approvedBy: string | null;
  approvedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lines: BudgetLine[];
}

/**
 * Budget revision record
 */
export interface BudgetRevision {
  id: string;
  budgetLineId: string;
  previousAmount: number;
  newAmount: number;
  reason: string;
  revisedBy: string;
  revisedAt: Date;
}

/**
 * Budget Entity
 * Represents an annual budget with monthly line items
 */
export class Budget {
  private _id: string;
  private _name: string;
  private _fiscalYear: number;
  private _status: BudgetStatus;
  private _approvedBy: string | null;
  private _approvedAt: Date | null;
  private _createdBy: string;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _lines: BudgetLine[];

  private constructor(props: BudgetPersistenceProps) {
    this._id = props.id;
    this._name = props.name;
    this._fiscalYear = props.fiscalYear;
    this._status = props.status;
    this._approvedBy = props.approvedBy;
    this._approvedAt = props.approvedAt;
    this._createdBy = props.createdBy;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
    this._lines = props.lines;
  }

  // Getters
  get id(): string {
    return this._id;
  }
  get name(): string {
    return this._name;
  }
  get fiscalYear(): number {
    return this._fiscalYear;
  }
  get status(): BudgetStatus {
    return this._status;
  }
  get approvedBy(): string | null {
    return this._approvedBy;
  }
  get approvedAt(): Date | null {
    return this._approvedAt;
  }
  get createdBy(): string {
    return this._createdBy;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }
  get lines(): BudgetLine[] {
    return [...this._lines];
  }

  /**
   * Create a new budget
   */
  static create(props: BudgetProps): Budget {
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('Budget name is required');
    }

    if (props.fiscalYear < 2000 || props.fiscalYear > 2100) {
      throw new Error('Invalid fiscal year');
    }

    const now = new Date();
    const id = props.id || `bgt-${nanoid(12)}`;

    const lines: BudgetLine[] = (props.lines || []).map((line) => ({
      id: `bgl-${nanoid(12)}`,
      accountId: line.accountId,
      fiscalMonth: line.fiscalMonth,
      amount: line.amount,
      notes: line.notes,
      createdAt: now,
      updatedAt: now,
    }));

    return new Budget({
      id,
      name: props.name.trim(),
      fiscalYear: props.fiscalYear,
      status: 'draft',
      approvedBy: null,
      approvedAt: null,
      createdBy: props.createdBy,
      createdAt: now,
      updatedAt: now,
      lines,
    });
  }

  /**
   * Reconstitute from persistence
   */
  static fromPersistence(props: BudgetPersistenceProps): Budget {
    return new Budget(props);
  }

  /**
   * Update budget name
   */
  updateName(name: string): void {
    if (this._status !== 'draft') {
      throw new Error('Cannot update approved or locked budget');
    }

    if (!name || name.trim().length === 0) {
      throw new Error('Budget name is required');
    }

    this._name = name.trim();
    this._updatedAt = new Date();
  }

  /**
   * Add or update a budget line
   */
  setLine(input: BudgetLineInput, userId: string): BudgetRevision | null {
    if (this._status === 'locked') {
      throw new Error('Cannot modify locked budget');
    }

    if (input.fiscalMonth < 1 || input.fiscalMonth > 12) {
      throw new Error('Invalid fiscal month');
    }

    const now = new Date();
    const existingLine = this._lines.find(
      (l) => l.accountId === input.accountId && l.fiscalMonth === input.fiscalMonth
    );

    let revision: BudgetRevision | null = null;

    if (existingLine) {
      // Create revision if amount changed
      if (existingLine.amount !== input.amount) {
        revision = {
          id: `bgr-${nanoid(12)}`,
          budgetLineId: existingLine.id,
          previousAmount: existingLine.amount,
          newAmount: input.amount,
          reason: 'Budget line updated',
          revisedBy: userId,
          revisedAt: now,
        };
      }

      // Update existing line
      existingLine.amount = input.amount;
      existingLine.notes = input.notes;
      existingLine.updatedAt = now;
    } else {
      // Add new line
      this._lines.push({
        id: `bgl-${nanoid(12)}`,
        accountId: input.accountId,
        fiscalMonth: input.fiscalMonth,
        amount: input.amount,
        notes: input.notes,
        createdAt: now,
        updatedAt: now,
      });
    }

    this._updatedAt = now;
    return revision;
  }

  /**
   * Approve the budget
   */
  approve(userId: string): void {
    if (this._status !== 'draft') {
      throw new Error('Only draft budgets can be approved');
    }

    if (this._lines.length === 0) {
      throw new Error('Cannot approve budget with no lines');
    }

    this._status = 'approved';
    this._approvedBy = userId;
    this._approvedAt = new Date();
    this._updatedAt = new Date();
  }

  /**
   * Lock the budget (prevent further changes)
   */
  lock(): void {
    if (this._status !== 'approved') {
      throw new Error('Only approved budgets can be locked');
    }

    this._status = 'locked';
    this._updatedAt = new Date();
  }

  /**
   * Reopen a locked budget (admin only)
   */
  reopen(): void {
    if (this._status !== 'locked') {
      throw new Error('Only locked budgets can be reopened');
    }

    this._status = 'approved';
    this._updatedAt = new Date();
  }

  /**
   * Get total budget amount for a specific month
   */
  getTotalForMonth(month: number): number {
    return this._lines.filter((l) => l.fiscalMonth === month).reduce((sum, l) => sum + l.amount, 0);
  }

  /**
   * Get total budget amount for the year
   */
  getTotalForYear(): number {
    return this._lines.reduce((sum, l) => sum + l.amount, 0);
  }

  /**
   * Get budget amount for a specific account
   */
  getAmountForAccount(accountId: string, month?: number): number {
    return this._lines
      .filter((l) => l.accountId === accountId && (month === undefined || l.fiscalMonth === month))
      .reduce((sum, l) => sum + l.amount, 0);
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this._id,
      name: this._name,
      fiscalYear: this._fiscalYear,
      status: this._status,
      approvedBy: this._approvedBy,
      approvedAt: this._approvedAt?.toISOString() || null,
      createdBy: this._createdBy,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      lines: this._lines,
    };
  }
}
