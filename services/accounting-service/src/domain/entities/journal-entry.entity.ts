import { nanoid } from 'nanoid';
import { FiscalPeriod } from '@/domain/value-objects';

/**
 * Journal Entry Status
 */
export enum JournalEntryStatus {
  DRAFT = 'Draft',
  POSTED = 'Posted',
  VOIDED = 'Voided',
}

/**
 * Journal Entry Type
 */
export enum JournalEntryType {
  MANUAL = 'Manual',
  SYSTEM = 'System',
  RECURRING = 'Recurring',
  ADJUSTING = 'Adjusting',
  CLOSING = 'Closing',
}

/**
 * Journal Line input (for creation)
 */
export interface JournalLineInput {
  accountId: string;
  direction: 'Debit' | 'Credit';
  amount: number;
  memo?: string;
  // GL Segmentation fields for analytics
  salesPersonId?: string;
  warehouseId?: string;
  salesChannel?: string;
  customerId?: string;
  vendorId?: string;
  productId?: string;
}

/**
 * Journal Line (stored with id and sequence)
 */
export interface JournalLine extends JournalLineInput {
  id: string;
  lineSequence: number;
}

/**
 * Journal Entry creation properties
 */
export interface JournalEntryProps {
  id?: string;
  entryNumber?: string;
  entryDate: Date;
  description: string;
  reference?: string;
  notes?: string;
  entryType?: JournalEntryType;
  lines: JournalLineInput[];
  createdBy: string;
  sourceService?: string;
  sourceReferenceId?: string;
}

/**
 * Journal Entry persistence properties (includes stored lines with ids)
 */
export interface JournalEntryPersistenceProps extends Omit<JournalEntryProps, 'lines'> {
  lines: JournalLine[];
}

/**
 * Journal Entry update properties
 */
export interface JournalEntryUpdateProps {
  description?: string;
  reference?: string;
  notes?: string;
  entryDate?: Date;
}

/**
 * Generate entry number in format JE-YYYY-NNNNNN
 */
function generateEntryNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 999999)
    .toString()
    .padStart(6, '0');
  return `JE-${year}-${random}`;
}

/**
 * Journal Entry Entity (Aggregate Root)
 * Represents a complete accounting transaction with balanced debits and credits
 */
export class JournalEntry {
  private _id: string;
  private _entryNumber: string;
  private _entryDate: Date;
  private _description: string;
  private _reference?: string;
  private _notes?: string;
  private _entryType: JournalEntryType;
  private _status: JournalEntryStatus;
  private _lines: JournalLine[];
  private _createdBy: string;
  private _createdAt: Date;
  private _postedBy?: string;
  private _postedAt?: Date;
  private _voidedBy?: string;
  private _voidedAt?: Date;
  private _voidReason?: string;
  private _updatedAt: Date;
  private _sourceService?: string;
  private _sourceReferenceId?: string;

  private constructor(props: JournalEntryProps, storedLines?: JournalLine[]) {
    this._id = props.id || nanoid();
    this._entryNumber = props.entryNumber || generateEntryNumber();
    this._entryDate = new Date(props.entryDate);
    this._description = props.description;
    this._reference = props.reference;
    this._notes = props.notes;
    this._entryType = props.entryType ?? JournalEntryType.MANUAL;
    this._status = JournalEntryStatus.DRAFT;
    // Use stored lines if provided (from persistence), otherwise create new with IDs
    this._lines = storedLines || props.lines.map((line, index) => ({
      ...line,
      id: nanoid(),
      lineSequence: index + 1,
    }));
    this._createdBy = props.createdBy;
    this._createdAt = new Date();
    this._updatedAt = new Date();
    this._sourceService = props.sourceService;
    this._sourceReferenceId = props.sourceReferenceId;
  }

  /**
   * Factory method to create a new Journal Entry
   */
  static create(props: JournalEntryProps): JournalEntry {
    // Validate description
    if (!props.description || props.description.trim().length === 0) {
      throw new Error('Description is required');
    }

    // Validate lines
    JournalEntry.validateLines(props.lines);

    return new JournalEntry(props);
  }

  /**
   * Reconstitute from persistence (no validation)
   */
  static fromPersistence(
    props: JournalEntryPersistenceProps & {
      status: JournalEntryStatus;
      fiscalPeriod: FiscalPeriod;
      createdAt: Date;
      updatedAt: Date;
      postedBy?: string;
      postedAt?: Date;
      voidedBy?: string;
      voidedAt?: Date;
      voidReason?: string;
    }
  ): JournalEntry {
    // Pass stored lines directly to avoid regenerating IDs
    const entry = new JournalEntry(props, props.lines);
    entry._status = props.status;
    entry._createdAt = props.createdAt;
    entry._updatedAt = props.updatedAt;
    entry._postedBy = props.postedBy;
    entry._postedAt = props.postedAt;
    entry._voidedBy = props.voidedBy;
    entry._voidedAt = props.voidedAt;
    entry._voidReason = props.voidReason;
    return entry;
  }

