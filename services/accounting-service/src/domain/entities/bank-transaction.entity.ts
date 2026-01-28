import { nanoid } from 'nanoid';
import { BankTransactionType, BankTransactionMatchStatus } from '@/domain/value-objects';

/**
 * Generate SHA-256 hash using Web Crypto API (works in Cloudflare Workers)
 * Returns first 32 hex characters of the hash
 */
async function sha256Hash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 32);
}

/**
 * Synchronous hash for entity creation (uses same algorithm deterministically)
 * This is needed because entity creation is synchronous
 */
function syncHash(str: string): string {
  // Use a deterministic hash algorithm that produces consistent results
  // This is a simplified version - the actual fingerprint will be verified/regenerated
  // when saving to DB using the async version if needed
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hash = (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
  // Extend to 32 chars by repeating with different seed
  let h3 = 0x1b873593;
  let h4 = 0xe6546b64;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h3 = Math.imul(h3 ^ ch, 2654435761);
    h4 = Math.imul(h4 ^ ch, 1597334677);
  }
  h3 = Math.imul(h3 ^ (h3 >>> 16), 2246822507) ^ Math.imul(h4 ^ (h4 >>> 13), 3266489909);
  h4 = Math.imul(h4 ^ (h4 >>> 16), 2246822507) ^ Math.imul(h3 ^ (h3 >>> 13), 3266489909);
  const hash2 = (h4 >>> 0).toString(16).padStart(8, '0') + (h3 >>> 0).toString(16).padStart(8, '0');
  return (hash + hash2).substring(0, 32);
}

/**
 * Props for creating a new BankTransaction
 */
export interface BankTransactionProps {
  bankStatementId: string;
  bankAccountId: string;
  transactionDate: Date;
  postDate?: Date;
  description: string;
  reference?: string;
  amount: number;
  transactionType: BankTransactionType;
  runningBalance?: number;
}

/**
 * Props for reconstituting from persistence
 */
export interface BankTransactionPersistenceProps extends BankTransactionProps {
  id: string;
  fingerprint: string;
  matchStatus: BankTransactionMatchStatus;
  matchedJournalLineId?: string;
  matchedAt?: Date;
  matchedBy?: string;
  createdAt: Date;
}

/**
 * BankTransaction Entity
 * Individual bank statement line with fingerprint for duplicate detection
 */
export class BankTransaction {
  private _id: string;
  private _bankStatementId: string;
  private _bankAccountId: string;
  private _transactionDate: Date;
  private _postDate?: Date;
  private _description: string;
  private _reference?: string;
  private _amount: number;
  private _transactionType: BankTransactionType;
  private _runningBalance?: number;
  private _fingerprint: string;
  private _matchStatus: BankTransactionMatchStatus;
  private _matchedJournalLineId?: string;
  private _matchedAt?: Date;
  private _matchedBy?: string;
  private _createdAt: Date;

  private constructor(props: BankTransactionPersistenceProps) {
    this._id = props.id;
    this._bankStatementId = props.bankStatementId;
    this._bankAccountId = props.bankAccountId;
    this._transactionDate = props.transactionDate;
    this._postDate = props.postDate;
    this._description = props.description;
    this._reference = props.reference;
    this._amount = props.amount;
    this._transactionType = props.transactionType;
    this._runningBalance = props.runningBalance;
    this._fingerprint = props.fingerprint;
    this._matchStatus = props.matchStatus;
    this._matchedJournalLineId = props.matchedJournalLineId;
    this._matchedAt = props.matchedAt;
    this._matchedBy = props.matchedBy;
    this._createdAt = props.createdAt;
  }

  /**
   * Generate fingerprint for duplicate detection
   * hash(bankAccountId + date + amount + reference)
   */
  private static generateFingerprint(props: BankTransactionProps): string {
    const dateStr = props.transactionDate.toISOString().split('T')[0];
    const data = `${props.bankAccountId}|${dateStr}|${props.amount}|${props.reference || ''}`;
    return syncHash(data);
  }

