import { describe, it, expect } from 'vitest';
import {
  JournalEntryPosted,
  JournalEntryVoided,
  AccountBalanceUpdated,
  FiscalPeriodClosed,
  FiscalPeriodReopened,
} from '@/domain/events';

describe('Domain Events', () => {
  describe('JournalEntryPosted', () => {
    it('should create a JournalEntryPosted event with correct properties', () => {
      const payload = {
        entryId: 'je-123',
        entryNumber: 'JE-2026-001',
        entryDate: '2026-01-28',
        description: 'Test journal entry',
        totalAmount: 1000000,
        fiscalYear: 2026,
        fiscalMonth: 1,
        accounts: [
          {
            accountId: 'acc-1',
            accountCode: '1101',
            accountName: 'Cash',
            direction: 'Debit' as const,
            amount: 1000000,
          },
          {
            accountId: 'acc-2',
            accountCode: '4101',
            accountName: 'Sales Revenue',
            direction: 'Credit' as const,
            amount: 1000000,
          },
        ],
        postedBy: 'user-1',
        postedAt: '2026-01-28T10:00:00.000Z',
      };

      const event = JournalEntryPosted.create(payload);

      expect(event.eventType).toBe('JournalEntryPosted');
      expect(event.aggregateId).toBe('je-123');
      expect(event.aggregateType).toBe('JournalEntry');
      expect(event.payload).toEqual(payload);
      expect(event.id).toMatch(/^evt-/);
      expect(event.occurredAt).toBeInstanceOf(Date);
    });

    it('should serialize to JSON correctly', () => {
      const payload = {
        entryId: 'je-123',
        entryNumber: 'JE-2026-001',
        entryDate: '2026-01-28',
        description: 'Test',
        totalAmount: 1000000,
        fiscalYear: 2026,
        fiscalMonth: 1,
        accounts: [],
        postedBy: 'user-1',
        postedAt: '2026-01-28T10:00:00.000Z',
      };

      const event = JournalEntryPosted.create(payload);
      const json = event.toJSON();

      expect(json.eventType).toBe('JournalEntryPosted');
      expect(json.aggregateId).toBe('je-123');
      expect(json.payload).toEqual(payload);
      expect(typeof json.occurredAt).toBe('string');
    });
  });

  describe('JournalEntryVoided', () => {
    it('should create a JournalEntryVoided event with correct properties', () => {
      const payload = {
        entryId: 'je-123',
        entryNumber: 'JE-2026-001',
        voidedBy: 'user-1',
        voidedAt: '2026-01-28T12:00:00.000Z',
        voidReason: 'Duplicate entry',
        originalAmount: 1000000,
        fiscalYear: 2026,
        fiscalMonth: 1,
      };

      const event = JournalEntryVoided.create(payload);

      expect(event.eventType).toBe('JournalEntryVoided');
      expect(event.aggregateId).toBe('je-123');
      expect(event.aggregateType).toBe('JournalEntry');
      expect(event.payload).toEqual(payload);
    });
  });

  describe('AccountBalanceUpdated', () => {
    it('should create an AccountBalanceUpdated event with correct properties', () => {
      const payload = {
        accountId: 'acc-123',
        accountCode: '1101',
        accountName: 'Cash',
        fiscalYear: 2026,
        fiscalMonth: 1,
        previousBalance: 5000000,
        newBalance: 6000000,
        changeAmount: 1000000,
        updatedAt: '2026-01-28T10:00:00.000Z',
      };

      const event = AccountBalanceUpdated.create(payload);

      expect(event.eventType).toBe('AccountBalanceUpdated');
      expect(event.aggregateId).toBe('acc-123');
      expect(event.aggregateType).toBe('AccountBalance');
      expect(event.payload).toEqual(payload);
    });
  });

  describe('FiscalPeriodClosed', () => {
    it('should create a FiscalPeriodClosed event with correct properties', () => {
      const payload = {
        periodId: 'fp-123',
        fiscalYear: 2026,
        fiscalMonth: 1,
        closedBy: 'user-1',
        closedAt: '2026-02-01T00:00:00.000Z',
        finalBalances: [
          { accountId: 'acc-1', accountCode: '1101', closingBalance: 10000000 },
          { accountId: 'acc-2', accountCode: '4101', closingBalance: 5000000 },
        ],
      };

      const event = FiscalPeriodClosed.create(payload);

      expect(event.eventType).toBe('FiscalPeriodClosed');
      expect(event.aggregateId).toBe('fp-123');
      expect(event.aggregateType).toBe('FiscalPeriod');
      expect(event.payload).toEqual(payload);
    });
  });

  describe('FiscalPeriodReopened', () => {
    it('should create a FiscalPeriodReopened event with correct properties', () => {
      const payload = {
        periodId: 'fp-123',
        fiscalYear: 2026,
        fiscalMonth: 1,
        reopenedBy: 'admin-1',
        reopenedAt: '2026-02-05T00:00:00.000Z',
        reopenReason: 'Error correction needed',
      };

      const event = FiscalPeriodReopened.create(payload);

      expect(event.eventType).toBe('FiscalPeriodReopened');
      expect(event.aggregateId).toBe('fp-123');
      expect(event.aggregateType).toBe('FiscalPeriod');
      expect(event.payload).toEqual(payload);
    });
  });
});
