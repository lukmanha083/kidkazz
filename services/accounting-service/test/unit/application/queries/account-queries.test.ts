import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  GetAccountByIdQuery,
  GetAccountByIdHandler,
  GetAccountByCodeQuery,
  GetAccountByCodeHandler,
  ListAccountsQuery,
  ListAccountsHandler,
  GetAccountTreeQuery,
  GetAccountTreeHandler,
} from '@/application/queries/account.queries';
import { Account } from '@/domain/entities';
import { AccountType } from '@/domain/value-objects';
import type { IAccountRepository } from '@/domain/repositories';

// Mock repository
const mockAccountRepository: IAccountRepository = {
  findById: vi.fn(),
  findByCode: vi.fn(),
  findAll: vi.fn(),
  findByParentId: vi.fn(),
  getAccountTree: vi.fn(),
  save: vi.fn(),
  delete: vi.fn(),
  hasTransactions: vi.fn(),
  codeExists: vi.fn(),
};

describe('Account Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GetAccountByIdQuery', () => {
    let handler: GetAccountByIdHandler;

    beforeEach(() => {
      handler = new GetAccountByIdHandler(mockAccountRepository);
    });

    it('should return account when found', async () => {
      const account = Account.create({
        code: '1010',
        name: 'Kas Kecil',
        accountType: AccountType.ASSET,
        normalBalance: 'Debit',
        isDetailAccount: true,
        isSystemAccount: false,
      });

      vi.mocked(mockAccountRepository.findById).mockResolvedValue(account);

      const query: GetAccountByIdQuery = { id: account.id };
      const result = await handler.execute(query);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(account.id);
      expect(result!.code).toBe('1010');
    });

    it('should return null when not found', async () => {
      vi.mocked(mockAccountRepository.findById).mockResolvedValue(null);

      const query: GetAccountByIdQuery = { id: 'non-existent' };
      const result = await handler.execute(query);

      expect(result).toBeNull();
    });
  });

  describe('GetAccountByCodeQuery', () => {
    let handler: GetAccountByCodeHandler;

    beforeEach(() => {
      handler = new GetAccountByCodeHandler(mockAccountRepository);
    });

    it('should return account when found', async () => {
      const account = Account.create({
        code: '1010',
        name: 'Kas Kecil',
        accountType: AccountType.ASSET,
        normalBalance: 'Debit',
        isDetailAccount: true,
        isSystemAccount: false,
      });

      vi.mocked(mockAccountRepository.findByCode).mockResolvedValue(account);

      const query: GetAccountByCodeQuery = { code: '1010' };
      const result = await handler.execute(query);

      expect(result).not.toBeNull();
      expect(result!.code).toBe('1010');
    });

    it('should return null when not found', async () => {
      vi.mocked(mockAccountRepository.findByCode).mockResolvedValue(null);

      const query: GetAccountByCodeQuery = { code: '9999' };
      const result = await handler.execute(query);

      expect(result).toBeNull();
    });
  });

  describe('ListAccountsQuery', () => {
    let handler: ListAccountsHandler;

    beforeEach(() => {
      handler = new ListAccountsHandler(mockAccountRepository);
    });

    it('should return all accounts without filter', async () => {
      const accounts = [
        Account.create({
          code: '1010',
          name: 'Kas',
          accountType: AccountType.ASSET,
          normalBalance: 'Debit',
          isDetailAccount: true,
          isSystemAccount: false,
        }),
        Account.create({
          code: '2010',
          name: 'Hutang',
          accountType: AccountType.LIABILITY,
          normalBalance: 'Credit',
          isDetailAccount: true,
          isSystemAccount: false,
        }),
      ];

      vi.mocked(mockAccountRepository.findAll).mockResolvedValue(accounts);

      const query: ListAccountsQuery = {};
      const result = await handler.execute(query);

      expect(result).toHaveLength(2);
    });

    it('should filter by account type', async () => {
      const assetAccounts = [
        Account.create({
          code: '1010',
          name: 'Kas',
          accountType: AccountType.ASSET,
          normalBalance: 'Debit',
          isDetailAccount: true,
          isSystemAccount: false,
        }),
      ];

      vi.mocked(mockAccountRepository.findAll).mockResolvedValue(assetAccounts);

      const query: ListAccountsQuery = { accountType: AccountType.ASSET };
      const result = await handler.execute(query);

      expect(result).toHaveLength(1);
      expect(mockAccountRepository.findAll).toHaveBeenCalledWith({ accountType: AccountType.ASSET });
    });

    it('should filter by detail account flag', async () => {
      const detailAccounts = [
        Account.create({
          code: '1010',
          name: 'Kas',
          accountType: AccountType.ASSET,
          normalBalance: 'Debit',
          isDetailAccount: true,
          isSystemAccount: false,
        }),
      ];

      vi.mocked(mockAccountRepository.findAll).mockResolvedValue(detailAccounts);

      const query: ListAccountsQuery = { isDetailAccount: true };
      const result = await handler.execute(query);

      expect(result).toHaveLength(1);
      expect(mockAccountRepository.findAll).toHaveBeenCalledWith({ isDetailAccount: true });
    });

    it('should filter by search term', async () => {
      vi.mocked(mockAccountRepository.findAll).mockResolvedValue([]);

      const query: ListAccountsQuery = { search: 'kas' };
      await handler.execute(query);

      expect(mockAccountRepository.findAll).toHaveBeenCalledWith({ search: 'kas' });
    });
  });

  describe('GetAccountTreeQuery', () => {
    let handler: GetAccountTreeHandler;

    beforeEach(() => {
      handler = new GetAccountTreeHandler(mockAccountRepository);
    });

    it('should return account tree', async () => {
      const accounts = [
        Account.create({
          code: '1000',
          name: 'Assets',
          accountType: AccountType.ASSET,
          normalBalance: 'Debit',
          level: 0,
          isDetailAccount: false,
          isSystemAccount: true,
        }),
        Account.create({
          code: '1100',
          name: 'Current Assets',
          accountType: AccountType.ASSET,
          normalBalance: 'Debit',
          level: 1,
          isDetailAccount: false,
          isSystemAccount: false,
        }),
        Account.create({
          code: '1110',
          name: 'Cash',
          accountType: AccountType.ASSET,
          normalBalance: 'Debit',
          level: 2,
          isDetailAccount: true,
          isSystemAccount: false,
        }),
      ];

      vi.mocked(mockAccountRepository.getAccountTree).mockResolvedValue(accounts);

      const query: GetAccountTreeQuery = {};
      const result = await handler.execute(query);

      expect(result).toHaveLength(3);
      expect(result[0].code).toBe('1000');
      expect(result[1].code).toBe('1100');
      expect(result[2].code).toBe('1110');
    });
  });
});
