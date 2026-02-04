import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { DrizzleJournalEntryRepository } from '@/infrastructure/repositories/journal-entry.repository';
import { DrizzleAccountRepository } from '@/infrastructure/repositories/account.repository';
import { JournalEntry, JournalEntryStatus, JournalEntryType, Account } from '@/domain/entities';
import { FiscalPeriod, AccountType } from '@/domain/value-objects';
import * as schema from '@/infrastructure/db/schema';

describe('DrizzleJournalEntryRepository', () => {
  let db: ReturnType<typeof drizzle>;
  let sqlite: Database.Database;
  let repository: DrizzleJournalEntryRepository;
  let accountRepository: DrizzleAccountRepository;
  let cashAccount: Account;
  let revenueAccount: Account;

  beforeAll(async () => {
    // Create in-memory SQLite database
    sqlite = new Database(':memory:');
    db = drizzle(sqlite, { schema });

    // Run all migrations manually using raw SQL
    const migrationFiles = [
      '0000_initial_accounting_schema.sql',
      '0009_add_tags_to_accounts.sql',
      '0010_add_store_and_business_unit_segments.sql',
    ];

    for (const migrationFile of migrationFiles) {
      const migrationPath = join(process.cwd(), 'migrations', migrationFile);
      const migrationSql = readFileSync(migrationPath, 'utf-8');

      // Split and execute DDL statements only
      const statements = migrationSql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith('INSERT INTO chart_of_accounts'));

      for (const statement of statements) {
        try {
          sqlite.exec(statement);
        } catch (error) {
          // Only ignore "already exists" errors, rethrow others
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (!errorMessage.includes('already exists')) {
            console.error('Migration error:', errorMessage);
            throw error;
          }
        }
      }
    }

    repository = new DrizzleJournalEntryRepository(db);
    accountRepository = new DrizzleAccountRepository(db);

    // Create test accounts with unique codes
    cashAccount = Account.create({
      code: '1015',
      name: 'Kas Test',
      accountType: AccountType.ASSET,
      normalBalance: 'Debit',
      isDetailAccount: true,
      isSystemAccount: false,
    });
    await accountRepository.save(cashAccount);

    revenueAccount = Account.create({
      code: '4015',
      name: 'Penjualan Test',
      accountType: AccountType.REVENUE,
      normalBalance: 'Credit',
      isDetailAccount: true,
      isSystemAccount: false,
    });
    await accountRepository.save(revenueAccount);
  });

  afterAll(() => {
    sqlite.close();
  });

  beforeEach(() => {
    // Clear journal entries before each test
    sqlite.exec('DELETE FROM journal_lines');
    sqlite.exec('DELETE FROM journal_entries');
  });

  describe('save', () => {
    it('should create a new journal entry with lines', async () => {
      const entry = JournalEntry.create({
        entryNumber: 'JE-2025-01-0001',
        entryDate: new Date('2025-01-15'),
        description: 'Cash sale',
        lines: [
          { accountId: cashAccount.id, direction: 'Debit', amount: 100000 },
          { accountId: revenueAccount.id, direction: 'Credit', amount: 100000 },
        ],
        createdBy: 'test-user',
      });

      await repository.save(entry);

      const found = await repository.findById(entry.id);
      expect(found).not.toBeNull();
      expect(found!.entryNumber).toBe('JE-2025-01-0001');
      expect(found!.lines).toHaveLength(2);
    });

    it('should update an existing journal entry', async () => {
      const entry = JournalEntry.create({
        entryNumber: 'JE-2025-01-0002',
        entryDate: new Date('2025-01-15'),
        description: 'Initial description',
        lines: [
          { accountId: cashAccount.id, direction: 'Debit', amount: 50000 },
          { accountId: revenueAccount.id, direction: 'Credit', amount: 50000 },
        ],
        createdBy: 'test-user',
      });

      await repository.save(entry);

      // Update description
      entry.updateDescription('Updated description');
      await repository.save(entry);

      const found = await repository.findById(entry.id);
      expect(found!.description).toBe('Updated description');
    });
  });

  describe('findById', () => {
    it('should return journal entry with lines when found', async () => {
      const entry = JournalEntry.create({
        entryNumber: 'JE-2025-01-0003',
        entryDate: new Date('2025-01-15'),
        description: 'Test entry',
        lines: [
          { accountId: cashAccount.id, direction: 'Debit', amount: 75000 },
          { accountId: revenueAccount.id, direction: 'Credit', amount: 75000 },
        ],
        createdBy: 'test-user',
      });

      await repository.save(entry);

      const found = await repository.findById(entry.id);
      expect(found).not.toBeNull();
      expect(found!.lines).toHaveLength(2);
      expect(found!.lines[0].amount).toBe(75000);
    });

    it('should return null when not found', async () => {
      const found = await repository.findById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('findByEntryNumber', () => {
    it('should return journal entry by entry number', async () => {
      const entry = JournalEntry.create({
        entryNumber: 'JE-2025-01-0004',
        entryDate: new Date('2025-01-15'),
        description: 'Test entry',
        lines: [
          { accountId: cashAccount.id, direction: 'Debit', amount: 100000 },
          { accountId: revenueAccount.id, direction: 'Credit', amount: 100000 },
        ],
        createdBy: 'test-user',
      });

      await repository.save(entry);

      const found = await repository.findByEntryNumber('JE-2025-01-0004');
      expect(found).not.toBeNull();
      expect(found!.id).toBe(entry.id);
    });

    it('should return null for non-existent entry number', async () => {
      const found = await repository.findByEntryNumber('JE-XXXX-XX-XXXX');
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      // Create multiple test entries
      const entry1 = JournalEntry.create({
        entryNumber: 'JE-2025-01-0010',
        entryDate: new Date('2025-01-10'),
        description: 'Entry 1',
        entryType: JournalEntryType.MANUAL,
        lines: [
          { accountId: cashAccount.id, direction: 'Debit', amount: 100000 },
          { accountId: revenueAccount.id, direction: 'Credit', amount: 100000 },
        ],
        createdBy: 'user-1',
      });
      await repository.save(entry1);

      const entry2 = JournalEntry.create({
        entryNumber: 'JE-2025-01-0011',
        entryDate: new Date('2025-01-15'),
        description: 'Entry 2',
        entryType: JournalEntryType.SYSTEM,
        lines: [
          { accountId: cashAccount.id, direction: 'Debit', amount: 200000 },
          { accountId: revenueAccount.id, direction: 'Credit', amount: 200000 },
        ],
        createdBy: 'user-2',
      });
      entry2.post('user-2');
      await repository.save(entry2);

      const entry3 = JournalEntry.create({
        entryNumber: 'JE-2025-02-0001',
        entryDate: new Date('2025-02-01'),
        description: 'Entry 3',
        entryType: JournalEntryType.MANUAL,
        lines: [
          { accountId: cashAccount.id, direction: 'Debit', amount: 150000 },
          { accountId: revenueAccount.id, direction: 'Credit', amount: 150000 },
        ],
        createdBy: 'user-1',
      });
      await repository.save(entry3);
    });

    it('should return all entries without filter', async () => {
      const result = await repository.findAll();
      expect(result.data).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it('should filter by status', async () => {
      const result = await repository.findAll({ status: JournalEntryStatus.POSTED });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe(JournalEntryStatus.POSTED);
    });

    it('should filter by entry type', async () => {
      const result = await repository.findAll({ entryType: JournalEntryType.MANUAL });
      expect(result.data).toHaveLength(2);
    });

    it('should filter by fiscal period', async () => {
      const result = await repository.findAll({
        fiscalPeriod: FiscalPeriod.create(2025, 1),
      });
      expect(result.data).toHaveLength(2);
    });

    it('should paginate results', async () => {
      const page1 = await repository.findAll(undefined, { page: 1, limit: 2 });
      expect(page1.data).toHaveLength(2);
      expect(page1.total).toBe(3);
      expect(page1.totalPages).toBe(2);

      const page2 = await repository.findAll(undefined, { page: 2, limit: 2 });
      expect(page2.data).toHaveLength(1);
    });

    it('should filter by createdBy', async () => {
      const result = await repository.findAll({ createdBy: 'user-1' });
      expect(result.data).toHaveLength(2);
    });
  });

  describe('findByAccountId', () => {
    it('should return entries that contain the specified account', async () => {
      const entry = JournalEntry.create({
        entryNumber: 'JE-2025-01-0020',
        entryDate: new Date('2025-01-20'),
        description: 'Test entry',
        lines: [
          { accountId: cashAccount.id, direction: 'Debit', amount: 100000 },
          { accountId: revenueAccount.id, direction: 'Credit', amount: 100000 },
        ],
        createdBy: 'test-user',
      });

      await repository.save(entry);

      const entries = await repository.findByAccountId(cashAccount.id);
      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe(entry.id);
    });
  });

  describe('delete', () => {
    it('should delete journal entry and its lines', async () => {
      const entry = JournalEntry.create({
        entryNumber: 'JE-2025-01-0030',
        entryDate: new Date('2025-01-20'),
        description: 'To be deleted',
        lines: [
          { accountId: cashAccount.id, direction: 'Debit', amount: 100000 },
          { accountId: revenueAccount.id, direction: 'Credit', amount: 100000 },
        ],
        createdBy: 'test-user',
      });

      await repository.save(entry);

      let found = await repository.findById(entry.id);
      expect(found).not.toBeNull();

      await repository.delete(entry.id);

      found = await repository.findById(entry.id);
      expect(found).toBeNull();
    });
  });

  describe('generateEntryNumber', () => {
    it('should generate entry number in correct format', async () => {
      const fiscalPeriod = FiscalPeriod.create(2025, 3);
      const entryNumber = await repository.generateEntryNumber(fiscalPeriod);

      expect(entryNumber).toMatch(/^JE-202503-\d{4}$/);
    });

    it('should increment entry number for same period', async () => {
      const fiscalPeriod = FiscalPeriod.create(2025, 4);

      // Create an entry
      const entry = JournalEntry.create({
        entryNumber: await repository.generateEntryNumber(fiscalPeriod),
        entryDate: new Date('2025-04-15'),
        description: 'First entry',
        lines: [
          { accountId: cashAccount.id, direction: 'Debit', amount: 100000 },
          { accountId: revenueAccount.id, direction: 'Credit', amount: 100000 },
        ],
        createdBy: 'test-user',
      });
      await repository.save(entry);

      // Generate next entry number
      const nextNumber = await repository.generateEntryNumber(fiscalPeriod);
      expect(nextNumber).toBe('JE-202504-0002');
    });
  });

  describe('findByFiscalPeriod', () => {
    it('should return entries for specific fiscal period', async () => {
      const period = FiscalPeriod.create(2025, 5);

      const entry = JournalEntry.create({
        entryNumber: 'JE-202505-0001',
        entryDate: new Date('2025-05-15'),
        description: 'May entry',
        lines: [
          { accountId: cashAccount.id, direction: 'Debit', amount: 100000 },
          { accountId: revenueAccount.id, direction: 'Credit', amount: 100000 },
        ],
        createdBy: 'test-user',
      });
      await repository.save(entry);

      const entries = await repository.findByFiscalPeriod(period);
      expect(entries).toHaveLength(1);
      expect(entries[0].fiscalPeriod.equals(period)).toBe(true);
    });

    it('should filter by status within fiscal period', async () => {
      const period = FiscalPeriod.create(2025, 6);

      const draftEntry = JournalEntry.create({
        entryNumber: 'JE-202506-0001',
        entryDate: new Date('2025-06-10'),
        description: 'Draft entry',
        lines: [
          { accountId: cashAccount.id, direction: 'Debit', amount: 100000 },
          { accountId: revenueAccount.id, direction: 'Credit', amount: 100000 },
        ],
        createdBy: 'test-user',
      });
      await repository.save(draftEntry);

      const postedEntry = JournalEntry.create({
        entryNumber: 'JE-202506-0002',
        entryDate: new Date('2025-06-15'),
        description: 'Posted entry',
        lines: [
          { accountId: cashAccount.id, direction: 'Debit', amount: 200000 },
          { accountId: revenueAccount.id, direction: 'Credit', amount: 200000 },
        ],
        createdBy: 'test-user',
      });
      postedEntry.post('test-user');
      await repository.save(postedEntry);

      const postedEntries = await repository.findByFiscalPeriod(period, JournalEntryStatus.POSTED);
      expect(postedEntries).toHaveLength(1);
      expect(postedEntries[0].status).toBe(JournalEntryStatus.POSTED);
    });
  });

  describe('findBySourceReference', () => {
    it('should find entry by source service and reference ID', async () => {
      const entry = JournalEntry.create({
        entryNumber: 'JE-2025-07-0001',
        entryDate: new Date('2025-07-15'),
        description: 'System generated entry',
        entryType: JournalEntryType.SYSTEM,
        lines: [
          { accountId: cashAccount.id, direction: 'Debit', amount: 100000 },
          { accountId: revenueAccount.id, direction: 'Credit', amount: 100000 },
        ],
        sourceService: 'sales-service',
        sourceReferenceId: 'order-123',
        createdBy: 'system',
      });
      await repository.save(entry);

      const found = await repository.findBySourceReference('sales-service', 'order-123');
      expect(found).not.toBeNull();
      expect(found!.sourceService).toBe('sales-service');
      expect(found!.sourceReferenceId).toBe('order-123');
    });

    it('should return null when source reference not found', async () => {
      const found = await repository.findBySourceReference('unknown-service', 'unknown-ref');
      expect(found).toBeNull();
    });
  });
});
