import { nanoid } from 'nanoid';

/**
 * Base DomainEvent class
 * Domain events represent something that happened in the domain
 */
export abstract class DomainEvent {
  public readonly eventId: string;
  public readonly occurredAt: Date;
  public readonly eventType: string;

  constructor(eventType: string) {
    this.eventId = nanoid();
    this.occurredAt = new Date();
    this.eventType = eventType;
  }

  /**
   * Convert event to plain object for serialization
   */
  abstract toData(): Record<string, any>;
}