  /**
   * Validate journal lines
   */
  private static validateLines(lines: JournalLineInput[]): void {
    if (lines.length < 2) {
      throw new Error('Journal entry must have at least 2 lines');
    }

    // Validate each line
    for (const line of lines) {
      if (line.amount <= 0) {
        throw new Error('Line amount must be positive');
      }
    }

    const hasDebit = lines.some((l) => l.direction === 'Debit');
    const hasCredit = lines.some((l) => l.direction === 'Credit');

    if (!hasDebit || !hasCredit) {
      throw new Error('Journal entry must have at least one debit and one credit line');
    }

    // Calculate totals
    const totalDebits = lines.filter((l) => l.direction === 'Debit').reduce((sum, l) => sum + l.amount, 0);

    const totalCredits = lines.filter((l) => l.direction === 'Credit').reduce((sum, l) => sum + l.amount, 0);

    // Allow tolerance for floating-point precision
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new Error(`Debits (${totalDebits}) must equal credits (${totalCredits})`);
    }
  }

  // Getters
  get id(): string {
    return this._id;
  }
  get entryNumber(): string {
    return this._entryNumber;
  }
  get entryDate(): Date {
    return this._entryDate;
  }
  get description(): string {
    return this._description;
  }
  get reference(): string | undefined {
    return this._reference;
  }
  get notes(): string | undefined {
    return this._notes;
  }
  get entryType(): JournalEntryType {
    return this._entryType;
  }
  get status(): JournalEntryStatus {
    return this._status;
  }
  get lines(): JournalLine[] {
    return [...this._lines];
  }
  get createdBy(): string {
    return this._createdBy;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get postedBy(): string | undefined {
    return this._postedBy;
  }
  get postedAt(): Date | undefined {
    return this._postedAt;
  }
  get voidedBy(): string | undefined {
    return this._voidedBy;
  }
  get voidedAt(): Date | undefined {
    return this._voidedAt;
  }
  get voidReason(): string | undefined {
    return this._voidReason;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }
  get sourceService(): string | undefined {
    return this._sourceService;
  }
  get sourceReferenceId(): string | undefined {
    return this._sourceReferenceId;
  }

  /**
   * Get fiscal period (derived from entry date)
   */
  get fiscalPeriod(): FiscalPeriod {
    return FiscalPeriod.fromDate(this._entryDate);
  }

  /**
   * Calculate total debits
   */
  get totalDebits(): number {
    return this._lines.filter((l) => l.direction === 'Debit').reduce((sum, l) => sum + l.amount, 0);
  }

  /**
   * Calculate total credits
   */
  get totalCredits(): number {
    return this._lines.filter((l) => l.direction === 'Credit').reduce((sum, l) => sum + l.amount, 0);
  }

  /**
   * Validate the entry is balanced
   */
  validate(): void {
    JournalEntry.validateLines(this._lines);
  }

  /**
   * Check if entry can be edited
   */
  canEdit(): boolean {
    return this._status === JournalEntryStatus.DRAFT;
  }

  /**
   * Check if entry can be deleted
   */
  canDelete(): boolean {
    return this._status === JournalEntryStatus.DRAFT;
  }

  /**
   * Check if entry can be posted
   */
  canPost(): boolean {
    return this._status === JournalEntryStatus.DRAFT;
  }

  /**
   * Check if entry can be voided
   */
  canVoid(): boolean {
    return this._status === JournalEntryStatus.POSTED;
  }

  /**
   * Post the journal entry
   */
  post(userId: string): void {
    if (!this.canPost()) {
      throw new Error('Only draft entries can be posted');
    }

    this.validate();

    this._status = JournalEntryStatus.POSTED;
    this._postedBy = userId;
    this._postedAt = new Date();
    this._updatedAt = new Date();
  }

  /**
   * Void the journal entry
   */
  void(userId: string, reason: string): void {
    if (!this.canVoid()) {
      throw new Error('Can only void posted entries');
    }

    if (!reason || reason.trim().length < 3) {
      throw new Error('Void reason is required (minimum 3 characters)');
    }

    this._status = JournalEntryStatus.VOIDED;
    this._voidedBy = userId;
    this._voidedAt = new Date();
    this._voidReason = reason;
    this._updatedAt = new Date();
  }

  /**
   * Update entry (only draft entries)
   */
  update(props: JournalEntryUpdateProps): void {
    if (!this.canEdit()) {
      throw new Error('Can only edit draft entries');
    }

    if (props.description !== undefined) {
      if (!props.description || props.description.trim().length === 0) {
        throw new Error('Description is required');
      }
      this._description = props.description;
    }

    if (props.reference !== undefined) {
      this._reference = props.reference;
    }

    if (props.notes !== undefined) {
      this._notes = props.notes;
    }

    if (props.entryDate !== undefined) {
      this._entryDate = new Date(props.entryDate);
    }

    this._updatedAt = new Date();
  }

  /**
   * Update journal lines (only draft entries)
   */
  updateLines(lines: JournalLineInput[]): void {
    if (!this.canEdit()) {
      throw new Error('Can only edit draft entries');
    }

    JournalEntry.validateLines(lines);
    // Generate new IDs and sequences for updated lines
    this._lines = lines.map((line, index) => ({
      ...line,
      id: nanoid(),
      lineSequence: index + 1,
    }));
    this._updatedAt = new Date();
  }

  /**
   * Update description (convenience method)
   */
  updateDescription(description: string): void {
    this.update({ description });
  }

  /**
   * Serialize to plain object
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this._id,
      entryNumber: this._entryNumber,
      entryDate: this._entryDate.toISOString(),
      description: this._description,
      reference: this._reference,
      notes: this._notes,
      entryType: this._entryType,
      status: this._status,
      lines: this._lines,
      totalDebits: this.totalDebits,
      totalCredits: this.totalCredits,
      createdBy: this._createdBy,
      createdAt: this._createdAt.toISOString(),
      postedBy: this._postedBy,
      postedAt: this._postedAt?.toISOString(),
      voidedBy: this._voidedBy,
      voidedAt: this._voidedAt?.toISOString(),
      voidReason: this._voidReason,
      sourceService: this._sourceService,
      sourceReferenceId: this._sourceReferenceId,
    };
  }
}
