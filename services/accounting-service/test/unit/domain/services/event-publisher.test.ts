import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventPublisher, type IDomainEventRepository, type IQueuePublisher, type StoredDomainEvent, type QueueMessage } from '@/domain/services/EventPublisher';
import { JournalEntryPosted } from '@/domain/events';

describe('EventPublisher', () => {
  // Mock repositories
  const mockEventRepository: IDomainEventRepository = {
    save: vi.fn(),
    findPendingEvents: vi.fn(),
    markAsPublished: vi.fn(),
    markAsFailed: vi.fn(),
    incrementRetryCount: vi.fn(),
    findById: vi.fn(),
    findByAggregateId: vi.fn(),
  };

  const mockQueuePublisher: IQueuePublisher = {
    publish: vi.fn(),
    publishBatch: vi.fn(),
  };

  let publisher: EventPublisher;

  beforeEach(() => {
    vi.clearAllMocks();
    publisher = new EventPublisher(mockEventRepository, mockQueuePublisher, 3);
  });

  describe('storeEvent', () => {
    it('should store a domain event', async () => {
      const event = JournalEntryPosted.create({
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
      });

      await publisher.storeEvent(event);

      expect(mockEventRepository.save).toHaveBeenCalledTimes(1);
      expect(mockEventRepository.save).toHaveBeenCalledWith(event);
    });
  });

  describe('storeEvents', () => {
    it('should store multiple domain events', async () => {
      const event1 = JournalEntryPosted.create({
        entryId: 'je-1',
        entryNumber: 'JE-2026-001',
        entryDate: '2026-01-28',
        description: 'Test 1',
        totalAmount: 1000000,
        fiscalYear: 2026,
        fiscalMonth: 1,
        accounts: [],
        postedBy: 'user-1',
        postedAt: '2026-01-28T10:00:00.000Z',
      });

      const event2 = JournalEntryPosted.create({
        entryId: 'je-2',
        entryNumber: 'JE-2026-002',
        entryDate: '2026-01-28',
        description: 'Test 2',
        totalAmount: 2000000,
        fiscalYear: 2026,
        fiscalMonth: 1,
        accounts: [],
        postedBy: 'user-1',
        postedAt: '2026-01-28T11:00:00.000Z',
      });

      await publisher.storeEvents([event1, event2]);

      expect(mockEventRepository.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('publishPendingEvents', () => {
    it('should publish pending events to queue', async () => {
      const pendingEvents: StoredDomainEvent[] = [
        {
          id: 'evt-1',
          eventType: 'JournalEntryPosted',
          aggregateId: 'je-1',
          aggregateType: 'JournalEntry',
          payload: { entryId: 'je-1' },
          occurredAt: new Date(),
          publishedAt: null,
          status: 'pending',
          retryCount: 0,
          lastError: null,
          createdAt: new Date(),
        },
        {
          id: 'evt-2',
          eventType: 'JournalEntryPosted',
          aggregateId: 'je-2',
          aggregateType: 'JournalEntry',
          payload: { entryId: 'je-2' },
          occurredAt: new Date(),
          publishedAt: null,
          status: 'pending',
          retryCount: 0,
          lastError: null,
          createdAt: new Date(),
        },
      ];

      vi.mocked(mockEventRepository.findPendingEvents).mockResolvedValue(pendingEvents);
      vi.mocked(mockQueuePublisher.publish).mockResolvedValue(undefined);
      vi.mocked(mockEventRepository.markAsPublished).mockResolvedValue(undefined);

      const result = await publisher.publishPendingEvents(100);

      expect(result.total).toBe(2);
      expect(result.published).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.skipped).toBe(0);
      expect(mockQueuePublisher.publish).toHaveBeenCalledTimes(2);
      expect(mockEventRepository.markAsPublished).toHaveBeenCalledTimes(2);
    });

    it('should skip events that exceed max retries', async () => {
      const pendingEvents: StoredDomainEvent[] = [
        {
          id: 'evt-1',
          eventType: 'JournalEntryPosted',
          aggregateId: 'je-1',
          aggregateType: 'JournalEntry',
          payload: { entryId: 'je-1' },
          occurredAt: new Date(),
          publishedAt: null,
          status: 'pending',
          retryCount: 5, // Exceeds max retries (3)
          lastError: 'Previous error',
          createdAt: new Date(),
        },
      ];

      vi.mocked(mockEventRepository.findPendingEvents).mockResolvedValue(pendingEvents);

      const result = await publisher.publishPendingEvents(100);

      expect(result.total).toBe(1);
      expect(result.published).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.skipped).toBe(1);
      expect(mockQueuePublisher.publish).not.toHaveBeenCalled();
    });

    it('should handle publish failures', async () => {
      const pendingEvents: StoredDomainEvent[] = [
        {
          id: 'evt-1',
          eventType: 'JournalEntryPosted',
          aggregateId: 'je-1',
          aggregateType: 'JournalEntry',
          payload: { entryId: 'je-1' },
          occurredAt: new Date(),
          publishedAt: null,
          status: 'pending',
          retryCount: 0,
          lastError: null,
          createdAt: new Date(),
        },
      ];

      vi.mocked(mockEventRepository.findPendingEvents).mockResolvedValue(pendingEvents);
      vi.mocked(mockQueuePublisher.publish).mockRejectedValue(new Error('Queue unavailable'));
      vi.mocked(mockEventRepository.markAsFailed).mockResolvedValue(undefined);
      vi.mocked(mockEventRepository.incrementRetryCount).mockResolvedValue(undefined);

      const result = await publisher.publishPendingEvents(100);

      expect(result.total).toBe(1);
      expect(result.published).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.skipped).toBe(0);
      expect(mockEventRepository.markAsFailed).toHaveBeenCalledWith('evt-1', 'Queue unavailable');
      expect(mockEventRepository.incrementRetryCount).toHaveBeenCalledWith('evt-1');
    });
  });

  describe('getAggregateEvents', () => {
    it('should return events for a specific aggregate', async () => {
      const events: StoredDomainEvent[] = [
        {
          id: 'evt-1',
          eventType: 'JournalEntryPosted',
          aggregateId: 'je-123',
          aggregateType: 'JournalEntry',
          payload: {},
          occurredAt: new Date(),
          publishedAt: new Date(),
          status: 'published',
          retryCount: 0,
          lastError: null,
          createdAt: new Date(),
        },
      ];

      vi.mocked(mockEventRepository.findByAggregateId).mockResolvedValue(events);

      const result = await publisher.getAggregateEvents('JournalEntry', 'je-123');

      expect(result).toEqual(events);
      expect(mockEventRepository.findByAggregateId).toHaveBeenCalledWith('JournalEntry', 'je-123');
    });
  });
});
