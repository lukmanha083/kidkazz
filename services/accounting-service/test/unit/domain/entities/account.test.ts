import { describe, it, expect } from 'vitest';
import { Account, AccountStatus } from '@/domain/entities/account.entity';
import { AccountType } from '@/domain/value-objects';

describe('Account', () => {
  const validProps = {
    id: 'acc-001',
    code: '1010',
    name: 'Cash on Hand',
    accountType: AccountType.ASSET,
    normalBalance: 'Debit' as const,
    isDetailAccount: true,
    isSystemAccount: false,
  };

  describe('create', () => {
    it('should create a valid account', () => {
      const account = Account.create(validProps);

      expect(account.id).toBe('acc-001');
      expect(account.code).toBe('1010');
      expect(account.name).toBe('Cash on Hand');
      expect(account.accountType).toBe(AccountType.ASSET);
      expect(account.normalBalance).toBe('Debit');
      expect(account.isDetailAccount).toBe(true);
      expect(account.isSystemAccount).toBe(false);
      expect(account.status).toBe(AccountStatus.ACTIVE);
    });

    it('should generate id if not provided', () => {
      const account = Account.create({
        ...validProps,
        id: undefined,
      });

      expect(account.id).toBeDefined();
      expect(account.id.length).toBeGreaterThan(0);
    });

    it('should throw error for invalid code format', () => {
      expect(() =>
        Account.create({
          ...validProps,
          code: '123', // Not 4 digits
        })
      ).toThrow('Account code must be 4 digits');
    });

    it('should throw error for empty name', () => {
      expect(() =>
        Account.create({
          ...validProps,
          name: '',
        })
      ).toThrow('Account name is required');
    });

    it('should throw error for name exceeding max length', () => {
      expect(() =>
        Account.create({
          ...validProps,
          name: 'a'.repeat(256),
        })
      ).toThrow('Account name must not exceed 255 characters');
    });
  });

  describe('canPost', () => {
    it('should return true for active detail account', () => {
      const account = Account.create(validProps);
      expect(account.canPost()).toBe(true);
    });

    it('should return false for header account', () => {
      const account = Account.create({
        ...validProps,
        isDetailAccount: false,
      });
      expect(account.canPost()).toBe(false);
    });

    it('should return false for inactive account', () => {
      const account = Account.create(validProps);
      account.deactivate();
      expect(account.canPost()).toBe(false);
    });
  });

  describe('canDelete', () => {
    it('should return true for non-system account without transactions', () => {
      const account = Account.create(validProps);
      expect(account.canDelete()).toBe(true);
    });

    it('should return false for system account', () => {
      const account = Account.create({
        ...validProps,
        isSystemAccount: true,
      });
      expect(account.canDelete()).toBe(false);
    });

    it('should return false for account with transactions', () => {
      const account = Account.create(validProps);
      account.markHasTransactions();
      expect(account.canDelete()).toBe(false);
    });
  });

  describe('activate', () => {
    it('should activate an inactive account', () => {
      const account = Account.create(validProps);
      account.deactivate();
      expect(account.status).toBe(AccountStatus.INACTIVE);

      account.activate();
      expect(account.status).toBe(AccountStatus.ACTIVE);
    });

    it('should not change status if already active', () => {
      const account = Account.create(validProps);
      account.activate();
      expect(account.status).toBe(AccountStatus.ACTIVE);
    });
  });

  describe('deactivate', () => {
    it('should deactivate an active account', () => {
      const account = Account.create(validProps);
      account.deactivate();
      expect(account.status).toBe(AccountStatus.INACTIVE);
    });

    it('should throw error when deactivating system account', () => {
      const account = Account.create({
        ...validProps,
        isSystemAccount: true,
      });
      expect(() => account.deactivate()).toThrow('Cannot deactivate system account');
    });
  });

  describe('archive', () => {
    it('should archive an inactive account', () => {
      const account = Account.create(validProps);
      account.deactivate();
      account.archive();
      expect(account.status).toBe(AccountStatus.ARCHIVED);
    });

    it('should throw error when archiving active account', () => {
      const account = Account.create(validProps);
      expect(() => account.archive()).toThrow('Can only archive inactive accounts');
    });
  });

  describe('updateName', () => {
    it('should update the account name', () => {
      const account = Account.create(validProps);
      account.updateName('Petty Cash');
      expect(account.name).toBe('Petty Cash');
    });

    it('should throw error for empty name', () => {
      const account = Account.create(validProps);
      expect(() => account.updateName('')).toThrow('Account name is required');
    });
  });

  describe('updateDescription', () => {
    it('should update the description', () => {
      const account = Account.create(validProps);
      account.updateDescription('Cash kept in office safe');
      expect(account.description).toBe('Cash kept in office safe');
    });

    it('should allow empty description', () => {
      const account = Account.create({
        ...validProps,
        description: 'Some description',
      });
      account.updateDescription('');
      expect(account.description).toBe('');
    });
  });

  describe('setParentAccount', () => {
    it('should set parent account', () => {
      const account = Account.create(validProps);
      account.setParentAccount('parent-001', 1);
      expect(account.parentAccountId).toBe('parent-001');
      expect(account.level).toBe(1);
    });

    it('should allow null parent account (top level)', () => {
      const account = Account.create({
        ...validProps,
        parentAccountId: 'parent-001',
        level: 1,
      });
      account.setParentAccount(null, 0);
      expect(account.parentAccountId).toBeNull();
      expect(account.level).toBe(0);
    });
  });

  describe('hierarchy', () => {
    it('should default to level 0 for top-level accounts', () => {
      const account = Account.create(validProps);
      expect(account.level).toBe(0);
      expect(account.parentAccountId).toBeNull();
    });

    it('should allow setting hierarchy on creation', () => {
      const account = Account.create({
        ...validProps,
        parentAccountId: 'parent-001',
        level: 1,
      });
      expect(account.parentAccountId).toBe('parent-001');
      expect(account.level).toBe(1);
    });
  });

  describe('toJSON', () => {
    it('should serialize account to plain object', () => {
      const account = Account.create(validProps);
      const json = account.toJSON();

      expect(json.id).toBe('acc-001');
      expect(json.code).toBe('1010');
      expect(json.name).toBe('Cash on Hand');
      expect(json.accountType).toBe('Asset');
      expect(json.normalBalance).toBe('Debit');
      expect(json.status).toBe('Active');
    });
  });
});
