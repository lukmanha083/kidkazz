import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CreateReconciliationCommand,
  CreateReconciliationHandler,
  StartReconciliationCommand,
  StartReconciliationHandler,
  MatchTransactionCommand,
  MatchTransactionHandler,
  AddReconcilingItemCommand,
  AddReconcilingItemHandler,
  CalculateAdjustedBalancesCommand,
  CalculateAdjustedBalancesHandler,
  CompleteReconciliationCommand,
  CompleteReconciliationHandler,
  ApproveReconciliationCommand,
  ApproveReconciliationHandler,
} from '@/application/commands/reconciliation.commands';
import { BankReconciliation, BankAccount, BankTransaction } from '@/domain/entities';
import {
  ReconciliationStatus,
  ReconciliationItemType,
  BankAccountType,
  BankTransactionType,
  BankTransactionMatchStatus,
} from '@/domain/value-objects';
import type {
  IBankAccountRepository,
  IBankReconciliationRepository,
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

const mockReconciliationRepository: IBankReconciliationRepository = {
  findById: vi.fn(),
  findByAccountAndPeriod: vi.fn(),
  findByBankAccountId: vi.fn(),
  findByPeriod: vi.fn(),
  findAll: vi.fn(),
  findIncomplete: vi.fn(),
  save: vi.fn(),
  saveItem: vi.fn(),
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
  save: vi.fn(),
  saveMany: vi.fn(),
  delete: vi.fn(),
};

describe('Reconciliation Commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CreateReconciliationHandler', () => {
    let handler: CreateReconciliationHandler;

    beforeEach(() => {
      handler = new CreateReconciliationHandler(mockBankAccountRepository, mockReconciliationRepository);
    });

    it('should create a new reconciliation successfully', async () => {
      const bankAccount = BankAccount.create({
        accountId: 'acc-001',
        bankName: 'BCA',
        accountNumber: '1234567890',
        accountType: BankAccountType.OPERATING,
        currency: 'IDR',
      });
      vi.mocked(mockBankAccountRepository.findById).mockResolvedValue(bankAccount);
      vi.mocked(mockReconciliationRepository.findByAccountAndPeriod).mockResolvedValue(null);
      vi.mocked(mockReconciliationRepository.save).mockResolvedValue(undefined);

      const command: CreateReconciliationCommand = {
        bankAccountId: bankAccount.id,
        fiscalYear: 2025,
        fiscalMonth: 1,
        statementEndingBalance: 50000000,
        bookEndingBalance: 49500000,
        createdBy: 'user-001',
      };

      const result = await handler.execute(command);

      expect(result.id).toBeDefined();
      expect(result.bankAccountId).toBe(bankAccount.id);
      expect(result.fiscalYear).toBe(2025);
      expect(result.fiscalMonth).toBe(1);
      expect(result.status).toBe(ReconciliationStatus.DRAFT);
      expect(mockReconciliationRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should throw error if bank account not found', async () => {
      vi.mocked(mockBankAccountRepository.findById).mockResolvedValue(null);

      const command: CreateReconciliationCommand = {
        bankAccountId: 'non-existent',
        fiscalYear: 2025,
        fiscalMonth: 1,
        statementEndingBalance: 50000000,
        bookEndingBalance: 49500000,
        createdBy: 'user-001',
      };

      await expect(handler.execute(command)).rejects.toThrow('Bank account not found');
    });

    it('should throw error if reconciliation already exists for period', async () => {
      const bankAccount = BankAccount.create({
        accountId: 'acc-001',
        bankName: 'BCA',
        accountNumber: '1234567890',
        accountType: BankAccountType.OPERATING,
        currency: 'IDR',
      });
      const existingReconciliation = BankReconciliation.create({
        bankAccountId: bankAccount.id,
        fiscalYear: 2025,
        fiscalMonth: 1,
        statementEndingBalance: 50000000,
        bookEndingBalance: 49500000,
        createdBy: 'user-001',
      });
      vi.mocked(mockBankAccountRepository.findById).mockResolvedValue(bankAccount);
      vi.mocked(mockReconciliationRepository.findByAccountAndPeriod).mockResolvedValue(existingReconciliation);

      const command: CreateReconciliationCommand = {
        bankAccountId: bankAccount.id,
        fiscalYear: 2025,
        fiscalMonth: 1,
        statementEndingBalance: 50000000,
        bookEndingBalance: 49500000,
        createdBy: 'user-001',
      };

      await expect(handler.execute(command)).rejects.toThrow('Reconciliation already exists for 2025-1');
    });
  });

  describe('StartReconciliationHandler', () => {
    let handler: StartReconciliationHandler;

    beforeEach(() => {
      handler = new StartReconciliationHandler(mockReconciliationRepository);
    });

    it('should start reconciliation successfully', async () => {
      const reconciliation = BankReconciliation.create({
        bankAccountId: 'ba-001',
        fiscalYear: 2025,
        fiscalMonth: 1,
        statementEndingBalance: 50000000,
        bookEndingBalance: 49500000,
        createdBy: 'user-001',
      });
      vi.mocked(mockReconciliationRepository.findById).mockResolvedValue(reconciliation);
      vi.mocked(mockReconciliationRepository.save).mockResolvedValue(undefined);

      const command: StartReconciliationCommand = { reconciliationId: reconciliation.id };

      await handler.execute(command);

      expect(reconciliation.status).toBe(ReconciliationStatus.IN_PROGRESS);
      expect(mockReconciliationRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should throw error if reconciliation not found', async () => {
      vi.mocked(mockReconciliationRepository.findById).mockResolvedValue(null);

      const command: StartReconciliationCommand = { reconciliationId: 'non-existent' };

      await expect(handler.execute(command)).rejects.toThrow('Reconciliation not found');
    });
  });

  describe('MatchTransactionHandler', () => {
    let handler: MatchTransactionHandler;

    beforeEach(() => {
      handler = new MatchTransactionHandler(mockReconciliationRepository, mockBankTransactionRepository);
    });

    it('should match transaction successfully', async () => {
      const reconciliation = BankReconciliation.create({
        bankAccountId: 'ba-001',
        fiscalYear: 2025,
        fiscalMonth: 1,
        statementEndingBalance: 50000000,
        bookEndingBalance: 49500000,
        createdBy: 'user-001',
      });
      reconciliation.startReconciliation();

      const bankTransaction = BankTransaction.create({
        bankStatementId: 'stmt-001',
        bankAccountId: 'ba-001',
        transactionDate: new Date('2025-01-15'),
        description: 'Payment received',
        amount: 1000000,
        transactionType: BankTransactionType.CREDIT,
      });

      vi.mocked(mockReconciliationRepository.findById).mockResolvedValue(reconciliation);
      vi.mocked(mockBankTransactionRepository.findById).mockResolvedValue(bankTransaction);
      vi.mocked(mockBankTransactionRepository.save).mockResolvedValue(undefined);

      const command: MatchTransactionCommand = {
        reconciliationId: reconciliation.id,
        bankTransactionId: bankTransaction.id,
        journalLineId: 'jl-001',
        matchedBy: 'user-001',
      };

      const result = await handler.execute(command);

      expect(result.matched).toBe(true);
      expect(result.bankTransactionId).toBe(bankTransaction.id);
      expect(result.journalLineId).toBe('jl-001');
      expect(bankTransaction.matchStatus).toBe(BankTransactionMatchStatus.MATCHED);
    });

    it('should throw error if reconciliation not in progress', async () => {
      const reconciliation = BankReconciliation.create({
        bankAccountId: 'ba-001',
        fiscalYear: 2025,
        fiscalMonth: 1,
        statementEndingBalance: 50000000,
        bookEndingBalance: 49500000,
        createdBy: 'user-001',
      });
      // Still in DRAFT status

      vi.mocked(mockReconciliationRepository.findById).mockResolvedValue(reconciliation);

      const command: MatchTransactionCommand = {
        reconciliationId: reconciliation.id,
        bankTransactionId: 'tx-001',
        journalLineId: 'jl-001',
        matchedBy: 'user-001',
      };

      await expect(handler.execute(command)).rejects.toThrow(
        'Reconciliation must be in progress to match transactions'
      );
    });

    it('should throw error if transaction already matched', async () => {
      const reconciliation = BankReconciliation.create({
        bankAccountId: 'ba-001',
        fiscalYear: 2025,
        fiscalMonth: 1,
        statementEndingBalance: 50000000,
        bookEndingBalance: 49500000,
        createdBy: 'user-001',
      });
      reconciliation.startReconciliation();

      const bankTransaction = BankTransaction.create({
        bankStatementId: 'stmt-001',
        bankAccountId: 'ba-001',
        transactionDate: new Date('2025-01-15'),
        description: 'Payment received',
        amount: 1000000,
        transactionType: BankTransactionType.CREDIT,
      });
      bankTransaction.match('jl-existing', 'user-001');

      vi.mocked(mockReconciliationRepository.findById).mockResolvedValue(reconciliation);
      vi.mocked(mockBankTransactionRepository.findById).mockResolvedValue(bankTransaction);

      const command: MatchTransactionCommand = {
        reconciliationId: reconciliation.id,
        bankTransactionId: bankTransaction.id,
        journalLineId: 'jl-new',
        matchedBy: 'user-001',
      };

      await expect(handler.execute(command)).rejects.toThrow('Bank transaction is already matched');
    });
  });

  describe('AddReconcilingItemHandler', () => {
    let handler: AddReconcilingItemHandler;

    beforeEach(() => {
      handler = new AddReconcilingItemHandler(mockReconciliationRepository);
    });

    it('should add reconciling item successfully', async () => {
      const reconciliation = BankReconciliation.create({
        bankAccountId: 'ba-001',
        fiscalYear: 2025,
        fiscalMonth: 1,
        statementEndingBalance: 50000000,
        bookEndingBalance: 49500000,
        createdBy: 'user-001',
      });
      reconciliation.startReconciliation();

      vi.mocked(mockReconciliationRepository.findById).mockResolvedValue(reconciliation);
      vi.mocked(mockReconciliationRepository.save).mockResolvedValue(undefined);

      const command: AddReconcilingItemCommand = {
        reconciliationId: reconciliation.id,
        itemType: ReconciliationItemType.OUTSTANDING_CHECK,
        description: 'Check #1234 to vendor ABC',
        amount: 500000,
        transactionDate: new Date('2025-01-20'),
        reference: 'CHK-1234',
        createdBy: 'user-001',
      };

      const result = await handler.execute(command);

      expect(result.itemId).toBeDefined();
      expect(result.type).toBe(ReconciliationItemType.OUTSTANDING_CHECK);
      expect(result.amount).toBe(500000);
      expect(reconciliation.reconcilingItems.length).toBe(1);
    });

    it('should throw error if reconciliation not in progress', async () => {
      const reconciliation = BankReconciliation.create({
        bankAccountId: 'ba-001',
        fiscalYear: 2025,
        fiscalMonth: 1,
        statementEndingBalance: 50000000,
        bookEndingBalance: 49500000,
        createdBy: 'user-001',
      });
      // Still in DRAFT status

      vi.mocked(mockReconciliationRepository.findById).mockResolvedValue(reconciliation);

      const command: AddReconcilingItemCommand = {
        reconciliationId: reconciliation.id,
        itemType: ReconciliationItemType.OUTSTANDING_CHECK,
        description: 'Check #1234',
        amount: 500000,
        transactionDate: new Date('2025-01-20'),
        createdBy: 'user-001',
      };

      await expect(handler.execute(command)).rejects.toThrow(
        'Reconciliation must be in progress to add items'
      );
    });
  });

  describe('CalculateAdjustedBalancesHandler', () => {
    let handler: CalculateAdjustedBalancesHandler;

    beforeEach(() => {
      handler = new CalculateAdjustedBalancesHandler(mockReconciliationRepository);
    });

    it('should calculate adjusted balances successfully', async () => {
      const reconciliation = BankReconciliation.create({
        bankAccountId: 'ba-001',
        fiscalYear: 2025,
        fiscalMonth: 1,
        statementEndingBalance: 50000000,
        bookEndingBalance: 49500000,
        createdBy: 'user-001',
      });
      reconciliation.startReconciliation();
      // Add some items to test calculation
      reconciliation.addReconcilingItem({
        itemType: ReconciliationItemType.OUTSTANDING_CHECK,
        description: 'Outstanding check',
        amount: 500000,
        transactionDate: new Date(),
        createdBy: 'user-001',
      });

      vi.mocked(mockReconciliationRepository.findById).mockResolvedValue(reconciliation);
      vi.mocked(mockReconciliationRepository.save).mockResolvedValue(undefined);

      const command: CalculateAdjustedBalancesCommand = { reconciliationId: reconciliation.id };

      const result = await handler.execute(command);

      expect(result.adjustedBankBalance).toBeDefined();
      expect(result.adjustedBookBalance).toBeDefined();
      expect(typeof result.difference).toBe('number');
      expect(typeof result.isBalanced).toBe('boolean');
    });

    it('should throw error if reconciliation not found', async () => {
      vi.mocked(mockReconciliationRepository.findById).mockResolvedValue(null);

      const command: CalculateAdjustedBalancesCommand = { reconciliationId: 'non-existent' };

      await expect(handler.execute(command)).rejects.toThrow('Reconciliation not found');
    });
  });

  describe('CompleteReconciliationHandler', () => {
    let handler: CompleteReconciliationHandler;

    beforeEach(() => {
      handler = new CompleteReconciliationHandler(mockReconciliationRepository);
    });

    it('should complete reconciliation when balanced', async () => {
      const reconciliation = BankReconciliation.create({
        bankAccountId: 'ba-001',
        fiscalYear: 2025,
        fiscalMonth: 1,
        statementEndingBalance: 50000000,
        bookEndingBalance: 50000000, // Same as statement for balanced
        createdBy: 'user-001',
      });
      reconciliation.startReconciliation();

      vi.mocked(mockReconciliationRepository.findById).mockResolvedValue(reconciliation);
      vi.mocked(mockReconciliationRepository.save).mockResolvedValue(undefined);

      const command: CompleteReconciliationCommand = {
        reconciliationId: reconciliation.id,
        completedBy: 'user-001',
      };

      const result = await handler.execute(command);

      expect(result.status).toBe(ReconciliationStatus.COMPLETED);
      expect(result.isBalanced).toBe(true);
    });

    it('should throw error if reconciliation not found', async () => {
      vi.mocked(mockReconciliationRepository.findById).mockResolvedValue(null);

      const command: CompleteReconciliationCommand = {
        reconciliationId: 'non-existent',
        completedBy: 'user-001',
      };

      await expect(handler.execute(command)).rejects.toThrow('Reconciliation not found');
    });
  });

  describe('ApproveReconciliationHandler', () => {
    let handler: ApproveReconciliationHandler;

    beforeEach(() => {
      handler = new ApproveReconciliationHandler(mockReconciliationRepository, mockBankAccountRepository);
    });

    it('should approve reconciliation and update bank account', async () => {
      const bankAccount = BankAccount.create({
        accountId: 'acc-001',
        bankName: 'BCA',
        accountNumber: '1234567890',
        accountType: BankAccountType.OPERATING,
        currency: 'IDR',
      });
      const reconciliation = BankReconciliation.create({
        bankAccountId: bankAccount.id,
        fiscalYear: 2025,
        fiscalMonth: 1,
        statementEndingBalance: 50000000,
        bookEndingBalance: 50000000,
        createdBy: 'user-001',
      });
      reconciliation.startReconciliation();
      reconciliation.calculateAdjustedBalances();
      reconciliation.complete('user-001');

      vi.mocked(mockReconciliationRepository.findById).mockResolvedValue(reconciliation);
      vi.mocked(mockReconciliationRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockBankAccountRepository.findById).mockResolvedValue(bankAccount);
      vi.mocked(mockBankAccountRepository.save).mockResolvedValue(undefined);

      const command: ApproveReconciliationCommand = {
        reconciliationId: reconciliation.id,
        approvedBy: 'manager-001',
      };

      const result = await handler.execute(command);

      expect(result.status).toBe(ReconciliationStatus.APPROVED);
      expect(result.approvedBy).toBe('manager-001');
      expect(result.approvedAt).toBeDefined();
      expect(mockBankAccountRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should throw error if reconciliation not found', async () => {
      vi.mocked(mockReconciliationRepository.findById).mockResolvedValue(null);

      const command: ApproveReconciliationCommand = {
        reconciliationId: 'non-existent',
        approvedBy: 'manager-001',
      };

      await expect(handler.execute(command)).rejects.toThrow('Reconciliation not found');
    });
  });
});
