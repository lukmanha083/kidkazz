import { nanoid } from 'nanoid';
import { FiscalPeriod, FiscalPeriodStatus } from '@/domain/value-objects';

/**
 * Props for creating a new FiscalPeriodEntity
 */
export interface FiscalPeriodEntityProps {
  fiscalYear: number;
  fiscalMonth: number;
}

/**
 * Props for reconstituting from persistence
 */
export interface FiscalPeriodPersistenceProps {
  id: string;
  fiscalYear: number;
  fiscalMonth: number;
  status: FiscalPeriodStatus;
  closedAt?: Date;
  closedBy?: string;
  reopenedAt?: Date;
  reopenedBy?: string;
  reopenReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * FiscalPeriodEntity (Aggregate Root)
 * Manages the lifecycle of a fiscal period from open to closed/locked
 *
 * Business Rules:
 * - Rule 14: Sequential period closing - cannot close if previous period is open
 * - Rule 15: Reopen requires authorization and reason (min 10 chars)
 * - Locked periods cannot be reopened
 */
export class FiscalPeriodEntity {
  private _id: string;
  private _fiscalYear: number;
  private _fiscalMonth: number;
  private _status: FiscalPeriodStatus;
  private _closedAt?: Date;
  private _closedBy?: string;
  private _reopenedAt?: Date;
  private _reopenedBy?: string;
  private _reopenReason?: string;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: FiscalPeriodPersistenceProps) {
    this._id = props.id;
    this._fiscalYear = props.fiscalYear;
    this._fiscalMonth = props.fiscalMonth;
    this._status = props.status;
    this._closedAt = props.closedAt;
    this._closedBy = props.closedBy;
    this._reopenedAt = props.reopenedAt;
    this._reopenedBy = props.reopenedBy;
    this._reopenReason = props.reopenReason;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  /**
   * Create a new FiscalPeriodEntity in OPEN status
   */
  static create(props: FiscalPeriodEntityProps): FiscalPeriodEntity {
    // Validate via FiscalPeriod value object
    FiscalPeriod.create(props.fiscalYear, props.fiscalMonth);

    const now = new Date();

    return new FiscalPeriodEntity({
      id: `fp-${nanoid(12)}`,
      fiscalYear: props.fiscalYear,
      fiscalMonth: props.fiscalMonth,
      status: FiscalPeriodStatus.OPEN,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Reconstitute from persistence
   */
  static fromPersistence(props: FiscalPeriodPersistenceProps): FiscalPeriodEntity {
    return new FiscalPeriodEntity(props);
  }

  /**
   * Close the fiscal period
   * Rule 14: Must validate that previous period is closed before calling this
   * @param closedBy - User ID closing the period
   */
  close(closedBy: string): void {
    if (this._status !== FiscalPeriodStatus.OPEN) {
      throw new Error(`Cannot close period: current status is ${this._status}`);
    }

    if (!closedBy || closedBy.trim().length === 0) {
      throw new Error('closedBy is required');
    }

    const now = new Date();
    this._status = FiscalPeriodStatus.CLOSED;
    this._closedAt = now;
    this._closedBy = closedBy;
    this._updatedAt = now;
  }

  /**
   * Reopen a closed fiscal period
   * Rule 15: Requires reason (min 10 chars)
   * Cannot reopen locked periods
   * @param reopenedBy - User ID reopening the period
   * @param reason - Reason for reopening (min 10 chars)
   */
  reopen(reopenedBy: string, reason: string): void {
    if (this._status === FiscalPeriodStatus.OPEN) {
      throw new Error('Period is already open');
    }

    if (this._status === FiscalPeriodStatus.LOCKED) {
      throw new Error('Cannot reopen a locked period');
    }

    if (!reopenedBy || reopenedBy.trim().length === 0) {
      throw new Error('reopenedBy is required');
    }

    if (!reason || reason.trim().length < 10) {
      throw new Error('Reopen reason must be at least 10 characters');
    }

    const now = new Date();
    this._status = FiscalPeriodStatus.OPEN;
    this._reopenedAt = now;
    this._reopenedBy = reopenedBy;
    this._reopenReason = reason;
    this._closedAt = undefined;
    this._closedBy = undefined;
    this._updatedAt = now;
  }

  /**
   * Lock the fiscal period permanently
   * Locked periods cannot be reopened
   * @param lockedBy - User ID locking the period
   */
  lock(lockedBy: string): void {
    if (this._status === FiscalPeriodStatus.OPEN) {
      throw new Error('Cannot lock an open period - close it first');
    }

    if (this._status === FiscalPeriodStatus.LOCKED) {
      throw new Error('Period is already locked');
    }

    if (!lockedBy || lockedBy.trim().length === 0) {
      throw new Error('lockedBy is required');
    }

    const now = new Date();
    this._status = FiscalPeriodStatus.LOCKED;
    this._updatedAt = now;
  }

  /**
   * Check if journal entries can be posted to this period
   */
  canPostEntries(): boolean {
    return this._status === FiscalPeriodStatus.OPEN;
  }

  /**
   * Check if this period can be closed
   * Note: Caller must also validate that previous period is closed (Rule 14)
   */
  canClose(): boolean {
    return this._status === FiscalPeriodStatus.OPEN;
  }

  /**
   * Check if this period can be reopened
   */
  canReopen(): boolean {
    return this._status === FiscalPeriodStatus.CLOSED;
  }

  /**
   * Check if this period can be locked
   */
  canLock(): boolean {
    return this._status === FiscalPeriodStatus.CLOSED;
  }

  /**
   * Get the FiscalPeriod value object for this entity
   */
  get period(): FiscalPeriod {
    return FiscalPeriod.create(this._fiscalYear, this._fiscalMonth);
  }

  /**
   * Get the previous period's FiscalPeriod value object
   */
  get previousPeriod(): FiscalPeriod | null {
    return this.period.previous();
  }

  /**
   * Get the next period's FiscalPeriod value object
   */
  get nextPeriod(): FiscalPeriod {
    return this.period.next();
  }

  // Getters
  get id(): string {
    return this._id;
  }
  get fiscalYear(): number {
    return this._fiscalYear;
  }
  get fiscalMonth(): number {
    return this._fiscalMonth;
  }
  get status(): FiscalPeriodStatus {
    return this._status;
  }
  get closedAt(): Date | undefined {
    return this._closedAt;
  }
  get closedBy(): string | undefined {
    return this._closedBy;
  }
  get reopenedAt(): Date | undefined {
    return this._reopenedAt;
  }
  get reopenedBy(): string | undefined {
    return this._reopenedBy;
  }
  get reopenReason(): string | undefined {
    return this._reopenReason;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  get isOpen(): boolean {
    return this._status === FiscalPeriodStatus.OPEN;
  }
  get isClosed(): boolean {
    return this._status === FiscalPeriodStatus.CLOSED;
  }
  get isLocked(): boolean {
    return this._status === FiscalPeriodStatus.LOCKED;
  }
}
