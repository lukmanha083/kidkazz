import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReconciliationService } from '@/domain/services/ReconciliationService';
import { BankReconciliation } from '@/domain/entities';
import { BankTransaction } from '@/domain/entities';
import {
  BankTransactionType,
  BankTransactionMatchStatus,
  ReconciliationItemType,
} from '@/domain/value-objects';

describe('ReconciliationService', () => {
  let service: ReconciliationService;

  beforeEach(() => {
    service = new ReconciliationService();
  });

  describe('matchTransactionToJournalLine', () => {
    it('should match transaction when amount and date match', () => {
      const transaction = BankTransaction.create({
        bankStatementId: 'bst-123',
        bankAccountId: 'ba-123',
        transactionDate: new Date('2026-01-15'),
        description: 'Payment received',
        amount: 5_000_000,
        transactionType: BankTransactionType.CREDIT,
      });

      const journalLine = {
        id: 'jl-456',
        amount: 5_000_000,
        date: new Date('2026-01-15'),
        direction: 'Debit' as const,
      };

      const result = service.matchTransactionToJournalLine(transaction, journalLine, 'user-123');

      expect(result.matched).toBe(true);
      expect(transaction.matchStatus).toBe(BankTransactionMatchStatus.MATCHED);
      expect(transaction.matchedJournalLineId).toBe('jl-456');
    });

    it('should not match when amounts differ', () => {
      const transaction = BankTransaction.create({
        bankStatementId: 'bst-123',
        bankAccountId: 'ba-123',
        transactionDate: new Date('2026-01-15'),
        description: 'Payment received',
        amount: 5_000_000,
        transactionType: BankTransactionType.CREDIT,
      });

      const journalLine = {
        id: 'jl-456',
        amount: 6_000_000, // Different amount
        date: new Date('2026-01-15'),
        direction: 'Debit' as const,
      };

      const result = service.matchTransactionToJournalLine(transaction, journalLine, 'user-123');

      expect(result.matched).toBe(false);
      expect(result.reason).toBe('Amount mismatch');
    });

    it('should not match when dates differ by more than tolerance', () => {
      const transaction = BankTransaction.create({
        bankStatementId: 'bst-123',
        bankAccountId: 'ba-123',
        transactionDate: new Date('2026-01-15'),
        description: 'Payment received',
        amount: 5_000_000,
        transactionType: BankTransactionType.CREDIT,
      });

      const journalLine = {
        id: 'jl-456',
        amount: 5_000_000,
        date: new Date('2026-01-20'), // 5 days difference
        direction: 'Debit' as const,
      };

      const result = service.matchTransactionToJournalLine(transaction, journalLine, 'user-123', {
        dateTolerance: 3,
      });

      expect(result.matched).toBe(false);
      expect(result.reason).toBe('Date outside tolerance');
    });

    it('should match within date tolerance', () => {
      const transaction = BankTransaction.create({
        bankStatementId: 'bst-123',
        bankAccountId: 'ba-123',
        transactionDate: new Date('2026-01-15'),
        description: 'Payment received',
        amount: 5_000_000,
        transactionType: BankTransactionType.CREDIT,
      });

      const journalLine = {
        id: 'jl-456',
        amount: 5_000_000,
        date: new Date('2026-01-17'), // 2 days difference
        direction: 'Debit' as const,
      };

      const result = service.matchTransactionToJournalLine(transaction, journalLine, 'user-123', {
        dateTolerance: 3,
      });

      expect(result.matched).toBe(true);
    });
  });

  describe('autoMatchTransactions', () => {
    it('should automatically match transactions with exact amount and close dates', () => {
      const transactions = [
        BankTransaction.create({
          bankStatementId: 'bst-123',
          bankAccountId: 'ba-123',
          transactionDate: new Date('2026-01-15'),
          description: 'Payment A',
          amount: 1_000_000,
          transactionType: BankTransactionType.CREDIT,
        }),
        BankTransaction.create({
          bankStatementId: 'bst-123',
          bankAccountId: 'ba-123',
          transactionDate: new Date('2026-01-16'),
          description: 'Payment B',
          amount: 2_000_000,
          transactionType: BankTransactionType.CREDIT,
        }),
      ];

      const journalLines = [
        { id: 'jl-1', amount: 1_000_000, date: new Date('2026-01-15'), direction: 'Debit' as const },
        { id: 'jl-2', amount: 2_000_000, date: new Date('2026-01-16'), direction: 'Debit' as const },
        { id: 'jl-3', amount: 3_000_000, date: new Date('2026-01-17'), direction: 'Debit' as const },
      ];

      const result = service.autoMatchTransactions(transactions, journalLines, 'user-123');

      expect(result.matchedCount).toBe(2);
      expect(result.unmatchedCount).toBe(0);
      expect(transactions[0].matchStatus).toBe(BankTransactionMatchStatus.MATCHED);
      expect(transactions[1].matchStatus).toBe(BankTransactionMatchStatus.MATCHED);
    });

    it('should not match already matched transactions', () => {
      const transaction = BankTransaction.create({
        bankStatementId: 'bst-123',
        bankAccountId: 'ba-123',
        transactionDate: new Date('2026-01-15'),
        description: 'Payment A',
        amount: 1_000_000,
        transactionType: BankTransactionType.CREDIT,
      });
      transaction.match('jl-existing', 'user-000');

      const journalLines = [
        { id: 'jl-1', amount: 1_000_000, date: new Date('2026-01-15'), direction: 'Debit' as const },
      ];

      const result = service.autoMatchTransactions([transaction], journalLines, 'user-123');

      expect(result.matchedCount).toBe(0);
      expect(result.skippedCount).toBe(1);
    });
  });

  describe('validateReconciliation (Rule 20)', () => {
    it('should validate when adjusted balances match', () => {
      const recon = BankReconciliation.create({
        bankAccountId: 'ba-123',
        fiscalYear: 2026,
        fiscalMonth: 1,
        statementEndingBalance: 100_000_000,
        bookEndingBalance: 100_000_000,
        createdBy: 'user-123',
      });
      recon.startReconciliation();
      recon.calculateAdjustedBalances();

      const result = service.validateReconciliation(recon);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error when balances do not match', () => {
      const recon = BankReconciliation.create({
        bankAccountId: 'ba-123',
        fiscalYear: 2026,
        fiscalMonth: 1,
        statementEndingBalance: 100_000_000,
        bookEndingBalance: 95_000_000,
        createdBy: 'user-123',
      });
      recon.startReconciliation();
      recon.calculateAdjustedBalances();

      const result = service.validateReconciliation(recon);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Adjusted bank and book balances do not match');
      expect(result.difference).toBe(5_000_000);
    });

    it('should warn about unposted journal entries', () => {
      const recon = BankReconciliation.create({
        bankAccountId: 'ba-123',
        fiscalYear: 2026,
        fiscalMonth: 1,
        statementEndingBalance: 100_000_000,
        bookEndingBalance: 100_000_000,
        createdBy: 'user-123',
      });
      recon.startReconciliation();

      // Add item requiring journal entry
      recon.addReconcilingItem({
        itemType: ReconciliationItemType.BANK_FEE,
        description: 'Service charge',
        amount: 100_000,
        transactionDate: new Date(),
        requiresJournalEntry: true,
        createdBy: 'user-123',
      });

      recon.calculateAdjustedBalances();

      const result = service.validateReconciliation(recon);

      expect(result.warnings).toContain('1 item(s) require journal entries that have not been created');
    });
  });

  describe('generateAdjustingEntries (Rule 22)', () => {
    it('should generate journal entry data for bank fees', () => {
      const recon = BankReconciliation.create({
        bankAccountId: 'ba-123',
        fiscalYear: 2026,
        fiscalMonth: 1,
        statementEndingBalance: 100_000_000,
        bookEndingBalance: 100_000_000,
        createdBy: 'user-123',
      });
      recon.startReconciliation();

      recon.addReconcilingItem({
        itemType: ReconciliationItemType.BANK_FEE,
        description: 'Monthly service charge',
        amount: 150_000,
        transactionDate: new Date('2026-01-31'),
        requiresJournalEntry: true,
        createdBy: 'user-123',
      });

      const entries = service.generateAdjustingEntries(recon, {
        bankAccountGLId: 'acc-1020',
        bankFeeExpenseGLId: 'acc-6100',
        interestIncomeGLId: 'acc-4200',
      });

      expect(entries).toHaveLength(1);
      expect(entries[0].description).toContain('Monthly service charge');
      expect(entries[0].lines).toHaveLength(2);
      // Debit Bank Fee Expense
      expect(entries[0].lines[0].accountId).toBe('acc-6100');
      expect(entries[0].lines[0].direction).toBe('Debit');
      expect(entries[0].lines[0].amount).toBe(150_000);
      // Credit Bank Account
      expect(entries[0].lines[1].accountId).toBe('acc-1020');
      expect(entries[0].lines[1].direction).toBe('Credit');
    });

    it('should generate journal entry data for bank interest', () => {
      const recon = BankReconciliation.create({
        bankAccountId: 'ba-123',
        fiscalYear: 2026,
        fiscalMonth: 1,
        statementEndingBalance: 100_000_000,
        bookEndingBalance: 100_000_000,
        createdBy: 'user-123',
      });
      recon.startReconciliation();

      recon.addReconcilingItem({
        itemType: ReconciliationItemType.BANK_INTEREST,
        description: 'Interest earned',
        amount: 500_000,
        transactionDate: new Date('2026-01-31'),
        requiresJournalEntry: true,
        createdBy: 'user-123',
      });

      const entries = service.generateAdjustingEntries(recon, {
        bankAccountGLId: 'acc-1020',
        bankFeeExpenseGLId: 'acc-6100',
        interestIncomeGLId: 'acc-4200',
      });

      expect(entries).toHaveLength(1);
      // Debit Bank Account
      expect(entries[0].lines[0].accountId).toBe('acc-1020');
      expect(entries[0].lines[0].direction).toBe('Debit');
      expect(entries[0].lines[0].amount).toBe(500_000);
      // Credit Interest Income
      expect(entries[0].lines[1].accountId).toBe('acc-4200');
      expect(entries[0].lines[1].direction).toBe('Credit');
    });
  });
});
