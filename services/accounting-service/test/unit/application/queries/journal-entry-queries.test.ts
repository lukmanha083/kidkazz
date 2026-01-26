import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  GetJournalEntryByIdQuery,
  GetJournalEntryByIdHandler,
  ListJournalEntriesQuery,
  ListJournalEntriesHandler,
  GetJournalEntriesByAccountQuery,
  GetJournalEntriesByAccountHandler,
  GetJournalEntriesByFiscalPeriodQuery,
  GetJournalEntriesByFiscalPeriodHandler,
} from '@/application/queries/journal-entry.queries';
import { JournalEntry, JournalEntryStatus, JournalEntryType, Account } from '@/domain/entities';
import { AccountType, FiscalPeriod } from '@/domain/value-objects';
import type { IJournalEntryRepository } from '@/domain/repositories';

// Mock repository
const mockJournalEntryRepository: IJournalEntryRepository = {
  findById: vi.fn(),
  findByEntryNumber: vi.fn(),
  findAll: vi.fn(),
  findByAccountId: vi.fn(),
  findBySourceReference: vi.fn(),
  save: vi.fn(),
  delete: vi.fn(),
  generateEntryNumber: vi.fn(),
  findByFiscalPeriod: vi.fn(),
};

// Test accounts
const cashAccount = Account.create({
  code: '1010',
  name: 'Kas',
  accountType: AccountType.ASSET,
  normalBalance: 'Debit',
  isDetailAccount: true,
  isSystemAccount: false,
});

const revenueAccount = Account.create({
  code: '4010',
  name: 'Penjualan',
  accountType: AccountType.REVENUE,
  normalBalance: 'Credit',
  isDetailAccount: true,
  isSystemAccount: false,
});

