import { describe, it, expect, beforeEach } from 'vitest';
import {
  JournalEntry,
  type JournalLineInput,
  JournalEntryStatus,
  JournalEntryType,
} from '@/domain/entities/journal-entry.entity';

describe('JournalEntry', () => {
  const validLines: JournalLineInput[] = [
    { accountId: 'acc-1010', direction: 'Debit', amount: 1000000, memo: 'Cash received' },
    { accountId: 'acc-4010', direction: 'Credit', amount: 1000000, memo: 'Sales revenue' },
  ];

  const validProps = {
    entryDate: new Date('2025-01-15'),
    description: 'Sales transaction',
    lines: validLines,
    createdBy: 'user-001',
  };

  describe('create', () => {
    it('should create a valid journal entry', () => {
      const entry = JournalEntry.create(validProps);

      expect(entry.id).toBeDefined();
      expect(entry.entryNumber).toMatch(/^JE-\d{4}-\d{6}$/);
      expect(entry.entryDate).toEqual(new Date('2025-01-15'));
      expect(entry.description).toBe('Sales transaction');
      expect(entry.status).toBe(JournalEntryStatus.DRAFT);
      expect(entry.entryType).toBe(JournalEntryType.MANUAL);
      expect(entry.lines).toHaveLength(2);
    });

    it('should allow custom entry number', () => {
      const entry = JournalEntry.create({
        ...validProps,
        entryNumber: 'JE-2025-000001',
      });
      expect(entry.entryNumber).toBe('JE-2025-000001');
    });

    it('should throw error for less than 2 lines', () => {
      expect(() =>
        JournalEntry.create({
          ...validProps,
          lines: [validLines[0]],
        })
      ).toThrow('Journal entry must have at least 2 lines');
    });

    it('should throw error when no debit line exists', () => {
      expect(() =>
        JournalEntry.create({
          ...validProps,
          lines: [
            { accountId: 'acc-1', direction: 'Credit', amount: 1000 },
            { accountId: 'acc-2', direction: 'Credit', amount: 1000 },
          ],
        })
      ).toThrow('Journal entry must have at least one debit and one credit line');
    });

    it('should throw error when no credit line exists', () => {
      expect(() =>
        JournalEntry.create({
          ...validProps,
          lines: [
            { accountId: 'acc-1', direction: 'Debit', amount: 1000 },
            { accountId: 'acc-2', direction: 'Debit', amount: 1000 },
          ],
        })
      ).toThrow('Journal entry must have at least one debit and one credit line');
    });

    it('should throw error for unbalanced entry', () => {
      expect(() =>
        JournalEntry.create({
          ...validProps,
          lines: [
            { accountId: 'acc-1', direction: 'Debit', amount: 1000 },
            { accountId: 'acc-2', direction: 'Credit', amount: 500 },
          ],
        })
      ).toThrow('Debits (1000) must equal credits (500)');
    });

    it('should throw error for negative amount', () => {
      expect(() =>
        JournalEntry.create({
          ...validProps,
          lines: [
            { accountId: 'acc-1', direction: 'Debit', amount: -1000 },
            { accountId: 'acc-2', direction: 'Credit', amount: -1000 },
          ],
        })
      ).toThrow('Line amount must be positive');
    });

    it('should throw error for zero amount', () => {
      expect(() =>
        JournalEntry.create({
          ...validProps,
          lines: [
            { accountId: 'acc-1', direction: 'Debit', amount: 0 },
            { accountId: 'acc-2', direction: 'Credit', amount: 0 },
          ],
        })
      ).toThrow('Line amount must be positive');
    });

    it('should throw error for empty description', () => {
      expect(() =>
        JournalEntry.create({
          ...validProps,
          description: '',
        })
      ).toThrow('Description is required');
    });
  });

  describe('validate', () => {
    it('should pass validation for balanced entry', () => {
      const entry = JournalEntry.create(validProps);
      expect(() => entry.validate()).not.toThrow();
    });

    it('should allow tolerance for floating point', () => {
      const entry = JournalEntry.create({
        ...validProps,
        lines: [
          { accountId: 'acc-1', direction: 'Debit', amount: 100.005 },
          { accountId: 'acc-2', direction: 'Credit', amount: 100 },
        ],
      });
      // Should not throw with 0.01 tolerance
      expect(() => entry.validate()).not.toThrow();
    });
  });

  describe('post', () => {
    it('should post a draft entry', () => {
      const entry = JournalEntry.create(validProps);
      entry.post('user-002');

      expect(entry.status).toBe(JournalEntryStatus.POSTED);
      expect(entry.postedBy).toBe('user-002');
      expect(entry.postedAt).toBeDefined();
    });

    it('should throw error when posting non-draft entry', () => {
      const entry = JournalEntry.create(validProps);
      entry.post('user-002');

      expect(() => entry.post('user-003')).toThrow('Only draft entries can be posted');
    });
  });

  describe('void', () => {
    it('should void a posted entry with reason', () => {
      const entry = JournalEntry.create(validProps);
      entry.post('user-002');
      entry.void('user-003', 'Incorrect amount recorded');

      expect(entry.status).toBe(JournalEntryStatus.VOIDED);
      expect(entry.voidedBy).toBe('user-003');
      expect(entry.voidedAt).toBeDefined();
      expect(entry.voidReason).toBe('Incorrect amount recorded');
    });

    it('should throw error when voiding non-posted entry', () => {
      const entry = JournalEntry.create(validProps);
      expect(() => entry.void('user-003', 'Some reason')).toThrow('Can only void posted entries');
    });

    it('should throw error when void reason is empty', () => {
      const entry = JournalEntry.create(validProps);
      entry.post('user-002');
      expect(() => entry.void('user-003', '')).toThrow(
        'Void reason is required (minimum 3 characters)'
      );
    });

    it('should throw error when void reason is too short', () => {
      const entry = JournalEntry.create(validProps);
      entry.post('user-002');
      expect(() => entry.void('user-003', 'ab')).toThrow(
        'Void reason is required (minimum 3 characters)'
      );
    });
  });

  describe('canEdit', () => {
    it('should return true for draft entry', () => {
      const entry = JournalEntry.create(validProps);
      expect(entry.canEdit()).toBe(true);
    });

    it('should return false for posted entry', () => {
      const entry = JournalEntry.create(validProps);
      entry.post('user-002');
      expect(entry.canEdit()).toBe(false);
    });

    it('should return false for voided entry', () => {
      const entry = JournalEntry.create(validProps);
      entry.post('user-002');
      entry.void('user-003', 'Some reason');
      expect(entry.canEdit()).toBe(false);
    });
  });

  describe('canDelete', () => {
    it('should return true for draft entry', () => {
      const entry = JournalEntry.create(validProps);
      expect(entry.canDelete()).toBe(true);
    });

    it('should return false for posted entry', () => {
      const entry = JournalEntry.create(validProps);
      entry.post('user-002');
      expect(entry.canDelete()).toBe(false);
    });
  });

  describe('canPost', () => {
    it('should return true for draft entry', () => {
      const entry = JournalEntry.create(validProps);
      expect(entry.canPost()).toBe(true);
    });

    it('should return false for posted entry', () => {
      const entry = JournalEntry.create(validProps);
      entry.post('user-002');
      expect(entry.canPost()).toBe(false);
    });
  });

  describe('canVoid', () => {
    it('should return true for posted entry', () => {
      const entry = JournalEntry.create(validProps);
      entry.post('user-002');
      expect(entry.canVoid()).toBe(true);
    });

    it('should return false for draft entry', () => {
      const entry = JournalEntry.create(validProps);
      expect(entry.canVoid()).toBe(false);
    });

    it('should return false for voided entry', () => {
      const entry = JournalEntry.create(validProps);
      entry.post('user-002');
      entry.void('user-003', 'Some reason');
      expect(entry.canVoid()).toBe(false);
    });
  });

  describe('update', () => {
    it('should update editable fields of draft entry', () => {
      const entry = JournalEntry.create(validProps);
      entry.update({
        description: 'Updated description',
        reference: 'INV-001',
        notes: 'Some notes',
      });

      expect(entry.description).toBe('Updated description');
      expect(entry.reference).toBe('INV-001');
      expect(entry.notes).toBe('Some notes');
    });

    it('should throw error when updating non-draft entry', () => {
      const entry = JournalEntry.create(validProps);
      entry.post('user-002');

      expect(() =>
        entry.update({
          description: 'Updated',
        })
      ).toThrow('Can only edit draft entries');
    });
  });

  describe('updateLines', () => {
    it('should update lines of draft entry', () => {
      const entry = JournalEntry.create(validProps);
      const newLines: JournalLineInput[] = [
        { accountId: 'acc-1020', direction: 'Debit', amount: 2000000 },
        { accountId: 'acc-4010', direction: 'Credit', amount: 2000000 },
      ];

      entry.updateLines(newLines);
      expect(entry.lines).toHaveLength(2);
      expect(entry.totalDebits).toBe(2000000);
    });

    it('should throw error for unbalanced lines', () => {
      const entry = JournalEntry.create(validProps);
      const newLines: JournalLineInput[] = [
        { accountId: 'acc-1020', direction: 'Debit', amount: 2000000 },
        { accountId: 'acc-4010', direction: 'Credit', amount: 1000000 },
      ];

      expect(() => entry.updateLines(newLines)).toThrow();
    });
  });

  describe('totals', () => {
    it('should calculate total debits correctly', () => {
      const entry = JournalEntry.create({
        ...validProps,
        lines: [
          { accountId: 'acc-1', direction: 'Debit', amount: 500 },
          { accountId: 'acc-2', direction: 'Debit', amount: 300 },
          { accountId: 'acc-3', direction: 'Credit', amount: 800 },
        ],
      });

      expect(entry.totalDebits).toBe(800);
    });

    it('should calculate total credits correctly', () => {
      const entry = JournalEntry.create({
        ...validProps,
        lines: [
          { accountId: 'acc-1', direction: 'Debit', amount: 800 },
          { accountId: 'acc-2', direction: 'Credit', amount: 500 },
          { accountId: 'acc-3', direction: 'Credit', amount: 300 },
        ],
      });

      expect(entry.totalCredits).toBe(800);
    });
  });

  describe('entry types', () => {
    it('should create manual entry by default', () => {
      const entry = JournalEntry.create(validProps);
      expect(entry.entryType).toBe(JournalEntryType.MANUAL);
    });

    it('should create system entry', () => {
      const entry = JournalEntry.create({
        ...validProps,
        entryType: JournalEntryType.SYSTEM,
      });
      expect(entry.entryType).toBe(JournalEntryType.SYSTEM);
    });

    it('should create adjusting entry', () => {
      const entry = JournalEntry.create({
        ...validProps,
        entryType: JournalEntryType.ADJUSTING,
      });
      expect(entry.entryType).toBe(JournalEntryType.ADJUSTING);
    });
  });

  describe('source tracking', () => {
    it('should track source service and reference', () => {
      const entry = JournalEntry.create({
        ...validProps,
        sourceService: 'order-service',
        sourceReferenceId: 'order-12345',
      });

      expect(entry.sourceService).toBe('order-service');
      expect(entry.sourceReferenceId).toBe('order-12345');
    });
  });

  describe('toJSON', () => {
    it('should serialize entry to plain object', () => {
      const entry = JournalEntry.create(validProps);
      const json = entry.toJSON();

      expect(json.id).toBeDefined();
      expect(json.entryNumber).toBeDefined();
      expect(json.description).toBe('Sales transaction');
      expect(json.status).toBe('Draft');
      expect(json.lines).toHaveLength(2);
    });
  });
});
