import { describe, it, expect } from 'vitest';
import { BankAccount, type BankAccountProps } from '@/domain/entities/bank-account.entity';
import { BankAccountType, BankAccountStatus } from '@/domain/value-objects';

describe('BankAccount', () => {
  const validProps: BankAccountProps = {
    accountId: 'acc-1020', // GL account ID
    bankName: 'Bank Central Asia',
    accountNumber: '1234567890',
    accountType: BankAccountType.OPERATING,
    currency: 'IDR',
    createdBy: 'user-123',
  };

  describe('create', () => {
    it('should create an active bank account with valid props', () => {
      const bankAccount = BankAccount.create(validProps);

      expect(bankAccount.accountId).toBe('acc-1020');
      expect(bankAccount.bankName).toBe('Bank Central Asia');
      expect(bankAccount.accountNumber).toBe('1234567890');
      expect(bankAccount.accountType).toBe(BankAccountType.OPERATING);
      expect(bankAccount.currency).toBe('IDR');
      expect(bankAccount.status).toBe(BankAccountStatus.ACTIVE);
      expect(bankAccount.lastReconciledDate).toBeUndefined();
      expect(bankAccount.lastReconciledBalance).toBeUndefined();
    });

    it('should generate unique ID with ba- prefix', () => {
      const bankAccount1 = BankAccount.create(validProps);
      const bankAccount2 = BankAccount.create(validProps);

      expect(bankAccount1.id).toMatch(/^ba-/);
      expect(bankAccount2.id).toMatch(/^ba-/);
      expect(bankAccount1.id).not.toBe(bankAccount2.id);
    });

    it('should default currency to IDR if not provided', () => {
      const bankAccount = BankAccount.create({
        ...validProps,
        currency: undefined,
      });

      expect(bankAccount.currency).toBe('IDR');
    });

    it('should throw error if account ID is empty', () => {
      expect(() =>
        BankAccount.create({
          ...validProps,
          accountId: '',
        })
      ).toThrow('Account ID (GL account) is required');
    });

    it('should throw error if account ID is whitespace only', () => {
      expect(() =>
        BankAccount.create({
          ...validProps,
          accountId: '   ',
        })
      ).toThrow('Account ID (GL account) is required');
    });

    it('should throw error if bank name is empty', () => {
      expect(() =>
        BankAccount.create({
          ...validProps,
          bankName: '',
        })
      ).toThrow('Bank name is required');
    });

    it('should throw error if account number is empty', () => {
      expect(() =>
        BankAccount.create({
          ...validProps,
          accountNumber: '',
        })
      ).toThrow('Account number is required');
    });
  });

  describe('update', () => {
    it('should update bank name', () => {
      const bankAccount = BankAccount.create(validProps);

      bankAccount.update({ bankName: 'Bank Mandiri', updatedBy: 'user-456' });

      expect(bankAccount.bankName).toBe('Bank Mandiri');
      expect(bankAccount.updatedBy).toBe('user-456');
    });

    it('should update account number', () => {
      const bankAccount = BankAccount.create(validProps);

      bankAccount.update({ accountNumber: '9876543210' });

      expect(bankAccount.accountNumber).toBe('9876543210');
    });

    it('should update account type', () => {
      const bankAccount = BankAccount.create(validProps);

      bankAccount.update({ accountType: BankAccountType.PAYROLL });

      expect(bankAccount.accountType).toBe(BankAccountType.PAYROLL);
    });

    it('should update currency', () => {
      const bankAccount = BankAccount.create(validProps);

      bankAccount.update({ currency: 'USD' });

      expect(bankAccount.currency).toBe('USD');
    });

    it('should throw error if updating closed account', () => {
      const bankAccount = BankAccount.create(validProps);
      bankAccount.close();

      expect(() =>
        bankAccount.update({ bankName: 'New Name' })
      ).toThrow('Cannot update a closed bank account');
    });

    it('should throw error if bank name is empty', () => {
      const bankAccount = BankAccount.create(validProps);

      expect(() =>
        bankAccount.update({ bankName: '' })
      ).toThrow('Bank name cannot be empty');
    });

    it('should throw error if account number is empty', () => {
      const bankAccount = BankAccount.create(validProps);

      expect(() =>
        bankAccount.update({ accountNumber: '   ' })
      ).toThrow('Account number cannot be empty');
    });
  });

  describe('recordReconciliation', () => {
    it('should record reconciliation with balance', () => {
      const bankAccount = BankAccount.create(validProps);

      bankAccount.recordReconciliation(50_000_000, 'user-456');

      expect(bankAccount.lastReconciledBalance).toBe(50_000_000);
      expect(bankAccount.lastReconciledDate).toBeInstanceOf(Date);
      expect(bankAccount.updatedBy).toBe('user-456');
    });

    it('should throw error if reconciling closed account', () => {
      const bankAccount = BankAccount.create(validProps);
      bankAccount.close();

      expect(() =>
        bankAccount.recordReconciliation(50_000_000)
      ).toThrow('Cannot reconcile a closed bank account');
    });
  });

  describe('status management', () => {
    describe('deactivate', () => {
      it('should deactivate an active account', () => {
        const bankAccount = BankAccount.create(validProps);

        bankAccount.deactivate('user-456');

        expect(bankAccount.status).toBe(BankAccountStatus.INACTIVE);
        expect(bankAccount.updatedBy).toBe('user-456');
      });

      it('should throw error if deactivating closed account', () => {
        const bankAccount = BankAccount.create(validProps);
        bankAccount.close();

        expect(() => bankAccount.deactivate()).toThrow('Bank account is already closed');
      });
    });

    describe('reactivate', () => {
      it('should reactivate an inactive account', () => {
        const bankAccount = BankAccount.create(validProps);
        bankAccount.deactivate();

        bankAccount.reactivate('user-456');

        expect(bankAccount.status).toBe(BankAccountStatus.ACTIVE);
        expect(bankAccount.updatedBy).toBe('user-456');
      });

      it('should throw error if reactivating closed account', () => {
        const bankAccount = BankAccount.create(validProps);
        bankAccount.close();

        expect(() => bankAccount.reactivate()).toThrow('Cannot reactivate a closed bank account');
      });
    });

    describe('close', () => {
      it('should close an active account', () => {
        const bankAccount = BankAccount.create(validProps);

        bankAccount.close('user-456');

        expect(bankAccount.status).toBe(BankAccountStatus.CLOSED);
        expect(bankAccount.updatedBy).toBe('user-456');
      });

      it('should close an inactive account', () => {
        const bankAccount = BankAccount.create(validProps);
        bankAccount.deactivate();

        bankAccount.close();

        expect(bankAccount.status).toBe(BankAccountStatus.CLOSED);
      });

      it('should throw error if already closed', () => {
        const bankAccount = BankAccount.create(validProps);
        bankAccount.close();

        expect(() => bankAccount.close()).toThrow('Bank account is already closed');
      });
    });
  });

  describe('isActive', () => {
    it('should return true for active account', () => {
      const bankAccount = BankAccount.create(validProps);

      expect(bankAccount.isActive()).toBe(true);
    });

    it('should return false for inactive account', () => {
      const bankAccount = BankAccount.create(validProps);
      bankAccount.deactivate();

      expect(bankAccount.isActive()).toBe(false);
    });

    it('should return false for closed account', () => {
      const bankAccount = BankAccount.create(validProps);
      bankAccount.close();

      expect(bankAccount.isActive()).toBe(false);
    });
  });

  describe('needsReconciliation (Rule 21)', () => {
    it('should return true if never reconciled', () => {
      const bankAccount = BankAccount.create(validProps);

      expect(bankAccount.needsReconciliation(2026, 1)).toBe(true);
    });

    it('should return true if last reconciled in previous month', () => {
      const bankAccount = BankAccount.create(validProps);
      // Simulate reconciliation in December 2025
      bankAccount.recordReconciliation(50_000_000);
      // Override the date for testing
      const persistedAccount = BankAccount.fromPersistence({
        ...validProps,
        id: bankAccount.id,
        status: BankAccountStatus.ACTIVE,
        lastReconciledDate: new Date('2025-12-15'),
        lastReconciledBalance: 50_000_000,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(persistedAccount.needsReconciliation(2026, 1)).toBe(true);
    });

    it('should return false if reconciled in current month', () => {
      const bankAccount = BankAccount.fromPersistence({
        ...validProps,
        id: 'ba-123',
        status: BankAccountStatus.ACTIVE,
        lastReconciledDate: new Date('2026-01-20'),
        lastReconciledBalance: 50_000_000,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(bankAccount.needsReconciliation(2026, 1)).toBe(false);
    });

    it('should return false for inactive accounts', () => {
      const bankAccount = BankAccount.create(validProps);
      bankAccount.deactivate();

      expect(bankAccount.needsReconciliation(2026, 1)).toBe(false);
    });

    it('should return false for closed accounts', () => {
      const bankAccount = BankAccount.create(validProps);
      bankAccount.close();

      expect(bankAccount.needsReconciliation(2026, 1)).toBe(false);
    });
  });

  describe('fromPersistence', () => {
    it('should reconstitute bank account from persistence data', () => {
      const bankAccount = BankAccount.fromPersistence({
        id: 'ba-123',
        accountId: 'acc-1020',
        bankName: 'Bank Central Asia',
        accountNumber: '1234567890',
        accountType: BankAccountType.OPERATING,
        currency: 'IDR',
        status: BankAccountStatus.ACTIVE,
        lastReconciledDate: new Date('2026-01-15'),
        lastReconciledBalance: 50_000_000,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-15'),
        createdBy: 'user-123',
        updatedBy: 'user-456',
      });

      expect(bankAccount.id).toBe('ba-123');
      expect(bankAccount.accountId).toBe('acc-1020');
      expect(bankAccount.bankName).toBe('Bank Central Asia');
      expect(bankAccount.status).toBe(BankAccountStatus.ACTIVE);
      expect(bankAccount.lastReconciledBalance).toBe(50_000_000);
      expect(bankAccount.createdBy).toBe('user-123');
      expect(bankAccount.updatedBy).toBe('user-456');
    });
  });
});