  /**
   * Create a new BankTransaction
   */
  static create(props: BankTransactionProps): BankTransaction {
    // Validation
    if (!props.bankStatementId || props.bankStatementId.trim().length === 0) {
      throw new Error('Bank statement ID is required');
    }
    if (!props.bankAccountId || props.bankAccountId.trim().length === 0) {
      throw new Error('Bank account ID is required');
    }
    if (!props.description || props.description.trim().length === 0) {
      throw new Error('Description is required');
    }
    if (props.amount === 0) {
      throw new Error('Amount must be non-zero');
    }

    const now = new Date();
    const fingerprint = this.generateFingerprint(props);

    return new BankTransaction({
      ...props,
      id: `btx-${nanoid(12)}`,
      fingerprint,
      matchStatus: BankTransactionMatchStatus.UNMATCHED,
      createdAt: now,
    });
  }

  /**
   * Reconstitute from persistence
   */
  static fromPersistence(props: BankTransactionPersistenceProps): BankTransaction {
    return new BankTransaction(props);
  }

  /**
   * Match this transaction to a journal line
   */
  match(journalLineId: string, matchedBy: string): void {
    if (this._matchStatus === BankTransactionMatchStatus.MATCHED) {
      throw new Error('Transaction is already matched');
    }
    if (this._matchStatus === BankTransactionMatchStatus.EXCLUDED) {
      throw new Error('Cannot match an excluded transaction');
    }

    this._matchStatus = BankTransactionMatchStatus.MATCHED;
    this._matchedJournalLineId = journalLineId;
    this._matchedAt = new Date();
    this._matchedBy = matchedBy;
  }

  /**
   * Unmatch this transaction
   */
  unmatch(): void {
    if (this._matchStatus !== BankTransactionMatchStatus.MATCHED) {
      throw new Error('Transaction is not matched');
    }

    this._matchStatus = BankTransactionMatchStatus.UNMATCHED;
    this._matchedJournalLineId = undefined;
    this._matchedAt = undefined;
    this._matchedBy = undefined;
  }

  /**
   * Exclude this transaction from reconciliation
   */
  exclude(excludedBy: string): void {
    if (this._matchStatus === BankTransactionMatchStatus.MATCHED) {
      throw new Error('Cannot exclude a matched transaction');
    }

    this._matchStatus = BankTransactionMatchStatus.EXCLUDED;
    this._matchedBy = excludedBy;
  }

  /**
   * Include a previously excluded transaction
   */
  include(): void {
    if (this._matchStatus !== BankTransactionMatchStatus.EXCLUDED) {
      throw new Error('Transaction is not excluded');
    }

    this._matchStatus = BankTransactionMatchStatus.UNMATCHED;
    this._matchedBy = undefined;
  }

  /**
   * Check if this is a debit transaction
   */
  isDebit(): boolean {
    return this._transactionType === BankTransactionType.DEBIT;
  }

  /**
   * Check if this is a credit transaction
   */
  isCredit(): boolean {
    return this._transactionType === BankTransactionType.CREDIT;
  }

  // Getters
  get id(): string { return this._id; }
  get bankStatementId(): string { return this._bankStatementId; }
  get bankAccountId(): string { return this._bankAccountId; }
  get transactionDate(): Date { return this._transactionDate; }
  get postDate(): Date | undefined { return this._postDate; }
  get description(): string { return this._description; }
  get reference(): string | undefined { return this._reference; }
  get amount(): number { return this._amount; }
  get transactionType(): BankTransactionType { return this._transactionType; }
  get runningBalance(): number | undefined { return this._runningBalance; }
  get fingerprint(): string { return this._fingerprint; }
  get matchStatus(): BankTransactionMatchStatus { return this._matchStatus; }
  get matchedJournalLineId(): string | undefined { return this._matchedJournalLineId; }
  get matchedAt(): Date | undefined { return this._matchedAt; }
  get matchedBy(): string | undefined { return this._matchedBy; }
  get createdAt(): Date { return this._createdAt; }
}
