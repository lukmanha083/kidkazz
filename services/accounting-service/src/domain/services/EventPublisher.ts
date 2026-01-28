import type { DomainEvent, EventStatus } from '../events';

/**
 * Interface for domain event repository
 */
export interface IDomainEventRepository {
  save(event: DomainEvent): Promise<void>;
  findPendingEvents(limit?: number): Promise<StoredDomainEvent[]>;
  markAsPublished(eventId: string): Promise<void>;
  markAsFailed(eventId: string, error: string): Promise<void>;
  incrementRetryCount(eventId: string): Promise<void>;
  findById(eventId: string): Promise<StoredDomainEvent | null>;
  findByAggregateId(aggregateType: string, aggregateId: string): Promise<StoredDomainEvent[]>;
}

/**
 * Interface for processed events repository (idempotency)
 */
export interface IProcessedEventRepository {
  isProcessed(eventId: string): Promise<boolean>;
  markAsProcessed(
    eventId: string,
    eventType: string,
    result: 'success' | 'failed' | 'skipped',
    errorMessage?: string
  ): Promise<void>;
  findByEventId(eventId: string): Promise<ProcessedEvent | null>;
}

/**
 * Stored domain event record
 */
export interface StoredDomainEvent {
  id: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
  publishedAt: Date | null;
  status: EventStatus;
  retryCount: number;
  lastError: string | null;
  createdAt: Date;
}

/**
 * Processed event record
 */
export interface ProcessedEvent {
  id: string;
  eventId: string;
  eventType: string;
  processedAt: Date;
  result: 'success' | 'failed' | 'skipped';
  errorMessage?: string;
  createdAt: Date;
}

/**
 * Queue message interface (Cloudflare Queues)
 */
export interface QueueMessage {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  payload: Record<string, unknown>;
  occurredAt: string;
}

/**
 * Queue publisher interface
 */
export interface IQueuePublisher {
  publish(message: QueueMessage): Promise<void>;
  publishBatch(messages: QueueMessage[]): Promise<void>;
}

/**
 * Event publisher service (Outbox pattern)
 *
 * Uses the transactional outbox pattern:
 * 1. Domain events are first stored in the database within the same transaction
 * 2. A separate process reads pending events and publishes them to the queue
 * 3. Events are marked as published once successfully sent
 */
export class EventPublisher {
  private readonly eventRepository: IDomainEventRepository;
  private readonly queuePublisher: IQueuePublisher;
  private readonly maxRetries: number;

  constructor(
    eventRepository: IDomainEventRepository,
    queuePublisher: IQueuePublisher,
    maxRetries = 3
  ) {
    this.eventRepository = eventRepository;
    this.queuePublisher = queuePublisher;
    this.maxRetries = maxRetries;
  }

  /**
   * Store a domain event for later publishing (outbox)
   */
  async storeEvent(event: DomainEvent): Promise<void> {
    await this.eventRepository.save(event);
  }

  /**
   * Store multiple domain events
   */
  async storeEvents(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.eventRepository.save(event);
    }
  }

  /**
   * Process pending events and publish to queue
   * This should be called by a scheduled worker or after each transaction
   */
  async publishPendingEvents(batchSize = 100): Promise<PublishResult> {
    const pendingEvents = await this.eventRepository.findPendingEvents(batchSize);

    const result: PublishResult = {
      total: pendingEvents.length,
      published: 0,
      failed: 0,
      skipped: 0,
    };

    for (const event of pendingEvents) {
      try {
        // Mark as dead-letter if max retries exceeded
        if (event.retryCount >= this.maxRetries) {
          await this.eventRepository.markAsFailed(
            event.id,
            `Max retries (${this.maxRetries}) exceeded. Event moved to dead-letter.`
          );
          result.skipped++;
          continue;
        }

        // Publish to queue
        const message: QueueMessage = {
          eventId: event.id,
          eventType: event.eventType,
          aggregateId: event.aggregateId,
          aggregateType: event.aggregateType,
          payload: event.payload,
          occurredAt: event.occurredAt.toISOString(),
        };

        await this.queuePublisher.publish(message);
        await this.eventRepository.markAsPublished(event.id);
        result.published++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await this.eventRepository.markAsFailed(event.id, errorMessage);
        await this.eventRepository.incrementRetryCount(event.id);
        result.failed++;
      }
    }

    return result;
  }

  /**
   * Get events for a specific aggregate
   */
  async getAggregateEvents(
    aggregateType: string,
    aggregateId: string
  ): Promise<StoredDomainEvent[]> {
    return this.eventRepository.findByAggregateId(aggregateType, aggregateId);
  }
}

/**
 * Result of publishing pending events
 */
export interface PublishResult {
  total: number;
  published: number;
  failed: number;
  skipped: number;
}
