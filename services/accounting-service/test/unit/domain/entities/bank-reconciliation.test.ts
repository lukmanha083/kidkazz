import { describe, it, expect } from 'vitest';
import { BankReconciliation, type BankReconciliationProps } from '@/domain/entities/bank-reconciliation.entity';
import { ReconciliationStatus, ReconciliationItemType, ReconciliationItemStatus } from '@/domain/value-objects';

describe('BankReconciliation', () => {
  const validProps: BankReconciliationProps = {
    bankAccountId: 'ba-123',
    fiscalYear: 2026,
    fiscalMonth: 1,
    statementEndingBalance: 150_000_000,
    bookEndingBalance: 145_000_000,
    createdBy: 'user-123',
  };

  describe('create', () => {
    it('should create a reconciliation in DRAFT status', () => {
      const recon = BankReconciliation.create(validProps);

      expect(recon.bankAccountId).toBe('ba-123');
      expect(recon.fiscalYear).toBe(2026);
      expect(recon.fiscalMonth).toBe(1);
      expect(recon.statementEndingBalance).toBe(150_000_000);
      expect(recon.bookEndingBalance).toBe(145_000_000);
      expect(recon.status).toBe(ReconciliationStatus.DRAFT);
      expect(recon.totalTransactions).toBe(0);
      expect(recon.matchedTransactions).toBe(0);
      expect(recon.unmatchedTransactions).toBe(0);
    });

    it('should generate unique ID with rec- prefix', () => {
      const recon1 = BankReconciliation.create(validProps);
      const recon2 = BankReconciliation.create(validProps);

      expect(recon1.id).toMatch(/^rec-/);
      expect(recon2.id).toMatch(/^rec-/);
      expect(recon1.id).not.toBe(recon2.id);
    });

    it('should throw error if bank account ID is empty', () => {
      expect(() =>
        BankReconciliation.create({
          ...validProps,
          bankAccountId: '',
        })
      ).toThrow('Bank account ID is required');
    });

    it('should throw error if fiscal year is invalid', () => {
      expect(() =>
        BankReconciliation.create({
          ...validProps,
          fiscalYear: 1999,
        })
      ).toThrow('Invalid fiscal year');
    });

    it('should throw error if fiscal month is invalid', () => {
      expect(() =>
        BankReconciliation.create({
          ...validProps,
          fiscalMonth: 13,
        })
      ).toThrow('Fiscal month must be between 1 and 12');
    });
  });

  describe('startReconciliation', () => {
    it('should transition from DRAFT to IN_PROGRESS', () => {
      const recon = BankReconciliation.create(validProps);

      recon.startReconciliation();

      expect(recon.status).toBe(ReconciliationStatus.IN_PROGRESS);
    });

    it('should throw error if not in DRAFT status', () => {
      const recon = BankReconciliation.create(validProps);
      recon.startReconciliation();

      expect(() => recon.startReconciliation()).toThrow(
        'Can only start reconciliation from DRAFT status'
      );
    });
  });

  describe('updateTransactionCounts', () => {
    it('should update transaction counts', () => {
      const recon = BankReconciliation.create(validProps);
      recon.startReconciliation();

      recon.updateTransactionCounts(100, 85, 15);

      expect(recon.totalTransactions).toBe(100);
      expect(recon.matchedTransactions).toBe(85);
      expect(recon.unmatchedTransactions).toBe(15);
    });
  });

  describe('addReconcilingItem', () => {
    it('should add outstanding check item', () => {
      const recon = BankReconciliation.create(validProps);
      recon.startReconciliation();

      const item = recon.addReconcilingItem({
        itemType: ReconciliationItemType.OUTSTANDING_CHECK,
        description: 'Check #1234 to Supplier XYZ',
        amount: 5_000_000,
        transactionDate: new Date('2026-01-28'),
        reference: 'CHK-1234',
        createdBy: 'user-123',
      });

      expect(item.itemType).toBe(ReconciliationItemType.OUTSTANDING_CHECK);
      expect(item.amount).toBe(5_000_000);
      expect(item.status).toBe(ReconciliationItemStatus.PENDING);
      expect(recon.reconcilingItems.length).toBe(1);
    });

    it('should add deposit in transit item', () => {
      const recon = BankReconciliation.create(validProps);
      recon.startReconciliation();

      const item = recon.addReconcilingItem({
        itemType: ReconciliationItemType.DEPOSIT_IN_TRANSIT,
        description: 'Daily deposit from sales',
        amount: 10_000_000,
        transactionDate: new Date('2026-01-31'),
        createdBy: 'user-123',
      });

      expect(item.itemType).toBe(ReconciliationItemType.DEPOSIT_IN_TRANSIT);
      expect(item.requiresJournalEntry).toBe(false);
    });

    it('should add bank fee item requiring journal entry', () => {
      const recon = BankReconciliation.create(validProps);
      recon.startReconciliation();

      const item = recon.addReconcilingItem({
        itemType: ReconciliationItemType.BANK_FEE,
        description: 'Monthly service charge',
        amount: 150_000,
        transactionDate: new Date('2026-01-31'),
        requiresJournalEntry: true,
        createdBy: 'user-123',
      });

      expect(item.itemType).toBe(ReconciliationItemType.BANK_FEE);
      expect(item.requiresJournalEntry).toBe(true);
    });

    it('should throw error if not in IN_PROGRESS status', () => {
      const recon = BankReconciliation.create(validProps);

      expect(() =>
        recon.addReconcilingItem({
          itemType: ReconciliationItemType.OUTSTANDING_CHECK,
          description: 'Test',
          amount: 1000,
          transactionDate: new Date(),
          createdBy: 'user-123',
        })
      ).toThrow('Can only add items when reconciliation is in progress');
    });
  });

  describe('calculateAdjustedBalances', () => {
    it('should calculate adjusted bank balance (Rule 20)', () => {
      const recon = BankReconciliation.create({
        ...validProps,
        statementEndingBalance: 150_000_000,
        bookEndingBalance: 145_000_000,
      });
      recon.startReconciliation();

      // Add outstanding checks (deduct from bank balance)
      recon.addReconcilingItem({
        itemType: ReconciliationItemType.OUTSTANDING_CHECK,
        description: 'Check #1',
        amount: 5_000_000,
        transactionDate: new Date(),
        createdBy: 'user-123',
      });

      // Add deposits in transit (add to bank balance)
      recon.addReconcilingItem({
        itemType: ReconciliationItemType.DEPOSIT_IN_TRANSIT,
        description: 'Deposit #1',
        amount: 3_000_000,
        transactionDate: new Date(),
        createdBy: 'user-123',
      });

      recon.calculateAdjustedBalances();

      // Adjusted Bank = 150M - 5M (outstanding checks) + 3M (deposits in transit) = 148M
      expect(recon.adjustedBankBalance).toBe(148_000_000);
    });

    it('should calculate adjusted book balance (Rule 20)', () => {
      const recon = BankReconciliation.create({
        ...validProps,
        statementEndingBalance: 150_000_000,
        bookEndingBalance: 148_150_000,
      });
      recon.startReconciliation();

      // Add bank fees (deduct from book balance)
      recon.addReconcilingItem({
        itemType: ReconciliationItemType.BANK_FEE,
        description: 'Service charge',
        amount: 150_000,
        transactionDate: new Date(),
        requiresJournalEntry: true,
        createdBy: 'user-123',
      });

      // Add bank interest (add to book balance)
      recon.addReconcilingItem({
        itemType: ReconciliationItemType.BANK_INTEREST,
        description: 'Interest earned',
        amount: 500_000,
        transactionDate: new Date(),
        requiresJournalEntry: true,
        createdBy: 'user-123',
      });

      recon.calculateAdjustedBalances();

      // Adjusted Book = 148.15M - 150K (fees) + 500K (interest) = 148.5M
      expect(recon.adjustedBookBalance).toBe(148_500_000);
    });
  });

  describe('isBalanced (Rule 20)', () => {
    it('should return true when adjusted balances match', () => {
      const recon = BankReconciliation.create({
        ...validProps,
        statementEndingBalance: 150_000_000,
        bookEndingBalance: 147_000_000,
      });
      recon.startReconciliation();

      // Outstanding check: 5M
      recon.addReconcilingItem({
        itemType: ReconciliationItemType.OUTSTANDING_CHECK,
        description: 'Check #1',
        amount: 5_000_000,
        transactionDate: new Date(),
        createdBy: 'user-123',
      });

      // Bank fee: 2M (to be recorded in books)
      recon.addReconcilingItem({
        itemType: ReconciliationItemType.BANK_FEE,
        description: 'Wire fee',
        amount: 2_000_000,
        transactionDate: new Date(),
        requiresJournalEntry: true,
        createdBy: 'user-123',
      });

      recon.calculateAdjustedBalances();

      // Adjusted Bank = 150M - 5M = 145M
      // Adjusted Book = 147M - 2M = 145M
      expect(recon.isBalanced()).toBe(true);
    });

    it('should return false when adjusted balances do not match', () => {
      const recon = BankReconciliation.create({
        ...validProps,
        statementEndingBalance: 150_000_000,
        bookEndingBalance: 145_000_000,
      });
      recon.startReconciliation();
      recon.calculateAdjustedBalances();

      // No adjustments - difference of 5M
      expect(recon.isBalanced()).toBe(false);
    });
  });

  describe('complete (Rule 20)', () => {
    it('should complete reconciliation when balanced', () => {
      const recon = BankReconciliation.create({
        ...validProps,
        statementEndingBalance: 145_000_000,
        bookEndingBalance: 145_000_000,
      });
      recon.startReconciliation();
      recon.calculateAdjustedBalances();

      recon.complete('user-123');

      expect(recon.status).toBe(ReconciliationStatus.COMPLETED);
      expect(recon.completedAt).toBeInstanceOf(Date);
      expect(recon.completedBy).toBe('user-123');
    });

    it('should throw error if not balanced', () => {
      const recon = BankReconciliation.create({
        ...validProps,
        statementEndingBalance: 150_000_000,
        bookEndingBalance: 145_000_000,
      });
      recon.startReconciliation();
      recon.calculateAdjustedBalances();

      expect(() => recon.complete('user-123')).toThrow(
        'Cannot complete reconciliation: adjusted bank and book balances do not match'
      );
    });

    it('should throw error if not in IN_PROGRESS status', () => {
      const recon = BankReconciliation.create(validProps);

      expect(() => recon.complete('user-123')).toThrow(
        'Can only complete reconciliation from IN_PROGRESS status'
      );
    });
  });

  describe('approve', () => {
    it('should approve completed reconciliation', () => {
      const recon = BankReconciliation.create({
        ...validProps,
        statementEndingBalance: 145_000_000,
        bookEndingBalance: 145_000_000,
      });
      recon.startReconciliation();
      recon.calculateAdjustedBalances();
      recon.complete('user-123');

      recon.approve('manager-456');

      expect(recon.status).toBe(ReconciliationStatus.APPROVED);
      expect(recon.approvedAt).toBeInstanceOf(Date);
      expect(recon.approvedBy).toBe('manager-456');
    });

    it('should throw error if not COMPLETED', () => {
      const recon = BankReconciliation.create(validProps);
      recon.startReconciliation();

      expect(() => recon.approve('manager-456')).toThrow(
        'Can only approve completed reconciliations'
      );
    });
  });

  describe('getOutstandingItems', () => {
    it('should return only pending items', () => {
      const recon = BankReconciliation.create(validProps);
      recon.startReconciliation();

      recon.addReconcilingItem({
        itemType: ReconciliationItemType.OUTSTANDING_CHECK,
        description: 'Check #1',
        amount: 1_000_000,
        transactionDate: new Date(),
        createdBy: 'user-123',
      });

      recon.addReconcilingItem({
        itemType: ReconciliationItemType.OUTSTANDING_CHECK,
        description: 'Check #2',
        amount: 2_000_000,
        transactionDate: new Date(),
        createdBy: 'user-123',
      });

      const outstanding = recon.getOutstandingItems();

      expect(outstanding.length).toBe(2);
      expect(outstanding[0].status).toBe(ReconciliationItemStatus.PENDING);
    });
  });

  describe('fromPersistence', () => {
    it('should reconstitute reconciliation from persistence data', () => {
      const recon = BankReconciliation.fromPersistence({
        id: 'rec-123',
        bankAccountId: 'ba-123',
        fiscalYear: 2026,
        fiscalMonth: 1,
        statementEndingBalance: 150_000_000,
        bookEndingBalance: 145_000_000,
        adjustedBankBalance: 148_000_000,
        adjustedBookBalance: 148_000_000,
        totalTransactions: 100,
        matchedTransactions: 95,
        unmatchedTransactions: 5,
        status: ReconciliationStatus.COMPLETED,
        completedAt: new Date('2026-02-01'),
        completedBy: 'user-123',
        notes: 'Monthly reconciliation',
        createdAt: new Date('2026-01-31'),
        updatedAt: new Date('2026-02-01'),
        createdBy: 'user-123',
        updatedBy: 'user-123',
        reconcilingItems: [],
      });

      expect(recon.id).toBe('rec-123');
      expect(recon.status).toBe(ReconciliationStatus.COMPLETED);
      expect(recon.adjustedBankBalance).toBe(148_000_000);
      expect(recon.adjustedBookBalance).toBe(148_000_000);
      expect(recon.completedBy).toBe('user-123');
    });
  });
});