describe('Journal Entry Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GetJournalEntryByIdQuery', () => {
    let handler: GetJournalEntryByIdHandler;

    beforeEach(() => {
      handler = new GetJournalEntryByIdHandler(mockJournalEntryRepository);
    });

    it('should return journal entry when found', async () => {
      const entry = JournalEntry.create({
        entryNumber: 'JE-202501-0001',
        entryDate: new Date('2025-01-15'),
        description: 'Cash sale',
        lines: [
          { accountId: cashAccount.id, direction: 'Debit', amount: 100000 },
          { accountId: revenueAccount.id, direction: 'Credit', amount: 100000 },
        ],
        createdBy: 'test-user',
      });

      vi.mocked(mockJournalEntryRepository.findById).mockResolvedValue(entry);

      const query: GetJournalEntryByIdQuery = { id: entry.id };
      const result = await handler.execute(query);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(entry.id);
      expect(result!.entryNumber).toBe('JE-202501-0001');
    });

    it('should return null when not found', async () => {
      vi.mocked(mockJournalEntryRepository.findById).mockResolvedValue(null);

      const query: GetJournalEntryByIdQuery = { id: 'non-existent' };
      const result = await handler.execute(query);

      expect(result).toBeNull();
    });
  });

  describe('ListJournalEntriesQuery', () => {
    let handler: ListJournalEntriesHandler;

    beforeEach(() => {
      handler = new ListJournalEntriesHandler(mockJournalEntryRepository);
    });

    it('should return paginated entries without filter', async () => {
      const entries = [
        JournalEntry.create({
          entryNumber: 'JE-202501-0001',
          entryDate: new Date('2025-01-15'),
          description: 'Entry 1',
          lines: [
            { accountId: cashAccount.id, direction: 'Debit', amount: 100000 },
            { accountId: revenueAccount.id, direction: 'Credit', amount: 100000 },
          ],
          createdBy: 'test-user',
        }),
      ];

      vi.mocked(mockJournalEntryRepository.findAll).mockResolvedValue({
        data: entries,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const query: ListJournalEntriesQuery = {};
      const result = await handler.execute(query);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by status', async () => {
      vi.mocked(mockJournalEntryRepository.findAll).mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      const query: ListJournalEntriesQuery = { status: JournalEntryStatus.POSTED };
      await handler.execute(query);

      expect(mockJournalEntryRepository.findAll).toHaveBeenCalledWith(
        { status: JournalEntryStatus.POSTED },
        { page: 1, limit: 20 }
      );
    });

    it('should filter by entry type', async () => {
      vi.mocked(mockJournalEntryRepository.findAll).mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      const query: ListJournalEntriesQuery = { entryType: JournalEntryType.MANUAL };
      await handler.execute(query);

      expect(mockJournalEntryRepository.findAll).toHaveBeenCalledWith(
        { entryType: JournalEntryType.MANUAL },
        { page: 1, limit: 20 }
      );
    });

    it('should filter by date range', async () => {
      vi.mocked(mockJournalEntryRepository.findAll).mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      const fromDate = new Date('2025-01-01');
      const toDate = new Date('2025-01-31');
      const query: ListJournalEntriesQuery = { fromDate, toDate };
      await handler.execute(query);

      expect(mockJournalEntryRepository.findAll).toHaveBeenCalledWith(
        { fromDate, toDate },
        { page: 1, limit: 20 }
      );
    });

    it('should paginate results', async () => {
      vi.mocked(mockJournalEntryRepository.findAll).mockResolvedValue({
        data: [],
        total: 50,
        page: 2,
        limit: 10,
        totalPages: 5,
      });

      const query: ListJournalEntriesQuery = { page: 2, limit: 10 };
      const result = await handler.execute(query);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(5);
      expect(mockJournalEntryRepository.findAll).toHaveBeenCalledWith(undefined, { page: 2, limit: 10 });
    });

    it('should filter by search term', async () => {
      vi.mocked(mockJournalEntryRepository.findAll).mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      const query: ListJournalEntriesQuery = { search: 'cash sale' };
      await handler.execute(query);

      expect(mockJournalEntryRepository.findAll).toHaveBeenCalledWith(
        { search: 'cash sale' },
        { page: 1, limit: 20 }
      );
    });
  });

  describe('GetJournalEntriesByAccountQuery', () => {
    let handler: GetJournalEntriesByAccountHandler;

    beforeEach(() => {
      handler = new GetJournalEntriesByAccountHandler(mockJournalEntryRepository);
    });

    it('should return entries for account', async () => {
      const entries = [
        JournalEntry.create({
          entryNumber: 'JE-202501-0001',
          entryDate: new Date('2025-01-15'),
          description: 'Entry 1',
          lines: [
            { accountId: cashAccount.id, direction: 'Debit', amount: 100000 },
            { accountId: revenueAccount.id, direction: 'Credit', amount: 100000 },
          ],
          createdBy: 'test-user',
        }),
      ];

      vi.mocked(mockJournalEntryRepository.findByAccountId).mockResolvedValue(entries);

      const query: GetJournalEntriesByAccountQuery = { accountId: cashAccount.id };
      const result = await handler.execute(query);

      expect(result).toHaveLength(1);
      expect(mockJournalEntryRepository.findByAccountId).toHaveBeenCalledWith(cashAccount.id, undefined);
    });

    it('should filter by status', async () => {
      vi.mocked(mockJournalEntryRepository.findByAccountId).mockResolvedValue([]);

      const query: GetJournalEntriesByAccountQuery = {
        accountId: cashAccount.id,
        status: JournalEntryStatus.POSTED,
      };
      await handler.execute(query);

      expect(mockJournalEntryRepository.findByAccountId).toHaveBeenCalledWith(cashAccount.id, {
        status: JournalEntryStatus.POSTED,
      });
    });

    it('should filter by fiscal period', async () => {
      const period = FiscalPeriod.create(2025, 1);
      vi.mocked(mockJournalEntryRepository.findByAccountId).mockResolvedValue([]);

      const query: GetJournalEntriesByAccountQuery = {
        accountId: cashAccount.id,
        fiscalPeriod: period,
      };
      await handler.execute(query);

      expect(mockJournalEntryRepository.findByAccountId).toHaveBeenCalledWith(cashAccount.id, {
        fiscalPeriod: period,
      });
    });
  });

  describe('GetJournalEntriesByFiscalPeriodQuery', () => {
    let handler: GetJournalEntriesByFiscalPeriodHandler;

    beforeEach(() => {
      handler = new GetJournalEntriesByFiscalPeriodHandler(mockJournalEntryRepository);
    });

    it('should return entries for fiscal period', async () => {
      const entries = [
        JournalEntry.create({
          entryNumber: 'JE-202501-0001',
          entryDate: new Date('2025-01-15'),
          description: 'Entry 1',
          lines: [
            { accountId: cashAccount.id, direction: 'Debit', amount: 100000 },
            { accountId: revenueAccount.id, direction: 'Credit', amount: 100000 },
          ],
          createdBy: 'test-user',
        }),
      ];

      const period = FiscalPeriod.create(2025, 1);
      vi.mocked(mockJournalEntryRepository.findByFiscalPeriod).mockResolvedValue(entries);

      const query: GetJournalEntriesByFiscalPeriodQuery = { fiscalPeriod: period };
      const result = await handler.execute(query);

      expect(result).toHaveLength(1);
      expect(mockJournalEntryRepository.findByFiscalPeriod).toHaveBeenCalledWith(period, undefined);
    });

    it('should filter by status', async () => {
      const period = FiscalPeriod.create(2025, 1);
      vi.mocked(mockJournalEntryRepository.findByFiscalPeriod).mockResolvedValue([]);

      const query: GetJournalEntriesByFiscalPeriodQuery = {
        fiscalPeriod: period,
        status: JournalEntryStatus.POSTED,
      };
      await handler.execute(query);

      expect(mockJournalEntryRepository.findByFiscalPeriod).toHaveBeenCalledWith(
        period,
        JournalEntryStatus.POSTED
      );
    });
  });
});
