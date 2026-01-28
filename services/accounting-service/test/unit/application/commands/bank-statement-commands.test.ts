import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ImportBankStatementCommand,
  ImportBankStatementHandler,
  DeleteBankStatementCommand,
  DeleteBankStatementHandler,
} from '@/application/commands/bank-statement.commands';
import { BankAccount, BankStatement, BankTransaction } from '@/domain/entities';
import {
  BankAccountType,
  BankTransactionType,
  BankTransactionMatchStatus,
} from '@/domain/value-objects';
import type {
  IBankAccountRepository,
  IBankStatementRepository,
  IBankTransactionRepository,
} from '@/domain/repositories';

// Mock repositories
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

const mockBankStatementRepository: IBankStatementRepository = {
  findById: vi.fn(),
  findByBankAccountId: vi.fn(),
  findByPeriod: vi.fn(),
  findAll: vi.fn(),
  save: vi.fn(),
  delete: vi.fn(),
};

const mockBankTransactionRepository: IBankTransactionRepository = {
  findById: vi.fn(),
  findByFingerprint: vi.fn(),
  findByStatementId: vi.fn(),
  findByBankAccountId: vi.fn(),
  findUnmatched: vi.fn(),
  findAll: vi.fn(),
  fingerprintExists: vi.fn(),
  fingerprintsExistMany: vi.fn(),
  save: vi.fn(),
  saveMany: vi.fn(),
  delete: vi.fn(),
};

