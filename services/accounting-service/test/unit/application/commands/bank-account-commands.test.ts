import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CreateBankAccountCommand,
  CreateBankAccountHandler,
  UpdateBankAccountCommand,
  UpdateBankAccountHandler,
  DeactivateBankAccountCommand,
  DeactivateBankAccountHandler,
  ReactivateBankAccountCommand,
  ReactivateBankAccountHandler,
  CloseBankAccountCommand,
  CloseBankAccountHandler,
} from '@/application/commands/bank-account.commands';
import { BankAccount } from '@/domain/entities';
import { BankAccountType, BankAccountStatus } from '@/domain/value-objects';
import type { IBankAccountRepository } from '@/domain/repositories';

// Mock repository
const mockBankAccountRepository: IBankAccountRepository = {
  findById: vi.fn(),
  findByAccountId: vi.fn(),
  findByAccountNumber: vi.fn(),
  findAll: vi.fn(),
  findActive: vi.fn(),
  findNeedingReconciliation: vi.fn(),
  accountNumberExists: vi.fn(),
  save: vi.fn(),
  delete: vi.fn(),
};

describe('Bank Account Commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CreateBankAccountHandler', () => {
    let handler: CreateBankAccountHandler;

    beforeEach(() => {
      handler = new CreateBankAccountHandler(mockBankAccountRepository);
    });

    it('should create a new bank account successfully', async () => {
      vi.mocked(mockBankAccountRepository.findByAccountNumber).mockResolvedValue(null);
      vi.mocked(mockBankAccountRepository.findByAccountId).mockResolvedValue(null);
      vi.mocked(mockBankAccountRepository.save).mockResolvedValue(undefined);

      const command: CreateBankAccountCommand = {
        accountId: 'acc-001',
        bankName: 'Bank Central Asia',
        accountNumber: '1234567890',
        accountType: BankAccountType.OPERATING,
        currency: 'IDR',
      };

      const result = await handler.execute(command);

      expect(result.id).toBeDefined();
      expect(result.accountId).toBe('acc-001');
      expect(result.bankName).toBe('Bank Central Asia');
      expect(result.accountNumber).toBe('1234567890');
      expect(result.status).toBe(BankAccountStatus.ACTIVE);
      expect(mockBankAccountRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should throw error if account number already exists', async () => {
      const existingAccount = BankAccount.create({
        accountId: 'acc-002',
        bankName: 'Other Bank',
        accountNumber: '1234567890',
        accountType: BankAccountType.OPERATING,
        currency: 'IDR',
      });
      vi.mocked(mockBankAccountRepository.findByAccountNumber).mockResolvedValue(existingAccount);

      const command: CreateBankAccountCommand = {
        accountId: 'acc-001',
        bankName: 'Bank Central Asia',
        accountNumber: '1234567890',
        accountType: BankAccountType.OPERATING,
        currency: 'IDR',
      };

      await expect(handler.execute(command)).rejects.toThrow(
        'Bank account with account number 1234567890 already exists'
      );
    });

    it('should throw error if COA account is already linked', async () => {
      const existingAccount = BankAccount.create({
        accountId: 'acc-001',
        bankName: 'Other Bank',
        accountNumber: '9876543210',
        accountType: BankAccountType.OPERATING,
        currency: 'IDR',
      });
      vi.mocked(mockBankAccountRepository.findByAccountNumber).mockResolvedValue(null);
      vi.mocked(mockBankAccountRepository.findByAccountId).mockResolvedValue(existingAccount);

      const command: CreateBankAccountCommand = {
        accountId: 'acc-001',
        bankName: 'Bank Central Asia',
        accountNumber: '1234567890',
        accountType: BankAccountType.OPERATING,
        currency: 'IDR',
      };

      await expect(handler.execute(command)).rejects.toThrow(
        'COA account acc-001 is already linked to another bank account'
      );
    });
  });

  describe('UpdateBankAccountHandler', () => {
    let handler: UpdateBankAccountHandler;

    beforeEach(() => {
      handler = new UpdateBankAccountHandler(mockBankAccountRepository);
    });

    it('should update bank account successfully', async () => {
      const bankAccount = BankAccount.create({
        accountId: 'acc-001',
        bankName: 'Old Bank',
        accountNumber: '1234567890',
        accountType: BankAccountType.OPERATING,
        currency: 'IDR',
      });
      vi.mocked(mockBankAccountRepository.findById).mockResolvedValue(bankAccount);
      vi.mocked(mockBankAccountRepository.save).mockResolvedValue(undefined);

      const command: UpdateBankAccountCommand = {
        id: bankAccount.id,
        bankName: 'New Bank Name',
      };

      await handler.execute(command);

      expect(bankAccount.bankName).toBe('New Bank Name');
      expect(mockBankAccountRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should throw error if bank account not found', async () => {
      vi.mocked(mockBankAccountRepository.findById).mockResolvedValue(null);

      const command: UpdateBankAccountCommand = {
        id: 'non-existent-id',
        bankName: 'New Bank Name',
      };

      await expect(handler.execute(command)).rejects.toThrow('Bank account not found');
    });

    it('should throw error if changing to duplicate account number', async () => {
      const bankAccount = BankAccount.create({
        accountId: 'acc-001',
        bankName: 'Bank A',
        accountNumber: '1111111111',
        accountType: BankAccountType.OPERATING,
        currency: 'IDR',
      });
      const existingAccount = BankAccount.create({
        accountId: 'acc-002',
        bankName: 'Bank B',
        accountNumber: '2222222222',
        accountType: BankAccountType.OPERATING,
        currency: 'IDR',
      });
      vi.mocked(mockBankAccountRepository.findById).mockResolvedValue(bankAccount);
      vi.mocked(mockBankAccountRepository.findByAccountNumber).mockResolvedValue(existingAccount);

      const command: UpdateBankAccountCommand = {
        id: bankAccount.id,
        accountNumber: '2222222222',
      };

      await expect(handler.execute(command)).rejects.toThrow(
        'Bank account with account number 2222222222 already exists'
      );
    });
  });

  describe('DeactivateBankAccountHandler', () => {
    let handler: DeactivateBankAccountHandler;

    beforeEach(() => {
      handler = new DeactivateBankAccountHandler(mockBankAccountRepository);
    });

    it('should deactivate bank account successfully', async () => {
      const bankAccount = BankAccount.create({
        accountId: 'acc-001',
        bankName: 'Bank Central Asia',
        accountNumber: '1234567890',
        accountType: BankAccountType.OPERATING,
        currency: 'IDR',
      });
      vi.mocked(mockBankAccountRepository.findById).mockResolvedValue(bankAccount);
      vi.mocked(mockBankAccountRepository.save).mockResolvedValue(undefined);

      const command: DeactivateBankAccountCommand = { id: bankAccount.id };

      const result = await handler.execute(command);

      expect(result.status).toBe(BankAccountStatus.INACTIVE);
      expect(mockBankAccountRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should throw error if bank account not found', async () => {
      vi.mocked(mockBankAccountRepository.findById).mockResolvedValue(null);

      const command: DeactivateBankAccountCommand = { id: 'non-existent-id' };

      await expect(handler.execute(command)).rejects.toThrow('Bank account not found');
    });
  });

  describe('ReactivateBankAccountHandler', () => {
    let handler: ReactivateBankAccountHandler;

    beforeEach(() => {
      handler = new ReactivateBankAccountHandler(mockBankAccountRepository);
    });

    it('should reactivate bank account successfully', async () => {
      const bankAccount = BankAccount.create({
        accountId: 'acc-001',
        bankName: 'Bank Central Asia',
        accountNumber: '1234567890',
        accountType: BankAccountType.OPERATING,
        currency: 'IDR',
      });
      bankAccount.deactivate(); // First deactivate
      vi.mocked(mockBankAccountRepository.findById).mockResolvedValue(bankAccount);
      vi.mocked(mockBankAccountRepository.save).mockResolvedValue(undefined);

      const command: ReactivateBankAccountCommand = { id: bankAccount.id };

      const result = await handler.execute(command);

      expect(result.status).toBe(BankAccountStatus.ACTIVE);
      expect(mockBankAccountRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should throw error if bank account not found', async () => {
      vi.mocked(mockBankAccountRepository.findById).mockResolvedValue(null);

      const command: ReactivateBankAccountCommand = { id: 'non-existent-id' };

      await expect(handler.execute(command)).rejects.toThrow('Bank account not found');
    });
  });

  describe('CloseBankAccountHandler', () => {
    let handler: CloseBankAccountHandler;

    beforeEach(() => {
      handler = new CloseBankAccountHandler(mockBankAccountRepository);
    });

    it('should close bank account successfully', async () => {
      const bankAccount = BankAccount.create({
        accountId: 'acc-001',
        bankName: 'Bank Central Asia',
        accountNumber: '1234567890',
        accountType: BankAccountType.OPERATING,
        currency: 'IDR',
      });
      vi.mocked(mockBankAccountRepository.findById).mockResolvedValue(bankAccount);
      vi.mocked(mockBankAccountRepository.save).mockResolvedValue(undefined);

      const command: CloseBankAccountCommand = { id: bankAccount.id };

      const result = await handler.execute(command);

      expect(result.status).toBe(BankAccountStatus.CLOSED);
      expect(mockBankAccountRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should throw error if bank account not found', async () => {
      vi.mocked(mockBankAccountRepository.findById).mockResolvedValue(null);

      const command: CloseBankAccountCommand = { id: 'non-existent-id' };

      await expect(handler.execute(command)).rejects.toThrow('Bank account not found');
    });
  });
});
