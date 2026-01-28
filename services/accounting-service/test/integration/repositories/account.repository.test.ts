import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { DrizzleAccountRepository } from '@/infrastructure/repositories/account.repository';
import { Account } from '@/domain/entities';
import { AccountType, AccountCategory, FinancialStatementType } from '@/domain/value-objects';
import * as schema from '@/infrastructure/db/schema';

describe('DrizzleAccountRepository', () => {
  let db: ReturnType<typeof drizzle>;
  let sqlite: Database.Database;
  let repository: DrizzleAccountRepository;

  beforeAll(() => {
    // Create in-memory SQLite database
    sqlite = new Database(':memory:');
    db = drizzle(sqlite, { schema });

    // Run migrations manually using raw SQL
    const migrationPath = join(process.cwd(), 'migrations', '0000_initial_accounting_schema.sql');
    const migrationSql = readFileSync(migrationPath, 'utf-8');

    // Split by semicolon and execute each statement (skip empty statements and INSERTs for test setup)
    const statements = migrationSql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('INSERT INTO chart_of_accounts'));

    for (const statement of statements) {
      try {
        sqlite.exec(statement);
      } catch {
        // Ignore errors for statements that might fail (like duplicate index creation)
      }
    }

    repository = new DrizzleAccountRepository(db);
  });

  afterAll(() => {
    sqlite.close();
  });

  beforeEach(() => {
    // Clear tables before each test
    sqlite.exec('DELETE FROM journal_lines');
    sqlite.exec('DELETE FROM journal_entries');
    sqlite.exec('DELETE FROM account_balances');
    sqlite.exec('DELETE FROM chart_of_accounts');
  });

  describe('save', () => {
    it('should create a new account', async () => {
      const account = Account.create({
        code: '1010',
        name: 'Kas Kecil',
        nameEn: 'Petty Cash',
        description: 'Petty cash account',
        accountType: AccountType.ASSET,
        accountCategory: AccountCategory.CURRENT_ASSET,
        normalBalance: 'Debit',
        financialStatementType: FinancialStatementType.BALANCE_SHEET,
        isDetailAccount: true,
        isSystemAccount: false,
      });

      await repository.save(account);

      const found = await repository.findById(account.id);
      expect(found).not.toBeNull();
      expect(found!.code).toBe('1010');
      expect(found!.name).toBe('Kas Kecil');
      expect(found!.nameEn).toBe('Petty Cash');
      expect(found!.accountCategory).toBe(AccountCategory.CURRENT_ASSET);
    });

    it('should update an existing account', async () => {
      const account = Account.create({
        code: '1020',
        name: 'Bank BCA',
        accountType: AccountType.ASSET,
        normalBalance: 'Debit',
        isDetailAccount: true,
        isSystemAccount: false,
      });

      await repository.save(account);

      account.updateName('Bank BCA - Operasional');
      account.updateDescription('Operating bank account');
      await repository.save(account);

      const found = await repository.findById(account.id);
      expect(found!.name).toBe('Bank BCA - Operasional');
      expect(found!.description).toBe('Operating bank account');
    });
  });

  describe('findById', () => {
    it('should return account when found', async () => {
      const account = Account.create({
        code: '2010',
        name: 'Hutang Dagang',
        accountType: AccountType.LIABILITY,
        normalBalance: 'Credit',
        isDetailAccount: true,
        isSystemAccount: false,
      });

      await repository.save(account);

      const found = await repository.findById(account.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(account.id);
    });

    it('should return null when not found', async () => {
      const found = await repository.findById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('findByCode', () => {
    it('should return account by code', async () => {
      const account = Account.create({
        code: '3100',
        name: 'Modal Disetor',
        accountType: AccountType.EQUITY,
        normalBalance: 'Credit',
        isDetailAccount: true,
        isSystemAccount: false,
      });

      await repository.save(account);

      const found = await repository.findByCode('3100');
      expect(found).not.toBeNull();
      expect(found!.code).toBe('3100');
    });

    it('should return null for non-existent code', async () => {
      const found = await repository.findByCode('9999');
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      // Seed test accounts
      const accounts = [
        Account.create({
          code: '1000',
          name: 'Kas & Bank',
          accountType: AccountType.ASSET,
          normalBalance: 'Debit',
          isDetailAccount: false,
          isSystemAccount: true,
        }),
        Account.create({
          code: '1010',
          name: 'Kas Kecil',
          accountType: AccountType.ASSET,
          normalBalance: 'Debit',
          isDetailAccount: true,
          isSystemAccount: false,
        }),
        Account.create({
          code: '2000',
          name: 'Hutang Usaha',
          accountType: AccountType.LIABILITY,
          normalBalance: 'Credit',
          isDetailAccount: false,
          isSystemAccount: true,
        }),
      ];

      for (const account of accounts) {
        await repository.save(account);
      }
    });

    it('should return all accounts without filter', async () => {
      const accounts = await repository.findAll();
      expect(accounts).toHaveLength(3);
    });

    it('should filter by account type', async () => {
      const accounts = await repository.findAll({ accountType: AccountType.ASSET });
      expect(accounts).toHaveLength(2);
      expect(accounts.every((a) => a.accountType === AccountType.ASSET)).toBe(true);
    });

    it('should filter by isDetailAccount', async () => {
      const accounts = await repository.findAll({ isDetailAccount: true });
      expect(accounts).toHaveLength(1);
      expect(accounts[0].code).toBe('1010');
    });

    it('should filter by isSystemAccount', async () => {
      const accounts = await repository.findAll({ isSystemAccount: true });
      expect(accounts).toHaveLength(2);
    });

    it('should filter by search term in name', async () => {
      const accounts = await repository.findAll({ search: 'Kas' });
      expect(accounts).toHaveLength(2);
    });
  });

  describe('findByParentId', () => {
    it('should return child accounts', async () => {
      const parent = Account.create({
        code: '1000',
        name: 'Kas & Bank',
        accountType: AccountType.ASSET,
        normalBalance: 'Debit',
        isDetailAccount: false,
        isSystemAccount: true,
      });
      await repository.save(parent);

      const child1 = Account.create({
        code: '1010',
        name: 'Kas Kecil',
        accountType: AccountType.ASSET,
        normalBalance: 'Debit',
        parentAccountId: parent.id,
        level: 1,
        isDetailAccount: true,
        isSystemAccount: false,
      });
      await repository.save(child1);

      const child2 = Account.create({
        code: '1020',
        name: 'Bank BCA',
        accountType: AccountType.ASSET,
        normalBalance: 'Debit',
        parentAccountId: parent.id,
        level: 1,
        isDetailAccount: true,
        isSystemAccount: false,
      });
      await repository.save(child2);

      const children = await repository.findByParentId(parent.id);
      expect(children).toHaveLength(2);
    });

    it('should return root accounts when parentId is null', async () => {
      const root1 = Account.create({
        code: '1000',
        name: 'Kas & Bank',
        accountType: AccountType.ASSET,
        normalBalance: 'Debit',
        isDetailAccount: false,
        isSystemAccount: true,
      });
      await repository.save(root1);

      const root2 = Account.create({
        code: '2000',
        name: 'Hutang',
        accountType: AccountType.LIABILITY,
        normalBalance: 'Credit',
        isDetailAccount: false,
        isSystemAccount: true,
      });
      await repository.save(root2);

      const rootAccounts = await repository.findByParentId(null);
      expect(rootAccounts).toHaveLength(2);
    });
  });

  describe('delete', () => {
    it('should delete account by ID', async () => {
      const account = Account.create({
        code: '9999',
        name: 'Test Account',
        accountType: AccountType.EXPENSE,
        normalBalance: 'Debit',
        isDetailAccount: true,
        isSystemAccount: false,
      });

      await repository.save(account);

      let found = await repository.findById(account.id);
      expect(found).not.toBeNull();

      await repository.delete(account.id);

      found = await repository.findById(account.id);
      expect(found).toBeNull();
    });
  });

  describe('codeExists', () => {
    it('should return true if code exists', async () => {
      const account = Account.create({
        code: '1234',
        name: 'Test Account',
        accountType: AccountType.ASSET,
        normalBalance: 'Debit',
        isDetailAccount: true,
        isSystemAccount: false,
      });

      await repository.save(account);

      const exists = await repository.codeExists('1234');
      expect(exists).toBe(true);
    });

    it('should return false if code does not exist', async () => {
      const exists = await repository.codeExists('9999');
      expect(exists).toBe(false);
    });

    it('should exclude specified ID when checking', async () => {
      const account = Account.create({
        code: '5555',
        name: 'Test Account',
        accountType: AccountType.ASSET,
        normalBalance: 'Debit',
        isDetailAccount: true,
        isSystemAccount: false,
      });

      await repository.save(account);

      // Should return false when excluding the account's own ID
      const exists = await repository.codeExists('5555', account.id);
      expect(exists).toBe(false);
    });
  });

  describe('hasTransactions', () => {
    it('should return false when account has no transactions', async () => {
      const account = Account.create({
        code: '1111',
        name: 'Test Account',
        accountType: AccountType.ASSET,
        normalBalance: 'Debit',
        isDetailAccount: true,
        isSystemAccount: false,
      });

      await repository.save(account);

      const hasTransactions = await repository.hasTransactions(account.id);
      expect(hasTransactions).toBe(false);
    });

    // Note: Testing hasTransactions=true requires journal entries,
    // which will be tested after JournalEntryRepository is implemented
  });

  describe('getAccountTree', () => {
    it('should return all accounts in hierarchical order', async () => {
      // Create parent
      const parent = Account.create({
        code: '1000',
        name: 'Aset',
        accountType: AccountType.ASSET,
        normalBalance: 'Debit',
        level: 0,
        isDetailAccount: false,
        isSystemAccount: true,
      });
      await repository.save(parent);

      // Create child
      const child = Account.create({
        code: '1100',
        name: 'Piutang',
        accountType: AccountType.ASSET,
        normalBalance: 'Debit',
        parentAccountId: parent.id,
        level: 1,
        isDetailAccount: false,
        isSystemAccount: false,
      });
      await repository.save(child);

      // Create grandchild
      const grandchild = Account.create({
        code: '1110',
        name: 'Piutang Usaha',
        accountType: AccountType.ASSET,
        normalBalance: 'Debit',
        parentAccountId: child.id,
        level: 2,
        isDetailAccount: true,
        isSystemAccount: false,
      });
      await repository.save(grandchild);

      const tree = await repository.getAccountTree();
      expect(tree).toHaveLength(3);
      // Should be sorted by code
      expect(tree[0].code).toBe('1000');
      expect(tree[1].code).toBe('1100');
      expect(tree[2].code).toBe('1110');
    });
  });
});
