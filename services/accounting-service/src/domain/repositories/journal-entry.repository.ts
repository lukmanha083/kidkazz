import { JournalEntry, JournalEntryStatus, JournalEntryType } from '../entities';
import { FiscalPeriod } from '../value-objects';

/**
 * Journal Entry filter options
 */
export interface JournalEntryFilter {
  status?: JournalEntryStatus;
  entryType?: JournalEntryType;
  fiscalPeriod?: FiscalPeriod;
  fromDate?: Date;
  toDate?: Date;
  accountId?: string;
  createdBy?: string;
  sourceService?: string;
  sourceReferenceId?: string;
  search?: string;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Journal Entry Repository Interface (Port)
 * Defines operations for persisting and retrieving journal entries
 */
export interface IJournalEntryRepository {
  /**
   * Find journal entry by ID
   */
  findById(id: string): Promise<JournalEntry | null>;

  /**
   * Find journal entry by entry number
   */
  findByEntryNumber(entryNumber: string): Promise<JournalEntry | null>;

  /**
   * Find journal entries with filters and pagination
   */
  findAll(filter?: JournalEntryFilter, pagination?: PaginationOptions): Promise<PaginatedResult<JournalEntry>>;

  /**
   * Find entries by account ID (for ledger)
   */
  findByAccountId(accountId: string, filter?: JournalEntryFilter): Promise<JournalEntry[]>;

  /**
   * Find entries by source reference
   */
  findBySourceReference(sourceService: string, sourceReferenceId: string): Promise<JournalEntry | null>;

  /**
   * Save journal entry (create or update)
   */
  save(entry: JournalEntry): Promise<void>;

  /**
   * Delete journal entry by ID (only draft entries)
   */
  delete(id: string): Promise<void>;

  /**
   * Generate next entry number
   */
  generateEntryNumber(fiscalPeriod: FiscalPeriod): Promise<string>;

  /**
   * Get entries for a fiscal period
   */
  findByFiscalPeriod(period: FiscalPeriod, status?: JournalEntryStatus): Promise<JournalEntry[]>;
}
