import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CreateAccountCommand,
  CreateAccountHandler,
  UpdateAccountCommand,
  UpdateAccountHandler,
  DeleteAccountCommand,
  DeleteAccountHandler,
} from '@/application/commands/account.commands';
import { Account } from '@/domain/entities';
import { AccountType, AccountCategory, FinancialStatementType } from '@/domain/value-objects';
import type { IAccountRepository } from '@/domain/repositories';

// Mock repository
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

describe('Account Commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CreateAccountCommand', () => {
    let handler: CreateAccountHandler;

    beforeEach(() => {
      handler = new CreateAccountHandler(mockAccountRepository);
    });

    it('should create a new account successfully', async () => {
      vi.mocked(mockAccountRepository.codeExists).mockResolvedValue(false);
      vi.mocked(mockAccountRepository.save).mockResolvedValue(undefined);

      const command: CreateAccountCommand = {
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
      };

      const result = await handler.execute(command);

      expect(result.id).toBeDefined();
      expect(result.code).toBe('1010');
      expect(result.name).toBe('Kas Kecil');
      expect(mockAccountRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should throw error if account code already exists', async () => {
      vi.mocked(mockAccountRepository.codeExists).mockResolvedValue(true);

      const command: CreateAccountCommand = {
        code: '1010',
        name: 'Kas Kecil',
        accountType: AccountType.ASSET,
        normalBalance: 'Debit',
        isDetailAccount: true,
        isSystemAccount: false,
      };

      await expect(handler.execute(command)).rejects.toThrow('Account code 1010 already exists');
    });

    it('should validate parent account exists when provided', async () => {
      vi.mocked(mockAccountRepository.codeExists).mockResolvedValue(false);
      vi.mocked(mockAccountRepository.findById).mockResolvedValue(null);

      const command: CreateAccountCommand = {
        code: '1011',
        name: 'Sub Account',
        accountType: AccountType.ASSET,
        normalBalance: 'Debit',
        parentAccountId: 'non-existent-parent',
        isDetailAccount: true,
        isSystemAccount: false,
      };

      await expect(handler.execute(command)).rejects.toThrow('Parent account not found');
    });

    it('should create account with valid parent', async () => {
      const parentAccount = Account.create({
        code: '1000',
        name: 'Assets',
        accountType: AccountType.ASSET,
        normalBalance: 'Debit',
        isDetailAccount: false,
        isSystemAccount: true,
      });

      vi.mocked(mockAccountRepository.codeExists).mockResolvedValue(false);
      vi.mocked(mockAccountRepository.findById).mockResolvedValue(parentAccount);
      vi.mocked(mockAccountRepository.save).mockResolvedValue(undefined);

      const command: CreateAccountCommand = {
        code: '1010',
        name: 'Cash',
        accountType: AccountType.ASSET,
        normalBalance: 'Debit',
        parentAccountId: parentAccount.id,
        isDetailAccount: true,
        isSystemAccount: false,
      };

      const result = await handler.execute(command);

      expect(result.parentAccountId).toBe(parentAccount.id);
    });
  });

  describe('UpdateAccountCommand', () => {
    let handler: UpdateAccountHandler;

    beforeEach(() => {
      handler = new UpdateAccountHandler(mockAccountRepository);
    });

    it('should update account name and description', async () => {
      const existingAccount = Account.create({
        code: '1010',
        name: 'Old Name',
        accountType: AccountType.ASSET,
        normalBalance: 'Debit',
        isDetailAccount: true,
        isSystemAccount: false,
      });

      vi.mocked(mockAccountRepository.findById).mockResolvedValue(existingAccount);
      vi.mocked(mockAccountRepository.save).mockResolvedValue(undefined);

      const command: UpdateAccountCommand = {
        id: existingAccount.id,
        name: 'New Name',
        description: 'New description',
      };

      const result = await handler.execute(command);

      expect(result.name).toBe('New Name');
      expect(result.description).toBe('New description');
      expect(mockAccountRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should throw error if account not found', async () => {
      vi.mocked(mockAccountRepository.findById).mockResolvedValue(null);

      const command: UpdateAccountCommand = {
        id: 'non-existent-id',
        name: 'New Name',
      };

      await expect(handler.execute(command)).rejects.toThrow('Account not found');
    });

    it('should throw error if updating system account code', async () => {
      const systemAccount = Account.create({
        code: '1000',
        name: 'System Account',
        accountType: AccountType.ASSET,
        normalBalance: 'Debit',
        isDetailAccount: false,
        isSystemAccount: true,
      });

      vi.mocked(mockAccountRepository.findById).mockResolvedValue(systemAccount);

      const command: UpdateAccountCommand = {
        id: systemAccount.id,
        code: '1001',
      };

      await expect(handler.execute(command)).rejects.toThrow('Cannot change code of system account');
    });

    it('should check code uniqueness when updating code', async () => {
      const existingAccount = Account.create({
        code: '1010',
        name: 'Account',
        accountType: AccountType.ASSET,
        normalBalance: 'Debit',
        isDetailAccount: true,
        isSystemAccount: false,
      });

      vi.mocked(mockAccountRepository.findById).mockResolvedValue(existingAccount);
      vi.mocked(mockAccountRepository.codeExists).mockResolvedValue(true);

      const command: UpdateAccountCommand = {
        id: existingAccount.id,
        code: '1020',
      };

      await expect(handler.execute(command)).rejects.toThrow('Account code 1020 already exists');
    });
  });

  describe('DeleteAccountCommand', () => {
    let handler: DeleteAccountHandler;

    beforeEach(() => {
      handler = new DeleteAccountHandler(mockAccountRepository);
    });

    it('should delete account successfully', async () => {
      const account = Account.create({
        code: '1010',
        name: 'Account',
        accountType: AccountType.ASSET,
        normalBalance: 'Debit',
        isDetailAccount: true,
        isSystemAccount: false,
      });

      vi.mocked(mockAccountRepository.findById).mockResolvedValue(account);
      vi.mocked(mockAccountRepository.hasTransactions).mockResolvedValue(false);
      vi.mocked(mockAccountRepository.findByParentId).mockResolvedValue([]);
      vi.mocked(mockAccountRepository.delete).mockResolvedValue(undefined);

      const command: DeleteAccountCommand = {
        id: account.id,
      };

      await handler.execute(command);

      expect(mockAccountRepository.delete).toHaveBeenCalledWith(account.id);
    });

    it('should throw error if account not found', async () => {
      vi.mocked(mockAccountRepository.findById).mockResolvedValue(null);

      const command: DeleteAccountCommand = {
        id: 'non-existent-id',
      };

      await expect(handler.execute(command)).rejects.toThrow('Account not found');
    });

    it('should throw error if account is system account', async () => {
      const systemAccount = Account.create({
        code: '1000',
        name: 'System Account',
        accountType: AccountType.ASSET,
        normalBalance: 'Debit',
        isDetailAccount: false,
        isSystemAccount: true,
      });

      vi.mocked(mockAccountRepository.findById).mockResolvedValue(systemAccount);

      const command: DeleteAccountCommand = {
        id: systemAccount.id,
      };

      await expect(handler.execute(command)).rejects.toThrow('Cannot delete system account');
    });

    it('should throw error if account has transactions', async () => {
      const account = Account.create({
        code: '1010',
        name: 'Account',
        accountType: AccountType.ASSET,
        normalBalance: 'Debit',
        isDetailAccount: true,
        isSystemAccount: false,
      });

      vi.mocked(mockAccountRepository.findById).mockResolvedValue(account);
      vi.mocked(mockAccountRepository.hasTransactions).mockResolvedValue(true);

      const command: DeleteAccountCommand = {
        id: account.id,
      };

      await expect(handler.execute(command)).rejects.toThrow('Cannot delete account with transactions');
    });

    it('should throw error if account has child accounts', async () => {
      const parentAccount = Account.create({
        code: '1000',
        name: 'Parent',
        accountType: AccountType.ASSET,
        normalBalance: 'Debit',
        isDetailAccount: false,
        isSystemAccount: false,
      });

      const childAccount = Account.create({
        code: '1010',
        name: 'Child',
        accountType: AccountType.ASSET,
        normalBalance: 'Debit',
        parentAccountId: parentAccount.id,
        isDetailAccount: true,
        isSystemAccount: false,
      });

      vi.mocked(mockAccountRepository.findById).mockResolvedValue(parentAccount);
      vi.mocked(mockAccountRepository.hasTransactions).mockResolvedValue(false);
      vi.mocked(mockAccountRepository.findByParentId).mockResolvedValue([childAccount]);

      const command: DeleteAccountCommand = {
        id: parentAccount.id,
      };

      await expect(handler.execute(command)).rejects.toThrow('Cannot delete account with child accounts');
    });
  });
});
