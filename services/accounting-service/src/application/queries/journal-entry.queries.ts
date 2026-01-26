import type { JournalEntry, JournalEntryStatus, JournalEntryType } from '@/domain/entities';
import type { FiscalPeriod } from '@/domain/value-objects';
import type {
  IJournalEntryRepository,
  JournalEntryFilter,
  PaginatedResult,
} from '@/domain/repositories';

/**
 * Get Journal Entry By ID Query
 */
export interface GetJournalEntryByIdQuery {
  id: string;
}

/**
 * Get Journal Entry By ID Handler
 */
export class GetJournalEntryByIdHandler {
  constructor(private readonly journalEntryRepository: IJournalEntryRepository) {}

  async execute(query: GetJournalEntryByIdQuery): Promise<JournalEntry | null> {
    return this.journalEntryRepository.findById(query.id);
  }
}

/**
 * List Journal Entries Query
 */
export interface ListJournalEntriesQuery {
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
  page?: number;
  limit?: number;
}

/**
 * List Journal Entries Handler
 */
export class ListJournalEntriesHandler {
  constructor(private readonly journalEntryRepository: IJournalEntryRepository) {}

  async execute(query: ListJournalEntriesQuery): Promise<PaginatedResult<JournalEntry>> {
    const filter: JournalEntryFilter = {};

    if (query.status !== undefined) {
      filter.status = query.status;
    }
    if (query.entryType !== undefined) {
      filter.entryType = query.entryType;
    }
    if (query.fiscalPeriod !== undefined) {
      filter.fiscalPeriod = query.fiscalPeriod;
    }
    if (query.fromDate !== undefined) {
      filter.fromDate = query.fromDate;
    }
    if (query.toDate !== undefined) {
      filter.toDate = query.toDate;
    }
    if (query.accountId !== undefined) {
      filter.accountId = query.accountId;
    }
    if (query.createdBy !== undefined) {
      filter.createdBy = query.createdBy;
    }
    if (query.sourceService !== undefined) {
      filter.sourceService = query.sourceService;
    }
    if (query.sourceReferenceId !== undefined) {
      filter.sourceReferenceId = query.sourceReferenceId;
    }
    if (query.search !== undefined) {
      filter.search = query.search;
    }

    const pagination = {
      page: query.page || 1,
      limit: query.limit || 20,
    };

    return this.journalEntryRepository.findAll(
      Object.keys(filter).length > 0 ? filter : undefined,
      pagination
    );
  }
}

/**
 * Get Journal Entries By Account Query
 */
export interface GetJournalEntriesByAccountQuery {
  accountId: string;
  status?: JournalEntryStatus;
  fiscalPeriod?: FiscalPeriod;
}

/**
 * Get Journal Entries By Account Handler
 */
export class GetJournalEntriesByAccountHandler {
  constructor(private readonly journalEntryRepository: IJournalEntryRepository) {}

  async execute(query: GetJournalEntriesByAccountQuery): Promise<JournalEntry[]> {
    const filter: JournalEntryFilter | undefined =
      query.status !== undefined || query.fiscalPeriod !== undefined
        ? {
            ...(query.status !== undefined && { status: query.status }),
            ...(query.fiscalPeriod !== undefined && { fiscalPeriod: query.fiscalPeriod }),
          }
        : undefined;

    return this.journalEntryRepository.findByAccountId(query.accountId, filter);
  }
}

/**
 * Get Journal Entries By Fiscal Period Query
 */
export interface GetJournalEntriesByFiscalPeriodQuery {
  fiscalPeriod: FiscalPeriod;
  status?: JournalEntryStatus;
}

/**
 * Get Journal Entries By Fiscal Period Handler
 */
export class GetJournalEntriesByFiscalPeriodHandler {
  constructor(private readonly journalEntryRepository: IJournalEntryRepository) {}

  async execute(query: GetJournalEntriesByFiscalPeriodQuery): Promise<JournalEntry[]> {
    return this.journalEntryRepository.findByFiscalPeriod(query.fiscalPeriod, query.status);
  }
}
