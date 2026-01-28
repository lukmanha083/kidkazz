import { describe, it, expect } from 'vitest';
import { BankTransaction, type BankTransactionProps } from '@/domain/entities/bank-transaction.entity';
import { BankTransactionType, BankTransactionMatchStatus } from '@/domain/value-objects';

describe('BankTransaction', () => {
  const validProps: BankTransactionProps = {
    bankStatementId: 'bst-123',
    bankAccountId: 'ba-123',
    transactionDate: new Date('2026-01-15'),
    description: 'Payment from Customer ABC',
    reference: 'INV-2026-001',
    amount: 5_000_000,
    transactionType: BankTransactionType.CREDIT,
    runningBalance: 105_000_000,
  };

  describe('create', () => {
    it('should create a bank transaction with valid props', () => {
      const transaction = BankTransaction.create(validProps);

      expect(transaction.bankStatementId).toBe('bst-123');
      expect(transaction.bankAccountId).toBe('ba-123');
      expect(transaction.transactionDate).toEqual(new Date('2026-01-15'));
      expect(transaction.description).toBe('Payment from Customer ABC');
      expect(transaction.reference).toBe('INV-2026-001');
      expect(transaction.amount).toBe(5_000_000);
      expect(transaction.transactionType).toBe(BankTransactionType.CREDIT);
      expect(transaction.runningBalance).toBe(105_000_000);
      expect(transaction.matchStatus).toBe(BankTransactionMatchStatus.UNMATCHED);
    });

    it('should generate unique ID with btx- prefix', () => {
      const tx1 = BankTransaction.create(validProps);
      const tx2 = BankTransaction.create(validProps);

      expect(tx1.id).toMatch(/^btx-/);
      expect(tx2.id).toMatch(/^btx-/);
      expect(tx1.id).not.toBe(tx2.id);
    });

    it('should generate fingerprint for duplicate detection', () => {
      const transaction = BankTransaction.create(validProps);

      expect(transaction.fingerprint).toBeDefined();
      expect(transaction.fingerprint.length).toBe(32);
    });

    it('should generate same fingerprint for identical transaction data', () => {
      const tx1 = BankTransaction.create(validProps);
      const tx2 = BankTransaction.create(validProps);

      expect(tx1.fingerprint).toBe(tx2.fingerprint);
    });

    it('should generate different fingerprint for different amount', () => {
      const tx1 = BankTransaction.create(validProps);
      const tx2 = BankTransaction.create({
        ...validProps,
        amount: 6_000_000,
      });

      expect(tx1.fingerprint).not.toBe(tx2.fingerprint);
    });

    it('should generate different fingerprint for different date', () => {
      const tx1 = BankTransaction.create(validProps);
      const tx2 = BankTransaction.create({
        ...validProps,
        transactionDate: new Date('2026-01-16'),
      });

      expect(tx1.fingerprint).not.toBe(tx2.fingerprint);
    });

    it('should generate different fingerprint for different reference', () => {
      const tx1 = BankTransaction.create(validProps);
      const tx2 = BankTransaction.create({
        ...validProps,
        reference: 'INV-2026-002',
      });

      expect(tx1.fingerprint).not.toBe(tx2.fingerprint);
    });

    it('should throw error if bank statement ID is empty', () => {
      expect(() =>
        BankTransaction.create({
          ...validProps,
          bankStatementId: '',
        })
      ).toThrow('Bank statement ID is required');
    });

    it('should throw error if bank account ID is empty', () => {
      expect(() =>
        BankTransaction.create({
          ...validProps,
          bankAccountId: '',
        })
      ).toThrow('Bank account ID is required');
    });

    it('should throw error if description is empty', () => {
      expect(() =>
        BankTransaction.create({
          ...validProps,
          description: '',
        })
      ).toThrow('Description is required');
    });

    it('should throw error if amount is zero', () => {
      expect(() =>
        BankTransaction.create({
          ...validProps,
          amount: 0,
        })
      ).toThrow('Amount must be non-zero');
    });

    it('should allow negative amounts for debits', () => {
      const transaction = BankTransaction.create({
        ...validProps,
        amount: -5_000_000,
        transactionType: BankTransactionType.DEBIT,
      });

      expect(transaction.amount).toBe(-5_000_000);
    });
  });

  describe('match', () => {
    it('should match transaction to journal line', () => {
      const transaction = BankTransaction.create(validProps);

      transaction.match('jl-456', 'user-123');

      expect(transaction.matchStatus).toBe(BankTransactionMatchStatus.MATCHED);
      expect(transaction.matchedJournalLineId).toBe('jl-456');
      expect(transaction.matchedBy).toBe('user-123');
      expect(transaction.matchedAt).toBeInstanceOf(Date);
    });

    it('should throw error if already matched', () => {
      const transaction = BankTransaction.create(validProps);
      transaction.match('jl-456', 'user-123');

      expect(() =>
        transaction.match('jl-789', 'user-456')
      ).toThrow('Transaction is already matched');
    });

    it('should throw error if excluded', () => {
      const transaction = BankTransaction.create(validProps);
      transaction.exclude('user-123');

      expect(() =>
        transaction.match('jl-456', 'user-123')
      ).toThrow('Cannot match an excluded transaction');
    });
  });

  describe('unmatch', () => {
    it('should unmatch a matched transaction', () => {
      const transaction = BankTransaction.create(validProps);
      transaction.match('jl-456', 'user-123');

      transaction.unmatch();

      expect(transaction.matchStatus).toBe(BankTransactionMatchStatus.UNMATCHED);
      expect(transaction.matchedJournalLineId).toBeUndefined();
      expect(transaction.matchedAt).toBeUndefined();
      expect(transaction.matchedBy).toBeUndefined();
    });

    it('should throw error if not matched', () => {
      const transaction = BankTransaction.create(validProps);

      expect(() => transaction.unmatch()).toThrow('Transaction is not matched');
    });
  });

  describe('exclude', () => {
    it('should exclude transaction from reconciliation', () => {
      const transaction = BankTransaction.create(validProps);

      transaction.exclude('user-123');

      expect(transaction.matchStatus).toBe(BankTransactionMatchStatus.EXCLUDED);
      expect(transaction.matchedBy).toBe('user-123');
    });

    it('should throw error if already matched', () => {
      const transaction = BankTransaction.create(validProps);
      transaction.match('jl-456', 'user-123');

      expect(() =>
        transaction.exclude('user-456')
      ).toThrow('Cannot exclude a matched transaction');
    });
  });

  describe('include', () => {
    it('should include a previously excluded transaction', () => {
      const transaction = BankTransaction.create(validProps);
      transaction.exclude('user-123');

      transaction.include();

      expect(transaction.matchStatus).toBe(BankTransactionMatchStatus.UNMATCHED);
    });

    it('should throw error if not excluded', () => {
      const transaction = BankTransaction.create(validProps);

      expect(() => transaction.include()).toThrow('Transaction is not excluded');
    });
  });

  describe('isDebit / isCredit', () => {
    it('should return true for debit transaction', () => {
      const transaction = BankTransaction.create({
        ...validProps,
        transactionType: BankTransactionType.DEBIT,
      });

      expect(transaction.isDebit()).toBe(true);
      expect(transaction.isCredit()).toBe(false);
    });

    it('should return true for credit transaction', () => {
      const transaction = BankTransaction.create({
        ...validProps,
        transactionType: BankTransactionType.CREDIT,
      });

      expect(transaction.isDebit()).toBe(false);
      expect(transaction.isCredit()).toBe(true);
    });
  });

  describe('fromPersistence', () => {
    it('should reconstitute bank transaction from persistence data', () => {
      const transaction = BankTransaction.fromPersistence({
        id: 'btx-123',
        bankStatementId: 'bst-123',
        bankAccountId: 'ba-123',
        transactionDate: new Date('2026-01-15'),
        postDate: new Date('2026-01-15'),
        description: 'Payment from Customer ABC',
        reference: 'INV-2026-001',
        amount: 5_000_000,
        transactionType: BankTransactionType.CREDIT,
        runningBalance: 105_000_000,
        fingerprint: 'abc123def456abc123def456abc12345',
        matchStatus: BankTransactionMatchStatus.MATCHED,
        matchedJournalLineId: 'jl-456',
        matchedAt: new Date('2026-01-20'),
        matchedBy: 'user-123',
        createdAt: new Date('2026-01-16'),
      });

      expect(transaction.id).toBe('btx-123');
      expect(transaction.fingerprint).toBe('abc123def456abc123def456abc12345');
      expect(transaction.matchStatus).toBe(BankTransactionMatchStatus.MATCHED);
      expect(transaction.matchedJournalLineId).toBe('jl-456');
    });
  });
});
