import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CreateJournalEntryCommand,
  CreateJournalEntryHandler,
  UpdateJournalEntryCommand,
  UpdateJournalEntryHandler,
  DeleteJournalEntryCommand,
  DeleteJournalEntryHandler,
  PostJournalEntryCommand,
  PostJournalEntryHandler,
  VoidJournalEntryCommand,
  VoidJournalEntryHandler,
} from '@/application/commands/journal-entry.commands';
import { JournalEntry, JournalEntryStatus, JournalEntryType, Account } from '@/domain/entities';
import { AccountType } from '@/domain/value-objects';
import type { IJournalEntryRepository, IAccountRepository } from '@/domain/repositories';

// Mock repositories
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

const mockAccountRepository: IAccountRepository = {
  findById: vi.fn(),
  findByIds: vi.fn(),
  findByCode: vi.fn(),
  findAll: vi.fn(),
  findByParentId: vi.fn(),
  getAccountTree: vi.fn(),
  save: vi.fn(),
  delete: vi.fn(),
  hasTransactions: vi.fn(),
  codeExists: vi.fn(),
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

describe('Journal Entry Commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CreateJournalEntryCommand', () => {
    let handler: CreateJournalEntryHandler;

    beforeEach(() => {
      handler = new CreateJournalEntryHandler(mockJournalEntryRepository, mockAccountRepository);
    });

    it('should create a new journal entry successfully', async () => {
      vi.mocked(mockAccountRepository.findById)
        .mockResolvedValueOnce(cashAccount)
        .mockResolvedValueOnce(revenueAccount);
      vi.mocked(mockJournalEntryRepository.generateEntryNumber).mockResolvedValue('JE-202501-0001');
      vi.mocked(mockJournalEntryRepository.save).mockResolvedValue(undefined);

      const command: CreateJournalEntryCommand = {
        entryDate: new Date('2025-01-15'),
        description: 'Cash sale',
        lines: [
          { accountId: cashAccount.id, direction: 'Debit', amount: 100000 },
          { accountId: revenueAccount.id, direction: 'Credit', amount: 100000 },
        ],
        createdBy: 'test-user',
      };

      const result = await handler.execute(command);

      expect(result.id).toBeDefined();
      expect(result.entryNumber).toBe('JE-202501-0001');
      expect(result.description).toBe('Cash sale');
      expect(result.status).toBe(JournalEntryStatus.DRAFT);
      expect(mockJournalEntryRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should throw error if account not found', async () => {
      vi.mocked(mockAccountRepository.findById).mockResolvedValue(null);

      const command: CreateJournalEntryCommand = {
        entryDate: new Date('2025-01-15'),
        description: 'Cash sale',
        lines: [
          { accountId: 'non-existent', direction: 'Debit', amount: 100000 },
          { accountId: revenueAccount.id, direction: 'Credit', amount: 100000 },
        ],
        createdBy: 'test-user',
      };

      await expect(handler.execute(command)).rejects.toThrow('Account not found: non-existent');
    });

    it('should throw error if account is not detail account', async () => {
      const headerAccount = Account.create({
        code: '1000',
        name: 'Assets',
        accountType: AccountType.ASSET,
        normalBalance: 'Debit',
        isDetailAccount: false,
        isSystemAccount: true,
      });

      vi.mocked(mockAccountRepository.findById).mockResolvedValue(headerAccount);

      const command: CreateJournalEntryCommand = {
        entryDate: new Date('2025-01-15'),
        description: 'Test',
        lines: [
          { accountId: headerAccount.id, direction: 'Debit', amount: 100000 },
          { accountId: revenueAccount.id, direction: 'Credit', amount: 100000 },
        ],
        createdBy: 'test-user',
      };

      await expect(handler.execute(command)).rejects.toThrow('Cannot post to header account');
    });

    it('should create entry with optional fields', async () => {
      vi.mocked(mockAccountRepository.findById)
        .mockResolvedValueOnce(cashAccount)
        .mockResolvedValueOnce(revenueAccount);
      vi.mocked(mockJournalEntryRepository.generateEntryNumber).mockResolvedValue('JE-202501-0001');
      vi.mocked(mockJournalEntryRepository.save).mockResolvedValue(undefined);

      const command: CreateJournalEntryCommand = {
        entryDate: new Date('2025-01-15'),
        description: 'Cash sale',
        reference: 'INV-001',
        notes: 'Customer payment',
        entryType: JournalEntryType.SYSTEM,
        sourceService: 'sales-service',
        sourceReferenceId: 'order-123',
        lines: [
          { accountId: cashAccount.id, direction: 'Debit', amount: 100000 },
          { accountId: revenueAccount.id, direction: 'Credit', amount: 100000 },
        ],
        createdBy: 'system',
      };

      const result = await handler.execute(command);

      expect(result.reference).toBe('INV-001');
      expect(result.notes).toBe('Customer payment');
      expect(result.entryType).toBe(JournalEntryType.SYSTEM);
      expect(result.sourceService).toBe('sales-service');
      expect(result.sourceReferenceId).toBe('order-123');
    });
  });

  describe('UpdateJournalEntryCommand', () => {
    let handler: UpdateJournalEntryHandler;

    beforeEach(() => {
      handler = new UpdateJournalEntryHandler(mockJournalEntryRepository, mockAccountRepository);
    });

    it('should update journal entry description', async () => {
      const existingEntry = JournalEntry.create({
        entryNumber: 'JE-202501-0001',
        entryDate: new Date('2025-01-15'),
        description: 'Old description',
        lines: [
          { accountId: cashAccount.id, direction: 'Debit', amount: 100000 },
          { accountId: revenueAccount.id, direction: 'Credit', amount: 100000 },
        ],
        createdBy: 'test-user',
      });

      vi.mocked(mockJournalEntryRepository.findById).mockResolvedValue(existingEntry);
      vi.mocked(mockJournalEntryRepository.save).mockResolvedValue(undefined);

      const command: UpdateJournalEntryCommand = {
        id: existingEntry.id,
        description: 'New description',
      };

      const result = await handler.execute(command);

      expect(result.description).toBe('New description');
      expect(mockJournalEntryRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should throw error if entry not found', async () => {
      vi.mocked(mockJournalEntryRepository.findById).mockResolvedValue(null);

      const command: UpdateJournalEntryCommand = {
        id: 'non-existent',
        description: 'New description',
      };

      await expect(handler.execute(command)).rejects.toThrow('Journal entry not found');
    });

    it('should throw error if entry is not draft', async () => {
      const postedEntry = JournalEntry.create({
        entryNumber: 'JE-202501-0001',
        entryDate: new Date('2025-01-15'),
        description: 'Posted entry',
        lines: [
          { accountId: cashAccount.id, direction: 'Debit', amount: 100000 },
          { accountId: revenueAccount.id, direction: 'Credit', amount: 100000 },
        ],
        createdBy: 'test-user',
      });
      postedEntry.post('test-user');

      vi.mocked(mockJournalEntryRepository.findById).mockResolvedValue(postedEntry);

      const command: UpdateJournalEntryCommand = {
        id: postedEntry.id,
        description: 'New description',
      };

      await expect(handler.execute(command)).rejects.toThrow('Can only edit draft entries');
    });

    it('should update journal entry lines', async () => {
      const existingEntry = JournalEntry.create({
        entryNumber: 'JE-202501-0001',
        entryDate: new Date('2025-01-15'),
        description: 'Entry',
        lines: [
          { accountId: cashAccount.id, direction: 'Debit', amount: 100000 },
          { accountId: revenueAccount.id, direction: 'Credit', amount: 100000 },
        ],
        createdBy: 'test-user',
      });

      vi.mocked(mockJournalEntryRepository.findById).mockResolvedValue(existingEntry);
      vi.mocked(mockAccountRepository.findById)
        .mockResolvedValueOnce(cashAccount)
        .mockResolvedValueOnce(revenueAccount);
      vi.mocked(mockJournalEntryRepository.save).mockResolvedValue(undefined);

      const command: UpdateJournalEntryCommand = {
        id: existingEntry.id,
        lines: [
          { accountId: cashAccount.id, direction: 'Debit', amount: 200000 },
          { accountId: revenueAccount.id, direction: 'Credit', amount: 200000 },
        ],
      };

      const result = await handler.execute(command);

      expect(result.totalDebits).toBe(200000);
      expect(result.totalCredits).toBe(200000);
    });
  });

  describe('DeleteJournalEntryCommand', () => {
    let handler: DeleteJournalEntryHandler;

    beforeEach(() => {
      handler = new DeleteJournalEntryHandler(mockJournalEntryRepository);
    });

    it('should delete draft journal entry', async () => {
      const draftEntry = JournalEntry.create({
        entryNumber: 'JE-202501-0001',
        entryDate: new Date('2025-01-15'),
        description: 'Draft entry',
        lines: [
          { accountId: cashAccount.id, direction: 'Debit', amount: 100000 },
          { accountId: revenueAccount.id, direction: 'Credit', amount: 100000 },
        ],
        createdBy: 'test-user',
      });

      vi.mocked(mockJournalEntryRepository.findById).mockResolvedValue(draftEntry);
      vi.mocked(mockJournalEntryRepository.delete).mockResolvedValue(undefined);

      const command: DeleteJournalEntryCommand = {
        id: draftEntry.id,
      };

      await handler.execute(command);

      expect(mockJournalEntryRepository.delete).toHaveBeenCalledWith(draftEntry.id);
    });

    it('should throw error if entry not found', async () => {
      vi.mocked(mockJournalEntryRepository.findById).mockResolvedValue(null);

      const command: DeleteJournalEntryCommand = {
        id: 'non-existent',
      };

      await expect(handler.execute(command)).rejects.toThrow('Journal entry not found');
    });

    it('should throw error if entry is posted', async () => {
      const postedEntry = JournalEntry.create({
        entryNumber: 'JE-202501-0001',
        entryDate: new Date('2025-01-15'),
        description: 'Posted entry',
        lines: [
          { accountId: cashAccount.id, direction: 'Debit', amount: 100000 },
          { accountId: revenueAccount.id, direction: 'Credit', amount: 100000 },
        ],
        createdBy: 'test-user',
      });
      postedEntry.post('test-user');

      vi.mocked(mockJournalEntryRepository.findById).mockResolvedValue(postedEntry);

      const command: DeleteJournalEntryCommand = {
        id: postedEntry.id,
      };

      await expect(handler.execute(command)).rejects.toThrow('Cannot delete posted entry');
    });
  });

  describe('PostJournalEntryCommand', () => {
    let handler: PostJournalEntryHandler;

    beforeEach(() => {
      handler = new PostJournalEntryHandler(mockJournalEntryRepository);
    });

    it('should post draft journal entry', async () => {
      const draftEntry = JournalEntry.create({
        entryNumber: 'JE-202501-0001',
        entryDate: new Date('2025-01-15'),
        description: 'Draft entry',
        lines: [
          { accountId: cashAccount.id, direction: 'Debit', amount: 100000 },
          { accountId: revenueAccount.id, direction: 'Credit', amount: 100000 },
        ],
        createdBy: 'test-user',
      });

      vi.mocked(mockJournalEntryRepository.findById).mockResolvedValue(draftEntry);
      vi.mocked(mockJournalEntryRepository.save).mockResolvedValue(undefined);

      const command: PostJournalEntryCommand = {
        id: draftEntry.id,
        postedBy: 'approver-user',
      };

      const result = await handler.execute(command);

      expect(result.status).toBe(JournalEntryStatus.POSTED);
      expect(result.postedBy).toBe('approver-user');
      expect(result.postedAt).toBeDefined();
    });

    it('should throw error if entry not found', async () => {
      vi.mocked(mockJournalEntryRepository.findById).mockResolvedValue(null);

      const command: PostJournalEntryCommand = {
        id: 'non-existent',
        postedBy: 'user',
      };

      await expect(handler.execute(command)).rejects.toThrow('Journal entry not found');
    });

    it('should throw error if entry is already posted', async () => {
      const postedEntry = JournalEntry.create({
        entryNumber: 'JE-202501-0001',
        entryDate: new Date('2025-01-15'),
        description: 'Posted entry',
        lines: [
          { accountId: cashAccount.id, direction: 'Debit', amount: 100000 },
          { accountId: revenueAccount.id, direction: 'Credit', amount: 100000 },
        ],
        createdBy: 'test-user',
      });
      postedEntry.post('test-user');

      vi.mocked(mockJournalEntryRepository.findById).mockResolvedValue(postedEntry);

      const command: PostJournalEntryCommand = {
        id: postedEntry.id,
        postedBy: 'user',
      };

      await expect(handler.execute(command)).rejects.toThrow('Only draft entries can be posted');
    });
  });

  describe('VoidJournalEntryCommand', () => {
    let handler: VoidJournalEntryHandler;

    beforeEach(() => {
      handler = new VoidJournalEntryHandler(mockJournalEntryRepository);
    });

    it('should void posted journal entry', async () => {
      const postedEntry = JournalEntry.create({
        entryNumber: 'JE-202501-0001',
        entryDate: new Date('2025-01-15'),
        description: 'Posted entry',
        lines: [
          { accountId: cashAccount.id, direction: 'Debit', amount: 100000 },
          { accountId: revenueAccount.id, direction: 'Credit', amount: 100000 },
        ],
        createdBy: 'test-user',
      });
      postedEntry.post('test-user');

      vi.mocked(mockJournalEntryRepository.findById).mockResolvedValue(postedEntry);
      vi.mocked(mockJournalEntryRepository.save).mockResolvedValue(undefined);

      const command: VoidJournalEntryCommand = {
        id: postedEntry.id,
        voidedBy: 'admin-user',
        reason: 'Duplicate entry',
      };

      const result = await handler.execute(command);

      expect(result.status).toBe(JournalEntryStatus.VOIDED);
      expect(result.voidedBy).toBe('admin-user');
      expect(result.voidReason).toBe('Duplicate entry');
    });

    it('should throw error if entry not found', async () => {
      vi.mocked(mockJournalEntryRepository.findById).mockResolvedValue(null);

      const command: VoidJournalEntryCommand = {
        id: 'non-existent',
        voidedBy: 'user',
        reason: 'Test',
      };

      await expect(handler.execute(command)).rejects.toThrow('Journal entry not found');
    });

    it('should throw error if entry is draft', async () => {
      const draftEntry = JournalEntry.create({
        entryNumber: 'JE-202501-0001',
        entryDate: new Date('2025-01-15'),
        description: 'Draft entry',
        lines: [
          { accountId: cashAccount.id, direction: 'Debit', amount: 100000 },
          { accountId: revenueAccount.id, direction: 'Credit', amount: 100000 },
        ],
        createdBy: 'test-user',
      });

      vi.mocked(mockJournalEntryRepository.findById).mockResolvedValue(draftEntry);

      const command: VoidJournalEntryCommand = {
        id: draftEntry.id,
        voidedBy: 'user',
        reason: 'Test',
      };

      await expect(handler.execute(command)).rejects.toThrow('Can only void posted entries');
    });
  });
});
