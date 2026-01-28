import { nanoid } from 'nanoid';

/**
 * Base class for all domain events
 * Implements the outbox pattern for reliable event publishing
 */
export interface DomainEventProps {
  id?: string;
  aggregateId: string;
  aggregateType: string;
  occurredAt?: Date;
  metadata?: Record<string, unknown>;
}

export type EventStatus = 'pending' | 'published' | 'failed';

export abstract class DomainEvent<TPayload = unknown> {
  readonly id: string;
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly occurredAt: Date;
  readonly metadata: Record<string, unknown>;

  protected constructor(props: DomainEventProps) {
    this.id = props.id || `evt-${nanoid(12)}`;
    this.aggregateId = props.aggregateId;
    this.aggregateType = props.aggregateType;
    this.occurredAt = props.occurredAt || new Date();
    this.metadata = props.metadata || {};
  }

  /**
   * The event type name (used for routing)
   */
  abstract get eventType(): string;

  /**
   * The event payload to be serialized
   */
  abstract get payload(): TPayload;

  /**
   * Serialize the event for storage/transmission
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      eventType: this.eventType,
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      payload: this.payload,
      occurredAt: this.occurredAt.toISOString(),
      metadata: this.metadata,
    };
  }
}

/**
 * Domain event persistence props
 */
export interface DomainEventPersistenceProps {
  id: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  payload: string; // JSON string
  occurredAt: string;
  publishedAt: string | null;
  status: EventStatus;
  retryCount: number;
  lastError: string | null;
  createdAt: string;
}

/**
 * Processed event record for idempotency
 */
export interface ProcessedEventRecord {
  id: string;
  eventId: string;
  eventType: string;
  processedAt: Date;
  result: 'success' | 'failed' | 'skipped';
  errorMessage?: string;
  createdAt: Date;
}
