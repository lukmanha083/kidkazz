import type { DomainEvent, EventStatus } from '../events';
import type { ProcessedEvent, StoredDomainEvent } from '../services/EventPublisher';

/**
 * Repository interface for domain events (outbox pattern)
 */
export interface IDomainEventRepository {
  /**
   * Save a domain event to the outbox
   */
  save(event: DomainEvent): Promise<void>;

  /**
   * Find pending events that need to be published
   */
  findPendingEvents(limit?: number): Promise<StoredDomainEvent[]>;

  /**
   * Mark an event as successfully published
   */
  markAsPublished(eventId: string): Promise<void>;

  /**
   * Mark an event as failed
   */
  markAsFailed(eventId: string, error: string): Promise<void>;

  /**
   * Increment the retry count for an event
   */
  incrementRetryCount(eventId: string): Promise<void>;

  /**
   * Find an event by ID
   */
  findById(eventId: string): Promise<StoredDomainEvent | null>;

  /**
   * Find all events for a specific aggregate
   */
  findByAggregateId(aggregateType: string, aggregateId: string): Promise<StoredDomainEvent[]>;

  /**
   * Find events by type
   */
  findByEventType(
    eventType: string,
    options?: {
      status?: EventStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<StoredDomainEvent[]>;

  /**
   * Delete old published events (cleanup)
   */
  deleteOldPublishedEvents(olderThan: Date): Promise<number>;
}

/**
 * Repository interface for processed events (idempotency tracking)
 */
export interface IProcessedEventRepository {
  /**
   * Check if an event has already been processed
   */
  isProcessed(eventId: string): Promise<boolean>;

  /**
   * Mark an event as processed
   */
  markAsProcessed(
    eventId: string,
    eventType: string,
    result: 'success' | 'failed' | 'skipped',
    errorMessage?: string
  ): Promise<void>;

  /**
   * Find a processed event by its event ID
   */
  findByEventId(eventId: string): Promise<ProcessedEvent | null>;

  /**
   * Find processed events by type
   */
  findByEventType(
    eventType: string,
    options?: {
      result?: 'success' | 'failed' | 'skipped';
      limit?: number;
      offset?: number;
    }
  ): Promise<ProcessedEvent[]>;

  /**
   * Find recent processed events (all types)
   */
  findRecent(options?: {
    result?: 'success' | 'failed' | 'skipped';
    limit?: number;
    offset?: number;
  }): Promise<ProcessedEvent[]>;

  /**
   * Delete old processed event records (cleanup)
   */
  deleteOldRecords(olderThan: Date): Promise<number>;
}