describe('Bank Statement Commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ImportBankStatementHandler', () => {
    let handler: ImportBankStatementHandler;

    beforeEach(() => {
      handler = new ImportBankStatementHandler(
        mockBankAccountRepository,
        mockBankStatementRepository,
        mockBankTransactionRepository
      );
    });

    it('should import bank statement with transactions successfully', async () => {
      const bankAccount = BankAccount.create({
        accountId: 'acc-001',
        bankName: 'BCA',
        accountNumber: '1234567890',
        accountType: BankAccountType.OPERATING,
        currency: 'IDR',
      });
      vi.mocked(mockBankAccountRepository.findById).mockResolvedValue(bankAccount);
      vi.mocked(mockBankStatementRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockBankTransactionRepository.fingerprintsExistMany).mockResolvedValue(new Set());
      vi.mocked(mockBankTransactionRepository.saveMany).mockResolvedValue(undefined);

      const command: ImportBankStatementCommand = {
        bankAccountId: bankAccount.id,
        statementDate: new Date('2025-01-31'),
        periodStart: new Date('2025-01-01'),
        periodEnd: new Date('2025-01-31'),
        openingBalance: 45000000,
        closingBalance: 50000000,
        transactions: [
          {
            transactionDate: new Date('2025-01-15'),
            description: 'Payment received',
            amount: 5000000,
          },
          {
            transactionDate: new Date('2025-01-20'),
            description: 'Check payment',
            amount: -1000000,
            checkNumber: 'CHK-001',
          },
        ],
        importedBy: 'user-001',
      };

      const result = await handler.execute(command);

      expect(result.statementId).toBeDefined();
      expect(result.bankAccountId).toBe(bankAccount.id);
      expect(result.transactionsImported).toBe(2);
      expect(result.duplicatesSkipped).toBe(0);
      expect(mockBankStatementRepository.save).toHaveBeenCalledTimes(2); // Initial + update
      expect(mockBankTransactionRepository.saveMany).toHaveBeenCalledTimes(1);
    });

    it('should skip duplicate transactions based on fingerprint', async () => {
      const bankAccount = BankAccount.create({
        accountId: 'acc-001',
        bankName: 'BCA',
        accountNumber: '1234567890',
        accountType: BankAccountType.OPERATING,
        currency: 'IDR',
      });
      // Create an existing transaction to get its fingerprint
      const existingTransaction = BankTransaction.create({
        bankStatementId: 'stmt-old',
        bankAccountId: bankAccount.id,
        transactionDate: new Date('2025-01-15'),
        description: 'Payment received',
        amount: 5000000,
        transactionType: BankTransactionType.CREDIT,
      });

      vi.mocked(mockBankAccountRepository.findById).mockResolvedValue(bankAccount);
      vi.mocked(mockBankStatementRepository.save).mockResolvedValue(undefined);
      // Return the fingerprint of the first transaction as existing
      vi.mocked(mockBankTransactionRepository.fingerprintsExistMany).mockResolvedValue(
        new Set([existingTransaction.fingerprint])
      );
      vi.mocked(mockBankTransactionRepository.saveMany).mockResolvedValue(undefined);

      const command: ImportBankStatementCommand = {
        bankAccountId: bankAccount.id,
        statementDate: new Date('2025-01-31'),
        periodStart: new Date('2025-01-01'),
        periodEnd: new Date('2025-01-31'),
        openingBalance: 45000000,
        closingBalance: 50000000,
        transactions: [
          {
            transactionDate: new Date('2025-01-15'),
            description: 'Payment received',
            amount: 5000000,
          },
          {
            transactionDate: new Date('2025-01-20'),
            description: 'New payment',
            amount: 2000000,
          },
        ],
        importedBy: 'user-001',
      };

      const result = await handler.execute(command);

      expect(result.transactionsImported).toBe(1);
      expect(result.duplicatesSkipped).toBe(1);
    });

    it('should throw error if bank account not found', async () => {
      vi.mocked(mockBankAccountRepository.findById).mockResolvedValue(null);

      const command: ImportBankStatementCommand = {
        bankAccountId: 'non-existent',
        statementDate: new Date('2025-01-31'),
        periodStart: new Date('2025-01-01'),
        periodEnd: new Date('2025-01-31'),
        openingBalance: 45000000,
        closingBalance: 50000000,
        transactions: [],
        importedBy: 'user-001',
      };

      await expect(handler.execute(command)).rejects.toThrow('Bank account not found');
    });

    it('should throw error if bank account is inactive', async () => {
      const bankAccount = BankAccount.create({
        accountId: 'acc-001',
        bankName: 'BCA',
        accountNumber: '1234567890',
        accountType: BankAccountType.OPERATING,
        currency: 'IDR',
      });
      bankAccount.deactivate();

      vi.mocked(mockBankAccountRepository.findById).mockResolvedValue(bankAccount);

      const command: ImportBankStatementCommand = {
        bankAccountId: bankAccount.id,
        statementDate: new Date('2025-01-31'),
        periodStart: new Date('2025-01-01'),
        periodEnd: new Date('2025-01-31'),
        openingBalance: 45000000,
        closingBalance: 50000000,
        transactions: [],
        importedBy: 'user-001',
      };

      await expect(handler.execute(command)).rejects.toThrow(
        'Cannot import statement for inactive bank account'
      );
    });
  });

  describe('DeleteBankStatementHandler', () => {
    let handler: DeleteBankStatementHandler;

    beforeEach(() => {
      handler = new DeleteBankStatementHandler(
        mockBankStatementRepository,
        mockBankTransactionRepository
      );
    });

    it('should delete statement with unmatched transactions', async () => {
      const statement = BankStatement.create({
        bankAccountId: 'ba-001',
        statementDate: new Date('2025-01-31'),
        periodStart: new Date('2025-01-01'),
        periodEnd: new Date('2025-01-31'),
        openingBalance: 45000000,
        closingBalance: 50000000,
      });
      const transaction = BankTransaction.create({
        bankStatementId: statement.id,
        bankAccountId: 'ba-001',
        transactionDate: new Date('2025-01-15'),
        description: 'Payment received',
        amount: 5000000,
        transactionType: BankTransactionType.CREDIT,
      });

      vi.mocked(mockBankStatementRepository.findById).mockResolvedValue(statement);
      vi.mocked(mockBankTransactionRepository.findByStatementId).mockResolvedValue([transaction]);
      vi.mocked(mockBankTransactionRepository.delete).mockResolvedValue(undefined);
      vi.mocked(mockBankStatementRepository.delete).mockResolvedValue(undefined);

      const command: DeleteBankStatementCommand = { statementId: statement.id };

      await handler.execute(command);

      expect(mockBankTransactionRepository.delete).toHaveBeenCalledWith(transaction.id);
      expect(mockBankStatementRepository.delete).toHaveBeenCalledWith(statement.id);
    });

    it('should throw error if statement has matched transactions', async () => {
      const statement = BankStatement.create({
        bankAccountId: 'ba-001',
        statementDate: new Date('2025-01-31'),
        periodStart: new Date('2025-01-01'),
        periodEnd: new Date('2025-01-31'),
        openingBalance: 45000000,
        closingBalance: 50000000,
      });
      const matchedTransaction = BankTransaction.create({
        bankStatementId: statement.id,
        bankAccountId: 'ba-001',
        transactionDate: new Date('2025-01-15'),
        description: 'Payment received',
        amount: 5000000,
        transactionType: BankTransactionType.CREDIT,
      });
      matchedTransaction.match('jl-001', 'user-001');

      vi.mocked(mockBankStatementRepository.findById).mockResolvedValue(statement);
      vi.mocked(mockBankTransactionRepository.findByStatementId).mockResolvedValue([
        matchedTransaction,
      ]);

      const command: DeleteBankStatementCommand = { statementId: statement.id };

      await expect(handler.execute(command)).rejects.toThrow(
        'Cannot delete statement with 1 matched transactions'
      );
    });

    it('should throw error if statement not found', async () => {
      vi.mocked(mockBankStatementRepository.findById).mockResolvedValue(null);

      const command: DeleteBankStatementCommand = { statementId: 'non-existent' };

      await expect(handler.execute(command)).rejects.toThrow('Bank statement not found');
    });
  });
});
